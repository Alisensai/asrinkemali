import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import { foldTurkish, queryTokens } from "./normalize.ts";
import type { MatchedField, PublicSearchFilters, SearchHit, SearchResult } from "./types";

const WEIGHTS: Readonly<Record<MatchedField, number>> = { title: 12, summary: 5, description: 3, tag: 4, category: 4, source: 2, location: 3 };
const text = (record: ArchiveRecord, field: MatchedField) => {
  if (field === "title") return record.title;
  if (field === "summary") return record.summary;
  if (field === "description") return record.description ?? "";
  if (field === "tag") return record.tags.join(" ");
  if (field === "category") return record.categories.join(" ");
  if (field === "source") return `${record.source.institution} ${record.source.title} ${record.source.citation ?? ""}`;
  return record.locations.map((place) => `${place.name} ${place.city ?? ""}`).join(" ");
};

function years(record: ArchiveRecord) { const start = record.date.start ? Number(record.date.start.slice(0, 4)) : undefined; const end = record.date.end ? Number(record.date.end.slice(0, 4)) : start; return { start, end }; }
export function passesFilters(record: ArchiveRecord, filters: PublicSearchFilters): boolean {
  if (filters.type && record.type !== filters.type) return false;
  const includes = (value: string, filter: string) => !filter || foldTurkish(value).includes(foldTurkish(filter));
  if (filters.category && !record.categories.some((item) => includes(item, filters.category))) return false;
  if (!includes(text(record, "source"), filters.source)) return false;
  if (filters.city && !record.locations.some((item) => includes(`${item.name} ${item.city ?? ""}`, filters.city))) return false;
  const range = years(record);
  return !(filters.yearFrom && (!range.end || range.end < filters.yearFrom)) && !(filters.yearTo && (!range.start || range.start > filters.yearTo));
}

export function searchPublishedRecords(records: readonly ArchiveRecord[], filters: PublicSearchFilters, pageSize = 12): SearchResult {
  const tokens = queryTokens(filters.q);
  const hits: SearchHit[] = [];
  for (const record of records) {
    if (!passesFilters(record, filters)) continue;
    const matched = new Set<MatchedField>(); let score = 0;
    for (const token of tokens) {
      let tokenMatched = false;
      for (const field of Object.keys(WEIGHTS) as MatchedField[]) {
        const candidate = foldTurkish(text(record, field));
        if (candidate.includes(token)) { tokenMatched = true; matched.add(field); score += candidate.split(token).length > 2 ? WEIGHTS[field] : WEIGHTS[field] / 2; }
      }
      if (!tokenMatched) { score = -1; break; }
    }
    if (score >= 0) hits.push({ record, score, matchedFields: [...matched] });
  }
  hits.sort((a, b) => b.score - a.score || (b.record.date.start ?? "").localeCompare(a.record.date.start ?? "") || a.record.title.localeCompare(b.record.title, "tr") || a.record.id.localeCompare(b.record.id));
  const pageCount = Math.max(1, Math.ceil(hits.length / pageSize)); const page = Math.min(Math.max(1, filters.page), pageCount);
  const slice = hits.slice((page - 1) * pageSize, page * pageSize);
  return { total: hits.length, page, pageCount, items: slice.map((hit) => hit.record), hits: slice };
}
