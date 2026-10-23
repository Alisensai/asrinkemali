import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalizeUrl,
  classifyReviewer,
  countBy,
  dateIntersectsPeriod,
  dateRangeYears,
  foldTr,
  formatPercent,
  markdownTable,
  normalizeSourceIdentifier,
  parseIsoDate,
  slugify,
  stableStringify,
  toSortedEntries,
  truncate,
} from "../src/util.mjs";

test("parseIsoDate geçerli ve geçersiz tarihleri ayırır", () => {
  assert.deepEqual(parseIsoDate("2024-02-29"), { iso: "2024-02-29", year: 2024, month: 2, day: 29 });
  assert.equal(parseIsoDate("2023-02-29"), null);
  assert.equal(parseIsoDate("2024-13-01"), null);
  assert.equal(parseIsoDate("2024-1-1"), null);
  assert.equal(parseIsoDate(null), null);
});

test("dateIntersectsPeriod bitişsiz kaydı tek tarih olarak yorumlar", () => {
  assert.equal(dateIntersectsPeriod("1915-04-25", null, "1881-01-01", "1918-12-31"), true);
  assert.equal(dateIntersectsPeriod("1919-01-01", null, "1881-01-01", "1918-12-31"), false);
  assert.equal(dateIntersectsPeriod("1847-01-01", null, "1881-01-01", "1918-12-31"), false);
  assert.equal(dateIntersectsPeriod("1910-01-01", "1920-01-01", "1881-01-01", "1918-12-31"), true);
  assert.equal(dateIntersectsPeriod("1930-01-01", "1935-01-01", "1881-01-01", "1918-12-31"), false);
  assert.equal(dateIntersectsPeriod(null, null, "1881-01-01", "1918-12-31"), false);
});

test("dateRangeYears açık uçlu kaydı tek yıl sayar", () => {
  assert.deepEqual(dateRangeYears("1912-01-01", null), [1912]);
  assert.deepEqual(dateRangeYears("1912-01-01", "1914-12-31"), [1912, 1913, 1914]);
  assert.deepEqual(dateRangeYears("bozuk", null), []);
});

test("canonicalizeUrl host, port, hash ve query normalizasyonu yapar", () => {
  assert.equal(
    canonicalizeUrl("https://www.Example.gov.tr:443/a/?b=2&a=1#bolum"),
    "https://example.gov.tr/a?a=1&b=2"
  );
  assert.equal(canonicalizeUrl("http://example.gov.tr:80/"), "http://example.gov.tr/");
  assert.equal(canonicalizeUrl(""), "");
});

test("normalizeSourceIdentifier sayısal kimlikleri ve metinleri normalize eder", () => {
  assert.equal(normalizeSourceIdentifier(" AYK-878 "), "878");
  assert.equal(normalizeSourceIdentifier("TBMM 23 Nisan 1920"), "23-1920");
  assert.equal(normalizeSourceIdentifier("tarihce"), "TARIHCE");
  assert.equal(normalizeSourceIdentifier(null), "");
});

test("classifyReviewer yapay zekâ, insan ve belirsiz inceleyicileri ayırır", () => {
  assert.equal(classifyReviewer("OpenCode arşiv denetimi (yapay zekâ)").kind, "ai");
  assert.equal(classifyReviewer("Prof. Dr. Ayşe Yılmaz").kind, "human");
  assert.equal(classifyReviewer("").kind, "none");
  assert.equal(classifyReviewer("Arşiv ekibi").kind, "unknown");
  assert.equal(classifyReviewer("OpenCode arşiv denetimi").human, false);
});

test("stableStringify anahtarları deterministik sıralar", () => {
  const first = stableStringify({ b: 2, a: { d: 4, c: 3 } });
  const second = stableStringify({ a: { c: 3, d: 4 }, b: 2 });
  assert.equal(first, second);
  assert.ok(first.indexOf('"a"') < first.indexOf('"b"'));
});

test("markdownTable hücrelerdeki boru ve satır sonlarını kaçırır", () => {
  const table = markdownTable(["A", "B"], [["x|y", "ilk\nikinci"]]);
  assert.match(table, /x\\\|y/);
  assert.match(table, /ilk<br>ikinci/);
});

test("formatPercent ve foldTr Türkçe çıktıyı doğru üretir", () => {
  assert.equal(formatPercent(0.256), "25.6%");
  assert.equal(formatPercent(null), "—");
  assert.equal(foldTr("İSTANBUL"), "istanbul");
  assert.equal(slugify("Erkân-ı Harbiye"), "erkan-i-harbiye");
});

test("truncate metni sözcük sınırında kısaltır", () => {
  assert.equal(truncate("kısa metin", 50), "kısa metin");
  assert.match(truncate("bu uzun bir metindir", 12), /^bu uzun\.\.\.$/);
});

test("countBy ve toSortedEntries sayımı deterministik döndürür", () => {
  const counts = countBy(["a", "b", "a"], (item) => item);
  assert.equal(counts.get("a"), 2);
  assert.deepEqual(toSortedEntries(counts), [
    { key: "a", count: 2 },
    { key: "b", count: 1 },
  ]);
});
