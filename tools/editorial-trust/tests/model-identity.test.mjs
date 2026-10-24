import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { snapshotHash } from "../../../web/lib/editorial-trust/canonical.ts";
import { createDecisionService, parseDecisionRequest } from "../../../web/lib/editorial-trust/decisions.ts";
import { canTransitionReview, classifyLegacyForm } from "../../../web/lib/editorial-trust/forms.ts";
import { authorizeDecision, createActorResolver } from "../../../web/lib/editorial-trust/identity.ts";
import { evaluateArchiveReviewReadiness, evaluateExhibitionReviewReadiness, evaluatePublicationReviewReadiness } from "../../../web/lib/editorial-trust/policy.ts";
import { ENV_CONFIGURED, ENV_UNCONFIGURED, POLICY, T0, memoryStores, resolverFor, switchableResolver, syntheticArchiveRecord, syntheticProvider } from "./helpers/fakes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const pendingForm = JSON.parse(readFileSync(path.join(repoRoot, "docs/editorial/forms/anitkabir.json"), "utf8"));
const realRecord = JSON.parse(readFileSync(path.join(repoRoot, "content/archive/records/anitkabir.json"), "utf8"));
const emptyIndex = { ids: new Set(["synthetic-record-0001"]), slugToId: new Map([["synthetic-slug", "synthetic-record-0001"]]) };

function service(stores, resolver, policy = POLICY) {
  return createDecisionService({ resolver, policy, subjects: stores.subjects, decisions: stores.decisions, audit: stores.audit, now: () => T0 });
}

function request(record, overrides = {}) {
  return { requestId: "req-1", idempotencyKey: "idem-1", subjectType: "archive_record", recordId: record.id, decisionKind: "historian_review", outcome: "approved", expectedSnapshotHash: snapshotHash("archive_record", record), evidenceReferences: ["SYN-1 katalog kaydı"], rationale: "Sentetik test gerekçesi.", ...overrides };
}

function archiveInput(record, decisions = [], form = null) {
  return { record, sourceFile: "synthetic.json", schemaErrors: [], form, formErrors: [], decisions };
}

// ---- A: saf model ve durum makinesi -------------------------------------------------

test("A01 boş form reddedilir", () => {
  assert.equal(classifyLegacyForm({}, realRecord).reviewState, "invalid");
  assert.equal(parseDecisionRequest({}).ok, false);
});

test("A02/A03 geçerli pending form kabul edilir ama onaylı sayılmaz", () => {
  const c = classifyLegacyForm(pendingForm, realRecord);
  assert.equal(c.reviewState, "pending");
  assert.equal(c.trustClass, "structural_valid");
  const r = evaluateArchiveReviewReadiness(archiveInput(realRecord, [], pendingForm), ENV_CONFIGURED);
  assert.equal(r.flags.human_historian_review_verified, false);
  assert.equal(r.result, "deny");
});

test("A04 yetersiz künye/tarih needs_review olarak kalır, otomatik pass yok", async () => {
  const { archiveEvidenceChecks } = await import("../../../web/lib/editorial-trust/policy.ts");
  const checks = archiveEvidenceChecks(syntheticArchiveRecord());
  assert.equal(checks.event_date, "needs_review");
  assert.equal(Object.values(checks).includes("pass"), false, "makine tarihî kontrolü pass yapamaz");
  const noRef = archiveEvidenceChecks(syntheticArchiveRecord({ source: { ...syntheticArchiveRecord().source, archiveIdentifier: null }, provenance: [] }));
  assert.equal(noRef.institutional_catalogue_reference, "fail");
});

test("A05/A07 geçersiz geçiş reddedilir; rejected doğrudan completed olamaz", () => {
  assert.equal(canTransitionReview("pending", "completed"), false);
  assert.equal(canTransitionReview("rejected", "completed"), false);
  assert.equal(canTransitionReview("rejected", "awaiting_editor"), false);
  assert.equal(canTransitionReview("rejected", "pending"), true);
  assert.equal(canTransitionReview("__proto__", "pending"), false);
});

