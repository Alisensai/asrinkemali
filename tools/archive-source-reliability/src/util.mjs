/**
 * Ortak yardımcılar: tarih, URL normalizasyonu, Türkçe metin, deterministik
 * JSON ve rapor biçimlendirme. Bu modül yalnızca saf fonksiyonlar içerir.
 */

import crypto from "node:crypto";

const TR_LOWER_MAP = Object.freeze({
  I: "ı",
  İ: "i",
});

const SLUG_MAP = Object.freeze({
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
  â: "a",
  Â: "a",
  î: "i",
  Î: "i",
  û: "u",
  Û: "u",
});

export const AI_REVIEW_PATTERN =
  /yapay\s*zek|open\s*code|opencode|otomatik|machine|robot|\bai\b|artificial\s*intelligence/i;
export const HUMAN_REVIEW_PATTERN =
  /insan|uzman|human|expert|editör|editor|tarihçi|akademisyen|prof\.?\s*dr|doç\.?\s*dr|dr\./i;

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function sortBy(items, compareFn) {
  return [...items].sort(compareFn);
}

export function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function truncate(value, maxLength = 200) {
  const text = normalizeWhitespace(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, "")}...`;
}

export function foldTr(value) {
  return String(value ?? "")
    .replace(/[Iİ]/g, (character) => TR_LOWER_MAP[character])
    .toLocaleLowerCase("tr-TR");
}

export function slugify(input) {
  return String(input ?? "")
    .replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (character) => SLUG_MAP[character] ?? character)
    .toLocaleLowerCase("tr-TR")
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseIsoDate(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { iso: value, year, month, day };
}

export function formatIsoDate(parts) {
  if (!parts) return null;
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dateIntersectsPeriod(start, end, periodStart, periodEnd) {
  const startParts = parseIsoDate(start);
  const endParts = parseIsoDate(end);
  const periodStartParts = parseIsoDate(periodStart);
  const periodEndParts = parseIsoDate(periodEnd);
  if (!startParts || !periodStartParts || !periodEndParts) return false;
  if (!endParts) {
    // Bitişi olmayan kayıtlar açık uçlu aralık değil, tek tarih olarak yorumlanır.
    return startParts.iso >= periodStartParts.iso && startParts.iso <= periodEndParts.iso;
  }
  return startParts.iso <= periodEndParts.iso && endParts.iso >= periodStartParts.iso;
}

export function dateRangeYears(start, end) {
  const startParts = parseIsoDate(start);
  const endParts = parseIsoDate(end) ?? startParts;
  if (!startParts || !endParts) return [];
  const first = Math.min(startParts.year, endParts.year);
  const last = Math.max(startParts.year, endParts.year);
  const years = [];
  for (let year = first; year <= last; year += 1) years.push(year);
  return years;
}

export function canonicalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.href;
}

export function normalizeSourceIdentifier(value) {
  const text = normalizeWhitespace(value).toUpperCase();
  if (!text) return "";
  const digits = text.match(/\d+/g);
  if (digits && digits.length > 0) return digits.join("-");
  return text;
}

export function classifyReviewer(reviewedBy) {
  const reviewer = normalizeWhitespace(reviewedBy);
  if (!reviewer) return { kind: "none", human: false, reviewer: null, reason: "İnceleyen bilgisi yok." };
  if (AI_REVIEW_PATTERN.test(reviewer)) {
    return {
      kind: "ai",
      human: false,
      reviewer,
      reason: "İnceleyen makine/otomatik denetim olarak işaretli; insan uzman onayı değil.",
    };
  }
  if (HUMAN_REVIEW_PATTERN.test(reviewer)) {
    return { kind: "human", human: true, reviewer, reason: "İnceleyen insan/uzman olarak işaretli." };
  }
  return {
    kind: "unknown",
    human: false,
    reviewer,
    reason: "İnceleyenin insan uzman olduğu doğrulanamadı; temkinli olarak onaysız sayıldı.",
  };
}

export function hashString(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function stableStringify(value, space = 2) {
  return JSON.stringify(sortJson(value), null, space);
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b, "tr"))) {
      sorted[key] = sortJson(value[key]);
    }
    return sorted;
  }
  return value;
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function escapeMarkdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>")
    .trim();
}

export function markdownTable(headers, rows) {
  const head = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  return [head, divider, ...body].join("\n");
}

export function issue(code, severity, message, field = null) {
  return { code, severity, message, field };
}

export function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function toSortedEntries(map, compareFn = (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr")) {
  return [...map.entries()].sort(compareFn).map(([key, count]) => ({ key, count }));
}
