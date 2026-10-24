import test from "node:test";
import assert from "node:assert/strict";
import {
  precisionAtK,
  recallAtK,
  reciprocalRank,
  meanReciprocalRank,
  calculateDCG,
  ndcgAtK,
} from "../src/metrics/index.mjs";

test("metrics - precisionAtK standart ve kenar durumlar", () => {
  const relevant = new Set(["doc-1", "doc-2"]);

  // P@1 (ilk ilgili)
  assert.equal(precisionAtK(["doc-1", "doc-3"], relevant, 1), 1.0);

  // P@2 (biri ilgili, biri ilgisiz)
  assert.equal(precisionAtK(["doc-1", "doc-3"], relevant, 2), 0.5);

  // P@5 ancak sadece 2 sonuç dönmüş
  assert.equal(precisionAtK(["doc-1", "doc-2"], relevant, 5), 2 / 5);

  // Boş sonuç
  assert.equal(precisionAtK([], relevant, 5), 0.0);

  // K <= 0 hatası
  assert.throws(() => precisionAtK(["doc-1"], relevant, 0), /Geçersiz K/);
  assert.throws(() => precisionAtK(["doc-1"], relevant, -1), /Geçersiz K/);

  // Tekrarlanan ID dedup kontrolü
  assert.equal(precisionAtK(["doc-1", "doc-1"], relevant, 2), 0.5); // doc-1 tek sayılır
});

test("metrics - recallAtK standart ve kenar durumlar", () => {
  const relevant = new Set(["doc-1", "doc-2", "doc-3", "doc-4"]);

  // R@2 (4 ilgiliden 2'si yakalanmış)
  assert.equal(recallAtK(["doc-1", "doc-2"], relevant, 2), 0.5);

  // R@5 (tüm 4 ilgili yakalanmış)
  assert.equal(recallAtK(["doc-1", "doc-2", "doc-3", "doc-4", "doc-5"], relevant, 5), 1.0);

  // Külliyatta hiç ilgili yok
  assert.equal(recallAtK(["doc-1"], new Set(), 5), 0.0);

  // Boş sonuç
  assert.equal(recallAtK([], relevant, 5), 0.0);
});

test("metrics - reciprocalRank ve MRR", () => {
  const relevant = new Set(["doc-target"]);

  // 1. sırada -> 1.0
  assert.equal(reciprocalRank(["doc-target", "doc-other"], relevant), 1.0);

  // 2. sırada -> 0.5
  assert.equal(reciprocalRank(["doc-other", "doc-target"], relevant), 0.5);

  // 5. sırada -> 0.2
  assert.equal(reciprocalRank(["a", "b", "c", "d", "doc-target"], relevant), 0.2);

  // Bulunamadı -> 0.0
  assert.equal(reciprocalRank(["a", "b", "c"], relevant), 0.0);

  // MRR ortalaması
  const runs = [
    { retrievedIds: ["doc-target"], relevantSet: relevant }, // 1.0
    { retrievedIds: ["other", "doc-target"], relevantSet: relevant }, // 0.5
    { retrievedIds: ["x", "y"], relevantSet: relevant }, // 0.0
  ];
  assert.equal(meanReciprocalRank(runs), (1.0 + 0.5 + 0.0) / 3);
});

test("metrics - calculateDCG ve ndcgAtK", () => {
  // Graded: 3 (mükemmel), 2 (ilgili), 0 (ilgisiz)
  // Gain = 2^grade - 1: grade 3 -> 7, grade 2 -> 3, grade 0 -> 0
  // Discount: rank 1 (i=0) -> log2(2) = 1, rank 2 (i=1) -> log2(3) = 1.58496
  // DCG@2 = 7/1 + 3/1.58496 = 7 + 1.89279 = 8.89279
  const dcg = calculateDCG([3, 2], 2);
  assert.ok(Math.abs(dcg - (7 / 1 + 3 / Math.log2(3))) < 1e-5);

  // Mükemmel sıralamada nDCG = 1.0
  const qrels = new Map([
    ["doc-best", 3],
    ["doc-good", 2],
    ["doc-bad", 0],
  ]);
  const perfectRetrieved = ["doc-best", "doc-good", "doc-bad"];
  assert.equal(ndcgAtK(perfectRetrieved, qrels, 3), 1.0);

  // Ters sıralamada nDCG < 1.0 ve > 0.0
  const reversedRetrieved = ["doc-bad", "doc-good", "doc-best"];
  const n = ndcgAtK(reversedRetrieved, qrels, 3);
  assert.ok(n > 0.0 && n < 1.0);

  // Hiç qrel yoksa nDCG = 0.0
  assert.equal(ndcgAtK(perfectRetrieved, new Map(), 3), 0.0);
});
