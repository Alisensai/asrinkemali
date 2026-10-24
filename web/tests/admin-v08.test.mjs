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
import { sha256CanonicalJson } from "../lib/admin-v08/canonical-hash.ts";
import {
  filterArchiveRecords,
  getArchiveQualityFlags,
  isMediaFileUrl,
  safeHttpsUrl,
  summarizeArchive,
} from "../lib/admin-v08/archive.ts";
import {
  appendAdminAuditEvent,
  auditActorMatches,
  redactAuditDetails,
  unavailableAuditRepository,
  validateAdminAuditEvent,
  verifyAdminAuditChain,
} from "../lib/admin-v08/audit.ts";
import { assertExpectedRevision, RevisionConflictError } from "../lib/admin-v08/concurrency.ts";
import { createPublicationReadOnlyAdapter } from "../lib/admin-v08/repositories.ts";
import { getReviewFormState, isReviewForm } from "../lib/admin-v08/reviews.ts";
import { evaluateEditorialDecisionReadiness } from "../lib/admin-v08/editorial-policy.ts";
import {
  authorizeAdminMutation,
  buildPermissionCrosswalk,
  resolveAdminPermissionGrant,
} from "../lib/admin-v08/fortress-role-adapter.ts";
import { stageProposal } from "../lib/admin-v08/staging-proposals.ts";
import { buildAdminReadinessReport } from "../lib/admin-v08/readiness.ts";

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
  const record = archive();
  return {
    record_id: "archive-one",
    record_snapshot_sha256: sha256CanonicalJson(record),
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
  assert.equal(canPerformRoleAction(session, "approve_publication"), true);
});

test("section visibility does not imply write permission for researchers or auditors", async () => {
  const researcher = await resolveAdminSession({ async getAuthenticatedPrincipal() { return { subject: "r", displayName: "Researcher", role: "researcher" }; } });
  const auditor = await resolveAdminSession({ async getAuthenticatedPrincipal() { return { subject: "a", displayName: "Auditor", role: "readonly_auditor" }; } });
  assert.equal(canAccessSection(researcher, "archive"), true);
  assert.equal(canPerformRoleAction(researcher, "manage_users"), false);
  assert.equal(canPerformRoleAction(auditor, "approve_publication"), false);
  assert.equal(canPerformRoleAction(auditor, "manage_users"), false);
});

test("system administrator can administer accounts but cannot perform editorial decisions", async () => {
  const session = await resolveAdminSession({ async getAuthenticatedPrincipal() { return { subject: "admin", displayName: "Admin", role: "system_admin" }; } });
  assert.equal(canPerformRoleAction(session, "manage_users"), true);
  assert.equal(canPerformRoleAction(session, "review_history"), false);
  assert.equal(canPerformRoleAction(session, "approve_publication"), false);
});

test("provider exceptions and malformed principal data fail closed", async () => {
  assert.equal(await resolveAdminSession({ async getAuthenticatedPrincipal() { throw new Error("provider failure"); } }), null);
  assert.equal(await resolveAdminSession({ async getAuthenticatedPrincipal() { return { subject: null, displayName: "Name", role: "historian" }; } }), null);
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

test("raw media URLs are flagged independently of institutional landing pages", () => {
  assert.equal(isMediaFileUrl("https://cdn.example.test/archive/photo.JPG?download=1"), true);
  assert.equal(isMediaFileUrl("https://example.test/item/123"), false);
  assert.equal(isMediaFileUrl("javascript:alert(1)"), false);
});

test("a new editorial form stays pending", () => {
  const form = reviewForm();
  assert.equal(isReviewForm(form), true);
  assert.equal(getReviewFormState(form, archive()), "pending");
});

test("review state binds every decision to the full canonical archive record hash", () => {
  const original = archive();
  const form = reviewForm();
  assert.equal(form.record_snapshot_sha256, sha256CanonicalJson(original));
  const changedProvenance = archive({ provenance: [{ source: "changed after review" }] });
  assert.equal(getReviewFormState(form, changedProvenance), "stale");
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
    email: "person@example.invalid",
    password: "secret",
    accessToken: "secret-token",
    context: { authorization: "Bearer secret", safe: "visible" },
    note: "safe",
  });
  assert.equal(safe.password, "[REDACTED]");
  assert.equal(safe.accessToken, "[REDACTED]");
  assert.equal(safe.context.authorization, "[REDACTED]");
  assert.equal(safe.email, "[REDACTED]");
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
  const recordsById = new Map(records.map((record) => [record.id, record]));
  assert.ok(
    forms.every((form) => form.record_snapshot_sha256 === sha256CanonicalJson(recordsById.get(form.record_id))),
    "every real editorial form hash should match its whole current archive record",
  );
});

