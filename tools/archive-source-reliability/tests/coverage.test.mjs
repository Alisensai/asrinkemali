import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { analyzeEarlyPeriodCoverage } from "../src/coverage.mjs";
import { makeRecord } from "./fixtures.mjs";

const CONFIG_PATH = new URL("../data/coverage-periods.json", import.meta.url);
const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));

function byId(result, recordId) {
  return result.records.find((record) => record.recordId === recordId);
}

function phase(result, phaseId) {
  return result.phaseMatrix.find((item) => item.id === phaseId);
}

test("kayıt tarihi ile biyografik kapsamı ayırır", () => {
  const records = [
    makeRecord({
      id: "front",
      title: "Çanakkale Cephesi'nde Mustafa Kemal",
      type: "event",
      date: { start: "1915-04-25", end: null, precision: "day", certainty: "exact" },
    }),
    makeRecord({
      id: "sisli",
      title: "Şişli Atatürk Evi",
      type: "place",
      date: { start: "1918-01-01", end: null, precision: "year", certainty: "exact" },
      summary: "Atatürk'ün ikamet ettiği ev.",
    }),
    makeRecord({
      id: "tanin",
      title: "Tanin Gazetesi",
      type: "publication",
      date: { start: "1908-08-01", end: null, precision: "day", certainty: "exact" },
      people: [{ name: "Tevfik Fikret", role: "author" }],
      summary: "1908'de yayımlanmaya başlayan gazete.",
    }),
    makeRecord({
      id: "manastir",
      title: "Manastır Askeri İdadisi",
      type: "place",
      date: { start: "1847-01-01", end: null, precision: "year", certainty: "exact" },
      summary: "Manastır'da eğitim veren askeri idadi.",
    }),
    makeRecord({
      id: "dolmabahce",
      title: "Dolmabahçe Sarayı",
      type: "place",
      date: { start: "1843-01-01", end: "1856-12-31", precision: "range", certainty: "exact" },
      summary: "Atatürk tarafından kullanılmış saray.",
    }),
    makeRecord({
      id: "undated",
      title: "Tarihsiz Kayıt",
      type: "event",
      date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "Bilinmiyor" },
    }),
  ];
  const result = analyzeEarlyPeriodCoverage(records, config);
  assert.equal(byId(result, "front").coverageRole, "direct-biographical");
  assert.equal(byId(result, "sisli").coverageRole, "associated-place");
  assert.equal(byId(result, "tanin").coverageRole, "contextual");
  assert.equal(byId(result, "manastir").coverageRole, "early-life-reference-outside-date");
  assert.deepEqual(byId(result, "manastir").referencePhaseIds, ["military-education"]);
  assert.equal(byId(result, "dolmabahce").coverageRole, "out-of-period");
  assert.equal(byId(result, "undated").coverageRole, "undated");
  assert.equal(result.summary.periodRecordCount, 3);
  assert.equal(result.summary.directBiographicalRecords, 1);
  assert.equal(result.summary.associatedPlaceRecords, 1);
  assert.equal(result.summary.contextualRecords, 1);
  assert.equal(result.summary.earlyLifeReferenceOutsideDate, 1);
  assert.equal(result.summary.outOfPeriodRecords, 1);
  assert.equal(result.summary.undatedRecords, 1);
});