test("A06/A15 aynı girdi aynı kararı üretir (deterministik)", () => {
  const a = evaluateArchiveReviewReadiness(archiveInput(realRecord, [], pendingForm), ENV_CONFIGURED);
  const b = evaluateArchiveReviewReadiness(archiveInput(structuredClone(realRecord), [], structuredClone(pendingForm)), ENV_CONFIGURED);
  assert.deepEqual(a, b);
  assert.equal(canTransitionReview("in_progress", "submitted"), canTransitionReview("in_progress", "submitted"));
});

test("A08 revizyon uyuşmazlığı stale üretir", () => {
  const changed = { ...realRecord, summary: `${realRecord.summary} (değişti)` };
  assert.equal(classifyLegacyForm(pendingForm, changed).reviewState, "stale");
  const r = evaluateArchiveReviewReadiness(archiveInput(changed, [], pendingForm), ENV_CONFIGURED);
  assert.ok(r.findings.some((f) => f.code === "stale_record_snapshot"));
  assert.equal(r.flags.current_revision_matched, false);
});

test("A10 submitted iddia güvenilir onay sayılmaz", () => {
  const claimed = { ...pendingForm, review_status: "submitted", outcome: "approved", reviewer: { name: "Sentetik Ad", role: "human_expert" }, review_date: "2026-10-20", publicationApproval: { status: "approved", authority: "human", role: "human_editor", approvedBy: "Sentetik Editör", approvedAt: "2026-10-21T10:00:00Z" }, checks: Object.fromEntries(Object.keys(pendingForm.checks).map((k) => [k, "pass"])) };
  const c = classifyLegacyForm(claimed, realRecord);
  assert.equal(c.trustClass, "submitted_claim_unverified");
  assert.equal(c.reviewState, "awaiting_identity_verification");
  const r = evaluateArchiveReviewReadiness(archiveInput(realRecord, [], claimed), ENV_CONFIGURED);
  assert.equal(r.flags.human_editor_approval_verified, false);
  assert.ok(r.findings.some((f) => f.code === "unverified_actor_claim" && f.hasHumanApproval === "claimed_unverified"));
});

test("A11 politika/kimlik yapılandırılmamışsa sonuç kapalıdır", () => {
  const record = syntheticArchiveRecord();
  const r = evaluateArchiveReviewReadiness(archiveInput(record), ENV_UNCONFIGURED);
  assert.notEqual(r.result, "allow");
  assert.equal(r.flags.release_ready, false);
  assert.equal(authorizeDecision({}, "historian_review", null, { subjectType: "archive_record", authorActorIds: [], otherDecisionActorIds: [] }).error, "policy_unconfigured");
});

