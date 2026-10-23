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

test("gerçek arşiv yüklenir: 168 kayıt beklenir", async () => {
  const archive = await loadArchive(REPO_ROOT);
  assert.equal(archive.errors.length, 0, `Yükleme hatası olmamalı: ${archive.errors.join("; ")}`);
  assert.equal(archive.records.length, 168);
});

test("gerçek arşivde 1881–1918 hedef dönemi kayıt yoksunluğu raporlanır", async () => {
  const archive = await loadArchive(REPO_ROOT);
  const report = analyzeGaps(archive.records, { targetStart: 1881, targetEnd: 1918 });
  // Bu test, mevcut arşivin erken dönem boşluğunu belgeler. Kayıt sayısı
  // değişirse (ör. 1.000'e çıkarsa) analiz hâlâ çalışır; yalnızca 1918 öncesi
  // kayıt eklenirse boşluk daralır.
  assert.ok(report.targetPeriod.targetRecords < report.counts.total * 0.3,
    "1881–1918 dönemine düşen kayıt-payı %30'un altında kalmaya devam ediyor");
  assert.ok(report.missingRanges.length >= 1, "en az bir boş yıl aralığı raporlanmalı");
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
