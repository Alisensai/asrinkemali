import test from "node:test";
import assert from "node:assert/strict";
import { assertNoCatalogWrite } from "../lib/types.mjs";
import { importCandidatesFromCsv, importCandidatesFromJson, parseCsv } from "../lib/importers.mjs";
import { registerSourceProvider, listSourceProviders, getSourceProvider, mergeIntoPool, organizeCandidates } from "../lib/adapters.mjs";
import { makeCandidate } from "./helpers.mjs";

test("katalog yazma koruması: göreli, mutlak ve katman geçişli yollar reddedilir", () => {
  // Göreli
  assert.throws(() => assertNoCatalogWrite("data/archive/catalog/x.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.throws(() => assertNoCatalogWrite("content/archive/records/a.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.throws(() => assertNoCatalogWrite("schemas/archive-record.types.ts"), /Korumalı arşiv yoluna yazma reddedildi/);
  // MUTLAK yollar (gerçek dünya hatası: path.resolve çıktısı)
  assert.throws(() => assertNoCatalogWrite("/repo/data/archive/catalog/x.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.throws(() => assertNoCatalogWrite("/repo/content/archive/records/a.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  // Katman geçişi (..): testlerin çalıştığı dizinden repo kökündeki korumalı yola inilir
  assert.throws(() => assertNoCatalogWrite("../../../data/archive/catalog/x.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.throws(() => assertNoCatalogWrite("../../../content/archive/records/a.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  assert.throws(() => assertNoCatalogWrite("/repo/data/research/../../../repo/data/archive/catalog/x.json"), /Korumalı arşiv yoluna yazma reddedildi/);
  // İzinli yollar geçer
  assert.doesNotThrow(() => assertNoCatalogWrite("data/research/candidates/exports/x.json"));
  assert.doesNotThrow(() => assertNoCatalogWrite("/repo/data/research/candidates/pool.json"));
  assert.doesNotThrow(() => assertNoCatalogWrite("docs/research/perplexity/rapor.md"));
});

test("CSV girdi doğrulama: bozuk satır raporlanır ve atlanır", () => {
  const csv = [
    "id,title,institution,institutionType,institutionUrl,url,authors,publishedAt,eventYear,periodStart,periodEnd,documentType,sourceNature,researchThemes,accessedAt,archiveIdentifier,citation,synthetic",
    "src-2026-0001,Doğru Satık,Kurum X,institutional,https://k.gov.tr,https://k.gov.tr/a,A Yazar;B Yazar,2020,1912,1911,1913,article,secondary,trablusgarp,2026-10-23,X-1,künye,false",
  ].join("\n");
  const result = importCandidatesFromCsv(csv);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].authors.length, 2);
  assert.equal(result.candidates[0].state, "new", "içe aktarılan aday doğrulanmış DEĞİLDİR");
});

test("CSV girdi doğrulama: eksik zorunlu sütun reddedilir", () => {
  const result = importCandidatesFromCsv("id,title\nsrc-1,X");
  assert.equal(result.candidates.length, 0);
  assert.ok(result.issues.some((issue) => issue.code === "MISSING_COLUMN"));
});

test("CSV girdi doğrulama: geçersiz satır atlanır ve raporlanır", () => {
  const header = "id,title,institution,institutionType,institutionUrl,url,authors,publishedAt,eventYear,periodStart,periodEnd,documentType,sourceNature,researchThemes,accessedAt,archiveIdentifier,citation,synthetic";
  const csv = [
    header,
    "yanlış-kimlik,Başlık,Kurum,institutional,https://k.gov.tr,https://k.gov.tr/a,,2020,,,,article,secondary,,2026-10-23,,künye,false",
  ].join("\n");
  const result = importCandidatesFromCsv(csv);
  assert.equal(result.candidates.length, 0);
  assert.ok(result.issues.some((issue) => issue.code === "INVALID_ROW"));
});

test("JSON girdi doğrulama: bozuk JSON ve eksik dizi reddedilir", () => {
  const bad = importCandidatesFromJson("{bozuk json");
  assert.equal(bad.candidates.length, 0);
  assert.ok(bad.issues.some((issue) => issue.code === "JSON_PARSE"));
  const noArray = importCandidatesFromJson('{"meta": {}}');
  assert.ok(noArray.issues.some((issue) => issue.code === "NO_CANDIDATES"));
});

test("JSON girdi doğrulama: havuz sarmalayıcısı okunur", () => {
  const candidate = makeCandidate();
  const result = importCandidatesFromJson(JSON.stringify({ candidates: [candidate] }));
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].id, candidate.id);
});

test("sağlayıcı kaydı: manuel katalog adaptörü kayıtlı ve çalışır", () => {
  const providers = listSourceProviders();
  assert.ok(providers.some((provider) => provider.id === "manual-catalog"));
  const provider = getSourceProvider("manual-catalog");
  const result = provider.importFrom({ json: JSON.stringify({ candidates: [makeCandidate()] }) });
  assert.equal(result.candidates.length, 1);
});

test("sağlayıcı kaydı: hatalı kayıt reddedilir", () => {
  assert.throws(() => registerSourceProvider({}), /zorunludur/);
  assert.throws(() => registerSourceProvider({ id: "x" }), /importFrom/);
});

test("havuz birleştirme: tekrar denetimli ekleme", () => {
  const pool = [makeCandidate()];
  const duplicate = makeCandidate({ id: "src-2026-0002", archiveIdentifier: "AYK-2" });
  const merged = mergeIntoPool(pool, [duplicate]);
  assert.equal(merged.added, 0);
  assert.equal(merged.rejected[0].code, "DUPLICATE_URL");
});

test("keşif düzenleme: dönem/kişi/konu süzme", () => {
  const candidates = [
    makeCandidate(), // 1881-1899, tema: cocukluk
    makeCandidate({ id: "src-2026-0002", url: "https://ornek.gov.tr/2", archiveIdentifier: "AYK-2", researchThemes: ["canakkale"], periodStart: 1914, periodEnd: 1916, eventYear: 1915 }),
  ];
  const byPeriod = organizeCandidates(candidates, { periodStart: 1910, periodEnd: 1918 });
  assert.equal(byPeriod.length, 1);
  assert.equal(byPeriod[0].id, "src-2026-0002");
  const byTheme = organizeCandidates(candidates, { theme: "cocukluk" });
  assert.equal(byTheme.length, 1);
  const byPerson = organizeCandidates(candidates, { person: "Mustafa Kemal" });
  assert.equal(byPerson.length, 2);
});
