/**
 * "Tarihte Bugün" algoritması.
 *
 * Yalnızca doğrulanmış (`published`), türü `event`, tarih kesinliği `exact` ve
 * gün hassasiyeti `day` olan kayıtlar seçilir. Takvim günü eşleşmesi ay/gün
 * üzerinden yapılır; yıl serbesttir. Kayıt yoksa sabit bir "boş" mesajı döner.
 * Hiçbir kayıt rastgele bir güne veya yıla bağlanmaz.
 */

import { toCalendarDate } from "./text.mjs";

export const NO_RECORDS_MESSAGE = "Bugün için doğrulanmış kayıt eklenmedi";

export function todayInHistory(records, date = new Date(), options = {}) {
  if (!Array.isArray(records)) throw new TypeError("todayInHistory: kayıt dizisi gerekli.");
  const calendarDate = toCalendarDate(date);
  const [, month, day] = calendarDate.split("-").map(Number);
  const types = Array.isArray(options.types) && options.types.length > 0
    ? new Set(options.types)
    : new Set(["event"]);
  const includeNonPublished = options.includeNonPublished === true;

  const matches = records.filter((record) => {
    if (!includeNonPublished && record?.verification?.status !== "published") return false;
    if (!types.has(record?.type)) return false;
    if (record?.date?.certainty !== "exact" || record?.date?.precision !== "day") return false;
    const start = record?.date?.start;
    if (typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return false;
    const [, recordMonth, recordDay] = start.split("-").map(Number);
    return recordMonth === month && recordDay === day;
  });

  matches.sort((a, b) => {
    const yearA = Number(a.date.start.slice(0, 4));
    const yearB = Number(b.date.start.slice(0, 4));
    if (yearA !== yearB) return yearA - yearB;
    return String(a.title).localeCompare(String(b.title), "tr");
  });

  return {
    date: calendarDate,
    records: matches,
    message: matches.length === 0 ? NO_RECORDS_MESSAGE : null,
  };
}
