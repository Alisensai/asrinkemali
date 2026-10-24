import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const core = await import(pathToFileURL(path.join(root, "lib", "historical-periods", "core.mjs")).href);

const record = (over) => ({
  id: over.id ?? "r",
  slug: over.slug ?? "r",
  title: over.title ?? "Kayıt",
  type: over.type ?? "event",
  date: { start: over.start ?? null, end: over.end ?? null, precision: "day", certainty: "exact", display: over.start ?? "" },
  people: over.people ?? [],
  locations: over.locations ?? [],
  categories: over.categories ?? [],
  summary: "özet",
  source: { institution: over.source ?? "Kurum", institutionType: "institutional", institutionUrl: "https://x", title: "t", url: "https://x", accessedAt: "2026-10-23" },
  verification: { status: "published", reviewedBy: "ai", reviewedAt: "2026-10-23", checks: {}, notes: "" },
  tags: [],
});

test("dönem sınırları: Samsun 19 Mayıs 1919 Millî Mücadele'dedir, TBMM değil", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: "1919-05-19" })), "milli-mucadele");
  assert.equal(core.assignRecordToPeriod(record({ start: "1920-04-23" })), "tbmm-kurulusu");
  assert.equal(core.assignRecordToPeriod(record({ start: "1923-10-29" })), "cumhuriyetin-ilk-yillari");
  assert.equal(core.assignRecordToPeriod(record({ start: "1925-12-31" })), "cumhuriyetin-ilk-yillari");
  assert.equal(core.assignRecordToPeriod(record({ start: "1926-01-01" })), "reformlar-ve-kurumsal-donusum");
  assert.equal(core.assignRecordToPeriod(record({ start: "1938-11-10" })), "ataturk-sonrasi-tarihi-miras");
});

test("dönemler çakışmasız: her kayıt en fazla bir döneme düşer", () => {
  const years = ["1881-01-01", "1906-06-01", "1919-05-19", "1921-01-01", "1923-10-29", "1928-01-01", "1933-01-01", "1953-01-01"];
  const assigned = years.map((y) => core.assignRecordToPeriod(record({ start: y })));
  assert.equal(new Set(assigned.filter(Boolean)).size, assigned.filter(Boolean).length);
  for (const id of assigned) assert.ok(core.getPeriodById(id), `${id} bilinen dönem değil`);
});

test("boş dönem: kayıt yoksa özet dürüstçe sıfır sayar", () => {
  const summary = core.summarizePeriod("ilk-yillar-ve-egitim", []);
  assert.equal(summary.count, 0);
  assert.equal(summary.records.length, 0);
  assert.equal(summary.sources.length, 0);
});

test("eksik tarih: tarihsiz kayıt hiçbir döneme atanmaz", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: null })), null);
  const { unassigned } = core.groupRecordsByPeriod([record({ start: null })]);
  assert.equal(unassigned.length, 1);
});

test("dönem aralığı dışı kayıt atanmaz", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: "1850-01-01" })), null);
});

test("yanlış kaynaklı kayıt dönem özetine kaynak kurumuyla girer, değiştirilmez", () => {
  const summary = core.summarizePeriod("milli-mucadele", [record({ start: "1919-07-01", source: "Yanlış Kurum" })]);
  assert.equal(summary.sources[0][0], "Yanlış Kurum");
});

test("geçersiz filtre: bilinmeyen dönem kimliği uyarıyla yok sayılır", () => {
  const { donem, warnings } = core.parsePeriodParams({ donem: "yok-boyle-donem" });
  assert.equal(donem, null);
  assert.ok(warnings.length >= 1);
  const evil = core.parsePeriodParams({ donem: "../../etc" });
  assert.equal(evil.donem, null);
});

test("geçersiz filtre: kötü karakterli karşılaştırma girişi reddedilir", () => {
  const { karsilastir, warnings } = core.parsePeriodParams({ karsilastir: "tbmm-kurulusu,<script>" });
  assert.deepEqual(karsilastir, ["tbmm-kurulusu"]);
  assert.ok(warnings.length >= 1);
});

test("dönem karşılaştırması: yalnızca nesnel alanlar, nedensellik üretilmez", () => {
  const records = [
    record({ id: "a1", start: "1919-05-19", people: [{ name: "Mustafa Kemal Atatürk" }], source: "Kurum X" }),
    record({ id: "b1", start: "1921-01-01", people: [{ name: "Mustafa Kemal Atatürk" }], source: "Kurum X" }),
  ];
  const result = core.comparePeriods("milli-mucadele", "tbmm-kurulusu", records);
  assert.ok(!("error" in result));
  assert.equal(result.a.count, 1);
  assert.equal(result.b.count, 1);
  assert.deepEqual(result.sharedPeople, ["Mustafa Kemal Atatürk"]);
  assert.deepEqual(result.sharedSources, ["Kurum X"]);
  assert.match(result.causalityNote, /nedensellik/);
});

test("aynı dönem karşılaştırılamaz", () => {
  const result = core.comparePeriods("tbmm-kurulusu", "tbmm-kurulusu", []);
  assert.ok("error" in result);
});

