/**
 * Görev 07 — URL/SSRF, ağ, dosya ve çıktı güvenliği (QA-079…098).
 * Ağ trafiği yoktur: fetch ve DNS sahte uygulamalarla verilir.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertSafeOutputPath, writeFileAtomic } from "../lib/integration/safe-output.mjs";
import { checkUrlReachability, classifyHttpOutcome } from "../lib/integration/url-status.mjs";
import { assertPublicDnsResolution, validateExternalUrl } from "../lib/url-security.mjs";
import { REAL_ROOT } from "./fixture-repo.mjs";

const NOW = "2026-10-24T10:00:00Z";
const publicResolver = { resolve4: async () => ["93.184.216.34"], resolve6: async () => [] };
const response = (status, location) => ({ status, headers: { get: (name) => (name === "location" ? location ?? null : null) } });
const rejected = (url) => validateExternalUrl(url).ok === false;

test("QA-079/QA-080/QA-081 loopback, özel, metadata ve IPv6 özel adresler reddedilir", () => {
  for (const url of ["http://127.0.0.1/", "http://localhost/", "http://localhost./", "http://10.0.0.1/", "http://169.254.169.254/latest", "http://192.168.1.1/", "http://[::1]/", "http://[fe80::1]/", "http://[::ffff:7f00:1]/", "http://[::ffff:127.0.0.1]/", "http://224.0.0.1/", "http://[ff02::1]/", "http://[64:ff9b::a00:1]/", "http://0x7f.1/", "http://2130706433/"]) {
    assert.ok(rejected(url), url);
  }
  assert.equal(validateExternalUrl("https://www.ataturkansiklopedisi.gov.tr/detay/1").ok, true);
});

test("QA-082/QA-084 userinfo ve beklenmeyen portlar reddedilir", () => {
  for (const url of ["https://u:p@example.org/", "https://example.org:22/", "https://example.org:3306/", "http://example.org:8080/"]) assert.ok(rejected(url), url);
});

test("QA-083/QA-090 iç adrese dönen yönlendirme ve döngü sınırlıdır", async () => {
  const toInternal = await checkUrlReachability("https://example.org/a", { now: NOW, resolver: publicResolver, fetchImpl: async () => response(302, "http://169.254.169.254/") });
  assert.equal(toInternal.state, "blocked");
  let calls = 0;
  const loop = await checkUrlReachability("https://example.org/a", { now: NOW, resolver: publicResolver, maxRedirects: 3, fetchImpl: async () => { calls += 1; return response(301, "https://example.org/a"); } });
  assert.equal(loop.reason, "REDIRECT_LIMIT");
  assert.equal(calls, 4);
});

test("QA-085 DNS rebinding: özel adrese çözülen ana makine reddedilir", async () => {
  const result = await assertPublicDnsResolution("https://example.org/", { resolve4: async () => ["10.1.2.3"], resolve6: async () => [] });
  assert.equal(result.errors[0].code, "DNS_REBINDING_PRIVATE");
});

test("QA-086 boşluk, kontrol/yön karakteri ve aşırı uzun URL geçersizdir", () => {
  assert.ok(rejected("https://exa mple.org/"));
  assert.ok(rejected(`https://example.org/${String.fromCharCode(0x202e)}x`));
  assert.ok(rejected(`https://example.org/${String.fromCharCode(7)}`));
  assert.ok(rejected(`https://example.org/${"a".repeat(2100)}`));
});

test("QA-087 varsayılan erişim denetimi ağa çıkmaz", async () => {
  const result = await checkUrlReachability("https://example.org/", undefined);
  assert.equal(result.state, "unchecked");
  const cli = spawnSync(process.execPath, ["tools/historical-research/cli.mjs", "verify-url", "https://example.org/"], { cwd: REAL_ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.match(cli.stdout, /ağ denetimi yapılmadı/);
});

test("QA-088/QA-089 HTTP 200 yalnız erişilebilir; 401/403/429/404/timeout ayrı durumlar", async () => {
  assert.equal(classifyHttpOutcome({ status: 200 }), "reachable");
  assert.equal(classifyHttpOutcome({ status: 401 }), "restricted");
  assert.equal(classifyHttpOutcome({ status: 403 }), "restricted");
  assert.equal(classifyHttpOutcome({ status: 404 }), "missing");
  assert.equal(classifyHttpOutcome({ status: 429 }), "temporary");
  assert.equal(classifyHttpOutcome({ status: 500 }), "temporary");
  assert.equal(classifyHttpOutcome({ error: "timeout" }), "temporary");
  assert.equal(classifyHttpOutcome(null), "unchecked");
  const ok = await checkUrlReachability("https://example.org/", { now: NOW, resolver: publicResolver, fetchImpl: async () => response(200) });
  assert.equal(ok.state, "reachable");
  assert.equal(ok.historicalVerification, "not_applicable");
  const dnsFail = await checkUrlReachability("https://example.org/", { now: NOW, resolver: { resolve4: async () => { throw new Error("ENOTFOUND"); }, resolve6: async () => { throw new Error("ENOTFOUND"); } }, fetchImpl: async () => response(200) });
  assert.equal(dnsFail.state, "temporary");
});

test("QA-091/QA-092/QA-093/QA-095 katalog, repo dışı, .git ve kimlik bilgisi yollarına yazılmaz", () => {
  for (const target of ["data/archive/catalog/x.json", "content/archive/records/x.json", "../disari.md", "/tmp/../" + path.join(REAL_ROOT, "data/archive/x.json").replace(/^\//, ""), ".git/hooks/pre-commit", "web/app/page.tsx", ".env.local", "schemas/x.json", "docs/editorial/forms/x.json"]) {
    assert.throws(() => assertSafeOutputPath(target, { root: REAL_ROOT }), (error) => ["PROTECTED_PATH", "OUTPUT_DIR_NOT_ALLOWED"].includes(error.code), target);
  }
  assert.throws(() => assertSafeOutputPath("\\\\server\\share\\x.md", { root: REAL_ROOT }), (error) => error.code === "UNC_PATH_FORBIDDEN");
  assert.doesNotThrow(() => assertSafeOutputPath("data/research/candidates/exports/x.json", { root: REAL_ROOT }));
});

test("QA-094 sembolik bağ hedefine yazılmaz", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mka-evidence-link-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "mka-evidence-out-"));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  const link = path.join(dir, "rapor.md");
  try {
    fs.symlinkSync(path.join(outside, "hedef.md"), link);
  } catch {
    t.skip("bu ortamda symlink izni yok (Windows geliştirici modu kapalı); Linux CI'da koşar");
    return;
  }
  fs.writeFileSync(path.join(outside, "hedef.md"), "eski");
  assert.throws(() => assertSafeOutputPath(link), (error) => error.code === "SYMLINK_TARGET");
});

test("QA-096 atomik yazım yarım dosya bırakmaz", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mka-evidence-atomic-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const target = path.join(dir, "rapor.json");
  writeFileAtomic(target, "{}\n");
  writeFileAtomic(target, '{"ikinci":true}\n');
  assert.equal(fs.readFileSync(target, "utf8"), '{"ikinci":true}\n');
  assert.deepEqual(fs.readdirSync(dir), ["rapor.json"]);
});

test("QA-097 hata mesajları yerel mutlak yol sızdırmaz", () => {
  try {
    assertSafeOutputPath("data/archive/catalog/x.json", { root: REAL_ROOT });
  } catch (error) {
    assert.equal(error.message.includes(REAL_ROOT), false);
  }
  const cli = spawnSync(process.execPath, ["tools/historical-research/cli.mjs", "gap-report", "--out", "data/archive/catalog/x.md"], { cwd: REAL_ROOT, encoding: "utf8" });
  assert.equal(cli.status, 3);
  assert.equal(cli.stderr.includes(REAL_ROOT), false);
  assert.equal(cli.stderr.includes(os.homedir()), false);
});

test("QA-098 Windows ve POSIX ayırıcılarıyla aynı güvenlik davranışı", () => {
  for (const target of ["data\\archive\\catalog\\x.json", "data/archive/catalog/x.json", "..\\..\\disari.md"]) {
    assert.throws(() => assertSafeOutputPath(target, { root: REAL_ROOT }), target);
  }
});
