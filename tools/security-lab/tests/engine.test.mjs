import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalTarget, scenarios } from "../engine.mjs";

test("RED TEAM LAB yalnız döngüsel geri dönüş hedeflerini kabul eder", () => {
  for (const target of ["http://127.0.0.1:49499", "http://localhost:49499", "http://[::1]:49499"]) assert.equal(assertLocalTarget(target).protocol, "http:");
  for (const target of ["https://example.invalid", "http://192.168.1.1", "http://user:pass@127.0.0.1:49499", "file:///etc/passwd"]) assert.throws(() => assertLocalTarget(target));
});

test("RED TEAM LAB özgün saldırı sınıflarını kapsayan en az 30 senaryo tanımlar", () => {
  const list = scenarios();
  assert.ok(list.length >= 30);
  assert.equal(new Set(list.map((item) => item.id)).size, list.length);
  for (const category of ["RT-016", "RT-017", "RT-021", "RT-025", "RT-033", "RT-035"]) assert.ok(list.some((item) => item.id === category));
});
