import test from "node:test";
import assert from "node:assert/strict";

import { auditDates, auditRecordDate } from "../src/date-audit.mjs";
import { makeRecord } from "./fixtures.mjs";

function codes(record) {
  return auditRecordDate(record).issues.map((issue) => issue.code);
}

test("tarih nesnesi yoksa yüksek önemde sorun üretir", () => {
  const record = makeRecord({ date: null });
  const result = auditRecordDate(record);
  assert.equal(result.issues[0].code, "missing_date");
  assert.equal(result.issues[0].severity, "high");
});

test("başlangıç ve bitiş tarihlerinin geçerliliğini denetler", () => {
  assert.ok(codes(makeRecord({ date: { start: null, precision: "day" } })).includes("missing_start"));
  assert.ok(codes(makeRecord({ date: { start: "2020-02-30" } })).includes("invalid_start"));
  assert.ok(codes(makeRecord({ date: { start: "1920-01-01", end: "1919-01-01" } })).includes("start_after_end"));
  assert.ok(codes(makeRecord({ date: { start: "1920-01-01", end: "1920-12-31", precision: "range" } })).length === 0);
  assert.ok(codes(makeRecord({ date: { start: "1920-01-01", end: null, precision: "range" } })).includes("range_without_end"));
});

test("hassasiyet ve tarih aralığı uyuşmazlıklarını yakalar", () => {
  assert.ok(
    codes(makeRecord({ date: { start: "1920-01-01", end: "1920-01-02", precision: "day" } })).includes("day_precision_range")
  );
  assert.ok(
    codes(makeRecord({ date: { start: "1920-01-01", end: "1920-02-01", precision: "month" } })).includes(
      "month_precision_multi_month"
    )
  );
  assert.ok(
    codes(makeRecord({ date: { start: "1920-01-01", end: "1921-01-01", precision: "year" } })).includes(
      "year_precision_multi_year"
    )
  );
  assert.ok(
    codes(makeRecord({ date: { start: "1920-04-23", end: null, precision: "year" } })).includes(
      "year_precision_has_month_day"
    )
  );
});

test("yayın kapısındaki tarih kesinliği risklerini işaretler", () => {
  const estimated = makeRecord({
    date: { certainty: "estimated" },
    verification: { status: "published" },
  });
  assert.ok(codes(estimated).includes("estimated_published"));
  const unknown = makeRecord({
    date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "Bilinmiyor" },
    verification: { status: "published" },
  });
  assert.ok(codes(unknown).includes("unknown_published"));
  const knownUnknownPrecision = makeRecord({
    date: { start: "1920-01-01", precision: "unknown", certainty: "unknown" },
  });
  assert.ok(codes(knownUnknownPrecision).includes("known_date_unknown_precision"));
});

test("başlıktaki yıl aralığı tarih alanına yansımıyorsa işaretler", () => {
  const record = makeRecord({
    title: "Ankara Şehreminleri (1924-1930)",
    type: "event",
    date: { start: "1924-02-16", end: null, precision: "day", certainty: "exact" },
  });
  assert.ok(codes(record).includes("title_year_range_not_reflected"));
});

test("boş gösterim, tahmin notu ve aralık notunu işaretler", () => {
  assert.ok(codes(makeRecord({ date: { display: "" } })).includes("missing_display"));
  assert.ok(
    codes(makeRecord({ date: { note: "Yaklaşık bir tarih.", certainty: "exact" } })).includes(
      "note_estimated_but_exact"
    )
  );
  assert.ok(
    codes(makeRecord({ date: { note: "Nisan aralığında.", precision: "day" } })).includes(
      "note_range_but_precision"
    )
  );
});

test("tarih denetimi özeti önem ve kod dağılımını hesaplar", () => {
  const records = [
    makeRecord({ id: "ok", date: { start: "1920-01-01", end: null, precision: "day", certainty: "exact" } }),
    makeRecord({ id: "bad", date: { start: "1920-01-01", end: "1919-01-01" } }),
    makeRecord({ id: "estimated", date: { certainty: "estimated" }, verification: { status: "published" } }),
  ];
  const result = auditDates(records);
  assert.equal(result.summary.totalRecords, 3);
  assert.equal(result.summary.recordsWithIssues, 2);
  assert.equal(result.summary.highSeverityRecords, 1);
  assert.equal(result.summary.estimatedRecords, 1);
  assert.ok(result.summary.issueCount >= 2);
  assert.ok(result.summary.bySeverity.some((item) => item.key === "high"));
});
