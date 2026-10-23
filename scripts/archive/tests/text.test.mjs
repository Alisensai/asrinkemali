import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTr,
  foldTr,
  tokenize,
  includesText,
  countOccurrences,
  makeSnippet,
  isValidCalendarDate,
  toCalendarDate,
} from "../lib/text.mjs";

test("normalizeTr Türkçe büyük/küçük harf kurallarını korur", () => {
  assert.equal(normalizeTr("İSTİKLAL"), "istiklal");
  assert.equal(normalizeTr("IŞIK"), "ışık");
  assert.equal(normalizeTr("ŞİŞLİ"), "şişli");
  assert.equal(normalizeTr("ĞÜÖÇ"), "ğüöç");
  assert.equal(normalizeTr("Mustafa Kemal ATATÜRK"), "mustafa kemal atatürk");
});

test("foldTr ı/i, İ/i ve ş/s ayrımını eşitler", () => {
  assert.equal(foldTr("Işık"), "isik");
  assert.equal(foldTr("İstiklal"), "istiklal");
  assert.equal(foldTr("Şişli"), "sisli");
  assert.equal(foldTr("ĞÜÖÇ"), "guoc");
  assert.equal(foldTr("ı"), "i");
  assert.equal(foldTr("İ"), "i");
});

test("foldTr Unicode ayrıştırılmış (NFD) harfleri de eşitler", () => {
  assert.equal(foldTr("S\u0327is\u0327li"), "sisli");
  assert.equal(foldTr("I\u0301s\u0327\u0131k"), "isik");
});

test("includesText folded modda Türkçe karakterleri eşitler, exact modda korur", () => {
  assert.equal(includesText("İstiklal Marşı", "istiklal"), true);
  assert.equal(includesText("Işık", "isik"), true);
  assert.equal(includesText("Şişli", "sisli"), true);
  assert.equal(includesText("Işık", "isik", "exact"), false);
  assert.equal(includesText("Işık", "ışık", "exact"), true);
  assert.equal(includesText("İstiklal", "i", "exact"), true);
});

test("tokenize noktalama ve kesme işaretlerini ayırır", () => {
  assert.deepEqual(tokenize("Cumhuriyet'in İlanı, 29 Ekim 1923!"), [
    "cumhuriyet",
    "in",
    "ilani",
    "29",
    "ekim",
    "1923",
  ]);
  assert.deepEqual(tokenize("   "), []);
});

test("countOccurrences ve makeSnippet sınırları", () => {
  assert.equal(countOccurrences("ıı ı", "ı"), 3);
  assert.equal(countOccurrences("İİ i", "i"), 3);
  const snippet = makeSnippet("a".repeat(200), 20);
  assert.equal([...snippet].length, 20);
  assert.ok(snippet.endsWith("…"));
  assert.equal(makeSnippet("kısa metin"), "kısa metin");
});

test("takvim tarihi doğrulaması artık yılları ve geçersiz günleri ayırır", () => {
  assert.equal(isValidCalendarDate("2024-02-29"), true);
  assert.equal(isValidCalendarDate("2023-02-29"), false);
  assert.equal(isValidCalendarDate("2026-10-23"), true);
  assert.equal(isValidCalendarDate("2026-13-01"), false);
  assert.equal(isValidCalendarDate("23.10.2026"), false);
  assert.equal(toCalendarDate("2026-10-23"), "2026-10-23");
  assert.throws(() => toCalendarDate("2026-02-30"), /Geçersiz takvim tarihi/);
  assert.throws(() => toCalendarDate("dün"), /YYYY-MM-DD/);
});
