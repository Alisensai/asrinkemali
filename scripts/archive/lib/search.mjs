/**
 * Arşiv kayıtları üzerinde çalışan Türkçe duyarlı arama.
 *
 * - Varsayılan mod `folded`: ı/i, İ/i, ş/s, ğ/g, ü/u, ö/o, ç/c eşitlenir.
 * - `exact` modu Türkçe harf ayrımını korur.
 * - `yil:1923`, `kategori:egitim`, `tur:event`, `etiket:TBMM` süzgeçleri
 *   serbest metin içinde de kullanılabilir.
 * - Varsayılan olarak yalnızca `published` kayıtlar aranır.
 */

import { foldTr, includesText, makeSnippet, tokenize } from "./text.mjs";

const TYPE_ALIASES = Object.freeze({
  fotograf: "photograph",
  photograph: "photograph",
  belge: "document",
  document: "document",
  konusma: "speech",
  speech: "speech",
  olay: "event",
  event: "event",
  kitap: "publication",
  yayin: "publication",
  publication: "publication",
  mekan: "place",
  place: "place",
});

const FIELD_WEIGHTS = Object.freeze({
  title: 12,
  tags: 8,
  quotation: 7,
  summary: 5,
  description: 4,
  people: 3,
  locations: 3,
  categories: 2,
  type: 2,
  source: 2,
  date: 1,
});

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeFilterValue(value) {
  return foldTr(String(value ?? "").trim());
}

function parseInteger(value) {
  const number = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(number) ? number : null;
}

export function parseSearchQuery(input) {
  const result = {
    text: "",
    year: null,
    yearFrom: null,
    yearTo: null,
    category: null,
    type: null,
    tags: [],
  };
  if (typeof input !== "string" || input.trim() === "") return result;
  const tokens = input.match(/"[^"]*"|\S+/g) ?? [];
  const textTokens = [];
  for (const rawToken of tokens) {
    const token = rawToken.replace(/^"|"$/g, "");
    const match = token.match(/^([^:]+):(.*)$/u);
    if (!match) {
      textTokens.push(token);
      continue;
    }
    const key = foldTr(match[1]);
    const value = match[2].replace(/^"|"$/g, "").trim();
    if (!value) {
      textTokens.push(token);
      continue;
    }
    if (key === "yil" || key === "yıl" || key === "year") {
      const range = value.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
      if (range) {
        result.yearFrom = Number(range[1]);
        result.yearTo = Number(range[2]);
      } else {
        const year = parseInteger(value);
        if (year !== null) result.year = year;
        else textTokens.push(token);
      }
    } else if (key === "kategori" || key === "category") {
      result.category = normalizeFilterValue(value);
    } else if (key === "tur" || key === "tür" || key === "type") {
      result.type = TYPE_ALIASES[normalizeFilterValue(value)] ?? normalizeFilterValue(value);
    } else if (key === "etiket" || key === "tag") {
      result.tags.push(normalizeFilterValue(value));
    } else {
      textTokens.push(token);
    }
  }
  result.text = textTokens.join(" ").trim();
  return result;
}

export function getRecordYearRange(record) {
  const start = record?.date?.start;
  const end = record?.date?.end;
  const startYear = start ? Number(start.slice(0, 4)) : null;
  const endYear = end ? Number(end.slice(0, 4)) : startYear;
  if (!Number.isFinite(startYear)) return null;
  return { startYear, endYear: Number.isFinite(endYear) ? endYear : startYear };
}

function matchesYear(record, query) {
  if (query.year == null && query.yearFrom == null && query.yearTo == null) return true;
  const range = getRecordYearRange(record);
  if (!range) return false;
  if (query.year != null) {
    return range.startYear <= query.year && range.endYear >= query.year;
  }
  if (query.yearFrom != null || query.yearTo != null) {
    const from = query.yearFrom ?? 1800;
    const to = query.yearTo ?? 2100;
    return range.startYear <= to && range.endYear >= from;
  }
  return true;
}

