import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, sameSource, sameArchiveIdentifier, findDuplicates, titleSimilarity } from "../lib/dedupe.mjs";
import { makeCandidate, makeArchiveRecord } from "./helpers.mjs";

test("URL normalizasyonu: izleme parametreleri ve fragment temizlenir", () => {
  const a = normalizeUrl("https://ornek.gov.tr/madde/1?utm_source=x&id=7#bolum");
  const b = normalizeUrl("https://ornek.gov.tr/madde/1?id=7");
  assert.equal(a, b);
});

test("URL normalizasyonu: son eğik çizgi ve http şeması ayrımı korunur", () => {
  const withSlash = normalizeUrl("https://ornek.gov.tr/madde/1/");
  const withoutSlash = normalizeUrl("https://ornek.gov.tr/madde/1");
  assert.equal(withSlash, withoutSlash);
  assert.notEqual(normalizeUrl("http://ornek.gov.tr/a"), normalizeUrl("https://ornek.gov.tr/a"));
});

test("geçersiz URL: null döner", () => {
  assert.equal(normalizeUrl(""), null);
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("not-a-url"), null);
});

test("tekrarlanan kaynak: aynı normalleştirilmiş URL çifti bulunur", () => {
  const a = makeCandidate({ id: "src-2026-0001", url: "https://ornek.gov.tr/madde/1?utm_campaign=x" });
  const b = makeCandidate({ id: "src-2026-0002", url: "https://ornek.gov.tr/madde/1" });
  assert.equal(sameSource(a.url, b.url), true);
  const result = findDuplicates([a, b], []);
  assert.equal(result.duplicatePairs.length, 1);
  assert.match(result.duplicatePairs[0].reason, /aynı normalleştirilmiş URL/);
});

test("tekrarlanan kaynak: aynı kurum arşiv kimliği çifti bulunur", () => {
  const a = makeCandidate({ id: "src-2026-0001", url: "https://a.gov.tr/x", archiveIdentifier: "AYK-166" });
  const b = makeCandidate({ id: "src-2026-0002", url: "https://a.gov.tr/baska", archiveIdentifier: "AYK-166" });
  assert.equal(sameArchiveIdentifier(a, b), true);
  const result = findDuplicates([a, b], []);
  assert.ok(result.duplicatePairs.some((pair) => pair.reason.includes("kurum arşiv kimliği")));
});

test("tekrarlanan kaynak: farklı kurum kimliği eşleşmesi yanlış pozitif vermez", () => {
  const a = makeCandidate({ id: "src-2026-0001", url: "https://a.gov.tr/x", archiveIdentifier: "XYZ-1", institution: "Kurum A" });
  const b = makeCandidate({ id: "src-2026-0002", url: "https://b.gov.tr/y", archiveIdentifier: "XYZ-1", institution: "Kurum B" });
  assert.equal(sameArchiveIdentifier(a, b), false);
});

test("kaynak-kayıt ilişkilendirme: mevcut arşivdeki URL eşleşmesi bulunur", () => {
  const candidate = makeCandidate({ url: "https://ornek.gov.tr/madde/1" });
  const record = makeArchiveRecord({ source: { ...makeArchiveRecord().source, url: "https://ornek.gov.tr/madde/1" } });
  const result = findDuplicates([candidate], [record]);
  assert.equal(result.archiveMatches.length, 1);
  assert.equal(result.archiveMatches[0].archiveId, record.id);
});

test("aynı kök türetme: farklı sitelerdeki benzer künyeler bağımsız kanıt sayılmaz", () => {
  const a = makeCandidate({
    id: "src-2026-0001",
    institution: "Kurum A",
    url: "https://a.gov.tr/madde",
    title: "Mustafa Kemal'in Selanik Yılları 1896",
    eventYear: 1896,
  });
  const b = makeCandidate({
    id: "src-2026-0002",
    institution: "Kurum B",
    url: "https://b.org/sayfa",
    title: "Mustafa Kemal'in Selanik Yılları",
    eventYear: 1896,
  });
  const result = findDuplicates([a, b], []);
  assert.equal(result.derivedPairs.length, 1);
  assert.match(result.derivedPairs[0].note, /bağımsız iki kanıt sayılmaz/);
});

test("başlık benzerliği: katlanmış Türkçe karşılaştırma", () => {
  assert.ok(titleSimilarity("Çanakkale Savaşları", "çanakkale savasları") >= 0.99);
  assert.ok(titleSimilarity("Çanakkale Savaşları", "Harp Akademisi") < 0.2);
});

test("tekrar yoksa çift raporlanmaz", () => {
  const a = makeCandidate({ id: "src-2026-0001", url: "https://ornek.gov.tr/a" });
  const b = makeCandidate({ id: "src-2026-0002", url: "https://ornek.gov.tr/b", archiveIdentifier: "AYK-2", eventYear: 1915 });
  const result = findDuplicates([a, b], []);
  assert.equal(result.duplicatePairs.length, 0);
});
