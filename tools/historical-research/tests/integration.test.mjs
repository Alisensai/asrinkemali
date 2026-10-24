import test from "node:test";
import assert from "node:assert/strict";
import { loadArchive, REPO_ROOT } from "../lib/archive-reader.mjs";
import { analyzeGaps } from "../lib/gap-analysis.mjs";
import { loadPool } from "../lib/candidates.mjs";
import { findDuplicates } from "../lib/dedupe.mjs";
import path from "node:path";

/**
 * Gerçek depo entegrasyon testleri. Bu testler depodaki 168 kayıtlık gerçek
 * arşivi ve aday havuzunu okur; hiçbir dosyaya yazmaz.
 */

test("gerçek arşiv yüklenir: kayıtlar hatasız okunur", async () => {
  const archive = await loadArchive(REPO_ROOT);
  assert.equal(archive.errors.length, 0, `Yükleme hatası olmamalı: ${archive.errors.join("; ")}`);
  assert.ok(archive.records.length >= 150, "en az 150 kayıt beklenir (PR #14 sonrası 168)");
});

test("gerçek arşivde 1881–1918 hedef dönemi boşluk raporlanır", async () => {
  const archive = await loadArchive(REPO_ROOT);
  const report = analyzeGaps(archive.records, { targetStart: 1881, targetEnd: 1918 });
  // Yalnızca TUTARLILIK denetimi: arşiv büyüdüğünde de geçerli kalır.
  // (Boşluk dolduğunda missingRanges boşalabilir; bu bir hata değildir.)
  assert.ok(report.targetPeriod.distinctRecords >= 0);
  assert.ok(report.targetPeriod.recordYearIncidences >= report.targetPeriod.distinctRecords, "kayıt-yıl örnekleme ayrı kayıttan az olamaz");
  assert.ok(report.targetPeriod.share <= 1, "ayrı kayıt payı %100'ü aşamaz");
  assert.equal(report.counts.total, archive.records.length);
  assert.ok(report.missingRanges.every((range) => range.start <= range.end), "boş aralıklar geçerli");
});

test("aday havuzu yüklenir: sentetik aday içermez ve gerçek kurumlar taşır", async () => {
  const pool = await loadPool(path.join(REPO_ROOT, "data", "research", "candidates", "pool.json"));
  assert.ok(pool.candidates.length >= 30, "en az 30 gerçek aday bulunmalı");
  assert.equal(pool.candidates.every((candidate) => candidate.synthetic === false), true);
  const institutions = new Set(pool.candidates.map((candidate) => candidate.institution));
  assert.ok(institutions.size >= 3, "en az 3 farklı kurumdan aday bulunmalı");
});

test("aday havuzundaki hiçbir URL mevcut arşivle çakışmaz", async () => {
  const archive = await loadArchive(REPO_ROOT);
  const pool = await loadPool(path.join(REPO_ROOT, "data", "research", "candidates", "pool.json"));
  const result = findDuplicates(pool.candidates, archive.records);
  assert.deepEqual(result.archiveMatches, [],
    `Arşivle çakışan aday olmamalı: ${JSON.stringify(result.archiveMatches)}`);
});

test("aday havuzunda tekrar eden URL/kimlik yoktur", async () => {
  const pool = await loadPool(path.join(REPO_ROOT, "data", "research", "candidates", "pool.json"));
  const result = findDuplicates(pool.candidates, []);
  assert.deepEqual(result.duplicatePairs, [],
    `Havuz içinde tekrar olmamalı: ${JSON.stringify(result.duplicatePairs)}`);
});

test("hiçbir aday 'import_ready + insan onaylı' değildir (yayın kararı yok)", async () => {
  const pool = await loadPool(path.join(REPO_ROOT, "data", "research", "candidates", "pool.json"));
  const preApproved = pool.candidates.filter(
    (candidate) => candidate.state === "import_ready" && candidate.verification?.humanReviewed === true
  );
  assert.deepEqual(preApproved, [],
    "Aday havuzunda otomatik yayına hazır kayıt olmamalı; insan onayı ayrı süreçtir.");
});

test("dry-run: gerçek adayların tamamı bloklanır (insan onayı olmadan)", async () => {
  const archive = await loadArchive(REPO_ROOT);
  const pool = await loadPool(path.join(REPO_ROOT, "data", "research", "candidates", "pool.json"));
  const { convertCandidateToDraft } = await import("../lib/convert-dryrun.mjs");
  for (const candidate of pool.candidates) {
    const result = convertCandidateToDraft(candidate, archive.records);
    assert.notEqual(result.outcome, "invalid", `${candidate.id} geçerli olmalı`);
    assert.equal(result.outcome, "blocked", `${candidate.id} insan onayı olmadan dönüştürülemez`);
  }
});

test("dry-run çıktısı mevcut arşiv şemasıyla doğrulanır (validateArchive)", async () => {
  const { validateArchive } = await import("../../../scripts/archive/lib/validate.mjs");
  const archive = await loadArchive(REPO_ROOT);
  // Onaylanmış bir aday için tam geçerli taslak üret
  const { convertCandidateToDraft } = await import("../lib/convert-dryrun.mjs");
  const { makeCandidate } = await import("./helpers.mjs");
  const approved = makeCandidate({
    id: "src-2026-9001",
    url: "https://www.ataturkansiklopedisi.gov.tr/detay/9001/dry-run-deneme",
    archiveIdentifier: "AYK-9001",
    state: "import_ready",
    verification: { urlReachable: true, citationComplete: true, rightsKnown: true, duplicateChecked: true, aiReviewed: true, humanReviewed: true, notes: "" },
  });
  const dryRun = convertCandidateToDraft(approved, []);
  assert.equal(dryRun.outcome, "ok", `Taslak üretilmeli: ${JSON.stringify(dryRun.blockers)}`);
  // Gerçek taksonomi ve şemalarla doğrula: taslak KENDİ hatası üretmemeli.
  const baseline = await validateArchive({
    records: archive.records,
    taxonomy: archive.taxonomy,
    recordSchema: archive.recordSchema,
    taxonomySchema: archive.taxonomySchema,
    root: REPO_ROOT,
  });
  const withDraft = await validateArchive({
    records: [...archive.records, dryRun.record],
    taxonomy: archive.taxonomy,
    recordSchema: archive.recordSchema,
    taxonomySchema: archive.taxonomySchema,
    root: REPO_ROOT,
  });
  const baselineIds = new Set(baseline.errors.map((e) => e.recordId));
  const newErrors = withDraft.errors.filter((e) => e.recordId === dryRun.record.id && !baselineIds.has(e.recordId));
  assert.deepEqual(newErrors.map((e) => e.message), [],
    `Taslak kayıt gerçek arşiv şemasında yeni hata üretmemeli: ${JSON.stringify(newErrors)}`);
});