test("yayımlanmamış kayıtlar sayfa katmanına hiç uğramaz (yalnızca published tüketilir)", () => {
  const draft = record({ start: "1921-01-01" });
  draft.verification.status = "draft";
  const { groups } = core.groupRecordsByPeriod([draft]);
  assert.equal(groups.get("tbmm-kurulusu").length, 1);
  // Motor kayıt süzer değil; sayfa getPublishedArchiveRecords() ile süzer.
  // Bu yüzden motor testi yalnızca gruplamayı doğrular; yayın kapısı arşiv lib'indedir.
});

// --- TASK 20 RESMİ SÖZLEŞME VE SAĞLAMLIK TESTLERİ ---

test("[20.001] malformed record: bozuk veya eksik tarihli kayıt hata fırlatmaz", () => {
  assert.equal(core.assignRecordToPeriod(null), null);
  assert.equal(core.assignRecordToPeriod({}), null);
  assert.equal(core.assignRecordToPeriod({ date: null }), null);
  assert.equal(core.assignRecordToPeriod({ date: { start: 1234 } }), null);
});

test("[20.002] duplicate id: aynı id'ye sahip kayıtlar özetleme ve kıyasta güvenle işlenir", () => {
  const recs = [record({ id: "dup", start: "1920-05-01" }), record({ id: "dup", start: "1920-06-01" })];
  const summary = core.summarizePeriod("tbmm-kurulusu", recs);
  assert.equal(summary.count, 2);
});

test("[20.003] null locations ve null people: özetlemede çökme yapmaz", () => {
  const badRec = record({ start: "1920-05-01", locations: null, people: null, categories: null });
  const summary = core.summarizePeriod("tbmm-kurulusu", [badRec]);
  assert.equal(summary.people.length, 0);
  assert.equal(summary.cities.length, 0);
});

test("[20.004] prototype pollution: __proto__ ve constructor alanları sızdırılmaz", () => {
  const polluted = record({ start: "1920-05-01", categories: ["__proto__", "constructor"] });
  const summary = core.summarizePeriod("tbmm-kurulusu", [polluted]);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"), false);
  assert.ok(summary.categoryDistribution.some(([c]) => c === "__proto__"));
});

test("[20.005] 10000 synthetic records: iterative min/max stack overflow üretmez", () => {
  const largeBatch = [];
  for (let i = 0; i < 10000; i++) {
    largeBatch.push(record({ id: `rec-${i}`, start: `192${i % 3}-01-01` }));
  }
  const summary = core.summarizePeriod("tbmm-kurulusu", largeBatch);
  assert.equal(summary.count, 10000);
  assert.equal(summary.earliestYear, 1920);
  assert.equal(summary.latestYear, 1922);
});

test("[20.006] stable ordering: tarih ve Türkçe başlığa göre deterministik sıralama", () => {
  const r1 = record({ id: "1", start: "1920-05-01", title: "Çankaya Kararı" });
  const r2 = record({ id: "2", start: "1920-05-01", title: "Ankara Genelgesi" });
  const summary = core.summarizePeriod("tbmm-kurulusu", [r1, r2]);
  assert.equal(summary.records[0].title, "Ankara Genelgesi");
  assert.equal(summary.records[1].title, "Çankaya Kararı");
});

test("[20.007] artık yıl: 1920-02-29 Millî Mücadele dönemine atanır", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: "1920-02-29" })), "milli-mucadele");
});

test("[20.008] Cumhuriyet ilanı: 1923-10-29 Cumhuriyetin İlk Yılları dönemine atanır", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: "1923-10-29" })), "cumhuriyetin-ilk-yillari");
  assert.equal(core.assignRecordToPeriod(record({ start: "1923-10-28" })), "tbmm-kurulusu");
});

test("[20.009] Atatürk vefatı sonrası: 1938-11-10 miras dönemine atanır", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: "1938-11-10" })), "ataturk-sonrasi-tarihi-miras");
  assert.equal(core.assignRecordToPeriod(record({ start: "1938-11-09" })), "1930lu-yillar");
});

test("[20.010] modern yayın yılı: 2025 tarihli kayıt miras dönemine atanır", () => {
  assert.equal(core.assignRecordToPeriod(record({ start: "2025" })), "ataturk-sonrasi-tarihi-miras");
});

test("[20.011] PeriodRecordCard ve PeriodStrip bileşenleri geçerli rotalara bağlanır", async () => {
  const { readFileSync } = await import("node:fs");
  const cardSrc = readFileSync(path.join(root, "components", "periods", "PeriodRecordCard.tsx"), "utf8");
  assert.match(cardSrc, /href=\{`\/arsiv\/\$\{record\.slug\}`\}/);
  const stripSrc = readFileSync(path.join(root, "components", "periods", "PeriodStrip.tsx"), "utf8");
  assert.match(stripSrc, /href=\{`\/donemler\?donem=\$\{period\.id\}`\}/);
});

test("[20.012] donemler/page.tsx ve bileşenleri istemci içine node:fs sızdırmaz", async () => {
  const { readFileSync } = await import("node:fs");
  const pageSrc = readFileSync(path.join(root, "app", "donemler", "page.tsx"), "utf8");
  assert.doesNotMatch(pageSrc, /node:fs|fs\/promises/);
  const pickerSrc = readFileSync(path.join(root, "components", "periods", "PeriodComparePicker.tsx"), "utf8");
  assert.doesNotMatch(pickerSrc, /node:fs|fs\/promises/);
});