test("A12/A13/A14 makale ve sergi onayı arşiv onayından bağımsızdır", async () => {
  const stores = memoryStores();
  const record = syntheticArchiveRecord();
  stores.subjects.put("archive_record", record.id, record);
  const actors = switchableResolver({ subject: "synthetic-historian", role: "historian" });
  const svc = service(stores, actors.resolver);
  assert.equal((await svc.recordDecision(request(record))).ok, true);
  actors.use({ subject: "synthetic-chief", role: "chief_editor" });
  assert.equal((await svc.recordDecision(request(record, { idempotencyKey: "idem-2", decisionKind: "publication_editor" }))).ok, true);
  const archiveDecisions = await stores.decisions.listForSubject("archive_record", record.id);
  const archive = evaluateArchiveReviewReadiness(archiveInput(record, archiveDecisions), ENV_CONFIGURED);
  assert.equal(archive.flags.human_historian_review_verified, true);
  assert.equal(archive.flags.human_editor_approval_verified, true);
  // Kapı açılabilir olmalı: yapılandırılmış ortam + iki doğrulanmış karar + teknik ve audit tamam.
  assert.equal(archive.result, "allow");
  assert.equal(archive.flags.release_ready, true);
  // Aynı kararlarla teknik test bayrağı veya audit bütünlüğü düşerse release_ready kapanır.
  assert.equal(evaluateArchiveReviewReadiness(archiveInput(record, archiveDecisions), { ...ENV_CONFIGURED, technicalTestsPassed: null }).flags.release_ready, false);
  assert.equal(evaluateArchiveReviewReadiness(archiveInput(record, archiveDecisions), { ...ENV_CONFIGURED, auditIntegrity: null }).flags.release_ready, false);
  assert.equal(evaluateArchiveReviewReadiness(archiveInput(record, archiveDecisions), ENV_UNCONFIGURED).result, "not_configured");
  // Aynı arşiv kaydını kullanan makale/sergi kendi kararları olmadan geçemez.
  const article = { id: "synthetic-article", slug: "synthetic-article", relatedArchiveIds: [record.id], bibliography: [{ institution: "Sentetik", url: "https://example.org/b" }], rights: { license: "CC BY 4.0", holder: "Sentetik" }, status: "approved" };
  const pub = evaluatePublicationReviewReadiness({ record: article, sourceFile: null, schemaErrors: [], decisions: [], archiveIndex: emptyIndex }, ENV_CONFIGURED);
  assert.equal(pub.result, "deny");
  assert.ok(pub.findings.some((f) => f.code === "missing_historian_review" && f.subjectType === "publication_record"));
  const ex = evaluateExhibitionReviewReadiness({ record: { id: "synthetic-ex", archiveRecordIds: [record.id], reviewStatus: "published" }, sourceFile: null, schemaErrors: [], decisions: archiveDecisions, archiveIndex: emptyIndex }, ENV_CONFIGURED);
  assert.equal(ex.flags.human_historian_review_verified, false, "arşiv kararı sergi revizyonuna ödünç verilemez");
  assert.equal(ex.result, "deny");
});

test("A16 beklenmeyen enum değerleri reddedilir", () => {
  const base = request(syntheticArchiveRecord());
  for (const [field, value] of [["decisionKind", "super_admin"], ["outcome", "approve_all"], ["subjectType", "everything"]]) {
    assert.equal(parseDecisionRequest({ ...base, [field]: value }).ok, false, field);
  }
  assert.equal(classifyLegacyForm({ ...pendingForm, review_status: "approved" }, realRecord).reviewState, "invalid");
});

// ---- B: kimlik ve rol güvenliği -----------------------------------------------------

test("B17 SessionProvider null ise karar oluşturulamaz", async () => {
  const stores = memoryStores();
  const record = syntheticArchiveRecord();
  stores.subjects.put("archive_record", record.id, record);
  const svc = service(stores, createActorResolver({ provider: null, environment: "production" }));
  const result = await svc.recordDecision(request(record));
  assert.deepEqual([result.ok, result.error, result.httpStatus], [false, "not_configured", 503]);
  assert.equal(stores.events.length, 0);
});

test("B18 production ortamında test sağlayıcısı reddedilir", async () => {
  const result = await resolverFor({ subject: "synthetic-historian", role: "historian" }, { environment: "production" }).resolve();
  assert.deepEqual(result, { ok: false, error: "test_provider_forbidden_in_production" });
});

test("B19/B20/B21 header, query ve localStorage rolü yetki vermez", async () => {
  const resolver = createActorResolver({ provider: null, environment: "development" });
  for (const ctx of [{ headers: { "x-role": "historian" } }, { url: "/yonetim?admin=1" }, { localStorage: { role: "system_admin" } }]) {
    assert.equal((await resolver.resolve(ctx)).ok, false);
  }
  // Doğrulanmış bir researcher, başlıkta historian dese bile researcher kalır.
  const researcher = await resolverFor({ subject: "synthetic-researcher", role: "researcher" }).resolve({ headers: { "x-role": "historian" } });
  assert.equal(researcher.actor.role, "researcher");
});

test("B22/B23 boş subject ve bilinmeyen rol reddedilir", async () => {
  assert.equal((await resolverFor({ subject: "  ", role: "historian" }).resolve()).error, "session_invalid");
  assert.equal((await resolverFor({ subject: "synthetic-x", role: "god_mode" }).resolve()).error, "unknown_role");
});

