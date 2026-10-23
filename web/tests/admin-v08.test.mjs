import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  ADMIN_ROLES,
  ADMIN_SECTIONS,
  ROLE_SECTIONS,
  canAccessSection,
  canPerformRoleAction,
  resolveAdminSession,
} from "../lib/admin-v08/access-control.ts";
import {
  filterArchiveRecords,
  getArchiveQualityFlags,
  safeHttpsUrl,
  summarizeArchive,
} from "../lib/admin-v08/archive.ts";
import {
  redactAuditDetails,
  unavailableAuditRepository,
  validateAdminAuditEvent,
} from "../lib/admin-v08/audit.ts";
import { assertExpectedRevision, RevisionConflictError } from "../lib/admin-v08/concurrency.ts";
import { createPublicationReadOnlyAdapter } from "../lib/admin-v08/repositories.ts";
import { getReviewFormState, isReviewForm } from "../lib/admin-v08/reviews.ts";

const NOW = "2026-10-23T12:00:00.000Z";

function archive(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "archive-one",
    slug: "archive-one",
    title: "İzmir olayı",
    type: "event",
    date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
    people: [],
    locations: [],
    categories: ["Cumhuriyet"],
    summary: "Kaynaklı örnek kayıt.",
    source: {
      institution: "Atatürk Araştırma Merkezi",
      institutionType: "official",
      institutionUrl: "https://example.org",
      title: "Kaynak sayfası",
      url: "https://example.org/source",
      citation: "Künye",
      accessedAt: "2026-10-23",
    },
    provenance: [],
    rights: { status: "official_link_only", imageReuse: "link_only", note: "Yalnızca bağlantı." },
    image: null,
    quotation: null,
    verification: {
      status: "published",
      reviewedBy: null,
      reviewedAt: null,
      checks: { sourceReachable: false, dateVerified: false, rightsVerified: false, quoteVerified: false, duplicateChecked: false },
      notes: "",
    },
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function reviewForm(overrides = {}) {
  return {
    record_id: "archive-one",
    record_snapshot_sha256: "a".repeat(64),
    record_snapshot: {
      title: "İzmir olayı",
      type: "event",
      date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact" },
      source_institution: "Atatürk Araştırma Merkezi",
      source_url: "https://example.org/source",
      citation: "Künye",
      rights_status: "official_link_only",
    },
    review_status: "pending",
    reviewer: null,
    review_date: null,
    outcome: "pending",
    publicationApproval: null,
    ...overrides,
  };
}

test("role and section sets are explicit and unique", () => {
  assert.equal(ADMIN_ROLES.length, 6);
  assert.equal(new Set(ADMIN_ROLES).size, ADMIN_ROLES.length);
  assert.equal(new Set(ADMIN_SECTIONS).size, ADMIN_SECTIONS.length);
});

test("missing session provider denies access", async () => {
  assert.equal(await resolveAdminSession(null), null);
});

test("session permissions are derived from server RBAC, not supplied by a principal", async () => {
  const provider = {
    async getAuthenticatedPrincipal() {
      return { subject: "user-1", displayName: "Test", role: "researcher", allowedSections: ["users"] };
    },
  };
  const session = await resolveAdminSession(provider);
  assert.equal(session.role, "researcher");
  assert.deepEqual(session.allowedSections, ROLE_SECTIONS.researcher);
  assert.equal(canAccessSection(session, "users"), false);
});

test("malformed principal is denied", async () => {
  const provider = { async getAuthenticatedPrincipal() { return { subject: " ", displayName: "No name", role: "root" }; } };
  assert.equal(await resolveAdminSession(provider), null);
});

test("historian cannot approve publication or manage users", async () => {
  const session = await resolveAdminSession({ async getAuthenticatedPrincipal() { return { subject: "h", displayName: "Historian", role: "historian" }; } });
  assert.equal(canPerformRoleAction(session, "review_history"), true);
  assert.equal(canPerformRoleAction(session, "approve_publication"), false);
  assert.equal(canPerformRoleAction(session, "manage_users"), false);
});

test("chief editor cannot assign system roles", async () => {
  const session = await resolveAdminSession({ async getAuthenticatedPrincipal() { return { subject: "e", displayName: "Editor", role: "chief_editor" }; } });
  assert.equal(canPerformRoleAction(session, "manage_users"), false);
});

test("archive search handles Turkish casing and uses all query tokens", () => {
  const result = filterArchiveRecords([archive()], {
    q: "İZMİR OLAYI",
    institution: "",
    type: "event",
    status: "published",
    rightsRisk: false,
    page: 1,
  });
  assert.equal(result.total, 1);
});

test("archive filter applies type, status, institution and uncertain-rights constraints", () => {
  const records = [
    archive(),
    archive({ id: "archive-two", slug: "archive-two", title: "Belge", type: "document", rights: { status: "unknown", imageReuse: "link_only", note: "Belirsiz." } }),
  ];
  const result = filterArchiveRecords(records, {
    q: "",
    institution: "merkez",
    type: "document",
    status: "published",
    rightsRisk: true,
    page: 1,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "archive-two");
});

test("archive paging clamps to a valid page and returns no duplicate records", () => {
  const records = Array.from({ length: 7 }, (_, index) => archive({ id: `archive-${index}`, slug: `archive-${index}` }));
  const result = filterArchiveRecords(records, { q: "", institution: "", type: "", status: "", rightsRisk: false, page: 999 }, 3);
  assert.equal(result.page, 3);
  assert.equal(result.items.length, 1);
});

test("archive quality flags recognize missing source and rights uncertainty", () => {
  const record = archive({
    source: { institution: "", institutionType: "other", institutionUrl: "", title: "", url: "", accessedAt: "" },
    rights: { status: "unknown", imageReuse: "link_only", note: "" },
  });
  const flags = getArchiveQualityFlags(record);
  assert.equal(flags.missingSource, true);
  assert.equal(flags.rightsUnclear, true);
});

test("archive summary uses record contents and never treats technical status as human approval", () => {
  const result = summarizeArchive([archive(), archive({ id: "archive-two", slug: "archive-two", verification: { ...archive().verification, reviewedBy: "Automated check" } })]);
  assert.equal(result.total, 2);
  assert.equal(result.humanReviewUnverified, 2);
  assert.equal(result.byStatus.published, 2);
});

test("HTTPS source links are allowed but script and non-HTTPS schemes are rejected", () => {
  assert.equal(safeHttpsUrl("https://example.org/source"), "https://example.org/source");
  assert.equal(safeHttpsUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpsUrl("http://example.org/source"), null);
  assert.equal(safeHttpsUrl("not-a-url"), null);
});

test("a new editorial form stays pending", () => {
  const form = reviewForm();
  assert.equal(isReviewForm(form), true);
  assert.equal(getReviewFormState(form, archive()), "pending");
});

test("an old review form is marked stale when the archive date changes", () => {
  assert.equal(getReviewFormState(reviewForm(), archive({ date: { start: "1923-10-30", end: null, precision: "day", certainty: "exact", display: "30 Ekim 1923" } })), "stale");
});

test("submitted form is only an unverified claim, not an approval", () => {
  const submitted = reviewForm({
    review_status: "submitted",
    reviewer: { name: "Recorded name", role: "human_expert" },
    review_date: "2026-10-23",
    outcome: "approved",
    publicationApproval: { status: "approved", authority: "human", role: "human_editor" },
  });
  assert.equal(getReviewFormState(submitted, archive()), "submitted_claim_unverified");
});

test("invalid review form is rejected instead of crashing the queue", () => {
  assert.equal(isReviewForm({ record_id: "x" }), false);
  assert.equal(getReviewFormState({ record_id: "../secret" }, archive()), "invalid");
});

test("audit validator checks required event shape and known actions", () => {
  const event = {
    eventId: "evt-1",
    actorId: "user-1",
    actorRole: "historian",
    action: "review_started",
    targetId: "archive-one",
    occurredAt: NOW,
    result: "success",
    recordVersion: "sha256:abc",
    detail: "Review started.",
  };
  assert.equal(validateAdminAuditEvent(event), true);
  assert.equal(validateAdminAuditEvent({ ...event, action: "arbitrary" }), false);
  assert.equal(validateAdminAuditEvent({ ...event, eventId: "  " }), false);
  assert.equal(validateAdminAuditEvent({ ...event, occurredAt: "2026-10-23" }), false);
});

test("audit redaction removes nested token and password values", () => {
  const safe = redactAuditDetails({
    action: "login",
    password: "secret",
    accessToken: "secret-token",
    context: { authorization: "Bearer secret", safe: "visible" },
    note: "safe",
  });
  assert.equal(safe.password, "[REDACTED]");
  assert.equal(safe.accessToken, "[REDACTED]");
  assert.equal(safe.context.authorization, "[REDACTED]");
  assert.equal(safe.context.safe, "visible");
  assert.equal(safe.note, "safe");
});

test("unavailable audit storage fails writes explicitly", async () => {
  await assert.rejects(() => unavailableAuditRepository.append({}), /repository yapılandırılmadığı/);
});

test("optimistic concurrency rejects stale revisions", () => {
  assert.doesNotThrow(() => assertExpectedRevision("rev-2", "rev-2"));
  assert.throws(() => assertExpectedRevision("rev-1", "rev-2"), RevisionConflictError);
  assert.throws(() => assertExpectedRevision("", "rev-2"), RevisionConflictError);
});

test("publication adapter exposes a read-only snapshot of existing records", async () => {
  const source = [{ id: "publication-1" }];
  const adapter = createPublicationReadOnlyAdapter(() => source);
  const snapshot = await adapter.listPublications();
  assert.equal(snapshot.length, 1);
  assert.notEqual(snapshot, source);
  assert.equal(Object.isFrozen(snapshot), true);
});

test("actual V0.6 archive and review-form data are unique, structurally valid and matched", () => {
  const repositoryRoot = path.resolve(process.cwd(), "..");
  const readJsonDirectory = (relativePath) => {
    const directory = path.join(repositoryRoot, relativePath);
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8")));
  };
  const records = [
    ...readJsonDirectory(path.join("content", "archive", "records")),
    ...readJsonDirectory(path.join("data", "archive", "catalog")),
  ];
  const forms = readJsonDirectory(path.join("docs", "editorial", "forms"));
  const recordIds = new Set(records.map((record) => record.id));
  const formIds = new Set(forms.map((form) => form.record_id));

  assert.ok(records.length > 0, "real archive catalogue should be present");
  assert.ok(forms.length > 0, "editorial review forms should be present");
  assert.equal(recordIds.size, records.length, "archive record IDs should be unique");
  assert.equal(formIds.size, forms.length, "review forms should not duplicate record IDs");
  assert.ok(forms.every((form) => isReviewForm(form)), "each real review form should satisfy the admin read model");
  assert.ok(forms.every((form) => recordIds.has(form.record_id)), "each form should match a current archive record");
});
