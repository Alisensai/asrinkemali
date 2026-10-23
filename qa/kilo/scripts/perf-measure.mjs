import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(root, "..", "results");
fs.mkdirSync(resultsDir, { recursive: true });
const target = process.argv.find((value) => value.startsWith("--target="))?.split("=")[1] ?? "next";
const baseUrl = process.argv.find((value) => value.startsWith("--baseUrl="))?.split("=")[1] ?? "http://127.0.0.1:4173";

const viewports = [
  { name: "mobile-360x800", width: 360, height: 800, scale: 2 },
  { name: "mobile-390x844", width: 390, height: 844, scale: 2 },
  { name: "desktop-1536x1024", width: 1536, height: 1024, scale: 1 },
  { name: "desktop-1440x900", width: 1440, height: 900, scale: 1 },
];

const browser = await chromium.launch({ headless: true });
const report = { timestamp: new Date().toISOString(), target, baseUrl, results: [] };

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale });
  const page = await context.newPage();
  const metrics = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") metrics.push({ type: "console", text: msg.text() });
  });
  try {
    const start = Date.now();
    const response = await page.goto(baseUrl, { waitUntil: "load", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const loadTime = Date.now() - start;
    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
        loadEventEnd: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
        transferSize: nav ? nav.transferSize : null,
        encodedBodySize: nav ? nav.encodedBodySize : null,
        decodedBodySize: nav ? nav.decodedBodySize : null,
      };
    });
    const images = await page.evaluate(() => Array.from(document.images).map((img) => ({ src: img.currentSrc || img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, complete: img.complete })));
    report.results.push({ viewport: vp.name, httpStatus: response?.status(), loadTimeMs: loadTime, ...perf, imageCount: images.length });
    await page.screenshot({ path: path.join(resultsDir, `perf-${target}-${vp.name}.png`), fullPage: true });
  } catch (error) {
    report.results.push({ viewport: vp.name, status: "ERROR", error: error.message });
  }
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(resultsDir, `perf-report-${target}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.results, null, 2));
