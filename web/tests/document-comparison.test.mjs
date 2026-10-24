import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "./dates" && context.parentURL?.includes("/document-comparison/")) {
      return next("./dates.ts", context);
    }
    return next(specifier, context);
  },
});

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");

const datesModuleUrl = pathToFileURL(path.join(webRoot, "lib", "document-comparison", "dates.ts")).href;
const modelModuleUrl = pathToFileURL(path.join(webRoot, "lib", "document-comparison", "model.ts")).href;

const { extractYear, checkDateOverlap, formatDateContext } = await import(datesModuleUrl);
const {
  toComparisonRecord,
  toComparisonDataset,
  compareDocuments,
  parseComparisonParams,
  filterRecords,
  foldTurkish,
  isSafeUrl,
  RECORD_TYPE_LABELS,
} = await import(modelModuleUrl);

function makeRecord(id, overrides = {}) {
  return {
    id,
    slug: overrides.slug || id,
    title: overrides.title || `Belge ${id}`,
    summary: overrides.summary || "Belge özeti",
    type: overrides.type || "document",
    date: overrides.date || {
      display: "1923",
      start: "1923-10-29",
      end: null,
      precision: "day",
      certainty: "exact",
    },
    source: overrides.source || {
      institution: "Cumhurbaşkanlığı Arşivi",
      title: "Resmî Gazete Nüshası",
      url: overrides.url !== undefined ? overrides.url : "https://example.org/doc",
      citation: "Düstur 3. Tertip",
    },
    rights: overrides.rights || {
      status: "public_domain_historical",
    },
    verification: overrides.verification || {
      status: "published",
    },
    locations: overrides.locations || [{ city: "Ankara", country: "Türkiye" }],
    people: overrides.people || ["Mustafa Kemal Atatürk"],
    categories: overrides.categories || ["cumhuriyet", "hukuk"],
    provenance: overrides.provenance || [
      { institution: "Millî Kütüphane", identifier: "MK-001", url: "https://example.org/mk" },
    ],
    relatedIds: overrides.relatedIds || [],
  };
}

test("[23.001] visibility gate: yalnızca published kayıtlar karşılaştırma havuzuna girer", () => {
  const records = [
    makeRecord("doc-pub", { verification: { status: "published" } }),
    makeRecord("doc-rev", { verification: { status: "reviewed" } }),
    makeRecord("doc-draft", { verification: { status: "draft" } }),
  ];
  const dataset = toComparisonDataset(records);
  assert.equal(dataset.records.length, 1);
  assert.equal(dataset.records[0].id, "doc-pub");
  assert.equal(dataset.bySlug.has("doc-rev"), false);
  assert.equal(dataset.bySlug.has("doc-draft"), false);
});

test("[23.002] safeUrl: tehlikeli javascript, data ve file şemaları engellenir", () => {
  assert.equal(isSafeUrl("javascript:alert(1)"), null);
  assert.equal(isSafeUrl("JAVASCRIPT:alert(1)"), null);
  assert.equal(isSafeUrl("data:text/html,<script>"), null);
  assert.equal(isSafeUrl("file:///etc/passwd"), null);
  assert.equal(isSafeUrl("https://user:pass@example.org/doc"), null);
  assert.equal(isSafeUrl("https://atam.gov.tr/arsiv/belge.pdf"), "https://atam.gov.tr/arsiv/belge.pdf");
  assert.equal(isSafeUrl("http://ttk.gov.tr/yayin"), "http://ttk.gov.tr/yayin");
});

test("[23.003] parseComparisonParams: geçerli a ve b parametrelerini ayrıştırır", () => {
  const params = { a: "nutuk-1927", b: "amasya-tamimi-1919" };
  const res = parseComparisonParams(params);
  assert.equal(res.slugA, "nutuk-1927");
  assert.equal(res.slugB, "amasya-tamimi-1919");
  assert.equal(res.warnings.length, 0);
});

test("[23.004] parseComparisonParams: aynı belgenin iki kez seçilmesi engellenir", () => {
  const params = { a: "nutuk-1927", b: "nutuk-1927" };
  const res = parseComparisonParams(params);
  assert.equal(res.slugA, "nutuk-1927");
  assert.equal(res.slugB, null);
  assert.ok(res.warnings.some((w) => w.includes("iki kez seçilemez")));
});

test("[23.005] parseComparisonParams: geçersiz karakterli ve zararlı slug girdileri reddedilir", () => {
  const badInputs = ["<script>", "doc/../../etc", "doc;DROP TABLE", "nutuk_1927", "belge@mka"];
  for (const bad of badInputs) {
    const res = parseComparisonParams({ a: bad });
    assert.equal(res.slugA, null);
    assert.ok(res.warnings.length > 0);
  }
});

test("[23.006] parseComparisonParams: aşırı uzun slug (>100 karakter) güvenle sınırlandırılır", () => {
  const longSlug = "a".repeat(150);
  const res = parseComparisonParams({ a: longSlug });
  assert.equal(res.slugA.length, 100);
  assert.ok(res.warnings.some((w) => w.includes("çok uzun")));
});

