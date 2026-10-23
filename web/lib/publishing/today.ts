import type { ArchiveRecord } from "../../../schemas/archive-record.types";

export interface TodayCandidate { archiveId: string; slug: string; title: string; date: string; summary: string; sourceInstitution: string; sourceUrl: string }
export interface TodayBrief { month: number; day: number; candidates: TodayCandidate[]; message: string | null }

export function prepareTodayBrief(records: readonly ArchiveRecord[], month: number, day: number): TodayBrief {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) throw new Error("Ay ve gün geçerli aralıkta olmalıdır.");
  const candidates = records.filter((record) => record.type === "event" && record.verification.status === "published" && record.date.precision === "day" && record.date.start).filter((record) => { const [, recordMonth, recordDay] = record.date.start!.split("-").map(Number); return recordMonth === month && recordDay === day; }).map((record) => ({ archiveId: record.id, slug: record.slug, title: record.title, date: record.date.display, summary: record.summary, sourceInstitution: record.source.institution, sourceUrl: record.source.url }));
  return { month, day, candidates, message: candidates.length ? null : "Bu gün için yayın kapısından geçmiş kaynaklı olay bulunmuyor." };
}
