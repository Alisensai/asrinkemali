import test from "node:test";
import assert from "node:assert/strict";

import { buildSourceClassification, classifyRecordSource } from "../src/classification.mjs";
import { makeRecord } from "./fixtures.mjs";

function record(overrides) {
  return makeRecord(overrides);
}

test("AYK ansiklopedisi ve ATAM yayınları ikincil sayılır", () => {
  const ayk = record({
    id: "ayk-test",
    source: {
      institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
      institutionType: "institutional",
      url: "https://www.ataturkansiklopedisi.gov.tr/detay/1/test",
    },
  });
  const atam = record({
    id: "atam-test",
    source: {
      institution: "Atatürk Araştırma Merkezi Yayınları",
      institutionType: "institutional",
      url: "https://www.atam.gov.tr/test",
    },
  });
  assert.equal(classifyRecordSource(ayk).role, "secondary");
  assert.equal(classifyRecordSource(ayk).evidenceLevel, "interpretation");
  assert.equal(classifyRecordSource(atam).role, "secondary");
});

test("TBMM belgesi ve fotoğrafı birincil sayılır", () => {
  const document = record({
    id: "tbmm-document",
    type: "document",
    source: {
      institution: "Türkiye Büyük Millet Meclisi",
      institutionType: "official",
      url: "https://www.tbmm.gov.tr/tutanak",
    },
  });
  const photograph = record({
    id: "tbmm-photo",
    type: "photograph",
    source: {
      institution: "Türkiye Büyük Millet Meclisi",
      institutionType: "official",
      url: "https://cdn.tbmm.gov.tr/fotograf.jpg",
    },
  });
  assert.equal(classifyRecordSource(document).role, "primary");
  assert.equal(classifyRecordSource(document).evidenceLevel, "transcription");
  assert.equal(classifyRecordSource(photograph).role, "primary");
  assert.equal(classifyRecordSource(photograph).evidenceLevel, "artifact");
});

test("İBB arşiv öğesi birincil, olay kaydı referanstır", () => {
  const photograph = record({
    id: "ibb-photo",
    type: "photograph",
    source: {
      institution: "İstanbul Büyükşehir Belediyesi Atatürk Kitaplığı",
      institutionType: "library",
      url: "https://katalog.ibb.gov.tr/test",
    },
  });
  const event = record({
    id: "ibb-event",
    type: "event",
    source: {
      institution: "İstanbul Büyükşehir Belediyesi Atatürk Kitaplığı",
      institutionType: "library",
      url: "https://katalog.ibb.gov.tr/etkinlik",
    },
  });
  assert.equal(classifyRecordSource(photograph).role, "primary");
  assert.equal(classifyRecordSource(event).role, "reference");
});

test("Millî Kütüphane katalog kaydı referanstır", () => {
  const recordValue = record({
    id: "mk-test",
    type: "publication",
    source: {
      institution: "Millî Kütüphane",
      institutionType: "library",
      url: "https://www.millikutuphane.gov.tr/test",
    },
  });
  assert.equal(classifyRecordSource(recordValue).role, "reference");
  assert.equal(classifyRecordSource(recordValue).evidenceLevel, "catalog");
});

test("bilinmeyen kurum unknown rolündedir", () => {
  const recordValue = record({
    id: "unknown-test",
    source: {
      institution: "Bilinmeyen Kurum",
      institutionType: "other",
      url: "https://example.com/test",
    },
  });
  assert.equal(classifyRecordSource(recordValue).role, "unknown");
});

test("uzman geçersiz kılması rolü ve kanıt düzeyini değiştirir", () => {
  const recordValue = record({
    id: "ayk-override",
    source: {
      institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
      institutionType: "institutional",
      url: "https://www.ataturkansiklopedisi.gov.tr/detay/2/test",
    },
  });
  const result = classifyRecordSource(recordValue, {
    "ayk-override": {
      role: "primary",
      evidenceLevel: "artifact",
      confidence: "high",
      basis: ["Uzman kararı"],
      caveats: ["Belge aslına erişim doğrulandı."],
    },
  });
  assert.equal(result.role, "primary");
  assert.equal(result.evidenceLevel, "artifact");
  assert.equal(result.overridden, true);
});

test("sınıflandırma özeti birincil payı ve kurum kırılımını hesaplar", () => {
  const records = [
    record({ id: "a", source: { institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)", institutionType: "institutional" } }),
    record({ id: "b", type: "document", source: { institution: "Türkiye Büyük Millet Meclisi", institutionType: "official" } }),
    record({ id: "c", type: "photograph", source: { institution: "İstanbul Büyükşehir Belediyesi Atatürk Kitaplığı", institutionType: "library" } }),
    record({ id: "d", type: "publication", source: { institution: "Millî Kütüphane", institutionType: "library" } }),
  ];
  const result = buildSourceClassification(records);
  assert.equal(result.summary.total, 4);
  assert.equal(result.summary.primaryCount, 2);
  assert.equal(result.summary.secondaryCount, 1);
  assert.equal(result.summary.referenceCount, 1);
  assert.equal(result.summary.primaryShare, 0.5);
  assert.equal(result.summary.byInstitution.length, 4);
  assert.equal(result.summary.overrideCount, 0);
});