test("[23.007] dates: extractYear 4 haneli yılları ayrıştırır ve sınır kontrolü yapar", () => {
  assert.equal(extractYear("1923-10-29"), 1923);
  assert.equal(extractYear("1919"), 1919);
  assert.equal(extractYear("999"), null);
  assert.equal(extractYear("2500"), null);
  assert.equal(extractYear(null), null);
  assert.equal(extractYear("geçersiz"), null);
});

test("[23.008] dates: çakışan tarih aralıkları overlap döner", () => {
  const dateA = { display: "1919-1922", start: "1919-05-19", end: "1922-09-09", precision: "range", certainty: "exact" };
  const dateB = { display: "1920-1923", start: "1920-04-23", end: "1923-10-29", precision: "range", certainty: "exact" };
  assert.equal(checkDateOverlap(dateA, dateB), "overlap");
});

test("[23.009] dates: ayrık tarih aralıkları no_overlap döner", () => {
  const dateA = { display: "1919", start: "1919-05-19", end: null, precision: "day", certainty: "exact" };
  const dateB = { display: "1930", start: "1930-08-12", end: null, precision: "day", certainty: "exact" };
  assert.equal(checkDateOverlap(dateA, dateB), "no_overlap");
});

test("[23.010] dates: belirsiz veya eksik tarihler uncertain döner", () => {
  const dateA = { display: "Tarihsiz", start: null, end: null, precision: "unknown", certainty: "unknown" };
  const dateB = { display: "1923", start: "1923-10-29", end: null, precision: "day", certainty: "exact" };
  assert.equal(checkDateOverlap(dateA, dateB), "uncertain");
});

test("[23.011] compareDocuments: ortak kişileri Türkçe katlama ile bulur", () => {
  const docA = toComparisonRecord(makeRecord("a", { people: ["Mustafa Kemal Atatürk", "İsmet İnönü"] }));
  const docB = toComparisonRecord(makeRecord("b", { people: ["ismet inonu", "Kazım Karabekir", "MUSTAFA KEMAL ATATÜRK"] }));
  const res = compareDocuments(docA, docB);
  assert.equal(res.commonPeople.length, 2);
  assert.ok(res.commonPeople.includes("ismet inonu"));
});

test("[23.012] compareDocuments: ortak şehirleri tespit eder", () => {
  const docA = toComparisonRecord(makeRecord("a", { locations: [{ city: "Ankara" }, { city: "Sivas" }] }));
  const docB = toComparisonRecord(makeRecord("b", { locations: [{ city: "ankara" }, { city: "Erzurum" }] }));
  const res = compareDocuments(docA, docB);
  assert.equal(res.commonLocations.length, 1);
  assert.equal(res.commonLocations[0].toLowerCase(), "ankara");
});

test("[23.013] compareDocuments: ortak kategorileri tespit eder", () => {
  const docA = toComparisonRecord(makeRecord("a", { categories: ["hukuk", "tbmm"] }));
  const docB = toComparisonRecord(makeRecord("b", { categories: ["tbmm", "diplomasi"] }));
  const res = compareDocuments(docA, docB);
  assert.deepEqual(res.commonCategories, ["tbmm"]);
});

test("[23.014] compareDocuments: alan farklılıklarını doğru sınıflandırır", () => {
  const docA = toComparisonRecord(makeRecord("a", { type: "document", title: "Teşkilat-ı Esasiye" }));
  const docB = toComparisonRecord(makeRecord("b", { type: "speech", title: "Bursa Nutku" }));
  const res = compareDocuments(docA, docB);
  const typeRow = res.fieldRows.find((r) => r.key === "type");
  const titleRow = res.fieldRows.find((r) => r.key === "title");
  assert.equal(typeRow.isDifferent, true);
  assert.equal(titleRow.isDifferent, true);
});

test("[23.015] compareDocuments: doğrulama etiketinde insan onayı iddiası yapılmaz", () => {
  const docA = toComparisonRecord(makeRecord("a"));
  const docB = toComparisonRecord(makeRecord("b"));
  const res = compareDocuments(docA, docB);
  const reviewRow = res.fieldRows.find((r) => r.key === "review");
  assert.ok(reviewRow.valueA.includes("Uzman teyidi anlamına gelmez"));
  assert.ok(reviewRow.valueB.includes("Uzman teyidi anlamına gelmez"));
  assert.equal(reviewRow.isDifferent, false);
});

test("[23.016] compareDocuments: hiçbir zaman sahte güvenilirlik puanı üretmez", () => {
  const docA = toComparisonRecord(makeRecord("a"));
  const docB = toComparisonRecord(makeRecord("b"));
  const res = compareDocuments(docA, docB);
  // Nesnede "reliabilityScore", "confidence", "trustRatio" gibi sübjektif alanlar olmamalı
  assert.equal(Object.hasOwn(res, "reliabilityScore"), false);
  assert.equal(Object.hasOwn(res, "confidence"), false);
  assert.equal(Object.hasOwn(res, "trustRatio"), false);
});

