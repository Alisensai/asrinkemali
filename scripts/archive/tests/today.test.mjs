import test from "node:test";
import assert from "node:assert/strict";

import { todayInHistory, NO_RECORDS_MESSAGE } from "../lib/today.mjs";
import { loadArchive } from "../lib/load.mjs";
import { makeRecord } from "./helpers.mjs";

function event(id, date, overrides = {}) {
  return makeRecord({
    id,
    slug: id,
    title: `Olay ${id}`,
    date: {
      start: date,
      end: null,
      precision: "day",
      certainty: "exact",
      display: date,
    },
    ...overrides,
  });
}

const records = [
  event("olay-1923", "1923-10-29"),
  event("olay-1933", "1933-10-29"),
  event("olay-baska-gun", "1923-10-30"),
  event("olay-incelenmis", "1924-07-15", { verification: { status: "reviewed" } }),
  event("olay-taslak", "1925-08-15", { verification: { status: "draft" } }),
  event("olay-ay", "1926-10-01", {
    date: { start: "1926-10-01", end: null, precision: "month", certainty: "exact", display: "Ekim 1926" },
  }),
  makeRecord({
    id: "fotograf-1920",
    slug: "fotograf-1920",
    title: "Fotoğraf 1920",
    type: "photograph",
    date: { start: "1920-06-15", end: null, precision: "day", certainty: "exact", display: "15 Haziran 1920" },
    image: {
      kind: "digitized_original",
      url: null,
      sourcePageUrl: "https://kurtulussavasimuzesi.tbmm.gov.tr/fotograf",
      alt: "Test fotoğrafı",
      credit: "TBMM",
      width: null,
      height: null,
      mimeType: null,
      localPath: null,
      displayPolicy: "source_link_only",
    },
    rights: {
      status: "official_link_only",
      license: null,
      licenseUrl: null,
      termsUrl: null,
      credit: "TBMM",
      imageReuse: "link_only",
      note: "Yalnızca kaynak sayfaya bağlantı verilir.",
    },
  }),
];

test("aynı takvim gününe düşen yayımlanmış olayları yıl sırasıyla döndürür", () => {
  const result = todayInHistory(records, "2026-10-29");
  assert.equal(result.date, "2026-10-29");
  assert.equal(result.message, null);
  assert.deepEqual(result.records.map((record) => record.id), ["olay-1923", "olay-1933"]);
});

test("23 Ekim için doğrulanmış kayıt yoksa sabit mesaj döner", async () => {
  const archive = await loadArchive();
  const result = todayInHistory(archive.records, "2026-10-23");
  assert.equal(result.records.length, 0);
  assert.equal(result.message, NO_RECORDS_MESSAGE);
  assert.equal(result.message, "Bugün için doğrulanmış kayıt eklenmedi");
});

test("inceleme/taslak, farklı tür ve gün hassasiyeti olmayan kayıtlar dışlanır", () => {
  const result = todayInHistory(records, "1924-07-15");
  assert.deepEqual(result.records.map((record) => record.id), []);
  assert.equal(result.message, NO_RECORDS_MESSAGE);
  const withReviewed = todayInHistory(records, "1924-07-15", { includeNonPublished: true });
  assert.deepEqual(withReviewed.records.map((record) => record.id), ["olay-incelenmis"]);
  const onlyEvents = todayInHistory(records, "1920-06-15");
  assert.equal(onlyEvents.records.length, 0);
  const withPhotos = todayInHistory(records, "1920-06-15", { types: ["event", "photograph"] });
  assert.deepEqual(withPhotos.records.map((record) => record.id), ["fotograf-1920"]);
});

test("geçersiz tarihlerde açık hata verir", () => {
  assert.throws(() => todayInHistory(records, "2026-02-30"), /Geçersiz takvim tarihi/);
  assert.throws(() => todayInHistory(records, "bugün"), /YYYY-MM-DD/);
  assert.throws(() => todayInHistory(null, "2026-10-23"), /kayıt dizisi/);
});

test("Date nesnesi yerel takvim gününe çevrilir", () => {
  const result = todayInHistory(records, new Date(2026, 9, 29, 12, 0, 0));
  assert.equal(result.date, "2026-10-29");
  assert.equal(result.records.length, 2);
});
