import assert from "node:assert/strict";
import test from "node:test";
import {
  auditPublicationLedger,
  computePublicationRevision,
  createFailClosedPublishingReviewAdapter,
  formatPublishingReport,
  getPublishingIntegrationHealth,
  planPublicationDryRun,
  runPublicationPreflight,
  validatePublicationReferences,
} from "../lib/publishing-integrations/index.ts";

const now = "2026-10-24T10:00:00.000Z";
function archive(overrides = {}) { return { id: "arsiv-001", slug: "arsiv-olay-001", title: "Kaynaklı olay", type: "event", summary: "Kaynaklı özet.", date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" }, people: [], locations: [], categories: ["Cumhuriyet"], source: { institution: "Kurum", institutionType: "official", institutionUrl: "https://example.org", title: "Kaynak", url: "https://example.org/kaynak", accessedAt: "2026-10-24" }, provenance: [], rights: { status: "official_link_only", imageReuse: "link_only", note: "Kurum koşulları." }, image: null, verification: { status: "published", reviewedBy: null, reviewedAt: null, checks: { sourceReachable: true, dateVerified: true, rightsVerified: true, quoteVerified: true, duplicateChecked: true }, notes: "Teknik yayın durumu." }, tags: [], createdAt: now, updatedAt: now, ...overrides }; }
function publication(overrides = {}) { return { schemaVersion: "1.0.0", id: "yayin-001", slug: "yayin-001", kind: "sourced_article", title: "İnceleme taslağı", summary: "Kaynaklı çalışma.", body: [{ type: "paragraph", text: "Metin." }], category: "Cumhuriyet", tags: ["Tarih"], authors: ["Katkıcı"], bibliography: [{ id: "arsiv-001", title: "Kaynak", institution: "Kurum", url: "https://example.org/kaynak", accessedAt: "2026-10-24" }], relatedArchiveIds: ["arsiv-001"], rights: { license: "Kurum koşulları", holder: "Kurum", note: "Dış bağlantı." }, status: "scheduled", approval: { kind: "human", approvedBy: "Sahte iddia değildir", approvedAt: "2026-10-23T09:00:00.000Z" }, scheduledAt: "2026-10-24T09:00:00.000Z", publishedAt: null, automation: null, createdAt: "2026-10-22T09:00:00.000Z", updatedAt: "2026-10-22T09:00:00.000Z", ...overrides }; }

test("preflight doğrulanmamış approval metadatasıyla fail-closed kalır", () => {
  const result = runPublicationPreflight(publication(), { archiveRecords: [archive()], now });
  assert.equal(result.eligibility, "blocked");
  assert.ok(result.blockers.some((item) => item.code === "AUTH_PROVIDER_UNAVAILABLE"));
  assert.ok(result.blockers.some((item) => item.code === "AUDIT_STORE_UNAVAILABLE"));
  assert.ok(result.warnings.some((item) => item.code === "HUMAN_APPROVAL_UNVERIFIED"));
});

test("arşiv ilişkileri id ile çözülür, eksik ve tekrar eden kimlikler bloklanır", () => {
  const result = validatePublicationReferences(publication({ relatedArchiveIds: ["arsiv-001", "arsiv-001", "yok"] }), [archive()]);
  assert.ok(result.findings.some((item) => item.code === "ARCHIVE_REFERENCE_DUPLICATE"));
  assert.ok(result.findings.some((item) => item.code === "ARCHIVE_REFERENCE_MISSING"));
});

test("takvimsel olmayan erişim tarihi ve bozuk otomasyon nesnesi tipli validation hatası üretir", async () => {
  const { validatePublication } = await import("../lib/publishing/model.ts");
  assert.equal(validatePublication(publication({ bibliography: [{ ...publication().bibliography[0], accessedAt: "2026-02-30" }] })).ok, false);
  assert.equal(validatePublication(publication({ automation: { mode: "deterministic" } })).ok, false);
});

test("revizyon özeti kanonik ve kaynak değişimine duyarlıdır", () => {
  const original = publication();
  assert.equal(computePublicationRevision(original), computePublicationRevision({ ...original, tags: [...original.tags] }));
  assert.notEqual(computePublicationRevision(original), computePublicationRevision({ ...original, bibliography: [{ ...original.bibliography[0], url: "https://example.org/yeni" }] }));
});

test("ledger denetimi yinelenen anahtarları ve bilinmeyen kayıtları sınıflandırır", () => {
  const record = publication();
  const audit = auditPublicationLedger([{ idempotencyKey: "k", publicationId: record.id, publishedAt: now }, { idempotencyKey: "k", publicationId: "bilinmeyen", publishedAt: now }], [record]);
  assert.equal(audit.ok, false);
  assert.ok(audit.findings.some((item) => item.code === "LEDGER_DUPLICATE_KEY"));
  assert.ok(audit.findings.some((item) => item.code === "LEDGER_UNKNOWN_PUBLICATION"));
});

test("dry-run mutasyon yapmaz ve fail-closed preflight adayını ready listesinden çıkarır", () => {
  const result = planPublicationDryRun({ records: [publication()], ledger: [], archiveRecords: [archive()], now });
  assert.equal(result.ready.length, 0);
  assert.equal(result.blocked.length, 1);
  assert.equal(result.dryRun, true);
});

test("salt-okunur review adapter geçişleri reddeder ve görev oluşturur", () => {
  const adapter = createFailClosedPublishingReviewAdapter();
  assert.equal(adapter.mode, "read_only_fail_closed");
  assert.equal(adapter.verifyPublicationApproval(publication()).verified, false);
  assert.equal(adapter.requestTransition(publication(), "published").allowed, false);
  assert.equal(adapter.getTasks(publication()).length, 1);
});

test("health ve rapor gerçek hazır olma iddiası üretmez", () => {
  const health = getPublishingIntegrationHealth({ repositoryAvailable: true, archiveAvailable: true, schedulerAvailable: true, authAvailable: false, auditAvailable: false });
  assert.equal(health.overall, "blocked");
  assert.match(formatPublishingReport({ generatedAt: now, ready: [], blocked: [{}], skipped: [], ledgerAudit: { ok: true, findings: [] } }, "markdown"), /Hazır aday: 0/);
});
