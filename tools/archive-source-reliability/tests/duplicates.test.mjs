import test from "node:test";
import assert from "node:assert/strict";

import { detectSharedSources } from "../src/duplicates.mjs";
import { makeRecord } from "./fixtures.mjs";

function provenance(identifier, institution = "Test Arşivi") {
  return [
    {
      institution,
      collection: "Test koleksiyonu",
      identifier,
      url: `https://www.tbmm.gov.tr/provenance/${identifier}`,
      accessedAt: "2026-10-23",
      note: "Test provenansı.",
    },
  ];
}

test("aynı kaynak URL'si yüksek önemde grup oluşturur", () => {
  const records = [
    makeRecord({ id: "exact-1", title: "Aynı Kaynak 1", source: { url: "https://www.tbmm.gov.tr/ayni", archiveIdentifier: "A1" }, provenance: provenance("P1") }),
    makeRecord({ id: "exact-2", title: "Aynı Kaynak 2", source: { url: "https://www.tbmm.gov.tr/ayni", archiveIdentifier: "A2" }, provenance: provenance("P2") }),
  ];
  const result = detectSharedSources(records);
  assert.equal(result.summary.groupCount, 1);
  assert.equal(result.summary.exactUrlClusters, 1);
  assert.equal(result.groups[0].severity, "high");
  assert.deepEqual(result.groups[0].recordIds, ["exact-1", "exact-2"]);
});

test("URL normalizasyonu sonrası aynı kaynak yakalanır", () => {
  const records = [
    makeRecord({ id: "canonical-1", source: { url: "https://www.tbmm.gov.tr/test/", archiveIdentifier: "B1" }, provenance: provenance("P1") }),
    makeRecord({ id: "canonical-2", source: { url: "https://tbmm.gov.tr/test", archiveIdentifier: "B2" }, provenance: provenance("P2") }),
  ];
  const result = detectSharedSources(records);
  assert.equal(result.summary.canonicalUrlClusters, 1);
  assert.equal(result.groups[0].severity, "high");
});

test("aynı kurum ve arşiv kimliği orta önemde grup oluşturur", () => {
  const records = [
    makeRecord({ id: "identifier-1", title: "Konu A", source: { url: "https://www.tbmm.gov.tr/a", archiveIdentifier: "C1" }, provenance: provenance("P1") }),
    makeRecord({ id: "identifier-2", title: "Konu B", source: { url: "https://www.tbmm.gov.tr/b", archiveIdentifier: "C1" }, provenance: provenance("P2") }),
  ];
  const result = detectSharedSources(records);
  assert.equal(result.summary.institutionIdentifierClusters, 1);
  assert.equal(result.summary.highSeverity, 0);
  assert.equal(result.groups[0].severity, "medium");
  assert.deepEqual(result.groups[0].archiveIdentifiers, ["C1"]);
});

test("aynı provenans kimliği ayrı kayıtları gruplar", () => {
  const records = [
    makeRecord({
      id: "prov-1",
      source: { institution: "Kurum A", institutionType: "other", url: "https://www.tbmm.gov.tr/a", archiveIdentifier: "D1" },
      provenance: provenance("P4", "Ortak Arşiv"),
    }),
    makeRecord({
      id: "prov-2",
      source: { institution: "Kurum B", institutionType: "other", url: "https://www.tbmm.gov.tr/b", archiveIdentifier: "D2" },
      provenance: provenance("P4", "Ortak Arşiv"),
    }),
  ];
  const result = detectSharedSources(records);
  assert.equal(result.summary.provenanceIdentifierClusters, 1);
  assert.equal(result.summary.groupCount, 1);
  assert.deepEqual(result.groups[0].recordIds, ["prov-1", "prov-2"]);
});

test("paylaşılan resmî kaynak grupları sayılır", () => {
  const records = [
    makeRecord({ id: "official-1", source: { url: "https://www.tbmm.gov.tr/ayni", archiveIdentifier: "A1" }, provenance: provenance("P1") }),
    makeRecord({ id: "official-2", source: { url: "https://www.tbmm.gov.tr/ayni", archiveIdentifier: "A2" }, provenance: provenance("P2") }),
  ];
  const result = detectSharedSources(records);
  assert.equal(result.summary.sharedOfficialSourceGroups, 1);
  assert.equal(result.summary.sharedRecordCount, 2);
});

test("paylaşılan kaynak yoksa boş özet döner", () => {
  const records = [
    makeRecord({ id: "solo-1", source: { url: "https://www.tbmm.gov.tr/1", archiveIdentifier: "S1" }, provenance: provenance("S1") }),
    makeRecord({ id: "solo-2", source: { url: "https://www.tbmm.gov.tr/2", archiveIdentifier: "S2" }, provenance: provenance("S2") }),
  ];
  const result = detectSharedSources(records);
  assert.equal(result.summary.groupCount, 0);
  assert.equal(result.summary.sharedRecordCount, 0);
  assert.deepEqual(result.groups, []);
});
