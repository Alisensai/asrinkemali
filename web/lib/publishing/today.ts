import type { ArchiveRecord } from "../../../schemas/archive-record.types";

export interface TodayCandidate { archiveId: string; slug: string; title: string; date: string; summary: string; sourceInstitution: string; sourceUrl: string }
export interface TodayBrief { month: number; day: number; candidates: TodayCandidate[]; message: string | null }

export function isValidMonthDay(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const daysInMonth: Record<number, number> = {
    1: 31,
    2: 29, // 2024 artık yıl referansıyla 29 Şubat geçerlidir
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
  };

  return day <= (daysInMonth[month] ?? 31);
}

export function prepareTodayBrief(records: readonly ArchiveRecord[], month: number, day: number): TodayBrief {
  if (!isValidMonthDay(month, day)) {
    throw new Error("Ay ve gün geçerli aralıkta olmalıdır.");
  }
  const candidates = records
    .filter(
      (record) =>
        record.type === "event" &&
        record.verification.status === "published" &&
        record.date.precision === "day" &&
        record.date.start
    )
    .filter((record) => {
      const [, recordMonth, recordDay] = record.date.start!.split("-").map(Number);
      return recordMonth === month && recordDay === day;
    })
    .map((record) => ({
      archiveId: record.id,
      slug: record.slug,
      title: record.title,
      date: record.date.display,
      summary: record.summary,
      sourceInstitution: record.source.institution,
      sourceUrl: record.source.url,
    }));
  return {
    month,
    day,
    candidates,
    message: candidates.length ? null : "Bu gün için yayın kapısından geçmiş kaynaklı olay bulunmuyor.",
  };
}

