import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

export const MAX_SYNTHETIC_RECORDS = 10_000;

export function generateSyntheticRecords(count, seed = 42) {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_SYNTHETIC_RECORDS) {
    throw new RangeError(`count must be an integer between 1 and ${MAX_SYNTHETIC_RECORDS}.`);
  }
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError("seed must be a non-negative safe integer.");
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state;
  };
  return Array.from({ length: count }, (_, index) => ({
    id: `qa-synthetic-${String(index).padStart(5, "0")}`,
    slug: `qa-synthetic-${String(index).padStart(5, "0")}`,
    title: `Synthetic QA record ${index}`,
    fixtureOnly: true,
    seedValue: next(),
  }));
}

export async function runSyntheticScale({ counts = [500, 2_000, 10_000], seed = 42 } = {}) {
  const temporaryRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "asrinkemali-qa-"));
  const measurements = [];
  const startedAt = performance.now();
  try {
    for (const count of counts) {
      if (count > MAX_SYNTHETIC_RECORDS) throw new RangeError(`Requested count exceeds ${MAX_SYNTHETIC_RECORDS}.`);
      const generatedAt = performance.now();
      let state = seed >>> 0;
      const next = () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state;
      };
      let observedPeakHeapBytes = process.memoryUsage().heapUsed;
      const sampler = setInterval(() => {
        observedPeakHeapBytes = Math.max(observedPeakHeapBytes, process.memoryUsage().heapUsed);
      }, 5);
      sampler.unref();
      const records = [];
      for (let index = 0; index < count; index += 1) {
        records.push({
          id: `qa-synthetic-${String(index).padStart(5, "0")}`,
          slug: `qa-synthetic-${String(index).padStart(5, "0")}`,
          title: `Synthetic QA record ${index}`,
          fixtureOnly: true,
          seedValue: next(),
        });
        if (index > 0 && index % 250 === 0) {
          observedPeakHeapBytes = Math.max(observedPeakHeapBytes, process.memoryUsage().heapUsed);
          await new Promise((resolve) => setImmediate(resolve));
        }
      }
      observedPeakHeapBytes = Math.max(observedPeakHeapBytes, process.memoryUsage().heapUsed);
      clearInterval(sampler);
      const filePath = path.join(temporaryRoot, `synthetic-${count}.json`);
      await fs.promises.writeFile(filePath, `${JSON.stringify(records)}\n`, { flag: "wx" });
      const stats = await fs.promises.stat(filePath);
      measurements.push({
        count,
        seed,
        bytes: stats.size,
        generationMs: Number((performance.now() - generatedAt).toFixed(3)),
        heapUsedBytes: process.memoryUsage().heapUsed,
        observedPeakHeapBytes,
      });
    }
    return { seed, temporary: true, elapsedMs: Number((performance.now() - startedAt).toFixed(3)), measurements };
  } finally {
    await fs.promises.rm(temporaryRoot, { recursive: true, force: false });
  }
}
