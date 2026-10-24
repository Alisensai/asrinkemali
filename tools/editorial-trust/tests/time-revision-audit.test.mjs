import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildAuditEvent, verifyAuditChain } from "../../../web/lib/editorial-trust/audit.ts";
import { legacyRecordHash, snapshotHash } from "../../../web/lib/editorial-trust/canonical.ts";
import { createDecisionService, effectiveDecision } from "../../../web/lib/editorial-trust/decisions.ts";
import { classifyLegacyForm } from "../../../web/lib/editorial-trust/forms.ts";
import { evaluateArchiveReviewReadiness } from "../../../web/lib/editorial-trust/policy.ts";
import { chronologyErrors, parseStrictDate, parseStrictTimestamp } from "../../../web/lib/editorial-trust/time.ts";
import { ENV_CONFIGURED, POLICY, T0, memoryStores, resolverFor, switchableResolver, syntheticArchiveRecord } from "./helpers/fakes.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function setup(record = syntheticArchiveRecord(), options = {}) {
  const stores = memoryStores(options);
  stores.subjects.put("archive_record", record.id, record);
  const actors = switchableResolver({ subject: "synthetic-historian", role: "historian" });
  const svc = createDecisionService({ resolver: actors.resolver, policy: options.policy ?? POLICY, subjects: stores.subjects, decisions: stores.decisions, audit: stores.audit, now: () => T0 });
  return { stores, actors, svc, record };
}

function req(record, overrides = {}) {
  return { requestId: "req", idempotencyKey: "idem-1", subjectType: "archive_record", recordId: record.id, decisionKind: "historian_review", outcome: "approved", expectedSnapshotHash: snapshotHash("archive_record", record), evidenceReferences: ["SYN-1"], rationale: "Sentetik.", ...overrides };
}

async function approveBoth(ctx) {
  assert.equal((await ctx.svc.recordDecision(req(ctx.record))).ok, true);
  ctx.actors.use({ subject: "synthetic-chief", role: "chief_editor" });
  const editor = await ctx.svc.recordDecision(req(ctx.record, { idempotencyKey: "idem-2", decisionKind: "publication_editor" }));
  assert.equal(editor.ok, true);
  return editor.receipt;
}

test("C33/C34/C35/C38 gelecek, saat dilimsiz ve imkânsız tarihler reddedilir", () => {
  assert.equal(parseStrictTimestamp("2026-10-25T10:00:00Z", T0).error, "future_timestamp");
  assert.equal(parseStrictTimestamp("2026-10-20T10:00:00", T0).error, "timezone_required");
  assert.equal(parseStrictTimestamp("2026-10-20T10:00:00+15:00", T0).error, "invalid_offset");
  assert.equal(parseStrictTimestamp("2023-02-29T10:00:00Z", T0).error, "impossible_date");
  assert.equal(parseStrictTimestamp("2024-02-29T10:00:00Z", T0).ok, true);
  assert.equal(parseStrictDate("2024-02-30").error, "impossible_date");
  assert.equal(parseStrictDate("2000-02-29").ok, true);
  assert.equal(parseStrictDate("1900-02-29").error, "impossible_date");
  assert.equal(parseStrictTimestamp("2024-04-31T00:00:00Z").error, "impossible_date");
  assert.equal(parseStrictTimestamp("2024-01-01T24:00:00Z").error, "impossible_date");
  // Ofset geçişi: aynı an iki farklı ofsetle tam UTC eşitliği verir.
  assert.equal(parseStrictTimestamp("2026-03-29T03:30:00+03:00").epochMs, parseStrictTimestamp("2026-03-29T00:30:00Z").epochMs);
});