test("B24/B25/B26/B27 yalnız politikadaki rol karar verebilir", async () => {
  const record = syntheticArchiveRecord();
  const ctx = { subjectType: "archive_record", authorActorIds: [], otherDecisionActorIds: [] };
  for (const role of ["researcher", "readonly_auditor", "system_admin", "content_editor"]) {
    const { actor } = await resolverFor({ subject: `synthetic-${role}`, role }).resolve();
    assert.equal(authorizeDecision(actor, "historian_review", POLICY, ctx).error, "role_not_permitted", role);
  }
  const stores = memoryStores();
  stores.subjects.put("archive_record", record.id, record);
  const result = await service(stores, resolverFor({ subject: "synthetic-admin", role: "system_admin" })).recordDecision(request(record));
  assert.equal(result.error, "role_not_permitted");
});

test("B28 kaydı oluşturan aktör aynı kaydı onaylayamaz; aynı aktör iki karar veremez", async () => {
  const record = syntheticArchiveRecord();
  const stores = memoryStores();
  stores.subjects.put("archive_record", record.id, record, ["synthetic-historian"]);
  assert.equal((await service(stores, resolverFor({ subject: "synthetic-historian", role: "historian" })).recordDecision(request(record))).error, "conflict_of_interest_author");
  const policyBoth = { ...POLICY, decisionRoles: { historian_review: ["historian"], publication_editor: ["historian", "chief_editor"] } };
  const stores2 = memoryStores();
  stores2.subjects.put("archive_record", record.id, record);
  const svc = service(stores2, resolverFor({ subject: "synthetic-dual", role: "historian" }), policyBoth);
  assert.equal((await svc.recordDecision(request(record))).ok, true);
  assert.equal((await svc.recordDecision(request(record, { idempotencyKey: "idem-2", decisionKind: "publication_editor" }))).error, "separation_of_duties");
});

test("B29 gövdedeki sahte actor/role/proof alanı reddedilir; elle kurulmuş kanıt geçmez", async () => {
  const record = syntheticArchiveRecord();
  for (const field of ["actorId", "role", "approvedBy", "proof", "session"]) {
    assert.equal(parseDecisionRequest({ ...request(record), [field]: "synthetic-other" }).error, "untrusted_identity_field", field);
  }
  const forged = JSON.parse(JSON.stringify({ actorId: "synthetic-historian", role: "historian", provider: "synthetic-test-idp", sessionId: "s", authenticatedAt: "2026-10-24T09:00:00.000Z", expiresAt: "2026-10-24T18:00:00.000Z" }));
  assert.equal(authorizeDecision(forged, "historian_review", POLICY, { subjectType: "archive_record", authorActorIds: [], otherDecisionActorIds: [] }).error, "actor_not_server_resolved");
});

test("B30 süresi dolmuş oturum reddedilir", async () => {
  const result = await resolverFor({ subject: "synthetic-historian", role: "historian", expiresAt: "2026-10-24T09:30:00Z" }).resolve();
  assert.equal(result.error, "session_expired");
});

test("B31 displayName kimlik değildir; karar kaydına aktör kimliği girer", async () => {
  const record = syntheticArchiveRecord();
  const stores = memoryStores();
  stores.subjects.put("archive_record", record.id, record);
  const result = await service(stores, resolverFor({ subject: "synthetic-historian", role: "historian", displayName: "Prof. Sahte Unvan" })).recordDecision(request(record));
  assert.equal(result.receipt.actorId, "synthetic-historian");
  assert.equal(JSON.stringify(stores.events).includes("Prof. Sahte Unvan"), false);
});

test("B32 test yardımcıları web/ paketinde değildir ve web kodu onları içe aktarmaz", () => {
  const webLib = path.join(repoRoot, "web", "lib", "editorial-trust");
  for (const name of readdirSync(webLib)) {
    const source = readFileSync(path.join(webLib, name), "utf8");
    assert.equal(/from\s+["'][^"']*tests\/helpers|syntheticProvider|mockHumanApproval/.test(source), false, name);
  }
  assert.equal(syntheticProvider({}).testOnly, true);
});
