import test from "node:test";
import assert from "node:assert/strict";
import { validateExternalUrl } from "../lib/url-security.mjs";

test("geçerli https URL kabul edilir", () => {
  const result = validateExternalUrl("https://www.ataturkansiklopedisi.gov.tr/detay/1/madde");
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("geçersiz URL: bozuk ve boş girdiler reddedilir", () => {
  assert.equal(validateExternalUrl("").ok, false);
  assert.equal(validateExternalUrl("not a url").ok, false);
  assert.equal(validateExternalUrl("ftp://ornek.gov.tr/dosya").ok, false);
});

test("güvensiz URL: javascript: ve data: şemaları reddedilir", () => {
  assert.equal(validateExternalUrl("javascript:alert(1)").ok, false);
  assert.equal(validateExternalUrl("data:text/html;base64,eHg=").ok, false);
  assert.equal(validateExternalUrl("file:///etc/passwd").ok, false);
});

test("güvensiz URL: kullanıcı bilgisi (SSRF kimlik sızdırma) reddedilir", () => {
  const result = validateExternalUrl("https://user:parola@ornek.gov.tr/madde");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "USERINFO_FORBIDDEN"));
});

test("güvensiz URL: özel IPv4 adresleri reddedilir", () => {
  for (const url of [
    "http://127.0.0.1/yonetim",
    "http://10.0.0.1/dahili",
    "http://192.168.1.1/panel",
    "http://172.16.0.1/dahili",
    "http://169.254.169.254/meta",
    "http://0.0.0.0/",
  ]) {
    const result = validateExternalUrl(url);
    assert.equal(result.ok, false, `reddedilmeliydi: ${url}`);
    assert.ok(result.errors.some((error) => error.code === "PRIVATE_IP" || error.code === "META_HOST"), url);
  }
});

test("güvensiz URL: özel IPv6 ve localhost reddedilir", () => {
  assert.equal(validateExternalUrl("http://[::1]/").ok, false);
  assert.equal(validateExternalUrl("http://localhost/panel").ok, false);
  assert.equal(validateExternalUrl("http://localhost:8080/panel").ok, false);
});

test("güvensiz URL: standart dışı port reddedilir", () => {
  const result = validateExternalUrl("https://ornek.gov.tr:8443/madde");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "PORT_FORBIDDEN"));
});

test("güvensiz URL: iç adres son eki reddedilir", () => {
  assert.equal(validateExternalUrl("https://kurum.internal/panel").ok, false);
  assert.equal(validateExternalUrl("https://makine.local/").ok, false);
});

test("aşırı uzun URL reddedilir", () => {
  const long = "https://ornek.gov.tr/" + "a".repeat(3000);
  const result = validateExternalUrl(long);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "URL_TOO_LONG"));
});