test("C36/C37 editör kararı incelemeden, yayın onaydan önce olamaz", () => {
  assert.deepEqual(chronologyErrors([{ label: "review", at: "2026-10-20T10:00:00Z" }, { label: "editor", at: "2026-10-19T10:00:00Z" }], T0), ["editor:before:review"]);
  assert.deepEqual(chronologyErrors([{ label: "editor", at: "2026-10-20T10:00:00+03:00" }, { label: "publish", at: "2026-10-20T06:59:59Z" }], T0), ["publish:before:editor"]);
  assert.deepEqual(chronologyErrors([{ label: "review", at: "2026-10-20T10:00:00Z" }, { label: "editor", at: "2026-10-20T10:00:00Z" }], T0), []);
});

test("C39/C40 snapshot farkı stale; Unicode NFC/NFD aynı v2 hash'i verir", () => {
  const nfc = syntheticArchiveRecord({ title: "Atatürk Çiftliği" });
  const nfd = syntheticArchiveRecord({ title: "Atatürk Çiftliği".normalize("NFD") });
  assert.notEqual(legacyRecordHash(nfc), legacyRecordHash(nfd), "v1 bayt hash'i normalize etmez (PR #15 uyumu)");
  assert.equal(snapshotHash("archive_record", nfc), snapshotHash("archive_record", nfd));
  assert.notEqual(snapshotHash("archive_record", nfc), snapshotHash("archive_record", { ...nfc, title: "Başka" }));
  // İnceleme sürecinin değiştirdiği alanlar v2'yi bayatlatmaz.
  assert.equal(snapshotHash("archive_record", nfc), snapshotHash("archive_record", { ...nfc, verification: { status: "published" }, updatedAt: "2026-10-24T00:00:00Z" }));
});

test("C41 hash doğru ama güvenilir aktör yoksa karar yazılmaz", async () => {
  const { stores, record } = setup();
  const svc = createDecisionService({ resolver: resolverFor(null), policy: POLICY, subjects: stores.subjects, decisions: stores.decisions, audit: stores.audit, now: () => T0 });
  assert.equal((await svc.recordDecision(req(record))).error, "identity_unavailable");
  assert.equal(stores.events.length, 0);
});

test("C42 revizyon belirteci olmadan yazım reddedilir", async () => {
  const { svc, record } = setup();
  const result = await svc.recordDecision({ ...req(record), expectedSnapshotHash: "" });
  assert.deepEqual([result.error, result.httpStatus], ["revision_token_required", 409]);
});

test("C43 eşzamanlı iki farklı karar revision_conflict üretir; tek karar kalır", async () => {
  const { svc, stores, record } = setup();
  const [a, b] = await Promise.all([svc.recordDecision(req(record, { idempotencyKey: "a" })), svc.recordDecision(req(record, { idempotencyKey: "b", outcome: "rejected" }))]);
  assert.equal([a, b].filter((r) => r.ok).length, 1);
  assert.equal([a, b].find((r) => !r.ok).error, "revision_conflict");
  assert.equal((await stores.decisions.listForSubject("archive_record", record.id)).length, 1);
  assert.equal(verifyAuditChain(stores.events, { now: T0 }).valid, true);
});

test("C44/C47 bozuk audit olayı işlenmez ve readiness düşer", async () => {
  const ctx = setup();
  await approveBoth(ctx);
  const good = verifyAuditChain(ctx.stores.events, { now: T0 });
  assert.equal(good.valid, true);
  const tampered = ctx.stores.events.map((e, i) => (i === 0 ? { ...e, actorId: "synthetic-other" } : e));
  const bad = verifyAuditChain(tampered, { now: T0 });
  assert.equal(bad.valid, false);
  assert.ok(bad.findings.some((f) => f.code === "event_hash_mismatch"));
  assert.equal(verifyAuditChain([null, "x", 7], { now: T0 }).validEventCount, 0);
  const decisions = await ctx.stores.decisions.listForSubject("archive_record", ctx.record.id);
  const ready = evaluateArchiveReviewReadiness({ record: ctx.record, sourceFile: null, schemaErrors: [], form: null, formErrors: [], decisions }, { ...ENV_CONFIGURED, auditIntegrity: { valid: bad.valid, eventCount: bad.eventCount } });
  assert.equal(ready.flags.audit_integrity_verified, false);
  assert.equal(ready.flags.release_ready, false);
});

