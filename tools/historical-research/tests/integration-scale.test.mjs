/**
 * Görev 07 — ölçek ve tam giriş değerlendirmesi (QA-048, QA-109…112).
 * Sentetik adaylar yalnız bellekte üretilir; hiçbir dosyaya yazılmaz.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { assessClaimEvidence } from "../lib/integration/evidence-assessment.mjs";
import { classifyDuplicates } from "../lib/integration/source-identity.mjs";
import { syntheticPool } from "./synthetic-pool.mjs";

for (const n of [500, 1000, 2000, 10000]) {
  test(`QA-${{ 500: "109", 1000: "110", 2000: "111", 10000: "048/112" }[n]} ${n} sentetik aday eksiksiz ve indeksli işlenir`, () => {
    const pool = syntheticPool(n);
    const started = performance.now();
    const result = classifyDuplicates(pool, []);
    const elapsedMs = performance.now() - started;
    assert.equal(result.metrics.candidates, n, "örnekleme yok: her aday değerlendirildi");
    const expectedUrlDupes = pool.filter((_, i) => i % 97 === 0 && i > 0).length;
    assert.equal(result.metrics.exactDuplicate, expectedUrlDupes);
    assert.ok(result.metrics.titleComparisons < (n * (n - 1)) / 2 / 10, `O(n²) karşılaştırma yok (${result.metrics.titleComparisons})`);
    assert.ok(elapsedMs < 60_000, `${n} aday ${Math.round(elapsedMs)} ms`);
    if (n === 2000) {
      // Hiçbir iddia ilişkisi sessizce kaybolmaz.
      const claims = pool.slice(0, 200).map((candidate, i) => ({ id: `claim-${i}`, evidence: [{ candidateId: candidate.id, relation: "supports" }, { candidateId: "src-2099-999999", relation: "partial" }] }));
      const assessed = claims.map((claim) => assessClaimEvidence(claim, pool));
      assert.equal(assessed.reduce((sum, item) => sum + item.counts.resolvedEdges + item.counts.unresolvedEdges, 0), 400);
    }
  });
}
