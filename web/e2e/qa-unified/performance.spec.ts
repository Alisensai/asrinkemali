import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test("performance sample measures three production navigations", async ({ browser, baseURL }) => {
  expect(process.env.ASRIN_QA_MODE).toBe("production");
  const values: Array<{ kind: "cold" | "warm"; durationMs: number; domContentLoadedMs: number | null; encodedBodySize: number | null; jsResources: number }> = [];
  for (let index = 0; index < 3; index += 1) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const started = performance.now();
    const response = await page.goto(new URL("/arsiv", baseURL).toString(), { waitUntil: "load" });
    const durationMs = Number((performance.now() - started).toFixed(2));
    expect(response?.status()).toBe(200);
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return {
        domContentLoadedMs: entry ? Number((entry.domContentLoadedEventEnd - entry.startTime).toFixed(2)) : null,
        encodedBodySize: entry?.encodedBodySize ?? null,
        jsResources: performance.getEntriesByType("resource").filter((resource) => /\.(?:m?js)(?:\?|$)/i.test(resource.name)).length,
      };
    });
    values.push({ kind: index === 0 ? "cold" : "warm", durationMs, ...navigation });
    await page.close();
  }
  const sorted = values.map(({ durationMs }) => durationMs).sort((a, b) => a - b);
  const measurement = {
    mode: process.env.ASRIN_QA_MODE,
    route: "/arsiv",
    repetitions: values.length,
    samples: values,
    medianDurationMs: sorted[1],
    iqrDurationMs: sorted[2] - sorted[0],
    interpretation: "Local repeated navigation sample only; not Lighthouse or a cross-machine baseline.",
  };
  const output = process.env.ASRIN_QA_PERF_OUTPUT;
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(measurement, null, 2)}\n`, { flag: "wx" });
  }
});
