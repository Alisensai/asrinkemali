import type { ArchiveRecord } from "../../../schemas/archive-record.types";

export interface HistoricalPeriod {
  id: string;
  title: string;
  start: string;
  end: string | null;
  summary: string;
}

export interface PeriodSummary {
  period: HistoricalPeriod;
  count: number;
  records: ArchiveRecord[];
  typeDistribution: [string, number][];
  categoryDistribution: [string, number][];
  sources: [string, number][];
  people: [string, number][];
  cities: [string, number][];
  earliestYear: number | null;
  latestYear: number | null;
}

export interface PeriodComparison {
  a: PeriodSummary;
  b: PeriodSummary;
  sharedPeople: string[];
  sharedSources: string[];
  sharedCities: string[];
  causalityNote: string;
}

export declare const PERIODS: readonly HistoricalPeriod[];
export declare function getPeriodById(id: string): HistoricalPeriod | null;
export declare function listPeriods(): HistoricalPeriod[];
export declare function recordYearBounds(record: ArchiveRecord): { start: number | null; end: number | null };
export declare function assignRecordToPeriod(record: ArchiveRecord): string | null;
export declare function groupRecordsByPeriod(records: readonly ArchiveRecord[]): {
  groups: Map<string, ArchiveRecord[]>;
  unassigned: ArchiveRecord[];
};
export declare function summarizePeriod(periodId: string, records: readonly ArchiveRecord[]): PeriodSummary | null;
export declare function comparePeriods(idA: string, idB: string, records: readonly ArchiveRecord[]): PeriodComparison | { error: string } | null;
export declare function parsePeriodParams(params: unknown): {
  donem: string | null;
  karsilastir: string[];
  warnings: string[];
};