test("[23.017] foldTurkish: büyük/küçük harf, noktalı/noktasız I ve aksanları eşitler", () => {
  assert.equal(foldTurkish("İSTANBUL"), "istanbul");
  assert.equal(foldTurkish("ısparta"), "isparta");
  assert.equal(foldTurkish("ÇANAKKALE"), "canakkale");
  assert.equal(foldTurkish("Eskişehir"), "eskisehir");
});

test("[23.018] filterRecords: serbest metin, tür ve kurum filtreleri birlikte çalışır", () => {
  const records = [
    toComparisonRecord(makeRecord("doc-1", { type: "document", source: { institution: "Cumhurbaşkanlığı" }, title: "Kararname" })),
    toComparisonRecord(makeRecord("doc-2", { type: "speech", source: { institution: "TBMM" }, title: "Nutuk Açış" })),
    toComparisonRecord(makeRecord("doc-3", { type: "document", source: { institution: "TBMM" }, title: "Kanun Metni" })),
  ];
  assert.equal(filterRecords(records, "Kanun", "all", "").length, 1);
  assert.equal(filterRecords(records, "", "document", "").length, 2);
  assert.equal(filterRecords(records, "", "all", "TBMM").length, 2);
  assert.equal(filterRecords(records, "", "document", "TBMM").length, 1);
});

test("[23.019] formatDateContext: gün hassasiyeti olmayan tarihlere yapay 1 Ocak eklemez", () => {
  const dateInfo = { display: "1923 yılı", start: "1923", end: null, precision: "year", certainty: "exact" };
  const str = formatDateContext(dateInfo);
  assert.ok(str.includes("1923 yılı"));
  assert.ok(str.includes("Yıl hassasiyeti"));
  assert.equal(str.includes("01.01"), false);
});

test("[23.020] malformed record: eksik veya boş alanlara sahip kayıt modeli çökertmez", () => {
  const brokenRecord = {
    id: "broken-1",
    slug: "broken-1",
    title: "Eksik Kayıt",
    type: "document",
    verification: { status: "published" },
  };
  assert.doesNotThrow(() => {
    const comp = toComparisonRecord(brokenRecord);
    assert.equal(comp.title, "Eksik Kayıt");
    assert.equal(comp.people.length, 0);
    assert.equal(comp.locations.length, 0);
    assert.equal(comp.institution, "Belirtilmemiş");
  });
});

test("[23.021] prototype pollution: __proto__ veya constructor alanları sızdırılmaz", () => {
  const malicious = JSON.parse('{"id":"x","slug":"x","__proto__":{"polluted":true},"verification":{"status":"published"}}');
  const comp = toComparisonRecord(malicious);
  assert.equal(comp.polluted, undefined);
  assert.equal({}.polluted, undefined);
});

test("[23.022] scale performance: 10000 sentetik kayıt ile model ve filtre performansı", () => {
  const synthetic = Array.from({ length: 10000 }, (_, i) =>
    makeRecord(`doc-${i}`, {
      slug: `belge-${i}`,
      title: `Sentetik Arşiv Belgesi ${i}`,
      type: i % 2 === 0 ? "document" : "speech",
    })
  );
  const start = performance.now();
  const dataset = toComparisonDataset(synthetic);
  const filtered = filterRecords(dataset.records, "Belgesi 500", "all", "");
  const duration = performance.now() - start;
  assert.equal(dataset.records.length, 10000);
  assert.ok(filtered.length >= 1);
  assert.ok(duration < 1500, `Performans beklentiyi aştı: ${duration}ms`);
});

test("[23.023] gerçek katalog ile tam uyum: tüm published kayıtlar hatasız map edilir", () => {
  const catDirs = ["content/archive/records", "data/archive/catalog"];
  const records = catDirs.flatMap((dir) =>
    readdirSync(path.join(repoRoot, dir))
      .filter((n) => n.endsWith(".json"))
      .map((n) => JSON.parse(readFileSync(path.join(repoRoot, dir, n), "utf8")))
  );
  const dataset = toComparisonDataset(records);
  assert.ok(dataset.records.length >= 140);
  assert.ok(dataset.institutions.length >= 2);
  assert.ok(dataset.types.length >= 4);
});

test("[23.024] Mistral schema alias uyuşmazlığı: sahte enumlar yerine standart tipler kullanılır", () => {
  const expectedTypes = ["photograph", "document", "speech", "event", "publication", "place"];
  for (const t of expectedTypes) {
    assert.ok(RECORD_TYPE_LABELS[t], `${t} tür etiketi tanımlı olmalı`);
  }
  // Sahte türler bulunmamalı
  assert.equal(RECORD_TYPE_LABELS["manuscript"], undefined);
  assert.equal(RECORD_TYPE_LABELS["telegram"], undefined);
});

test("[23.025] relatedIds varlığı güvenle korunur", () => {
  const rec = makeRecord("doc-with-rel", { relatedIds: ["rel-1", "rel-2"] });
  const comp = toComparisonRecord(rec);
  assert.deepEqual(comp.relatedIds, ["rel-1", "rel-2"]);
});
