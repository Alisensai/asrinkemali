/**
 * Katı ISO 8601 zaman doğrulaması. `Date.parse()` "2024-02-30" gibi değerleri sessizce
 * Mart'a taşıyabildiği için takvim ayrıca doğrulanır.
 */

export type TimeError = "timestamp_not_string" | "timestamp_format" | "timezone_required" | "impossible_date" | "invalid_offset" | "future_timestamp";

export type TimeResult = { ok: true; epochMs: number; utc: string } | { ok: false; error: TimeError };

const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
}

function validCalendarDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function parseStrictTimestamp(value: unknown, now?: number): TimeResult {
  if (typeof value !== "string") return { ok: false, error: "timestamp_not_string" };
  const match = TIMESTAMP.exec(value);
  if (!match) return { ok: false, error: "timestamp_format" };
  const [, y, mo, d, h, mi, s = "0", fraction = "", zone] = match;
  if (!zone) return { ok: false, error: "timezone_required" };
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  if (!validCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return { ok: false, error: "impossible_date" };
  let offsetMinutes = 0;
  if (zone !== "Z") {
    const sign = zone.startsWith("-") ? -1 : 1;
    const offsetHours = Number(zone.slice(1, 3));
    const offsetMins = Number(zone.slice(4, 6));
    if (offsetHours > 14 || offsetMins > 59 || (offsetHours === 14 && offsetMins > 0)) return { ok: false, error: "invalid_offset" };
    offsetMinutes = sign * (offsetHours * 60 + offsetMins);
  }
  const ms = Number(fraction.padEnd(3, "0").slice(0, 3));
  const epochMs = Date.UTC(year, month - 1, day, hour, minute, second, ms) - offsetMinutes * 60_000;
  if (now !== undefined && epochMs > now) return { ok: false, error: "future_timestamp" };
  return { ok: true, epochMs, utc: new Date(epochMs).toISOString() };
}

export function parseStrictDate(value: unknown, now?: number): TimeResult {
  if (typeof value !== "string") return { ok: false, error: "timestamp_not_string" };
  const match = DATE_ONLY.exec(value);
  if (!match) return { ok: false, error: "timestamp_format" };
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (!validCalendarDate(year, month, day)) return { ok: false, error: "impossible_date" };
  const epochMs = Date.UTC(year, month - 1, day);
  if (now !== undefined && epochMs > now) return { ok: false, error: "future_timestamp" };
  return { ok: true, epochMs, utc: new Date(epochMs).toISOString() };
}

export interface ChronologyStep {
  label: string;
  at: string;
}

/**
 * Sıralı adımların (ör. inceleme → editör kararı → yayın) zaman tutarlılığı.
 * Her adım geçerli, gelecekte olmayan ve bir öncekinden önce olmayan bir zaman olmalı.
 */
export function chronologyErrors(steps: readonly ChronologyStep[], now: number): string[] {
  const errors: string[] = [];
  let previous: { label: string; epochMs: number } | null = null;
  for (const step of steps) {
    const parsed = parseStrictTimestamp(step.at, now);
    if (!parsed.ok) {
      errors.push(`${step.label}:${parsed.error}`);
      continue;
    }
    if (previous && parsed.epochMs < previous.epochMs) errors.push(`${step.label}:before:${previous.label}`);
    previous = { label: step.label, epochMs: parsed.epochMs };
  }
  return errors;
}
