import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(root, "..", "results");
fs.mkdirSync(resultsDir, { recursive: true });
const target = process.argv.find((value) => value.startsWith("--target="))?.split("=")[1] ?? "next";
const baseUrl = process.argv.find((value) => value.startsWith("--baseUrl="))?.split("=")[1] ?? "http://127.0.0.1:4173";
const viewports = [[320,568],[360,800],[375,812],[390,844],[414,896],[430,932],[768,1024],[1024,768],[1440,900],[1536,1024]];
const report = { timestamp: new Date().toISOString(), target, baseUrl, results: [] };
const browser = await chromium.launch({ headless: true });
let failed = false;
for (const [width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 768 ? 2 : 1 });
  const page = await context.newPage();
  try {
    const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
    const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    const ok = response?.ok() === true && metrics.scrollWidth <= metrics.clientWidth + 2;
    failed ||= !ok;
    report.results.push({ viewport: `${width}x${height}`, status: ok ? "PASS" : "FAIL", httpStatus: response?.status(), ...metrics });
    await page.screenshot({ path: path.join(resultsDir, `responsive-${target}-${width}x${height}.png`), fullPage: false });
  } catch (error) { failed = true; report.results.push({ viewport: `${width}x${height}`, status: "ERROR", error: error.message }); }
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(resultsDir, `responsive-report-${target}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.results, null, 2));
if (failed) process.exitCode = 1;