test("C45/A09/D61 geri çekilen onay yayın hakkını düşürür ve eski onayla yeniden yayın olmaz", async () => {
  const ctx = setup();
  const editor = await approveBoth(ctx);
  const before = await ctx.stores.decisions.listForSubject("archive_record", ctx.record.id);
  assert.equal(effectiveDecision(before, "publication_editor", snapshotHash("archive_record", ctx.record), T0, POLICY).state, "valid");
  const revoked = await ctx.svc.revokeDecision({ requestId: "r", idempotencyKey: "rev-1", subjectType: "archive_record", recordId: ctx.record.id, decisionId: editor.decisionId, reason: "revoked" });
  assert.equal(revoked.ok, true);
  const after = await ctx.stores.decisions.listForSubject("archive_record", ctx.record.id);
  const ready = evaluateArchiveReviewReadiness({ record: ctx.record, sourceFile: null, schemaErrors: [], form: null, formErrors: [], decisions: after }, ENV_CONFIGURED);
  assert.equal(ready.flags.human_editor_approval_verified, false);
  assert.ok(ready.findings.some((f) => f.code === "decision_revoked"));
  assert.equal(ctx.stores.events.at(-1).type, "approval_revoked");
  const eventCount = ctx.stores.events.length;
  const replay = await ctx.svc.revokeDecision({ requestId: "r", idempotencyKey: "rev-1", subjectType: "archive_record", recordId: ctx.record.id, decisionId: editor.decisionId, reason: "revoked" });
  assert.equal(replay.replayed, true);
  assert.equal(ctx.stores.events.length, eventCount, "tekrar eden geri çekme ikinci olay yazmaz");
});

test("C46 aynı idempotency anahtarı ikinci olay yazmaz; farklı içerikle çakışma verir", async () => {
  const { svc, stores, record } = setup();
  const first = await svc.recordDecision(req(record));
  const replay = await svc.recordDecision(req(record));
  assert.equal(replay.replayed, true);
  assert.equal(replay.receipt.decisionId, first.receipt.decisionId);
  assert.equal(stores.events.length, 1);
  assert.equal((await svc.recordDecision(req(record, { outcome: "rejected" }))).error, "idempotency_key_conflict");
});

test("C-partial yarım kalan yazım açıkça raporlanır (transaksiyon gereksinimi)", async () => {
  const { svc, stores, record } = setup(syntheticArchiveRecord(), { failDecisionWrite: true });
  const result = await svc.recordDecision(req(record));
  assert.equal(result.error, "partial_write_requires_reconciliation");
  assert.equal(stores.events.length, 1, "audit yazıldı, karar yazılamadı: uzlaştırma gerekir");
  assert.equal((await svc.recordDecision(req(record))).error, "partial_write_requires_reconciliation");
});

test("C48 geçerli v1 eski form sınıflandırmada kaybolmaz ve değiştirilmez", () => {
  const form = JSON.parse(readFileSync(path.join(repoRoot, "docs/editorial/forms/anitkabir.json"), "utf8"));
  const record = JSON.parse(readFileSync(path.join(repoRoot, "content/archive/records/anitkabir.json"), "utf8"));
  const snapshot = JSON.stringify(form);
  assert.equal(classifyLegacyForm(form, record).reviewState, "pending");
  assert.equal(JSON.stringify(form), snapshot);
});

