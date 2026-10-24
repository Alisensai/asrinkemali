import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { generateSyntheticRecords, MAX_SYNTHETIC_RECORDS, runSyntheticScale } from "../lib/synthetic.mjs";
import { repoRoot } from "../lib/runtime.mjs";

test("synthetic generation is deterministic, bounded, and explicitly fixture-only", () => {
  const first = generateSyntheticRecords(50, 17);
  const second = generateSyntheticRecords(50, 17);
  assert.deepEqual(first, second);
  assert.equal(first[0].fixtureOnly, true);
  assert.match(first[0].title, /^Synthetic QA record/);
  assert.throws(() => generateSyntheticRecords(MAX_SYNTHETIC_RECORDS + 1), RangeError);
});

test("scale experiment writes only to a temporary directory and reports measurements", async () => {
  const catalog = path.join(repoRoot, "data", "archive", "catalog");
  const before = fs.existsSync(catalog) ? fs.readdirSync(catalog).sort() : [];
  const report = await runSyntheticScale({ counts: [500, 2_000, 10_000], seed: 9 });
  const after = fs.existsSync(catalog) ? fs.readdirSync(catalog).sort() : [];
  assert.deepEqual(after, before);
  assert.deepEqual(report.measurements.map(({ count }) => count), [500, 2_000, 10_000]);
  assert.ok(report.measurements.every(({ bytes, heapUsedBytes }) => bytes > 0 && heapUsedBytes > 0));
});