function matchesTags(record, requestedTags) {
  if (!requestedTags || requestedTags.length === 0) return true;
  const recordTags = new Set(asArray(record.tags).map(normalizeFilterValue));
  return requestedTags.every((tag) => recordTags.has(tag));
}

function recordFields(record) {
  const fields = [
    ["title", record.title],
    ["summary", record.summary],
    ["description", record.description],
    ["type", record.type],
    ["date", record.date?.display],
    ["source", record.source?.institution],
    ["source", record.source?.title],
  ];
  for (const tag of asArray(record.tags)) fields.push(["tags", tag]);
  for (const category of asArray(record.categories)) fields.push(["categories", category]);
  for (const person of asArray(record.people)) fields.push(["people", person.name]);
  for (const location of asArray(record.locations)) fields.push(["locations", location.name]);
  if (record.quotation) {
    fields.push(["quotation", record.quotation.text]);
    fields.push(["quotation", record.quotation.work]);
    fields.push(["quotation", record.quotation.context]);
  }
  return fields.filter(([, value]) => typeof value === "string" && value.length > 0);
}

function fieldScore(field, mode, token) {
  const base = FIELD_WEIGHTS[field] ?? 1;
  if (mode === "exact") return base;
  return base;
}

export function searchRecords(records, query = {}) {
  if (!Array.isArray(records)) throw new TypeError("searchRecords: kayıt dizisi gerekli.");
  const input = typeof query === "string" ? { q: query } : { ...query };
  const parsed = parseSearchQuery(input.q ?? "");
  const merged = {
    text: parsed.text,
    year: input.year ?? parsed.year,
    yearFrom: input.yearFrom ?? parsed.yearFrom,
    yearTo: input.yearTo ?? parsed.yearTo,
    category: input.category != null ? normalizeFilterValue(input.category) : parsed.category,
    type: input.type != null ? normalizeFilterValue(input.type) : parsed.type,
    tags: [
      ...parsed.tags,
      ...asArray(input.tags).map(normalizeFilterValue),
    ].filter(Boolean),
    mode: input.mode === "exact" ? "exact" : "folded",
    includeNonPublished: input.includeNonPublished === true,
    limit: Number.isInteger(input.limit) && input.limit > 0 ? input.limit : null,
  };
  const tokens = tokenize(merged.text, merged.mode);
  const normalizedType = merged.type
    ? TYPE_ALIASES[merged.type] ?? merged.type
    : null;

  const hits = [];
  for (const record of records) {
    const status = record?.verification?.status;
    if (!merged.includeNonPublished && status !== "published") continue;
    if (normalizedType && normalizeFilterValue(record.type) !== normalizedType) continue;
    if (merged.category) {
      const categories = asArray(record.categories).map(normalizeFilterValue);
      if (!categories.includes(merged.category)) continue;
    }
    if (!matchesTags(record, merged.tags)) continue;
    if (!matchesYear(record, merged)) continue;

    const fields = recordFields(record);
    const matchedFields = new Set();
    let score = 0;
    let allTokensMatched = true;
    for (const token of tokens) {
      let tokenMatched = false;
      for (const [field, value] of fields) {
        if (includesText(value, token, merged.mode)) {
          tokenMatched = true;
          matchedFields.add(field);
          score += fieldScore(field, merged.mode, token);
        }
      }
      if (!tokenMatched) {
        allTokensMatched = false;
        break;
      }
    }
    if (!allTokensMatched) continue;

    if (merged.text && fields.some(([, value]) => includesText(value, merged.text, merged.mode))) {
      score += 6;
    }
    hits.push({
      record,
      score,
      matchedFields: [...matchedFields],
      snippet: makeSnippet(record.summary ?? record.description ?? record.title),
    });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.record.date?.start ?? a.record.date?.end ?? "";
    const dateB = b.record.date?.start ?? b.record.date?.end ?? "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return String(a.record.title).localeCompare(String(b.record.title), "tr");
  });
  return merged.limit ? hits.slice(0, merged.limit) : hits;
}

export function getRecordById(records, id) {
  return records.find((record) => record.id === id) ?? null;
}