test("C-audit sıra, prevHash, zaman, rol, revizyon ve boyut doğrulaması", () => {
  const base = { idempotencyKey: "k1", type: "review_requested", timestamp: "2026-10-24T09:00:00Z", requestId: "r", actorId: null, actorRole: null, actorVerified: false, subjectType: "archive_record", recordId: "synthetic-record-0001", snapshotHash: null, decisionRef: null, payload: {} };
  const e1 = buildAuditEvent(null, base);
  const e2 = buildAuditEvent(e1, { ...base, idempotencyKey: "k2", type: "review_assigned", timestamp: "2026-10-24T09:01:00Z" });
  assert.equal(verifyAuditChain([e1, e2], { now: T0 }).valid, true);
  assert.ok(verifyAuditChain([e2, e1], { now: T0 }).findings.some((f) => f.code === "invalid_sequence"));
  assert.ok(verifyAuditChain([e2], { now: T0 }).findings.some((f) => f.code === "broken_prev_hash"), "ilk olay eksik");
  const unverifiedDecision = buildAuditEvent(e2, { ...base, idempotencyKey: "k3", type: "editor_decision_recorded", timestamp: "2026-10-24T09:02:00Z" });
  const codes = verifyAuditChain([e1, e2, unverifiedDecision], { now: T0 }).findings.map((f) => f.code);
  assert.ok(codes.includes("decision_without_verified_actor") && codes.includes("decision_without_revision_link"));
  assert.throws(() => buildAuditEvent(null, { ...base, payload: { note: "x".repeat(9000) } }), /audit_payload_too_large/);
  // Tamamen yeniden yazılmış zincir kendi içinde tutarlıdır; yalnız harici çapa yakalar.
  const rewritten = [buildAuditEvent(null, { ...base, recordId: "rewritten" })];
  assert.equal(verifyAuditChain(rewritten, { now: T0 }).valid, true);
  assert.equal(verifyAuditChain(rewritten, { now: T0, anchor: { sequence: 1, hash: e1.hash } }).valid, false);
});

test("D63 süresi geçmiş inceleme (politika süresi tanımlıysa) onay sayılmaz", async () => {
  const ctx = setup(syntheticArchiveRecord(), { policy: { ...POLICY, approvalValidityMs: 60_000 } });
  await ctx.svc.recordDecision(req(ctx.record));
  const decisions = await ctx.stores.decisions.listForSubject("archive_record", ctx.record.id);
  const hash = snapshotHash("archive_record", ctx.record);
  assert.equal(effectiveDecision(decisions, "historian_review", hash, T0 + 30_000, { ...POLICY, approvalValidityMs: 60_000 }).state, "valid");
  assert.equal(effectiveDecision(decisions, "historian_review", hash, T0 + 120_000, { ...POLICY, approvalValidityMs: 60_000 }).state, "expired");
  assert.equal(effectiveDecision(decisions, "historian_review", hash, T0 + 1e12, POLICY).state, "valid", "politika süre tanımlamıyorsa süre uydurulmaz");
});

test("D64 editör kararı başka revizyonun onayını ödünç alamaz", async () => {
  const ctx = setup();
  await approveBoth(ctx);
  const changed = { ...ctx.record, summary: "Değişmiş özet" };
  ctx.stores.subjects.put("archive_record", changed.id, changed);
  const decisions = await ctx.stores.decisions.listForSubject("archive_record", changed.id);
  const ready = evaluateArchiveReviewReadiness({ record: changed, sourceFile: null, schemaErrors: [], form: null, formErrors: [], decisions }, ENV_CONFIGURED);
  assert.equal(ready.flags.human_editor_approval_verified, false);
  assert.equal(ready.flags.current_revision_matched, false);
  ctx.actors.use({ subject: "synthetic-chief-2", role: "chief_editor" });
  assert.equal((await ctx.svc.recordDecision(req(ctx.record, { idempotencyKey: "idem-3", decisionKind: "publication_editor" }))).error, "stale_snapshot");
  assert.equal((await ctx.svc.recordDecision(req(changed, { idempotencyKey: "idem-4", decisionKind: "publication_editor" }))).error, "historian_review_required");
});
