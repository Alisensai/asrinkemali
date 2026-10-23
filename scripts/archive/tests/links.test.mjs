import test from "node:test";
import assert from "node:assert/strict";

import { checkArchiveLinks, checkUrls, collectRecordUrls } from "../lib/links.mjs";
import { loadArchive } from "../lib/load.mjs";

function response(status, headers = {}) {
  return {
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    body: { cancel: async () => {} },
  };
}

test("checkUrls 2xx yanıtını başarılı sayar ve URL'leri tekilleştirir", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    return response(200);
  };
  const result = await checkUrls(
    ["https://ataturkansiklopedisi.gov.tr/detay/1/Ornek", "https://ataturkansiklopedisi.gov.tr/detay/1/Ornek"],
    { fetchImpl }
  );
  assert.equal(result.checked, 1);
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "HEAD");
});

test("checkUrls 404 ve ağ hatalarını raporlar", async () => {
  const notFound = await checkUrls(["https://ataturkansiklopedisi.gov.tr/detay/1/Yok"], {
    fetchImpl: async () => response(404),
  });
  assert.equal(notFound.ok, false);
  assert.equal(notFound.failures[0].status, 404);
  assert.match(notFound.failures[0].error, /HTTP 404/);

  const network = await checkUrls(["https://ataturkansiklopedisi.gov.tr/detay/1/Ornek"], {
    fetchImpl: async () => {
      throw new Error("bağlantı kurulamadı");
    },
  });
  assert.equal(network.ok, false);
  assert.match(network.failures[0].error, /bağlantı kurulamadı/);
});

test("HEAD 405/403 olduğunda GET ile yeniden denenir", async () => {
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    return options.method === "HEAD" ? response(405) : response(200);
  };
  const result = await checkUrls(["https://ataturkansiklopedisi.gov.tr/detay/1/Ornek"], { fetchImpl });
  assert.equal(result.ok, true);
  assert.deepEqual(methods, ["HEAD", "GET"]);
});

test("yönlendirmeler güvenli konaklara izlenir, güvensiz konaklar reddedilir", async () => {
  const visited = [];
  const fetchImpl = async (url) => {
    visited.push(url);
    if (url.endsWith("/eski")) {
      return response(301, { location: "https://ataturkansiklopedisi.gov.tr/yeni" });
    }
    return response(200);
  };
  const followed = await checkUrls(["https://ataturkansiklopedisi.gov.tr/eski"], { fetchImpl });
  assert.equal(followed.ok, true);
  assert.equal(followed.results[0].finalUrl, "https://ataturkansiklopedisi.gov.tr/yeni");
  assert.equal(visited.length, 2);

  const unsafe = await checkUrls(["https://ataturkansiklopedisi.gov.tr/eski"], {
    fetchImpl: async () => response(302, { location: "https://evil.example/hedef" }),
  });
  assert.equal(unsafe.ok, false);
  assert.match(unsafe.failures[0].error, /Güvenli olmayan yönlendirme/);
});

test("geçersiz URL ağ isteği yapmadan reddedilir", async () => {
  let called = false;
  const result = await checkUrls(["http://ataturkansiklopedisi.gov.tr/x"], {
    fetchImpl: async () => {
      called = true;
      return response(200);
    },
  });
  assert.equal(result.ok, false);
  assert.equal(called, false);
  assert.match(result.failures[0].error, /https/);
});

test("collectRecordUrls kaynak, provenans, alıntı ve görsel URL'lerini toplar", async () => {
  const archive = await loadArchive();
  const entries = collectRecordUrls(archive.records);
  assert.ok(entries.length > 20);
  assert.ok(entries.some((entry) => entry.field === "$.source.url"));
  assert.ok(entries.some((entry) => entry.field === "$.provenance.url"));
  assert.ok(entries.some((entry) => entry.field === "$.image.sourcePageUrl"));
  assert.ok(entries.some((entry) => entry.recordId === "onuncu-yil-nutku-1933" && entry.field === "$.quotation.sourceUrl"));
  assert.throws(() => collectRecordUrls(null), /kayıt dizisi/);
});

test("checkArchiveLinks başarısız URL'leri kayıt ve alan bilgisiyle eşler", async () => {
  const archive = await loadArchive();
  const result = await checkArchiveLinks(archive.records, {
    fetchImpl: async () => response(200),
  });
  assert.equal(result.ok, true);
  assert.ok(result.checked > 10);

  const failing = await checkArchiveLinks(archive.records, {
    fetchImpl: async (url) => (url.includes("ataturkansiklopedisi") ? response(500) : response(200)),
  });
  assert.equal(failing.ok, false);
  assert.ok(failing.failures.length > 0);
  assert.ok(failing.failures[0].references.length > 0);
  assert.ok(failing.failures[0].references[0].recordId);
});
