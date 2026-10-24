import test from "node:test";
import assert from "node:assert/strict";

import { auditRecordSufficiency, auditSourceSufficiency } from "../src/sufficiency.mjs";
import { makeImageRecord, makeRecord } from "./fixtures.mjs";

test("tam kaynak bileşenleri güçlü kayıt üretir", () => {
  const record = makeRecord({ id: "full" });
  const result = auditRecordSufficiency(record);
  assert.equal(result.score, 100);
  assert.equal(result.level, "strong");
  assert.equal(result.deficits.length, 0);
  assert.equal(result.caps.length, 0);
  assert.equal(result.flags.officialInstitution, true);
});

test("künye eksikliği puanı düşürür ve düzeyi sınırlar", () => {
  const record = makeRecord({ id: "no-citation", source: { citation: "" } });
  const result = auditRecordSufficiency(record);
  assert.equal(result.score, 85);
  assert.equal(result.scoreLevel, "strong");
  assert.equal(result.level, "partial");
  assert.ok(result.caps.some((cap) => cap.reason.includes("künye")));
  assert.ok(result.deficits.some((deficit) => deficit.key === "citation"));
});

test("kaynak URL'si yoksa kayıt yeterli düzeyin altındadır", () => {
  const record = makeRecord({ id: "no-url", source: { url: "" } });
  const result = auditRecordSufficiency(record);
  assert.equal(result.level, "partial");
  assert.ok(result.caps.some((cap) => cap.reason.includes("Kaynak URL")));
  assert.ok(result.deficits.some((deficit) => deficit.key === "provenanceMatch"));
});

test("fotoğrafın kaynak sayfası yoksa türe özgü kanıt eksik sayılır", () => {
  const record = makeImageRecord({ id: "image-no-page" });
  record.image.sourcePageUrl = null;
  const result = auditRecordSufficiency(record);
  assert.equal(result.level, "adequate");
  assert.ok(result.deficits.some((deficit) => deficit.key === "typeEvidence"));
});

test("hak durumu bilinmiyorsa düzey adequate ile sınırlanır", () => {
  const record = makeRecord({
    id: "unknown-rights",
    rights: { status: "unknown" },
  });
  const result = auditRecordSufficiency(record);
  assert.equal(result.level, "adequate");
  assert.ok(result.caps.some((cap) => cap.reason.includes("Hak durumu")));
});

test("provenans kaynakla eşleşmiyorsa düzey sınırlanır", () => {
  const record = makeRecord({
    id: "provenance-mismatch",
    provenance: [
      {
        institution: "Başka Kurum",
        collection: "Test",
        identifier: "OTHER-ID",
        url: "https://www.tbmm.gov.tr/baska",
        accessedAt: "2026-10-23",
        note: "Test.",
      },
    ],
  });
  const result = auditRecordSufficiency(record);
  assert.equal(result.level, "adequate");
  assert.ok(result.caps.some((cap) => cap.reason.includes("Provenans")));
});

test("doğrulanmış konuşma alıntısı türe özgü kanıt sayılır", () => {
  const record = makeRecord({
    id: "speech",
    type: "speech",
    quotation: {
      text: "Test alıntısı.",
      speaker: "Mustafa Kemal Atatürk",
      work: "Test",
      date: "1920-04-23",
      context: "Test",
      sourceUrl: "https://www.tbmm.gov.tr/test",
      sourceTitle: "Test",
      evidence: "Test",
      verified: true,
    },
  });
  const result = auditRecordSufficiency(record);
  assert.equal(result.level, "strong");
  assert.equal(result.flags.quoteVerified, false, "rozet ayrı kontrol alanından gelir");
});

test("kaynak yeterliliği özeti düzey ve eksik dağılımını hesaplar", () => {
  const records = [
    makeRecord({ id: "full" }),
    makeRecord({ id: "no-citation", source: { citation: "" } }),
    makeRecord({ id: "no-url", source: { url: "" } }),
  ];
  const result = auditSourceSufficiency(records);
  assert.equal(result.summary.totalRecords, 3);
  assert.equal(result.summary.strongRecords, 1);
  assert.equal(result.summary.partialRecords, 2);
  assert.equal(result.summary.belowAdequate, 2);
  assert.equal(result.summary.citationMissing, 1);
  assert.equal(result.summary.sourceUrlMissing, 1);
  assert.ok(result.summary.deficitCounts.some((item) => item.key === "citation"));
});
