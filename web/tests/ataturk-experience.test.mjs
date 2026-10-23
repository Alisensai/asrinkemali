import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");
const { buildAtaturkExperience, dateNote, formatYearRanges, periodFor, safeExternalUrl, PLACE_DATE_NOTE } = await import(pathToFileURL(path.join(webRoot, "lib", "ataturk-experience.ts")).href);

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
  // Erken dönem yalnız 1881–1918'e tarihlenen yayımlanmış kayıtları içerir; kaynaksız doldurulmaz.
  const early = experience.periods.find((period) => period.id === "erken-yillar");
  const expectedEarly = all.filter((record) => record.verification.status === "published" && record.date.start && record.date.start >= "1881" && record.date.start < "1919").map((record) => record.slug).sort();
  assert.deepEqual([...early.recordSlugs].sort(), expectedEarly);
  assert.match(early.intro, expectedEarly.length ? /sınırlı/ : /henüz bulunmuyor/);
});

test("kayıt bulunmayan yıllar dürüstçe listelenir", () => {
  const empty = experience.yearMarks.filter((mark) => mark.count === 0).map((mark) => mark.year);
  for (const year of empty) assert.equal(experience.records.some((record) => record.year === year), false);
  for (const year of experience.periods.flatMap((period) => period.emptyYears)) assert.equal(empty.includes(year), true, `${year} kayıtlı olduğu hâlde boş sayıldı`);
  for (const gap of experience.rail.filter((item) => item.kind === "gap")) for (let year = gap.from; year <= gap.to; year += 1) assert.equal(experience.records.some((record) => record.year === year), false);
});

test("kaynağı olmayan tema kapalı, kısmi temalar not taşır", () => {
  for (const theme of experience.themes) assert.equal(theme.coverage === "none", theme.count === 0, theme.id);
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

const make = (slug, overrides = {}) => fixture({ id: slug, slug, relatedIds: [], ...overrides });
const day = (start, display = start) => ({ start, end: null, precision: start.length === 4 ? "year" : "day", certainty: "exact", display });

test("1881 öncesine tarihlenen kayıt yaşam çizelgesine ve tarihsiz gruba girmez", () => {
  const result = buildAtaturkExperience([make("eski-mekan", { type: "place", categories: ["mekan", "egitim"], date: day("1847") }), make("olay-1920", { date: day("1920-04-23") })]);
  const old = result.records.find((record) => record.slug === "eski-mekan");
  assert.equal(old.periodId, "oncesi");
  assert.equal(result.periods.find((period) => period.id === "oncesi").inLifetime, false);
  assert.equal(result.periods.some((period) => period.id === "tarihsiz"), false);
  assert.equal(result.stats.firstLifetimeYear, 1920);
  assert.deepEqual(result.rail.filter((item) => item.kind === "period").map((item) => item.periodId), ["oncesi"]);
});

test("özet yaşam aralığı mekân kuruluş tarihlerinden etkilenmez", () => {
  const result = buildAtaturkExperience([make("okul", { type: "place", categories: ["mekan", "egitim"], date: day("1883") }), make("gazete", { type: "publication", date: day("1908-08-01") }), make("olay", { date: day("1920-04-23") })]);
  assert.equal(result.stats.firstLifetimeYear, 1908);
  assert.equal(result.stats.lastLifetimeYear, 1920);
});

test("mekân kaydının tarihi yaşam olayı gibi sunulmaz", () => {
  const [place] = buildAtaturkExperience([make("kosk", { type: "place", categories: ["mekan"], date: day("1912") })]).records;
  assert.ok(place.dateNote.startsWith(PLACE_DATE_NOTE));
  const [event] = buildAtaturkExperience([make("olay", { date: day("1920-04-23") })]).records;
  assert.equal(event.dateNote, null);
});

test("çocukluk ve öğrenim teması okul mekânlarını öğrenim kanıtı saymaz", () => {
  const school = make("okul", { type: "place", categories: ["mekan", "egitim"], date: day("1883") });
  const decree = make("ogrenim-belgesi", { type: "document", categories: ["egitim"], date: day("1896") });
  const themes = (records) => buildAtaturkExperience(records).themes.find((theme) => theme.id === "cocukluk-ogrenim");
  assert.equal(themes([school]).count, 0);
  assert.equal(themes([school]).coverage, "none");
  assert.equal(themes([school, decree]).count, 1);
  assert.ok(themes([school, decree]).note);
});

test("erken dönem metni kayıt sayısına göre değişir; kayıt varken 'kayıt yok' denmez", () => {
  const empty = buildAtaturkExperience([make("olay", { date: day("1920-04-23") })]).periods.find((period) => period.id === "erken-yillar");
  assert.match(empty.intro, /henüz bulunmuyor/);
  const filled = buildAtaturkExperience([make("gazete", { type: "publication", date: day("1908-08-01") })]);
  assert.doesNotMatch(filled.periods.find((period) => period.id === "erken-yillar").intro, /bulunmuyor/);
  assert.equal(filled.stats.earlyRecords, 1);
});

test("art arda üç ve daha fazla kayıtsız yıl rayda tek aralık olur", () => {
  const result = buildAtaturkExperience(["1908-08-01", "1912-01-01", "1919-05-19", "1921-01-20"].map((start, index) => make(`k${index}`, { date: day(start) })));
  const gaps = result.rail.filter((item) => item.kind === "gap").map((item) => [item.from, item.to]);
  assert.deepEqual(gaps, [[1909, 1911], [1913, 1918], [1920, 1920]]);
  assert.equal(formatYearRanges([1929, 1931, 1932, 1935, 1937]), "1929, 1931–1932, 1935, 1937");
});

test("1938 sonrası ve tarihsiz kayıtlar rayda tek kısayol olarak gösterilir", () => {
  const result = buildAtaturkExperience([make("olay", { date: day("1920-04-23") }), make("anit", { type: "place", date: day("1953-11-10") }), make("yayin", { type: "publication", date: day("2025") }), make("belirsiz", { date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "Tarih bilinmiyor" } })]);
  assert.deepEqual(result.rail.map((item) => item.kind === "period" ? `p:${item.periodId}:${item.count}` : item.kind), ["year", "p:miras:2", "p:tarihsiz:1"]);
});
