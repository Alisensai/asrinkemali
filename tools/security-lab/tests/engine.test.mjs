import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalTarget, resolveScenarioUrl, scenarios } from "../engine.mjs";
import { headerOptionsFromEnv, securityHeaders } from "../../../web/lib/security/headers.ts";

test("RED TEAM LAB yalnız döngüsel geri dönüş hedeflerini kabul eder", () => {
  assert.equal(assertLocalTarget("http://localhost:49499").hostname, "127.0.0.1", "localhost fetch öncesi DNS'siz literal adrese sabitlenir");
  for (const target of ["http://127.0.0.1:49499", "http://localhost:49499", "http://[::1]:49499"]) assert.equal(assertLocalTarget(target).protocol, "http:");
  for (const target of ["https://example.invalid", "http://192.168.1.1", "http://user:pass@127.0.0.1:49499", "file:///etc/passwd"]) assert.throws(() => assertLocalTarget(target));
});

test("RED TEAM LAB nihai senaryo URL'sini fetch öncesi aynı literal origin'e sınırlar", () => {
  const target = assertLocalTarget("http://localhost:49499");
  assert.equal(resolveScenarioUrl(target, "/arsiv?q=test").href, "http://127.0.0.1:49499/arsiv?q=test");
  for (const candidate of ["https://example.invalid/", "//example.invalid/", "http://127.0.0.1:49498/", "http://user:pass@127.0.0.1:49499/"]) {
    assert.throws(() => resolveScenarioUrl(target, candidate));
  }
});

test("RED TEAM LAB özgün saldırı sınıflarını kapsayan en az 30 senaryo tanımlar", () => {
  const list = scenarios();
  assert.ok(list.length >= 30);
  assert.equal(new Set(list.map((item) => item.id)).size, list.length);
  for (const category of ["RT-016", "RT-017", "RT-021", "RT-025", "RT-033", "RT-035", "RT-036"]) assert.ok(list.some((item) => item.id === category));
});

test("production CSP default, off ve report-only modlarında zorunlu başlığı korur", () => {
  const get = (headers, key) => headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;
  for (const env of [
    { NODE_ENV: "production" },
    { NODE_ENV: "production", ASRIN_CSP_MODE: "off" },
    { NODE_ENV: "production", ASRIN_CSP_MODE: "report-only" },
  ]) {
    const headers = securityHeaders(headerOptionsFromEnv(env));
    assert.match(get(headers, "Content-Security-Policy") ?? "", /object-src 'none'/);
    if (env.ASRIN_CSP_MODE === "report-only") assert.ok(get(headers, "Content-Security-Policy-Report-Only"));
  }
});