test("evre matrisi doğrudan, mekân, bağlam ve referans sayımlarını yapar", () => {
  const records = [
    makeRecord({
      id: "front",
      title: "Çanakkale Cephesi'nde Mustafa Kemal",
      type: "event",
      date: { start: "1915-04-25", end: null, precision: "day", certainty: "exact" },
    }),
    makeRecord({
      id: "sisli",
      title: "Şişli Atatürk Evi",
      type: "place",
      date: { start: "1918-01-01", end: null, precision: "year", certainty: "exact" },
      summary: "Atatürk'ün ikamet ettiği ev.",
    }),
    makeRecord({
      id: "tanin",
      title: "Tanin Gazetesi",
      type: "publication",
      date: { start: "1908-08-01", end: null, precision: "day", certainty: "exact" },
      people: [{ name: "Tevfik Fikret", role: "author" }],
      summary: "1908'de yayımlanmaya başlayan gazete.",
    }),
    makeRecord({
      id: "manastir",
      title: "Manastır Askeri İdadisi",
      type: "place",
      date: { start: "1847-01-01", end: null, precision: "year", certainty: "exact" },
      summary: "Manastır'da eğitim veren askeri idadi.",
    }),
  ];
  const result = analyzeEarlyPeriodCoverage(records, config);
  assert.equal(phase(result, "wwi").directCount, 1);
  assert.equal(phase(result, "wwi").associatedCount, 1);
  assert.equal(phase(result, "wwi").status, "covered");
  assert.equal(phase(result, "birth-childhood").status, "missing");
  assert.equal(phase(result, "military-education").status, "reference-only");
  assert.equal(phase(result, "military-education").referenceOnlyCount, 1);
  assert.equal(phase(result, "salonika-cup").status, "context-only");
  assert.equal(phase(result, "early-officer").status, "missing");
  assert.equal(result.summary.phasesWithDirect, 1);
  assert.equal(result.summary.phasesWithReferenceOnly, 1);
  assert.equal(result.summary.yearsWithAnyRecord.join(","), "1908,1915,1918");
  assert.equal(result.summary.emptyYearCount, 35);
});

test("aday kaynaklar evrelere bağlanır ve arşivde olanlar filtrelenir", () => {
  const records = [
    makeRecord({
      id: "existing",
      title: "Mevcut AYK Kaydı",
      type: "event",
      date: { start: "1930-01-01", end: null, precision: "day", certainty: "exact" },
      source: {
        institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
        archiveIdentifier: "AYK-3",
        url: "https://www.ataturkansiklopedisi.gov.tr/detay/3/mevcut",
      },
    }),
    makeRecord({
      id: "tanin",
      title: "Tanin Gazetesi",
      type: "publication",
      date: { start: "1908-08-01", end: null, precision: "day", certainty: "exact" },
      people: [{ name: "Tevfik Fikret", role: "author" }],
      summary: "1908'de yayımlanmaya başlayan gazete.",
    }),
  ];
  const candidates = [
    { sourceId: "AYK-1", title: "Aday 1", url: "https://www.ataturkansiklopedisi.gov.tr/detay/1/aday", gapPhases: ["salonika-cup"], coverageType: "dedicated" },
    { sourceId: "AYK-2", title: "Aday 2", url: "https://www.ataturkansiklopedisi.gov.tr/detay/2/aday", gapPhases: ["early-officer"], coverageType: "broad" },
    { sourceId: "AYK-3", title: "Mevcut AYK Kaydı", url: "https://www.ataturkansiklopedisi.gov.tr/detay/3/mevcut", gapPhases: ["birth-childhood"], coverageType: "dedicated" },
  ];
  const result = analyzeEarlyPeriodCoverage(records, config, { candidateSeeds: candidates });
  assert.deepEqual(phase(result, "salonika-cup").candidateIds, ["AYK-1"]);
  assert.equal(phase(result, "salonika-cup").candidateCoverage, "dedicated");
  assert.deepEqual(phase(result, "early-officer").candidateIds, ["AYK-2"]);
  assert.equal(phase(result, "early-officer").candidateCoverage, "broad-only");
  assert.deepEqual(phase(result, "birth-childhood").candidateIds, []);
  assert.equal(result.summary.phasesWithCandidates, 2);
  assert.equal(result.summary.phasesWithoutCandidates, 5);
});

test("kapsam boşlukları ve öneriler üretilir", () => {
  const records = [
    makeRecord({
      id: "tanin",
      title: "Tanin Gazetesi",
      type: "publication",
      date: { start: "1908-08-01", end: null, precision: "day", certainty: "exact" },
      people: [{ name: "Tevfik Fikret", role: "author" }],
      summary: "1908'de yayımlanmaya başlayan gazete.",
    }),
  ];
  const result = analyzeEarlyPeriodCoverage(records, config);
  assert.ok(result.gaps.some((gap) => gap.id === "no-direct-biographical-records"));
  assert.ok(result.gaps.some((gap) => gap.id === "missing-direct-types"));
  assert.ok(result.gaps.some((gap) => gap.id === "empty-year-ranges"));
  assert.ok(result.recommendations.some((item) => item.includes("uzman")));
});
