#!/usr/bin/env node
/**
 * Görev 07 dedupe ölçümü: #19 `findDuplicates` (çift karşılaştırma) ile
 * `classifyDuplicates` (indeksli) aynı sentetik girdide, aynı süreçte, tekrarlı.
 * Sentetik adaylar yalnız bellekte üretilir; dosyaya yazılmaz.
 *
 *   node tools/historical-research/scripts/bench-dedupe.mjs 500 2000 10000
 */
import os from "node:os";

import { findDuplicates } from "../lib/dedupe.mjs";
import { classifyDuplicates } from "../lib/integration/source-identity.mjs";
import { syntheticPool } from "../tests/synthetic-pool.mjs";

const REPEATS = 3;
const sizes = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 50_000);

function measure(fn) {
  const times = [];
  for (let i = 0; i < REPEATS; i += 1) {
    const start = performance.now();
    fn();
    times.push(Math.round(performance.now() - start));
  }
  times.sort((a, b) => a - b);
  return { minMs: times[0], medianMs: times[Math.floor(times.length / 2)], maxMs: times.at(-1) };
}

const results = [];
for (const n of sizes.length ? sizes : [500, 2000]) {
  const pool = syntheticPool(n);
  results.push({
    candidates: n,
    legacyFindDuplicates: n <= 10_000 ? measure(() => findDuplicates(pool, [])) : "not_run (O(n²))",
    indexedClassifyDuplicates: measure(() => classifyDuplicates(pool, [])),
  });
}
process.stdout.write(`${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, cpus: os.cpus().length, repeats: REPEATS, results }, null, 2)}\n`);
