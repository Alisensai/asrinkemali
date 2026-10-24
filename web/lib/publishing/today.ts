import type { ArchiveRecord } from "../../../schemas/archive-record.types";

export interface TodayCandidate { archiveId: string; slug: string; title: string; date: string; summary: string; sourceInstitution: string; sourceUrl: string }
export interface TodayBrief { month: number; day: number; candidates: TodayCandidate[]; message: string | null }

/** Takvimde var olan ay/gün mü? Artık yıl (2024) referans alınır; 29 Şubat geçerlidir, 31 Şubat değildir. */
export function isValidMonthDay(month: number, day: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1) return false;
  return day <= new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

export function prepareTodayBrief(records: readonly ArchiveRecord[], month: number, day: number): TodayBrief {
  if (!isValidMonthDay(month, day)) throw new Error("Ay ve gün takvimde geçerli bir tarih olmalıdır.");
  const candidates = records.filter((record) => record.type === "event" && record.verification.status === "published" && record.date.precision === "day" && record.date.start).filter((record) => { const [, recordMonth, recordDay] = record.date.start!.split("-").map(Number); return recordMonth === month && recordDay === day; }).map((record) => ({ archiveId: record.id, slug: record.slug, title: record.title, date: record.date.display, summary: record.summary, sourceInstitution: record.source.institution, sourceUrl: record.source.url }));
  return { month, day, candidates, message: candidates.length ? null : "Bu gün için yayın kapısından geçmiş kaynaklı olay bulunmuyor." };
}
