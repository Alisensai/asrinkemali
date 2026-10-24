/**
 * Görev 07 — gerçek arşiv yükleme, kapsam/kronoloji, dry-run ve rapor (QA-001…010, 058…078, 113, 116).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { convertCandidateToDraft } from "../lib/convert-dryrun.mjs";
import { analyzeGaps } from "../lib/gap-analysis.mjs";
import { diffIntegrity, integritySnapshot, loadArchiveContext } from "../lib/integration/archive-context.mjs";
import { buildResearchSnapshot, periodCoverage, stableStringify, workListToCsv } from "../lib/integration/research-report.mjs";
import { makeCandidate } from "./helpers.mjs";
import { REAL_ROOT, makeFixtureRepo, syntheticRecord } from "./fixture-repo.mjs";

const NOW = "2026-10-24T10:00:00Z";

test("QA-001 iki katalog kökü birleşik okunur, her kayıt bir kez sayılır (dinamik)", async () => {
  const context = await loadArchiveContext(REAL_ROOT);
  const onDisk = ["content/archive/records", "data/archive/catalog"].reduce((sum, dir) => sum + fs.readdirSync(path.join(REAL_ROOT, dir)).filter((name) => name.endsWith(".json")).length, 0);
  assert.equal(context.counts.files, onDisk);
  assert.equal(context.counts.uniqueIds, onDisk);
  assert.equal(Object.isFrozen(context.records), true);
});

test("QA-002 bozuk katalog dosyası konumuyla raporlanır, diğer kayıtlar kaybolmaz", async (t) => {
  const fx = makeFixtureRepo({ catalog: { "a.json": syntheticRecord("sentetik-a"), "bozuk.json": "{ bozuk" } });
  t.after(fx.cleanup);
  const context = await loadArchiveContext(fx.root);
  assert.equal(context.counts.files, 1);
  assert.ok(context.errors.some((error) => error.includes("bozuk.json")));
  assert.equal(context.limit.complete, false);
});

test("QA-003/QA-004 aynı id iki kökte kritik çakışma; farklı id aynı slug ayrıca raporlanır", async (t) => {
  const fx = makeFixtureRepo({
    catalog: { "a.json": syntheticRecord("sentetik-a"), "c.json": syntheticRecord("sentetik-c", { slug: "ortak-slug" }) },
    legacy: { "a.json": syntheticRecord("sentetik-a"), "d.json": syntheticRecord("sentetik-d", { slug: "ortak-slug" }) },
  });
  t.after(fx.cleanup);
  const context = await loadArchiveContext(fx.root);
  assert.equal(context.collisions.ids.length, 1);
  assert.equal(context.collisions.ids[0].severity, "critical");
  assert.equal(context.collisions.slugs.length, 1);
  assert.deepEqual([...context.collisions.slugs[0].ids].sort(), ["sentetik-c", "sentetik-d"]);
  assert.equal(context.records.length, 4, "sessiz üzerine yazma yok");
});

test("QA-005/QA-054 aday, iddia ve arşiv kimlikleri ayrı ad alanlarındadır", async () => {
  const { buildEvidenceGraph } = await import("../lib/integration/evidence-assessment.mjs");
  const same = "src-2026-0001";
  const graph = buildEvidenceGraph([{ id: same, text: "x", evidence: [{ candidateId: same, relation: "supports" }] }], [makeCandidate({ id: same, relatedArchiveIds: [same] })], [{ id: same }]);
  const ids = graph.nodes.map((node) => node.id);
  assert.ok(ids.includes(`claim:${same}`) && ids.includes(`candidate:${same}`) && ids.includes(`archive:${same}`));
});

test("QA-006 boş katalog sıfırları açıkça raporlar; önceki snapshot sayıları basılmaz", async (t) => {
  const fx = makeFixtureRepo({});
  t.after(fx.cleanup);
  const context = await loadArchiveContext(fx.root);
  assert.equal(context.counts.files, 0);
  assert.equal(context.limit.complete, false);
  assert.ok(context.errors.length > 0);
});

test("QA-007 500 kayıt sınırı aşılınca kısmi veri tam sayılmaz", async (t) => {
  const catalog = {};
  for (let i = 0; i < 502; i += 1) catalog[`r${String(i).padStart(4, "0")}.json`] = syntheticRecord(`sentetik-${i}`);
  const fx = makeFixtureRepo({ catalog });
  t.after(fx.cleanup);
  const context = await loadArchiveContext(fx.root);
  assert.equal(context.limit.maxRecords, 500);
  assert.equal(context.limit.limitExceeded, true);
  assert.equal(context.limit.complete, false);
  const report = await buildResearchSnapshot(fx.root, { generatedAt: NOW });
  assert.ok(report.blockers.some((blocker) => blocker.code === "ARCHIVE_INCOMPLETE"));
});

test("QA-008/QA-078 gerçek veri okuması ve rapor sonrası bütünlük özetleri değişmez", async () => {
  const before = integritySnapshot(REAL_ROOT);
  const report = await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW });
  assert.equal(report.readOnlyIntegrity.verified, true);
  assert.deepEqual(diffIntegrity(before, integritySnapshot(REAL_ROOT)), []);
});

test("QA-009 teknik published etiketi insan onayına çevrilmez", async () => {
  const context = await loadArchiveContext(REAL_ROOT);
  assert.equal(context.counts.humanApproved, 0);
  const report = await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW });
  assert.equal(report.metrics.archiveHumanApproved, 0);
  assert.equal(report.importEligibleCount, 0);
  if (context.counts.technicalStatus.published > 0) assert.ok(report.warnings.some((warning) => warning.code === "TECHNICAL_PUBLISHED_IS_NOT_HUMAN_APPROVAL"));
});

test("QA-010 aynı kaynak URI'sine işaret eden iki kayıt otomatik birleşmez", async (t) => {
  const fx = makeFixtureRepo({ catalog: { "a.json": syntheticRecord("sentetik-a"), "b.json": syntheticRecord("sentetik-b", { source: { ...syntheticRecord("sentetik-a").source } }) } });
  t.after(fx.cleanup);
  const context = await loadArchiveContext(fx.root);
  assert.equal(context.counts.uniqueIds, 2);
});

test("QA-058 iddialar dosyadan dinamik yüklenir; sayılar sabit değildir", async () => {
  const claims = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, "data/research/candidates/claims.json"), "utf8")).claims;
  const report = await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW });
  assert.equal(report.metrics.historicalClaims, claims.length);
  assert.equal(report.metrics.humanVerifiedClaims, 0);
});

test("QA-059/QA-060/QA-061 sınırlar kapsayıcı; 1919 sayılmaz; aralık bir kayıt ama çok kayıt-yıl", () => {
  const rec = (id, start, end = null) => ({ id, type: "event", date: { start, end } });
  const coverage = periodCoverage([rec("a", "1881-01-01"), rec("b", "1918-12-31"), rec("c", "1919-01-01"), rec("d", "1910-05-01", "1912-02-01")], [], { from: 1881, to: 1918 });
  assert.equal(coverage.distinctRecords, 3);
  assert.equal(coverage.recordYearIncidences, 5);
  assert.equal(coverage.inclusive, true);
});

test("QA-062/QA-063 mekân kuruluş tarihi ve yayın tarihi olay tarihi olarak yorumlanmaz", async () => {
  const report = await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW });
  assert.match(report.periodCoverage.placeRecordsNote, /kuruluş\/inşa/);
  assert.ok(Object.hasOwn(report.periodCoverage, "byRecordType"));
  const candidate = makeCandidate({ eventYear: null, publishedAt: "2020-01-01", periodStart: null, periodEnd: null });
  const coverage = periodCoverage([], [candidate], { from: 2019, to: 2021 });
  assert.equal(coverage.candidateSourcesOverlapping, 0, "yayın yılı olay yılı yerine geçmez");
});

test("QA-064/QA-065 ay hassasiyeti güne zorlanmaz; bilinmeyen tarih 1881/1900 atanmaz", () => {
  const report = analyzeGaps([{ id: "u", date: { start: null, end: null, precision: "unknown" }, verification: { status: "draft" } }], { targetStart: 1881, targetEnd: 1918 });
  assert.equal(report.targetPeriod.distinctRecords, 0);
  assert.deepEqual(report.recordsByYear, {});
  const draft = convertCandidateToDraft(makeCandidate({ eventYear: null, state: "import_ready", verification: { ...makeCandidate().verification, humanReviewed: true } }), [], { now: NOW });
  assert.equal(draft.record?.date.precision ?? "unknown", "unknown");
  assert.equal(draft.record?.date.start ?? null, null);
});

test("QA-066/QA-068 kayıt yokluğu olay yokluğu değildir; tema eşleşmesi sezgisel etiketlidir", async () => {
  const report = await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW });
  assert.match(report.periodCoverage.absenceNote, /olayın yaşanmadığı anlamına gelmez/);
  assert.equal(report.gapAnalysis.method, "heuristic_keyword");
});

test("QA-067 Türkçe ı/İ, ş/Ş katlaması eşleşir", async () => {
  const { foldTr } = await import("../lib/dedupe.mjs");
  assert.equal(foldTr("İSTANBUL Şişli"), foldTr("istanbul şişli"));
  assert.equal(foldTr("Işık"), "isik");
});

test("QA-069/QA-070/QA-071/QA-072 taslak published değil; inceleme, künye ve hak eksikliği engeller", () => {
  const result = convertCandidateToDraft(makeCandidate({ authors: [], publishedAt: null, rights: { ...makeCandidate().rights, status: "unknown" } }), [], { now: NOW });
  const codes = result.blockers.map((blocker) => blocker.code);
  assert.equal(result.outcome, "blocked");
  assert.ok(codes.includes("HUMAN_REVIEW_REQUIRED") && codes.includes("CITATION_INCOMPLETE") && codes.includes("RIGHTS_UNKNOWN"));
  const ok = convertCandidateToDraft(makeCandidate({ state: "import_ready", verification: { ...makeCandidate().verification, humanReviewed: true } }), [], { now: NOW });
  assert.equal(ok.record.verification.status, "draft");
  assert.equal(ok.record.verification.reviewedBy, null);
  assert.equal(ok.record.image, null);
  assert.equal(ok.record.rights.imageReuse, "not_downloaded");
});

test("QA-073/QA-074 sentetik aday ve mevcut arşiv URL'si dönüşümü engeller", () => {
  const synthetic = convertCandidateToDraft(makeCandidate({ synthetic: true }), [], { now: NOW });
  assert.ok(synthetic.blockers.some((blocker) => blocker.code === "SYNTHETIC_FORBIDDEN"));
  const dup = convertCandidateToDraft(makeCandidate(), [{ id: "var-olan", source: { url: makeCandidate().url } }], { now: NOW });
  assert.ok(dup.blockers.some((blocker) => blocker.code === "DUPLICATE_IN_ARCHIVE"));
});

test("QA-075 gerçek validateArchive uyumsuz taslağı reddeder", async () => {
  const { convertAndValidate } = await import("../lib/convert-dryrun.mjs");
  const context = await loadArchiveContext(REAL_ROOT);
  const candidate = makeCandidate({ state: "import_ready", verification: { ...makeCandidate().verification, humanReviewed: true } });
  const full = { taxonomy: context.taxonomy, recordSchema: context.recordSchema, taxonomySchema: context.taxonomySchema, root: REAL_ROOT };
  const result = await convertAndValidate(candidate, [], full, { now: NOW });
  assert.equal(result.outcome, "ok", "geçerli taslak gerçek doğrulayıcıdan geçer");
  // Aynı taslak, kategorisini tanımayan bir taksonomiyle gerçek doğrulayıcıdan geçemez.
  const draftCategories = new Set(result.record.categories);
  const narrowed = { ...context.taxonomy, categories: context.taxonomy.categories.filter((category) => !draftCategories.has(category.id)) };
  const rejected = await convertAndValidate(candidate, [], { ...full, taxonomy: narrowed }, { now: NOW });
  assert.equal(rejected.outcome, "invalid");
  assert.equal(rejected.record, null);
  assert.ok(rejected.validationErrors.some((error) => error.code === "TAKSONOMI_KATEGORI"));
});

test("QA-076/QA-113 aynı girdi ve saat için dry-run ve rapor bayt düzeyinde aynıdır", async () => {
  const candidate = makeCandidate({ state: "import_ready", verification: { ...makeCandidate().verification, humanReviewed: true } });
  assert.equal(JSON.stringify(convertCandidateToDraft(candidate, [], { now: NOW })), JSON.stringify(convertCandidateToDraft(candidate, [], { now: NOW })));
  const one = stableStringify(await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW }));
  const two = stableStringify(await buildResearchSnapshot(REAL_ROOT, { generatedAt: NOW }));
  assert.equal(one, two);
});

test("QA-116 sıfır adaylı havuz: rapor 0 sayılarla döner, sahte veri yok", async (t) => {
  const fx = makeFixtureRepo({ catalog: { "a.json": syntheticRecord("sentetik-a") }, pool: [], claims: [] });
  t.after(fx.cleanup);
  const report = await buildResearchSnapshot(fx.root, { generatedAt: NOW });
  assert.equal(report.metrics.sourceCandidates, 0);
  assert.equal(report.workList.length, 0);
  assert.equal(workListToCsv(report).trim().split("\n").length, 1);
});
