import test from "node:test";
import assert from "node:assert/strict";

import { checkSourceLinks } from "../src/link-check.mjs";
import { makeRecord } from "./fixtures.mjs";

function response(status, { location = null } = {}) {
  return {
    status,
    headers: { get: (name) => (String(name).toLowerCase() === "location" ? location : null) },
    body: { cancel: async () => {} },
  };
}

function makeFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method ?? "GET" });
    const handler = routes[url];
    if (!handler) return response(404);
    return handler(options);
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function records() {
  return [
    makeRecord({
      id: "ok",
      title: "Sağlam kaynak",
      source: {
        url: "https://www.tbmm.gov.tr/ok",
        institutionUrl: "https://www.tbmm.gov.tr/kurum",
      },
      provenance: [
        {
          institution: "TBMM",
          collection: "Test",
          identifier: "OK-1",
          url: "https://www.tbmm.gov.tr/redirect",
          accessedAt: "2026-10-23",
          note: "Test.",
        },
      ],
    }),
    makeRecord({
      id: "broken",
      title: "Kırık kaynak",
      source: {
        url: "https://www.tbmm.gov.tr/broken",
        institutionUrl: "https://www.tbmm.gov.tr/kurum-broken",
      },
      provenance: [
        {
          institution: "TBMM",
          collection: "Test",
          identifier: "BROKEN-1",
          url: "https://www.tbmm.gov.tr/broken",
          accessedAt: "2026-10-23",
          note: "Test.",
        },
      ],
    }),
    makeRecord({
      id: "unsafe",
      title: "Güvensiz yönlendirme",
      source: {
        url: "https://www.tbmm.gov.tr/unsafe-redirect",
        institutionUrl: "https://www.tbmm.gov.tr/kurum",
      },
    }),
    makeRecord({
      id: "method",
      title: "HEAD desteklemeyen kaynak",
      source: {
        url: "https://www.tbmm.gov.tr/method",
        institutionUrl: "https://www.tbmm.gov.tr/kurum",
      },
    }),
  ];
}

function fetchRoutes() {
  return makeFetch({
    "https://www.tbmm.gov.tr/ok": () => response(200),
    "https://www.tbmm.gov.tr/kurum": () => response(200),
    "https://www.tbmm.gov.tr/redirect": () => response(302, { location: "https://www.tbmm.gov.tr/yeni" }),
    "https://www.tbmm.gov.tr/yeni": () => response(200),
    "https://www.tbmm.gov.tr/broken": () => response(500),
    "https://www.tbmm.gov.tr/kurum-broken": () => response(500),
    "https://www.tbmm.gov.tr/unsafe-redirect": () => response(302, { location: "https://evil.example.com/x" }),
    "https://www.tbmm.gov.tr/method": (options) =>
      options.method === "HEAD" ? response(405) : response(200),
    "https://www.tbmm.gov.tr/test-kaynak": () => response(200),
    "https://www.ataturkansiklopedisi.gov.tr/detay/1/aday": () => response(200),
  });
}

test("çevrimdışı mod ağ isteği yapmaz ve ölçülmedi durumunu döndürür", async () => {
  let called = false;
  const result = await checkSourceLinks(records(), {
    online: false,
    fetchImpl: async () => {
      called = true;
      throw new Error("ağ çağrısı yapılmamalı");
    },
  });
  assert.equal(called, false);
  assert.equal(result.mode, "not_run");
  assert.equal(result.checkedAt, null);
  assert.equal(result.summary.checked, 0);
  assert.equal(result.summary.broken, 0);
  assert.deepEqual(result.results, []);
});

test("çevrimiçi mod kaynak, yönlendirme, kırık ve aday URL'leri denetler", async () => {
  const fetchImpl = fetchRoutes();
  const result = await checkSourceLinks(records(), {
    online: true,
    fetchImpl,
    concurrency: 1,
    candidateUrls: [
      {
        id: "candidate-1",
        sourceId: "AYK-1",
        title: "Aday 1",
        url: "https://www.ataturkansiklopedisi.gov.tr/detay/1/aday",
      },
    ],
    checkedAt: "2026-10-23T00:00:00.000Z",
  });
  assert.equal(result.mode, "online");
  assert.equal(result.checkedAt, "2026-10-23T00:00:00.000Z");
  assert.ok(result.summary.checked >= 6);
  assert.equal(result.summary.broken, 3);
  assert.equal(result.summary.redirected, 1);
  assert.equal(result.summary.sourceChecked, 4);
  assert.equal(result.summary.sourceOk, 2);
  assert.equal(result.summary.sourceBroken, 2);
  assert.equal(result.summary.criticalBroken, 2);
  assert.equal(result.summary.candidateChecked, 1);
  assert.equal(result.summary.candidateBroken, 0);
  assert.ok(result.summary.byRole.some((row) => row.key === "source" && row.count === 4));
  assert.ok(result.summary.byRole.some((row) => row.key === "provenance"));
  assert.ok(result.summary.byRole.some((row) => row.key === "candidate"));

  const byUrl = new Map(result.results.map((row) => [row.url, row]));
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/ok").ok, true);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/ok").roles.includes("source"), true);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/redirect").redirected, true);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/redirect").finalUrl, "https://www.tbmm.gov.tr/yeni");
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/broken").ok, false);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/broken").error, "HTTP 500");
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/kurum-broken").ok, false);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/unsafe-redirect").ok, false);
  assert.match(byUrl.get("https://www.tbmm.gov.tr/unsafe-redirect").error, /Güvenli olmayan yönlendirme/);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/method").ok, true);
  assert.equal(byUrl.get("https://www.tbmm.gov.tr/method").status, 200);
  assert.equal(byUrl.get("https://www.ataturkansiklopedisi.gov.tr/detay/1/aday").roles.includes("candidate"), true);
  assert.ok(fetchImpl.calls.some((call) => call.url.endsWith("/method") && call.method === "GET"));
});

test("yinelenen URL'ler tek istekte birleştirilir", async () => {
  const fetchImpl = fetchRoutes();
  const duplicateRecords = [
    makeRecord({ id: "a", source: { url: "https://www.tbmm.gov.tr/kurum" } }),
    makeRecord({ id: "b", source: { url: "https://www.tbmm.gov.tr/kurum" } }),
  ];
  const result = await checkSourceLinks(duplicateRecords, {
    online: true,
    fetchImpl,
    concurrency: 1,
    checkedAt: "2026-10-23T00:00:00.000Z",
  });
  const calls = fetchImpl.calls.filter((call) => call.url === "https://www.tbmm.gov.tr/kurum");
  assert.equal(calls.length, 1);
  const row = result.results.find((item) => item.url === "https://www.tbmm.gov.tr/kurum");
  assert.deepEqual(row.recordIds, ["a", "b"]);
  assert.equal(result.summary.sourceChecked, 1);
});

test("çevrimiçi modda fetch yoksa hata verir", async () => {
  await assert.rejects(
    checkSourceLinks([makeRecord()], { online: true, fetchImpl: null }),
    /fetch gerekli/
  );
});
