import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ALLOWED_HOSTS,
  MAX_IMAGE_BYTES,
  MAX_JSON_BYTES,
  MAX_RECORDS,
  assertFileSize,
  assertSafeText,
  escapeHtml,
  findPrototypePollutionKeys,
  isAllowedHost,
  isPrivateHostname,
  validateExternalUrl,
  validateLocalImage,
} from "../lib/security.mjs";

test("kurumsal alan adları ve alt alan adları kabul edilir", () => {
  assert.equal(isAllowedHost("tbmm.gov.tr"), true);
  assert.equal(isAllowedHost("kurtulussavasimuzesi.tbmm.gov.tr"), true);
  assert.equal(isAllowedHost("ATATURKANSIKLOPEDISI.GOV.TR"), true);
  assert.equal(isAllowedHost("tbmm.gov.tr.evil.example"), false);
  assert.equal(isAllowedHost("evil.example"), false);
  assert.ok(ALLOWED_HOSTS.includes("devletarsivleri.gov.tr"));
});

test("özel ve yerel ağ adresleri reddedilir", () => {
  for (const host of ["localhost", "127.0.0.1", "10.0.0.1", "192.168.1.5", "172.20.0.1", "169.254.1.1", "::1"]) {
    assert.equal(isPrivateHostname(host), true, host);
  }
  assert.equal(isPrivateHostname("8.8.8.8"), false);
  assert.equal(isPrivateHostname("ataturkansiklopedisi.gov.tr"), false);
});

test("validateExternalUrl yalnızca güvenli https kurumsal URL'leri kabul eder", () => {
  assert.equal(
    validateExternalUrl("https://ataturkansiklopedisi.gov.tr/detay/1/Ornek").ok,
    true
  );
  assert.equal(
    validateExternalUrl("https://kurtulussavasimuzesi.tbmm.gov.tr/meclisacilis").ok,
    true
  );
  const cases = [
    ["http://ataturkansiklopedisi.gov.tr/detay/1/Ornek", /https/],
    ["https://evil.example/detay/1", /kurumsal kaynak/],
    ["https://user:pass@ataturkansiklopedisi.gov.tr/x", /kimlik bilgisi/],
    ["https://ataturkansiklopedisi.gov.tr:8443/x", /443/],
    ["https://127.0.0.1/x", /özel\/yerel/],
    ["https://ataturkansiklopedisi.gov.tr/a b", /boşluk/],
    ["https://ataturkansiklopedisi.gov.tr/%00", /null bayt/],
    ["", /boş veya geçersiz/],
  ];
  for (const [url, pattern] of cases) {
    const result = validateExternalUrl(url, { field: "test" });
    assert.equal(result.ok, false, url);
    assert.ok(result.errors.some((error) => pattern.test(error)), `${url}: ${result.errors.join(" | ")}`);
  }
});

test("assertSafeText HTML, olay işleyicisi, tehlikeli şema ve mojibake yakalar", () => {
  assert.equal(assertSafeText("Mustafa Kemal Atatürk").ok, true);
  assert.equal(assertSafeText("Cumhuriyet'in ilanı").ok, true);
  assert.equal(assertSafeText("<script>alert(1)</script>").ok, false);
  assert.equal(assertSafeText('<img src=x onerror="alert(1)">').ok, false);
  assert.equal(assertSafeText("javascript:alert(1)").ok, false);
  assert.equal(assertSafeText("data:text/html;base64,AAAA").ok, false);
  assert.equal(assertSafeText("bozuk metin Ã¼").ok, false);
  assert.equal(assertSafeText("değiştirme \uFFFD").ok, false);
  assert.equal(assertSafeText("kontrol \u0001").ok, false);
  assert.equal(assertSafeText(42).ok, false);
});

test("escapeHtml tüm HTML özel karakterlerini kaçırır", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
  assert.equal(escapeHtml(null), "");
});

test("prototip kirliliği anahtarları iç içe nesnelerde bulunur", () => {
  const payload = JSON.parse('{"a":{"__proto__":{"x":1}},"constructor":1,"liste":[{"prototype":true}]}');
  assert.deepEqual(findPrototypePollutionKeys(payload), [
    "$.a.__proto__",
    "$.constructor",
    "$.liste[0].prototype",
  ]);
  assert.deepEqual(findPrototypePollutionKeys({ safe: true }), []);
});

test("dosya boyutu sınırları", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-guvenlik-"));
  try {
    const small = path.join(dir, "small.json");
    await fs.writeFile(small, "{}", "utf8");
    assert.equal((await assertFileSize(small, 10)).ok, true);
    assert.equal((await assertFileSize(small, 1)).ok, false);
    assert.equal((await assertFileSize(path.join(dir, "yok.json"), 10)).ok, false);
    assert.equal(MAX_JSON_BYTES, 512 * 1024);
    assert.equal(MAX_IMAGE_BYTES, 2 * 1024 * 1024);
    assert.equal(MAX_RECORDS, 500);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("yerel görsel yolu, uzantısı, boyutu ve dosya imzası denetlenir", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-gorsel-"));
  const images = path.join(root, "content", "archive", "images");
  await fs.mkdir(images, { recursive: true });
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
  try {
    await fs.writeFile(path.join(images, "a.png"), png);
    const good = await validateLocalImage("content/archive/images/a.png", { root });
    assert.equal(good.ok, true);
    assert.equal(good.mimeType, "image/png");

    const traversal = await validateLocalImage("../disari.png", { root });
    assert.equal(traversal.ok, false);
    assert.ok(traversal.errors.some((error) => /dışına çıkıyor/.test(error)));

    await fs.writeFile(path.join(images, "a.gif"), png);
    const extension = await validateLocalImage("content/archive/images/a.gif", { root });
    assert.equal(extension.ok, false);
    assert.ok(extension.errors.some((error) => /uzantısı/.test(error)));

    await fs.writeFile(path.join(images, "bozuk.jpg"), Buffer.from("bu bir jpeg degil"));
    const signature = await validateLocalImage("content/archive/images/bozuk.jpg", { root });
    assert.equal(signature.ok, false);
    assert.ok(signature.errors.some((error) => /dosya imzası/.test(error)));

    const tooLarge = await validateLocalImage("content/archive/images/a.png", { root, maxBytes: 4 });
    assert.equal(tooLarge.ok, false);
    assert.ok(tooLarge.errors.some((error) => /sınırını aşıyor/.test(error)));

    const noRoot = await validateLocalImage("content/archive/images/a.png", {});
    assert.equal(noRoot.ok, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
