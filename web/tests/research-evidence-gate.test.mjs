import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Görev 07 (QA-099…QA-102): araştırma laboratuvarı production'da kapalı, aday verisi istemciye sızmaz.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gateSource = readFileSync(path.join(webRoot, "lib/research-evidence/candidates.ts"), "utf8");
const pageSource = readFileSync(path.join(webRoot, "app/arastirma-laboratuvari/page.tsx"), "utf8");

function researchLabEnabledFromSource(env) {
  // Kaynaktaki kapı fonksiyonunun gövdesini, server-only içe aktarmadan bağımsız değerlendirir.
  const body = /export function researchLabEnabled\(\): boolean \{([\s\S]*?)\n\}/.exec(gateSource)?.[1];
  assert.ok(body, "researchLabEnabled bulunamadı");
  return new Function("process", body)({ env });
}

test("QA-099/QA-100 production'da bayrak olsa da olmasa da laboratuvar kapalı", () => {
  assert.equal(researchLabEnabledFromSource({ NODE_ENV: "production" }), false);
  assert.equal(researchLabEnabledFromSource({ NODE_ENV: "production", MKA_RESEARCH_LAB: "1" }), false);
  assert.match(pageSource, /if \(!researchLabEnabled\(\)\) \{\s*notFound\(\);/);
  assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
});

test("QA-101 geliştirmede yalnız açık bayrakla açılır", () => {
  assert.equal(researchLabEnabledFromSource({ NODE_ENV: "development" }), false);
  assert.equal(researchLabEnabledFromSource({ NODE_ENV: "development", MKA_RESEARCH_LAB: "1" }), true);
  assert.equal(/NEXT_PUBLIC_/.test(gateSource), false, "istemci bayrağıyla açılmaz");
});

test("QA-102 aday okuyucu server-only; istemci bileşenleri onu içe aktarmaz", () => {
  assert.match(gateSource, /^import "server-only";/m);
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|mjs)$/.test(entry.name)) {
        const text = readFileSync(full, "utf8");
        if (/^["']use client["']/m.test(text) && /research-evidence|historical-research/.test(text)) offenders.push(path.relative(webRoot, full));
      }
    }
  };
  walk(path.join(webRoot, "app"));
  walk(path.join(webRoot, "components"));
  assert.deepEqual(offenders, []);
});
