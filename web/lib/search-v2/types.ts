import type { ArchiveRecord, ArchiveRecordType } from "../../../schemas/archive-record.types";

export type PublicSearchFilters = {
  q: string;
  type?: ArchiveRecordType;
  category: string;
  source: string;
  city: string;
  yearFrom?: number;
  yearTo?: number;
  page: number;
};

export type MatchedField = "title" | "summary" | "description" | "tag" | "category" | "source" | "location";
export type SearchHit = { record: ArchiveRecord; score: number; matchedFields: readonly MatchedField[] };
export type SearchResult = { total: number; page: number; pageCount: number; items: readonly ArchiveRecord[]; hits: readonly SearchHit[] };
