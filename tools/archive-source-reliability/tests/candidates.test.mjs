import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { buildCandidateReport, refreshCandidateMetadata } from "../src/candidates.mjs";
import { analyzeEarlyPeriodCoverage } from "../src/coverage.mjs";
import { makeRecord } from "./fixtures.mjs";

const CONFIG = JSON.parse(await fs.readFile(new URL("../data/coverage-periods.json", import.meta.url), "utf8"));

function coverageFor(records) {
  return analyzeEarlyPeriodCoverage(records, CONFIG);
}

function candidate(overrides = {}) {
  return {
    id: "candidate-default",
    sourceId: "AYK-101",
    institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
    institutionType: "institutional",
    institutionUrl: "https://www.ataturkansiklopedisi.gov.tr/",
    title: "Aday Kaynak",
    author: "Test Yazarı",
    publishedAt: "2022-01-01",
    url: "https://www.ataturkansiklopedisi.gov.tr/detay/101/aday",
    definition: "  Aday   kaynağın\n tanımı.  ",
    keywords: ["Selanik", "Hareket Ordusu"],
    period: "1908-1911",
    gapPhases: ["salonika-cup"],
    coverageType: "dedicated",
    priority: "high",
    whyCandidate: "Evrede doğrudan kayıt yok.",
    status: "unverified",
    ingest: false,
    ...overrides,
  };
}

test("uygun aday unverified ve ingest=false olarak raporlanır", () => {
  const records = [makeRecord({ id: "existing" })];
  const coverage = coverageFor(records);
  const file = { discoveredAt: "2026-10-23", candidates: [candidate()] };
  const before = JSON.parse(JSON.stringify(file));
  const result = buildCandidateReport(file, records, coverage);
  assert.equal(result.summary.seedCandidates, 1);
  assert.equal(result.summary.eligibleCandidates, 1);
  assert.equal(result.candidates[0].status, "unverified");
  assert.equal(result.candidates[0].ingest, false);
  assert.equal(result.candidates[0].humanApproved, false);
  assert.equal(result.candidates[0].verificationRequired, true);
  assert.equal(result.candidates[0].definition, "Aday kaynağın tanımı.");
  assert.equal(result.candidates[0].phaseLabels[0], "Selanik, İttihat ve Terakki, Hareket Ordusu");
  assert.equal(result.candidates[0].urlCheck.status, "not_checked");
  assert.deepEqual(file, before, "aday dosyası değiştirilmemeli");
});

test("arşivde aynı kimlik veya URL olan adaylar filtrelenir", () => {
  const existing = makeRecord({
    id: "existing-ayk",
    title: "Mevcut AYK",
    source: {
      institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
      archiveIdentifier: "AYK-3",
      url: "https://www.tbmm.gov.tr/mevcut/",
    },
  });
  const records = [existing];
  const coverage = coverageFor(records);
  const file = {
    candidates: [
      candidate({ id: "by-id", sourceId: "AYK-3", url: "https://www.ataturkansiklopedisi.gov.tr/detay/3/x" }),
      candidate({ id: "by-canonical", sourceId: "AYK-4", url: "https://tbmm.gov.tr/mevcut" }),
      candidate({ id: "eligible", sourceId: "AYK-5", url: "https://www.ataturkansiklopedisi.gov.tr/detay/5/y" }),
    ],
  };
  const result = buildCandidateReport(file, records, coverage);
  assert.equal(result.summary.eligibleCandidates, 1);
  assert.equal(result.summary.filteredAlreadyInArchive, 2);
  assert.equal(result.filtered[0].reason, "source_identifier_already_in_archive");
  assert.equal(result.filtered[1].reason, "canonical_source_url_already_in_archive");
  assert.equal(result.candidates[0].sourceId, "AYK-5");
});

test("başlık çakışması adayı silmez, görünür biçimde işaretler", () => {
  const existing = makeRecord({ id: "existing-title", title: "Aynı Başlık" });
  const file = {
    candidates: [
      candidate({ id: "title-collision", sourceId: "AYK-102", title: "Aynı Başlık", url: "https://www.ataturkansiklopedisi.gov.tr/detay/102/x" }),
    ],
  };
  const result = buildCandidateReport(file, [existing], coverageFor([existing]));
  assert.equal(result.summary.eligibleCandidates, 1);
  assert.deepEqual(result.candidates[0].titleCollisionIds, ["existing-title"]);
});

