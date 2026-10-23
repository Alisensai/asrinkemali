/**
 * Tarih kesinliği denetimi.
 *
 * Bu denetim tarihsel doğruluğu kanıtlamaz; kayıttaki tarih alanının kendi
 * içinde tutarlı olup olmadığını, kesinlik beyanıyla gösterim arasındaki
 * uyuşmazlıkları ve yayın kapısıyla ilgili riskleri görünür kılar.
 */

import { countBy, issue, parseIsoDate, sortBy, toSortedEntries } from "./util.mjs";

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

function yearRangeFromTitle(title) {
  const text = String(title ?? "");
  const matches = [...text.matchAll(/\b(1[89]\d{2}|20\d{2})\s*[-–—]\s*(1[89]\d{2}|20\d{2})\b/g)];
  if (matches.length === 0) return null;
  const first = Number(matches[0][1]);
  const second = Number(matches[0][2]);
  if (first > second) return null;
  return { first, second, text: matches[0][0] };
}

export function auditRecordDate(record) {
  const issues = [];
  const date = record.date;
  if (!date || typeof date !== "object") {
    return {
      recordId: record.id ?? null,
      title: record.title ?? null,
      type: record.type ?? null,
      status: record.verification?.status ?? null,
      start: null,
      end: null,
      precision: null,
      certainty: null,
      display: null,
      issues: [issue("missing_date", "high", "Kayıtta tarih nesnesi yok.", "$.date")],
    };
  }

  const startParts = parseIsoDate(date.start);
  const endParts = date.end ? parseIsoDate(date.end) : null;
  const precision = date.precision ?? null;
  const certainty = date.certainty ?? null;
  const status = record.verification?.status ?? null;

  if (!date.start && precision !== "unknown") {
    issues.push(issue("missing_start", "high", "Tarih başlangıcı yok; kesinlik 'unknown' değil.", "$.date.start"));
  }
  if (date.start && !startParts) {
    issues.push(issue("invalid_start", "high", "Tarih başlangıcı ISO YYYY-MM-DD biçiminde değil.", "$.date.start"));
  }
  if (date.end && !endParts) {
    issues.push(issue("invalid_end", "high", "Tarih bitişi ISO YYYY-MM-DD biçiminde değil.", "$.date.end"));
  }
  if (startParts && endParts && startParts.iso > endParts.iso) {
    issues.push(issue("start_after_end", "high", "Başlangıç tarihi bitiş tarihinden sonra.", "$.date"));
  }
  if (precision === "unknown" && (date.start || date.end)) {
    issues.push(issue("known_date_unknown_precision", "high", "Tarih değeri var ama hassasiyet 'unknown'.", "$.date.precision"));
  }
  if (precision === "day" && startParts && endParts && startParts.iso !== endParts.iso) {
    issues.push(issue("day_precision_range", "medium", "Gün hassasiyeti var ama başlangıç ve bitiş farklı.", "$.date.end"));
  }
  if (precision === "range" && startParts && !endParts) {
    issues.push(issue("range_without_end", "high", "Aralık hassasiyeti var ama bitiş tarihi yok.", "$.date.end"));
  }
  if (precision === "month" && startParts && endParts && (startParts.year !== endParts.year || startParts.month !== endParts.month)) {
    issues.push(issue("month_precision_multi_month", "medium", "Ay hassasiyeti var ama tarih birden fazla aya yayılıyor.", "$.date.end"));
  }
  if (precision === "year" && startParts && endParts && startParts.year !== endParts.year) {
    issues.push(issue("year_precision_multi_year", "medium", "Yıl hassasiyeti var ama tarih birden fazla yıla yayılıyor.", "$.date.end"));
  }
  if (precision === "year" && startParts && (startParts.month !== 1 || startParts.day !== 1)) {
    issues.push(issue("year_precision_has_month_day", "low", "Yıl hassasiyetine rağmen ay/gün bilgisi dolu.", "$.date.start"));
  }
  if (certainty === "estimated" && status === "published") {
    issues.push(issue("estimated_published", "medium", "Tahmini tarihli kayıt yayında.", "$.date.certainty"));
  }
  if (certainty === "unknown" && status === "published") {
    issues.push(issue("unknown_published", "high", "Tarihi bilinmeyen kayıt yayında.", "$.date.certainty"));
  }
  if (!date.display || String(date.display).trim() === "") {
    issues.push(issue("missing_display", "medium", "Tarih gösterimi boş.", "$.date.display"));
  }
  if (date.note && /tahmin|yaklaşık|muhtemelen/i.test(date.note) && certainty === "exact") {
    issues.push(issue("note_estimated_but_exact", "low", "Tarih notu tahmin ifadesi içeriyor ama kesinlik 'exact'.", "$.date.note"));
  }
  if (date.note && /aralık|aralığı/i.test(date.note) && precision !== "range") {
    issues.push(issue("note_range_but_precision", "low", "Tarih notu aralıktan söz ediyor ama hassasiyet 'range' değil.", "$.date.note"));
  }

  const titleRange = yearRangeFromTitle(record.title);
  if (titleRange && ["event", "place", "document"].includes(record.type) && precision !== "range") {
    issues.push(
      issue(
        "title_year_range_not_reflected",
        "medium",
        `Başlıkta ${titleRange.first}-${titleRange.second} dönemi var; tarih alanı tek tarih olarak modellenmiş.`,
        "$.title"
      )
    );
  }

  const maxYear = new Date().getUTCFullYear() + 1;
  if (startParts && startParts.year > maxYear) {
    issues.push(issue("future_date", "medium", "Tarih gelecekte görünüyor.", "$.date.start"));
  }

  return {
    recordId: record.id ?? null,
    title: record.title ?? null,
    type: record.type ?? null,
    status,
    start: date.start ?? null,
    end: date.end ?? null,
    precision,
    certainty,
    display: date.display ?? null,
    note: date.note ?? null,
    issues: sortBy(issues, (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.code.localeCompare(b.code)),
  };
}

export function auditDates(records) {
  const rows = sortBy(
    records.map((record) => auditRecordDate(record)),
    (a, b) => {
      const severityA = Math.min(...a.issues.map((item) => SEVERITY_RANK[item.severity]), 99);
      const severityB = Math.min(...b.issues.map((item) => SEVERITY_RANK[item.severity]), 99);
      return severityA - severityB || String(a.recordId).localeCompare(String(b.recordId), "tr");
    }
  );
  const issues = rows.flatMap((row) =>
    row.issues.map((item) => ({
      recordId: row.recordId,
      title: row.title,
      type: row.type,
      status: row.status,
      start: row.start,
      end: row.end,
      ...item,
    }))
  );
  const bySeverity = countBy(issues, (item) => item.severity);
  const byCode = countBy(issues, (item) => item.code);
  const byCertainty = countBy(rows, (row) => row.certainty ?? "(yok)");
  const byPrecision = countBy(rows, (row) => row.precision ?? "(yok)");

  return {
    schemaVersion: "1.0.0",
    policy: {
      scope: "Tarih alanının iç tutarlılığı ve kesinlik beyanı; tarihsel doğruluk iddiası değildir.",
      severity: {
        high: "Yayın kapısını veya tarih modelini doğrudan etkileyebilir.",
        medium: "Uzman incelemesi gerektiren tutarsızlık.",
        low: "Bilgi amaçlı iyileştirme fırsatı.",
      },
    },
    summary: {
      totalRecords: rows.length,
      recordsWithIssues: rows.filter((row) => row.issues.length > 0).length,
      highSeverityRecords: rows.filter((row) => row.issues.some((item) => item.severity === "high")).length,
      issueCount: issues.length,
      bySeverity: toSortedEntries(bySeverity),
      byCode: toSortedEntries(byCode),
      byCertainty: toSortedEntries(byCertainty),
      byPrecision: toSortedEntries(byPrecision),
      exactRecords: rows.filter((row) => row.certainty === "exact").length,
      estimatedRecords: rows.filter((row) => row.certainty === "estimated").length,
      unknownRecords: rows.filter((row) => row.certainty === "unknown").length,
      estimatedPublished: rows.filter((row) => row.certainty === "estimated" && row.status === "published").length,
      unknownPublished: rows.filter((row) => row.certainty === "unknown" && row.status === "published").length,
    },
    records: rows,
    issues,
  };
}