function fortressClaims(role, overrides = {}) {
  const permissions = {
    viewer: [],
    contributor: ["archive.read_drafts", "archive.edit", "publication.edit"],
    historian: ["archive.read_drafts", "review.submit_expert"],
    editor: ["archive.read_drafts", "publication.edit", "publication.approve", "publication.schedule", "audit.read"],
    admin: ["audit.read", "users.manage"],
  };
  return {
    issuer: "fixture-idp",
    subject: `${role}-subject`,
    roles: [role],
    permissions: permissions[role],
    issuedAt: Date.parse(NOW) - 60_000,
    expiresAt: Date.parse(NOW) + 60 * 60_000,
    mfa: true,
    ...overrides,
  };
}

async function fixtureGrant(role, overrides = {}, now = Date.parse(NOW)) {
  const claims = fortressClaims(role, overrides);
  return resolveAdminPermissionGrant({
    id: claims.issuer,
    async verifySession() { return claims; },
  }, now);
}

test("Fortress-to-admin crosswalk grants only the source/target permission intersection", () => {
  const rows = buildPermissionCrosswalk();
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.ok(row.grantedIntersection.every((permission) =>
      row.sourcePermissions.includes(permission) && row.expectedByAdminRole.includes(permission),
    ));
  }
  assert.deepEqual(buildPermissionCrosswalk().find((row) => row.fortressRole === "admin").grantedIntersection, ["audit.read", "users.manage"]);
});

test("Fortress role adapter rejects expired, future, unknown, conflicting and failed-provider claims", async () => {
  assert.equal((await fixtureGrant("historian")).role, "historian");
  assert.equal(await fixtureGrant("historian", { roles: ["historian", "editor"] }), null);
  assert.equal(await fixtureGrant("historian", { roles: ["superuser"] }), null);
  assert.equal(await fixtureGrant("historian", { expiresAt: Date.parse(NOW) - 1 }), null);
  assert.equal(await fixtureGrant("historian", { issuedAt: Date.parse(NOW) + 120_000 }), null);
  assert.equal(await fixtureGrant("historian", { expiresAt: Date.parse(NOW) + 9 * 60 * 60_000 }), null);
  assert.equal(await resolveAdminPermissionGrant({ id: "trusted-idp", async verifySession() { throw new Error("invalid token"); } }), null);
  assert.equal(await resolveAdminPermissionGrant({ id: "trusted-idp", async verifySession() { return fortressClaims("admin"); } }), null);
});

test("role mapping clamps permissions and enforces MFA, self-approval and verified-grant provenance", async () => {
  const admin = await fixtureGrant("admin", { permissions: ["audit.read", "users.manage", "publication.approve"] });
  assert.equal(authorizeAdminMutation(admin, "publication.approve").reason, "permission-denied");
  assert.equal(authorizeAdminMutation(admin, "users.manage").allowed, true);

  const historian = await fixtureGrant("historian", { mfa: false });
  assert.equal(authorizeAdminMutation(historian, "review.submit_expert").reason, "mfa-required");

  const mfaHistorian = await fixtureGrant("historian");
  assert.equal(authorizeAdminMutation(mfaHistorian, "review.submit_expert", { resourceAuthor: mfaHistorian.subject }).reason, "self-approval");

  const editor = await fixtureGrant("editor");
  assert.equal(authorizeAdminMutation(editor, "publication.approve").allowed, true);
  assert.equal(authorizeAdminMutation({ ...editor }, "publication.approve").reason, "no-trusted-grant");
});

function auditEvent(overrides = {}) {
  return {
    eventId: "evt-00000001",
    actorId: "historian-subject",
    actorRole: "historian",
    action: "review_decision",
    targetId: "archive-one",
    occurredAt: NOW,
    result: "success",
    recordVersion: "a".repeat(64),
    detail: "Expert review recorded.",
    ...overrides,
  };
}

test("audit events reject role tampering, duplicate IDs and broken hash chains", () => {
  const first = auditEvent();
  const chain = appendAdminAuditEvent([], first);
  assert.equal(verifyAdminAuditChain(chain).valid, true);
  assert.equal(auditActorMatches(first, { subject: "historian-subject", role: "historian" }), true);
  assert.equal(auditActorMatches(first, { subject: "historian-subject", role: "system_admin" }), false);
  assert.throws(() => appendAdminAuditEvent(chain, first), /eventId/);
  assert.equal(verifyAdminAuditChain([{ ...chain[0], event: { ...first, actorRole: "system_admin" } }]).valid, false);
  assert.equal(validateAdminAuditEvent({ ...first, actorRole: "owner" }), false);
});

