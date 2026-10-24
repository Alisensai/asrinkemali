import "server-only";

import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import { getPublishedArchiveRecords } from "../archive";
import {
  PERIODS,
  assignRecordToPeriod,
  comparePeriods,
  getPeriodById,
  groupRecordsByPeriod,
  listPeriods,
  parsePeriodParams,
  recordYearBounds,
  summarizePeriod,
} from "./core";
import type { HistoricalPeriod, PeriodComparison, PeriodSummary } from "./core";

export type { HistoricalPeriod, PeriodComparison, PeriodSummary };

export { PERIODS, assignRecordToPeriod, comparePeriods, getPeriodById, groupRecordsByPeriod, listPeriods, parsePeriodParams, recordYearBounds, summarizePeriod };

/** Yayımlanmış kayıtlarla dönem özetlerini üretir; boş dönemler de döner (dürüst boş durum). */
export function getPeriodOverview(records?: readonly ArchiveRecord[]) {
  const source = records ?? getPublishedArchiveRecords();
  const { groups, unassigned } = groupRecordsByPeriod(source);
  const periods = PERIODS.map((period) => summarizePeriod(period.id, groups.get(period.id) ?? [])).filter((p): p is PeriodSummary => p !== null);
  return { periods, unassignedCount: unassigned.length, totalPublished: source.length };
}

export function getPeriodDetail(periodId: string): PeriodSummary | null {
  return summarizePeriod(periodId, getPublishedArchiveRecords());
}

export function getPeriodComparison(idA: string, idB: string): PeriodComparison | { error: string } | null {
  return comparePeriods(idA, idB, getPublishedArchiveRecords());
}