test("aday dosyasındaki ingest=true politika ihlali olarak raporlanır ve normalize edilir", () => {
  const records = [makeRecord({ id: "existing" })];
  const file = {
    candidates: [
      candidate({ id: "bad-policy", sourceId: "AYK-103", title: "Politika Adayı", status: "approved", ingest: true }),
    ],
  };
  const result = buildCandidateReport(file, records, coverageFor(records));
  assert.equal(result.candidates[0].status, "unverified");
  assert.equal(result.candidates[0].ingest, false);
  assert.ok(result.candidates[0].policyViolation);
  assert.equal(result.summary.policyViolations, 1);
  assert.equal(result.policyViolations[0].id, "bad-policy");
  assert.equal(result.candidates[0].humanApproved, false);
});

test("bağlantı denetimi sonuçları adaya yansıtılır", () => {
  const records = [makeRecord({ id: "existing" })];
  const okUrl = "https://www.ataturkansiklopedisi.gov.tr/detay/201/ok";
  const redirectUrl = "https://www.ataturkansiklopedisi.gov.tr/detay/202/redirect";
  const brokenUrl = "https://www.ataturkansiklopedisi.gov.tr/detay/203/broken";
  const file = {
    candidates: [
      candidate({ id: "ok", sourceId: "AYK-201", url: okUrl }),
      candidate({ id: "redirect", sourceId: "AYK-202", url: redirectUrl }),
      candidate({ id: "broken", sourceId: "AYK-203", url: brokenUrl }),
    ],
  };
  const linkCheck = {
    results: [
      { url: okUrl, finalUrl: okUrl, status: 200, ok: true, error: null },
      { url: redirectUrl, finalUrl: "https://www.ataturkansiklopedisi.gov.tr/detay/202/yeni", status: 200, ok: true, error: null },
      { url: brokenUrl, finalUrl: brokenUrl, status: 500, ok: false, error: "HTTP 500" },
    ],
  };
  const result = buildCandidateReport(file, records, coverageFor(records), { linkCheck });
  const bySource = new Map(result.candidates.map((item) => [item.sourceId, item]));
  assert.equal(bySource.get("AYK-201").urlCheck.status, "ok");
  assert.equal(bySource.get("AYK-202").urlCheck.status, "redirected");
  assert.equal(bySource.get("AYK-202").urlCheck.finalUrl, "https://www.ataturkansiklopedisi.gov.tr/detay/202/yeni");
  assert.equal(bySource.get("AYK-203").urlCheck.status, "broken");
  assert.equal(bySource.get("AYK-203").urlCheck.error, "HTTP 500");
});

test("aday metadata yenileme AYK yanıtını normalize eder", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          title: "  Yeni Başlık ",
          writerName: " Yeni Yazar ",
          releaseDate: "2022-02-22T21:00:00.000Z",
          definition: " Yeni\n tanım ",
          keyword: "a, b , ",
        },
      }),
    };
  };
  const result = await refreshCandidateMetadata(
    [candidate({ id: "refresh", sourceId: "AYK-243" })],
    { fetchImpl, checkedAt: "2026-10-23" }
  );
  assert.equal(result.refreshed, 1);
  assert.equal(result.failed.length, 0);
  assert.equal(result.candidates[0].title, "Yeni Başlık");
  assert.equal(result.candidates[0].author, "Yeni Yazar");
  assert.equal(result.candidates[0].publishedAt, "2022-02-23");
  assert.equal(result.candidates[0].definition, "Yeni tanım");
  assert.deepEqual(result.candidates[0].keywords, ["a", "b"]);
  assert.equal(result.candidates[0].metadataCheckedAt, "2026-10-23");
  assert.match(calls[0], /\/243$/);
});

test("metadata yenileme hataları adayı silmeden raporlanır", async () => {
  const noId = await refreshCandidateMetadata([candidate({ id: "no-id", sourceId: "ADAY" })], {
    fetchImpl: async () => {
      throw new Error("çağrılmamalı");
    },
    checkedAt: "2026-10-23",
  });
  assert.equal(noId.refreshed, 0);
  assert.equal(noId.failed.length, 1);
  assert.equal(noId.candidates[0].id, "no-id");

  const httpError = await refreshCandidateMetadata([candidate({ id: "http", sourceId: "AYK-1" })], {
    fetchImpl: async () => ({ ok: false, status: 503 }),
    checkedAt: "2026-10-23",
  });
  assert.equal(httpError.failed.length, 1);
  assert.equal(httpError.candidates[0].refreshError, "HTTP 503");

  const badPayload = await refreshCandidateMetadata([candidate({ id: "payload", sourceId: "AYK-2" })], {
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: false }) }),
    checkedAt: "2026-10-23",
  });
  assert.equal(badPayload.failed.length, 1);
  assert.match(badPayload.candidates[0].refreshError, /AYK yanıtı/);
});