test("editorial decision readiness requires distinct MFA actors, matching hashes and audit evidence", async () => {
  const historian = await fixtureGrant("historian");
  const editor = await fixtureGrant("editor", { subject: "editor-subject" });
  const recordHash = "b".repeat(64);
  const expertEvent = auditEvent({ actorId: historian.subject, recordVersion: recordHash });
  const editorEvent = auditEvent({
    eventId: "evt-00000002",
    actorId: editor.subject,
    actorRole: "chief_editor",
    action: "editorial_decision",
    occurredAt: "2026-10-23T13:00:00.000Z",
    recordVersion: recordHash,
    detail: "Editorial approval recorded.",
  });
  const expertChain = appendAdminAuditEvent([], expertEvent);
  const editorChain = appendAdminAuditEvent([], editorEvent);
  const expertReview = { grant: historian, event: expertEvent, chain: expertChain, recordSha256: recordHash, occurredAt: NOW };
  const editorApproval = { grant: editor, event: editorEvent, chain: editorChain, recordSha256: recordHash, occurredAt: editorEvent.occurredAt };

  assert.deepEqual(evaluateEditorialDecisionReadiness({
    currentRecordSha256: recordHash,
    contentUpdatedAt: "2026-10-23T11:00:00.000Z",
    expertReview,
    editorApproval,
  }), { ready: true });
  assert.deepEqual(evaluateEditorialDecisionReadiness({
    currentRecordSha256: "c".repeat(64),
    contentUpdatedAt: "2026-10-23T11:00:00.000Z",
    expertReview,
    editorApproval,
  }), { ready: false, reason: "stale_content" });
  assert.deepEqual(evaluateEditorialDecisionReadiness({
    currentRecordSha256: recordHash,
    contentUpdatedAt: "2026-10-23T11:00:00.000Z",
    expertReview,
    editorApproval: { ...editorApproval, grant: historian },
  }), { ready: false, reason: "same_actor" });
  assert.deepEqual(evaluateEditorialDecisionReadiness({
    currentRecordSha256: recordHash,
    contentUpdatedAt: "2026-10-23T11:00:00.000Z",
    expertReview,
    editorApproval: { ...editorApproval, chain: null },
  }), { ready: false, reason: "audit_unavailable" });
  assert.deepEqual(evaluateEditorialDecisionReadiness({
    currentRecordSha256: recordHash,
    contentUpdatedAt: "2026-10-23T12:30:00.000Z",
    expertReview,
    editorApproval,
  }), { ready: false, reason: "invalid_audit" });
});

test("readiness report computes dynamic counts and never marks release ready without human gates", () => {
  const report = buildAdminReadinessReport({
    archiveAvailable: true,
    archiveCount: 17,
    formsAvailable: true,
    formCount: 12,
    pendingForms: 8,
    staleForms: 2,
    invalidForms: 1,
    unverifiedSubmissions: 1,
    identityProviderConfigured: false,
    durableDatabaseConfigured: false,
    auditRepositoryConfigured: false,
    ciStatus: "unavailable",
  }, new Date(NOW));
  assert.equal(report.archive.count, 17);
  assert.equal(report.editorial.count, 12);
  assert.equal(report.releaseGate.status, "blocked");
  assert.equal(report.ready, false);
  assert.equal(report.ci, "unavailable");
  assert.equal(report.identity, "not_configured");
});

async function stagingInput(overrides = {}) {
  const contributor = await fixtureGrant("contributor");
  return {
    revisionId: "revision-0001",
    idempotencyKey: "request-0001",
    recordId: "archive-one",
    currentRecordVersion: "a".repeat(64),
    expectedRecordVersion: "a".repeat(64),
    proposedChanges: { summary: "Yeni kaynakla uyumlu açıklama." },
    reason: "Kaynak metniyle tutarlılık düzeltmesi.",
    createdAt: NOW,
    grant: contributor,
    ...overrides,
  };
}

test("staging proposals reject unsafe fields, stale revisions and missing durable storage", async () => {
  assert.deepEqual(await stageProposal(await stagingInput()), { status: "not_configured" });
  assert.equal((await stageProposal(await stagingInput({ expectedRecordVersion: "c".repeat(64) }))).status, "conflict");
  assert.equal((await stageProposal(await stagingInput({ proposedChanges: { verification: { status: "published" } } }))).status, "invalid");
  assert.equal((await stageProposal(await stagingInput({ proposedChanges: JSON.parse('{"__proto__":{"polluted":true}}') }))).status, "invalid");
  assert.equal((await stageProposal(await stagingInput({ grant: null }))).status, "invalid");
});

test("staging writes require the atomic revision-plus-audit transaction contract", async () => {
  const accepted = [];
  const store = {
    async commitRevisionAndAudit(input) {
      accepted.push(input);
      return "created";
    },
  };
  const result = await stageProposal(await stagingInput(), store);
  assert.deepEqual(result, { status: "staged", revisionId: "revision-0001" });
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].revision.status, "review_required");
  assert.equal(accepted[0].revision.createdBy, "contributor-subject");

  const conflict = await stageProposal(await stagingInput(), {
    async commitRevisionAndAudit() { return "conflict"; },
  });
  assert.deepEqual(conflict, { status: "conflict" });

  const duplicate = await stageProposal(await stagingInput(), {
    async commitRevisionAndAudit() { return "duplicate"; },
  });
  assert.deepEqual(duplicate, { status: "duplicate" });
});
