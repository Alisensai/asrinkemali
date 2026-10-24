/**
 * Türkçe karakter duyarlı metin normalizasyonu ve arama yardımcıları.
 *
 * İki mod vardır:
 *  - `normalizeTr`: Türkçe büyük/küçük harf kurallarını uygular; ı/i, İ/i ve ş/s
 *    ayrımını KORUR.
 *  - `foldTr`: arama için aksan ve Türkçe karakterleri ASCII'ye indirger;
 *    ı/i, İ/i, ş/s ayrımını EŞİTLER.
 *
 * Böylece hem "İstiklal" yazımına duyarlı hem de "istiklal" ile bulunabilen
 * bir arama katmanı kurulur.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalizeTr(input) {
  return String(input ?? "")
    .normalize("NFC")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC");
}

export function foldTr(input) {
  return normalizeTr(input)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFC");
}

export function tokenize(input, mode = "folded") {
  const normalize = mode === "exact" ? normalizeTr : foldTr;
  return normalize(input)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function includesText(haystack, needle, mode = "folded") {
  const normalize = mode === "exact" ? normalizeTr : foldTr;
  const normalizedNeedle = normalize(needle);
  if (!normalizedNeedle) return false;
  return normalize(haystack).includes(normalizedNeedle);
}

export function countOccurrences(haystack, needle, mode = "folded") {
  const normalize = mode === "exact" ? normalizeTr : foldTr;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n) return 0;
  let count = 0;
  let index = 0;
  while ((index = h.indexOf(n, index)) !== -1) {
    count += 1;
    index += n.length;
  }
  return count;
}

export function makeSnippet(text, maxLength = 160) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function toCalendarDate(input) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    if (!isValidCalendarDate(input)) throw new Error(`Geçersiz takvim tarihi: ${input}`);
    return input;
  }
  if (input instanceof Date && Number.isFinite(input.getTime())) {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, "0");
    const day = String(input.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  throw new Error("Tarih, YYYY-MM-DD biçiminde bir metin veya geçerli bir Date olmalı.");
}
