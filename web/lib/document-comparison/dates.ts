export type DateCertainty = "exact" | "estimated" | "unknown";
export type DatePrecision = "day" | "month" | "year" | "range" | "unknown";

export interface RecordDateInfo {
  display: string;
  start: string | null;
  end: string | null;
  precision: DatePrecision;
  certainty: DateCertainty;
}

export function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  return Number.isSafeInteger(y) && y >= 1000 && y <= 2100 ? y : null;
}

export function getRecordYearRange(date: RecordDateInfo): { from: number | null; to: number | null } {
  const from = extractYear(date.start);
  const to = extractYear(date.end) ?? from;
  return { from, to };
}

export type OverlapResult = "overlap" | "no_overlap" | "uncertain";

/**
 * Calculates whether two historical date ranges overlap in time.
 * Avoids browser timezone issues by using purely numerical year and ISO string boundaries.
 */
export function checkDateOverlap(dateA: RecordDateInfo, dateB: RecordDateInfo): OverlapResult {
  if (dateA.certainty === "unknown" || dateB.certainty === "unknown") {
    return "uncertain";
  }
  if (!dateA.start || !dateB.start) {
    return "uncertain";
  }

  const rangeA = getRecordYearRange(dateA);
  const rangeB = getRecordYearRange(dateB);

  if (rangeA.from === null || rangeB.from === null) {
    return "uncertain";
  }

  const fromA = rangeA.from;
  const toA = rangeA.to ?? fromA;
  const fromB = rangeB.from;
  const toB = rangeB.to ?? fromB;

  if (toA < fromB || toB < fromA) {
    return "no_overlap";
  }

  return "overlap";
}

export function formatDateContext(date: RecordDateInfo): string {
  const parts: string[] = [date.display || "Tarih belirtilmemiş"];
  if (date.precision && date.precision !== "day") {
    const precLabels: Record<string, string> = {
      month: "Ay hassasiyeti",
      year: "Yıl hassasiyeti",
      range: "Tarih aralığı",
      unknown: "Hassasiyet bilinmiyor",
    };
    parts.push(`(${precLabels[date.precision] || date.precision})`);
  }
  if (date.certainty === "estimated") {
    parts.push("[Tahmini]");
  } else if (date.certainty === "unknown") {
    parts.push("[Belirsiz]");
  }
  return parts.join(" ");
}
