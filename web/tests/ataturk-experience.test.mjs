import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");
const { buildAtaturkExperience, dateNote, periodFor, safeExternalUrl } = await import(pathToFileURL(path.join(webRoot, "lib", "ataturk-experience.ts")).href);

function readRecords() {
  return ["content/archive/records", "data/archive/catalog"].flatMap((directory) => readdirSync(path.join(repoRoot, directory)).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(repoRoot, directory, name), "utf8"))));
}

const all = readRecords();
const experience = buildAtaturkExperience(all);
const fixture = (overrides = {}) => ({ ...structuredClone(all.find((record) => record.slug === "tbmm-acilisi-1920")), ...overrides });

test("yalnız yayımlanmış kayıtlar deneyime girer", () => {
  const published = all.filter((record) => record.verification.status === "published");
  assert.equal(experience.records.length, published.length);
  const slugs = new Set(experience.records.map((record) => record.slug));
  for (const record of all.filter((item) => item.verification.status !== "published")) assert.equal(slugs.has(record.slug), false, `${record.slug} yayımlanmamış olduğu hâlde göründü`);
});

test("ilgili kayıtlar yalnız yayımlanmış kayıtlara bağlanır", () => {
  const slugs = new Set(experience.records.map((record) => record.slug));
  for (const record of experience.records) for (const related of record.related) assert.equal(slugs.has(related.slug), true, `${record.slug} → ${related.slug}`);
});

test("kayıtlar kronolojik sıralanır ve dönemlere ayrılır", () => {
  const dates = experience.records.map((record) => record.dateStart ?? "9999");
  assert.deepEqual(dates, [...dates].sort());
  assert.equal(periodFor({ start: "1919-05-19", end: null, precision: "day", certainty: "exact", display: "" }), "milli-mucadele");
  assert.equal(periodFor({ start: "1922-11-01", end: null, precision: "day", certainty: "exact", display: "" }), "kurulus");
  assert.equal(periodFor({ start: "1953", end: null, precision: "year", certainty: "exact", display: "" }), "miras");
  const early = experience.periods.find((period) => period.id === "erken-yillar");
  assert.equal(early.recordSlugs.length, 0, "erken dönem kaynaksız doldurulmamalı");
});

test("kayıt bulunmayan yıllar dürüstçe listelenir", () => {
  const empty = experience.yearMarks.filter((mark) => mark.count === 0).map((mark) => mark.year);
  for (const year of empty) assert.equal(experience.records.some((record) => record.year === year), false);
  assert.deepEqual(experience.periods.flatMap((period) => period.emptyYears).sort(), empty.filter((year) => year <= 1938).sort());
});

test("kaynağı olmayan tema kapalı, kısmi temalar not taşır", () => {
  const childhood = experience.themes.find((theme) => theme.id === "cocukluk-ogrenim");
  assert.equal(childhood.count, 0);
  assert.equal(childhood.coverage, "none");
  for (const theme of experience.themes.filter((item) => item.coverage === "partial")) assert.ok(theme.note, `${theme.id} için kapsam notu yok`);
  assert.equal(experience.themes.length, 8);
});

test("bozuk veya eksik kaynak bağlantısı dış bağlantıya dönüşmez", () => {
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("not a url"), null);
  assert.equal(safeExternalUrl(""), null);
  assert.equal(safeExternalUrl(undefined), null);
  assert.equal(safeExternalUrl("https://kurtulussavasimuzesi.tbmm.gov.tr/meclisacilis"), "https://kurtulussavasimuzesi.tbmm.gov.tr/meclisacilis");
  const broken = fixture({ id: "bozuk-kaynak", slug: "bozuk-kaynak", source: { ...fixture().source, url: "javascript:void(0)", institutionUrl: "" } });
  const [record] = buildAtaturkExperience([broken]).records;
  assert.equal(record.sourceUrl, null);
  assert.equal(record.institutionUrl, null);
});

test("tarihi bilinmeyen kayıt tahmini yıla yerleştirilmez", () => {
  const undated = fixture({ id: "tarihsiz", slug: "tarihsiz", date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "Tarih bilinmiyor" }, relatedIds: [] });
  const result = buildAtaturkExperience([undated]);
  assert.equal(result.records[0].year, null);
  assert.equal(result.records[0].periodId, "tarihsiz");
  assert.match(result.records[0].dateNote, /bilinmiyor/);
  assert.equal(result.periods.some((period) => period.id === "tarihsiz"), true);
  assert.equal(result.stats.undated, 1);
});

test("tarih hassasiyeti açıklanır", () => {
  assert.match(dateNote({ start: "1927", end: null, precision: "year", certainty: "exact", display: "1927" }), /yalnız yılı/);
  assert.match(dateNote({ start: "1928-07", end: null, precision: "month", certainty: "exact", display: "Temmuz 1928" }), /ay düzeyinde/);
  assert.match(dateNote({ start: "1933", end: null, precision: "year", certainty: "estimated", display: "1933" }), /tahminidir/);
  assert.equal(dateNote({ start: "1920-04-23", end: null, precision: "day", certainty: "exact", display: "23 Nisan 1920" }), null);
});

test("yapay zekâ incelemesi insan onayı olarak sunulmaz", () => {
  for (const record of experience.records) {
    assert.doesNotMatch(record.reviewLabel, /uzman onaylı|tarihçi onaylı/i);
    if (/yapay zek/i.test(record.reviewNote)) assert.match(record.reviewNote, /insan tarihçi onayı değildir/);
  }
});

test("öne çıkan alıntı yalnız kurumca doğrulanmış metinden gelir", () => {
  assert.ok(experience.quote);
  const source = all.find((record) => record.slug === experience.quote.recordSlug);
  assert.equal(source.verification.status, "published");
  assert.equal(source.verification.checks.quoteVerified, true);
  assert.equal(source.quotation.text, experience.quote.text);
  assert.doesNotMatch(experience.quote.verifiedBy, /yapay zek/i);
});

test("görsel hakkı doğrulanmamış fotoğraflar gömülmez", () => {
  for (const record of experience.records.filter((item) => item.type === "photograph")) assert.match(record.imageNote ?? "", /gösterilmez|temsilî/);
});
