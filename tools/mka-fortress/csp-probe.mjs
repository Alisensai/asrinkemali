#!/usr/bin/env node
// MKA FORTRESS — CSP kanıt sondası. Çalışan YEREL bir sunucuda tüm rotaları gerçek tarayıcıyla
// gezer, etkileşimleri tetikler ve CSP ihlallerini (securitypolicyviolation + konsol) toplar.
// Kullanım: node tools/mka-fortress/csp-probe.mjs --base http://127.0.0.1:4421 [--browser chromium|firefox|webkit]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium, firefox, webkit } = createRequire(path.join(root, "web", "package.json"))("playwright");
const argument = (name, fallback) => { const found = process.argv.find((value) => value.startsWith(`--${name}=`)); return found ? found.slice(name.length + 3) : fallback; };
const base = argument("base", "http://127.0.0.1:4421");
const host = new URL(base).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host)) { console.error("Yalnız yerel sunucuya karşı çalıştırılabilir."); process.exit(2); }
const browserType = { chromium, firefox, webkit }[argument("browser", "chromium")];

const ROUTES = ["/", "/ataturk", "/arsiv", "/arsiv?q=cumhuriyet", "/arsiv/1924-anayasasi", "/kronoloji", "/yayinlar", "/tarihte-bugun", "/hakkimizda", "/olmayan-sayfa"];
const INTERACTIONS = {
  "/": async (page) => { await page.getByRole("button", { name: "Arşivde Ara" }).click().catch(() => {}); await page.keyboard.press("Escape"); },
  "/ataturk": async (page) => { await page.locator("button[aria-expanded]").first().click().catch(() => {}); await page.locator("#sergi button[aria-haspopup='dialog']").first().click().catch(() => {}); await page.keyboard.press("Escape"); },
};

const browser = await browserType.launch();
const report = { base, browser: argument("browser", "chromium"), routes: {}, violations: [], notices: [] };
// WebKit, report-to'suz Report-Only politikası için bir yapılandırma uyarısı basar; bu ihlal değildir, ayrı raporlanır.
const NOTICE = /delivered in report-only mode, but does not specify/i;
for (const route of ROUTES) {
  const page = await browser.newPage();
  const found = [];
  await page.addInitScript(() => { document.addEventListener("securitypolicyviolation", (event) => { window.__cspViolations = [...(window.__cspViolations ?? []), { directive: event.violatedDirective, blocked: event.blockedURI, disposition: event.disposition, sample: event.sample }]; }); });
  page.on("console", (message) => { const text = message.text(); if (NOTICE.test(text)) { report.notices.push({ route, text: text.replace(/'default-src.*?' was/, "<policy> was").slice(0, 200) }); return; } if (/content security policy|content-security-policy|\[report only\]/i.test(text)) found.push({ source: "console", text: text.slice(0, 300) }); });
  const response = await page.goto(base + route, { waitUntil: "networkidle" });
  await INTERACTIONS[route]?.(page);
  await page.waitForTimeout(500);
  const events = await page.evaluate(() => window.__cspViolations ?? []);
  const headers = response?.headers() ?? {};
  report.routes[route] = { status: response?.status(), csp: headers["content-security-policy"] ? "enforce" : headers["content-security-policy-report-only"] ? "report-only" : "none", violations: events.length + found.length };
  for (const item of [...events, ...found]) report.violations.push({ route, ...item });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.violations.length ? 1 : 0);
