import test from "node:test";
import assert from "node:assert/strict";
import { analyzeGaps } from "../lib/gap-analysis.mjs";
import { findDuplicates } from "../lib/dedupe.mjs";
import { convertCandidateToDraft } from "../lib/convert-dryrun.mjs";
import { makeSyntheticCandidates, makeSyntheticRecords } from "./helpers.mjs";
import { poolSummary } from "../lib/candidates.mjs";

/**
 * Ölçek testleri: 500, 1.000 ve 10.000 sentetik kayıt.
 * Sentetik veri `synthetic: true` işaretlidir ve gerçek veriyle karışmaz.
 */

async function timed(fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  return { result, ms: Number(end - start) / 1e6 };
}

for (const size of [500, 1000, 2000, 10000]) {
  test(`ölçek: ${size} sentetik arşiv kaydında boşluk analizi çalışır`, async () => {
    const records = makeSyntheticRecords(size, 42);
    assert.equal(records.length, size);
    const { result, ms } = await timed(() => Promise.resolve(analyzeGaps(records, { targetStart: 1881, targetEnd: 1918 })));
    assert.equal(result.counts.total, size);
    assert.ok(ms < 30000, `${size} kayıtlık analiz 30 sn'den kısa sürmeli (sürdü: ${ms.toFixed(0)} ms)`);
  });
}

test("ölçek: 500 sentetik aday arasında tekrar analizi çalışır", async () => {
  const candidates = makeSyntheticCandidates(500, 7);
  const { result, ms } = await timed(() => Promise.resolve(findDuplicates(candidates, [])));
  assert.ok(ms < 30000, `500 adaylık tekrar analizi 30 sn'den kısa sürmeli (sürdü: ${ms.toFixed(0)} ms)`);
  // Rastgele üretimde tekrar çıkmaması beklenir; çıktı biçimi doğrudur
  assert.ok(Array.isArray(result.duplicatePairs));
  assert.ok(Array.isArray(result.archiveMatches));
});

test("ölçek: 10.000 sentetik adaydan hiçbiri dönüşebilir değil (sentetik koruması)", () => {
  const candidates = makeSyntheticCandidates(10000, 3);
  let blocked = 0;
  for (const candidate of candidates) {
    const result = convertCandidateToDraft(candidate, []);
    if (result.blockers.some((blocker) => blocker.code === "SYNTHETIC_FORBIDDEN")) blocked += 1;
  }
  // TÜM 10.000 aday denetlenir (örneklem değil)
  assert.equal(blocked, 10000);
});

test("sentetik kayıtlar gerçek tarihî kaynaklarla karıştırılamaz: işaret zorunlu", () => {
  const synthetic = makeSyntheticCandidates(10);
  const real = [{ ...makeSyntheticCandidates(1)[0], synthetic: false }];
  for (const candidate of synthetic) {
    assert.equal(candidate.synthetic, true, "sentetik aday synthetic:true taşımak zorunda");
  }
  assert.equal(real[0].synthetic, false);
  // Havuz özeti sentetikleri ayrı sayar
  const summary = poolSummary([...synthetic, ...real]);
  assert.equal(summary.synthetic, 10);
  assert.equal(summary.total, 11);
});
