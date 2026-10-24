import test from "node:test";
import assert from "node:assert/strict";
import { convertCandidateToDraft } from "../lib/convert-dryrun.mjs";
import { makeCandidate, makeArchiveRecord } from "./helpers.mjs";

function fullyApprovedCandidate(overrides = {}) {
  return makeCandidate({
    state: "import_ready",
    verification: {
      urlReachable: true,
      citationComplete: true,
      rightsKnown: true,
      duplicateChecked: true,
      aiReviewed: true,
      humanReviewed: true,
      notes: "",
    },
    ...overrides,
  });
}

test("dry-run: tüm koşullar sağlanırsa TASLAK (draft) kayıt üretilir", () => {
  const result = convertCandidateToDraft(fullyApprovedCandidate(), []);
  assert.equal(result.outcome, "ok");
  assert.equal(result.record.verification.status, "draft");
  assert.equal(result.record.schemaVersion, "1.1.0");
  assert.equal(result.record.holding.mode, "external_link");
  assert.equal(result.record.rights.imageReuse, "not_downloaded");
});

test("insan incelemesi olmadan yayımlama engeli: humanReviewed=false dönüşümü bloklar", () => {
  const result = convertCandidateToDraft(makeCandidate(), []);
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "HUMAN_REVIEW_REQUIRED"));
});

test("yayın üretilemez: dönüştürülen kayıt asla 'published' olamaz", () => {
  const result = convertCandidateToDraft(fullyApprovedCandidate(), []);
  assert.equal(result.outcome, "ok");
  assert.equal(result.record.verification.status, "draft");
  assert.equal(result.record.verification.reviewedBy, null);
  // Kod düzeyinde published üreten yol yoktur: status sabit "draft" atanır.
  assert.match(result.record.verification.notes, /yayımlanamaz|İnsan uzman onayı YOKTUR/);
});

test("eksik künye: yazar/yayın tarihi eksikse dönüşüm bloklanır", () => {
  const result = convertCandidateToDraft(
    fullyApprovedCandidate({ authors: [], publishedAt: null }),
    []
  );
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "CITATION_INCOMPLETE"));
});

test("hak bilgisi bilinmiyorsa dönüşüm bloklanır", () => {
  const result = convertCandidateToDraft(
    fullyApprovedCandidate({ rights: { ...makeCandidate().rights, status: "unknown" } }),
    []
  );
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "RIGHTS_UNKNOWN"));
});

test("sentetik aday asla dönüştürülemez", () => {
  const result = convertCandidateToDraft(fullyApprovedCandidate({ synthetic: true }), []);
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "SYNTHETIC_FORBIDDEN"));
});

test("durum 'import_ready' değilse dönüşüm bloklanır", () => {
  const result = convertCandidateToDraft(
    fullyApprovedCandidate({ state: "awaiting_human_review" }),
    []
  );
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "STATE_NOT_IMPORT_READY"));
});

test("arşivde aynı URL varsa dönüşüm bloklanır (tekrar koruması)", () => {
  const candidate = fullyApprovedCandidate({ url: "https://ornek.gov.tr/madde/1" });
  const record = makeArchiveRecord({
    source: { ...makeArchiveRecord().source, url: "https://ornek.gov.tr/madde/1" },
  });
  const result = convertCandidateToDraft(candidate, [record]);
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "DUPLICATE_IN_ARCHIVE"));
});

test("arşivde aynı kurum arşiv kimliği varsa dönüşüm bloklanır", () => {
  const candidate = fullyApprovedCandidate({ archiveIdentifier: "AYK-166" });
  const record = makeArchiveRecord({
    source: { ...makeArchiveRecord().source, url: "https://baska.gov.tr/x", archiveIdentifier: "AYK-166" },
  });
  const result = convertCandidateToDraft(candidate, [record]);
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "DUPLICATE_IN_ARCHIVE"));
});

test("erişilemeyen URL dönüşümü bloklar (erişilebilirlik koşulu)", () => {
  const candidate = fullyApprovedCandidate({
    verification: { urlReachable: false, citationComplete: true, rightsKnown: true, duplicateChecked: true, aiReviewed: true, humanReviewed: true, notes: "" },
  });
  const result = convertCandidateToDraft(candidate, []);
  assert.equal(result.outcome, "blocked");
  assert.ok(result.blockers.some((blocker) => blocker.code === "URL_NOT_REACHABLE"));
});

test("geçersiz aday: bozuk nesne 'invalid' döner", () => {
  const result = convertCandidateToDraft(null, []);
  assert.equal(result.outcome, "invalid");
  const bad = convertCandidateToDraft({ id: "yanlış" }, []);
  assert.equal(bad.outcome, "invalid");
});

test("katalog yazma koruması: korumalı yollar reddedilir", async () => {
  const { assertNoCatalogWrite } = await import("../lib/types.mjs");
  assert.throws(() => assertNoCatalogWrite("data/archive/catalog/x.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.throws(() => assertNoCatalogWrite("content/archive/records/a.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.doesNotThrow(() => assertNoCatalogWrite("data/research/candidates/exports/x.json"));
});

test("dry-run çıktı yolu yalnızca exports/ altına düşer", async () => {
  const { draftExportPath } = await import("../lib/convert-dryrun.mjs");
  // Görev 07 (QA-098): Windows'ta path.join ters eğik çizgi üretir; karşılaştırma ayırıcıdan bağımsız.
  const target = draftExportPath("/repo", "src-2026-0001").replaceAll("\\", "/");
  assert.match(target, /data\/research\/candidates\/exports\/src-2026-0001\.json$/);
  // Üretilen yol asla korumalı katalog dizinlerine giremez
  assert.ok(!target.includes("data/archive/catalog"));
  assert.ok(!target.includes("content/archive/records"));
});
