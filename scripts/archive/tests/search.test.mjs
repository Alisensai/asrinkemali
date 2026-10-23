import test from "node:test";
import assert from "node:assert/strict";

import { searchRecords, parseSearchQuery, getRecordById, getRecordYearRange } from "../lib/search.mjs";
import { makeRecord } from "./helpers.mjs";

const records = [
  makeRecord({
    id: "istiklal-marsi-1921",
    slug: "istiklal-marsi-1921",
    title: "İstiklal Marşı'nın Kabulü",
    date: { start: "1921-03-12", end: null, precision: "day", certainty: "exact", display: "12 Mart 1921" },
    categories: ["milli-mucadele", "kultur"],
    summary: "Mehmet Akif Ersoy'un yazdığı İstiklal Marşı, 12 Mart 1921'de TBMM tarafından kabul edildi.",
    tags: ["İstiklal Marşı", "TBMM", "Mehmet Akif Ersoy"],
    people: [{ name: "Mehmet Akif Ersoy", role: "author" }],
  }),
  makeRecord({
    id: "cumhuriyetin-ilani-1923",
    slug: "cumhuriyetin-ilani-1923",
    title: "Cumhuriyet'in İlanı",
    date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
    categories: ["kurulus", "cumhuriyet"],
    summary: "Türkiye Büyük Millet Meclisi 29 Ekim 1923'te cumhuriyeti ilan etti.",
    tags: ["TBMM", "Ankara", "cumhuriyet"],
  }),
  makeRecord({
    id: "isik-uzerine-1920",
    slug: "isik-uzerine-1920",
    title: "Işık Üzerine Bir Belge",
    type: "document",
    date: { start: "1920-01-01", end: null, precision: "year", certainty: "exact", display: "1920" },
    categories: ["kultur"],
    summary: "Işık konusunu ele alan örnek bir belge kaydı.",
    tags: ["Işık"],
  }),
  makeRecord({
    id: "meclis-onunde-dua-1920",
    slug: "meclis-onunde-dua-1920",
    title: "Meclis Önünde Dua",
    type: "photograph",
    date: { start: "1920-05-06", end: null, precision: "day", certainty: "exact", display: "6 Mayıs 1920" },
    categories: ["fotograf", "tbmm"],
    summary: "Meclis önünde dua eden milletvekillerini gösteren fotoğraf.",
    tags: ["dua", "meclis"],
    image: {
      kind: "digitized_original",
      url: null,
      sourcePageUrl: "https://kurtulussavasimuzesi.tbmm.gov.tr/fotograf",
      alt: "Meclis önünde dua eden milletvekilleri",
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
  makeRecord({
    id: "vatandas-icin-medeni-bilgiler-1930",
    slug: "vatandas-icin-medeni-bilgiler-1930",
    title: "Vatandaş İçin Medenî Bilgiler",
    type: "publication",
    date: { start: "1930-01-01", end: null, precision: "year", certainty: "exact", display: "1930" },
    categories: ["egitim", "yayin"],
    summary: "Vatandaşlık bilgisi alanında yayımlanmış temel bir eser.",
    tags: ["eğitim", "Afet İnan"],
    verification: { status: "published" },
  }),
  makeRecord({
    id: "inonu-zaferi-1921",
    slug: "inonu-zaferi-1921",
    title: "İnönü Zaferi",
    date: { start: "1921-04-01", end: null, precision: "day", certainty: "exact", display: "1 Nisan 1921" },
    categories: ["milli-mucadele"],
    summary: "İnönü Zaferi'ni konu alan incelenmiş kayıt.",
    tags: ["İnönü"],
    verification: { status: "reviewed" },
  }),
  makeRecord({
    id: "selanikteki-ataturk-evi",
    slug: "selanikteki-ataturk-evi",
    title: "Atatürk'ün Selanik'teki Evi",
    type: "place",
    date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "Tarih bilinmiyor" },
    categories: ["mekan"],
    summary: "Selanik'te bulunan tarihî ev.",
    tags: ["Selanik"],
    verification: { status: "draft" },
  }),
];

test("varsayılan arama yalnızca yayımlanmış kayıtları döndürür", () => {
  const hits = searchRecords(records, "inönü");
  assert.equal(hits.length, 0);
  const all = searchRecords(records, { q: "inönü", includeNonPublished: true });
  assert.equal(all.length, 1);
  assert.equal(all[0].record.id, "inonu-zaferi-1921");
});

test("Türkçe büyük/küçük harf ve aksan eşitlemesi aramada çalışır", () => {
  assert.equal(searchRecords(records, "istiklal")[0].record.id, "istiklal-marsi-1921");
  assert.equal(searchRecords(records, "İSTİKLAL")[0].record.id, "istiklal-marsi-1921");
  assert.equal(searchRecords(records, "isik")[0].record.id, "isik-uzerine-1920");
  assert.equal(searchRecords(records, "IŞIK")[0].record.id, "isik-uzerine-1920");
  assert.equal(searchRecords(records, "sisli").length, 0);
});

test("exact mod Türkçe harf ayrımını korur", () => {
  assert.equal(searchRecords(records, { q: "isik", mode: "exact" }).length, 0);
  assert.equal(searchRecords(records, { q: "Işık", mode: "exact" })[0].record.id, "isik-uzerine-1920");
  assert.equal(searchRecords(records, { q: "İstiklal", mode: "exact" })[0].record.id, "istiklal-marsi-1921");
});

test("yıl, kategori, tür ve etiket süzgeçleri birlikte çalışır", () => {
  assert.equal(searchRecords(records, "yil:1923")[0].record.id, "cumhuriyetin-ilani-1923");
  assert.equal(searchRecords(records, "kategori:egitim")[0].record.id, "vatandas-icin-medeni-bilgiler-1930");
  assert.equal(searchRecords(records, "tur:fotograf")[0].record.id, "meclis-onunde-dua-1920");
  assert.equal(searchRecords(records, "tur:belge")[0].record.id, "isik-uzerine-1920");
  assert.equal(searchRecords(records, "etiket:TBMM").length, 2);
  assert.equal(searchRecords(records, { q: "meclis", tags: ["TBMM"] }).length, 1);
  assert.equal(searchRecords(records, { q: "meclis", category: "fotograf" })[0].record.id, "meclis-onunde-dua-1920");
});

test("yıl aralığı ve programatik süzgeçler", () => {
  const hits = searchRecords(records, { yearFrom: 1920, yearTo: 1922 });
  assert.deepEqual(hits.map((hit) => hit.record.id).sort(), [
    "isik-uzerine-1920",
    "istiklal-marsi-1921",
    "meclis-onunde-dua-1920",
  ].sort());
  assert.equal(searchRecords(records, { year: 1920, type: "photograph" })[0].record.id, "meclis-onunde-dua-1920");
  assert.equal(searchRecords(records, { q: "meclis", limit: 1 }).length, 1);
});

test("parseSearchQuery alanları ve tırnaklı ifadeleri ayrıştırır", () => {
  const parsed = parseSearchQuery('yil:1923 kategori:kurulus tur:event etiket:"TBMM" "cumhuriyet ilanı"');
  assert.equal(parsed.year, 1923);
  assert.equal(parsed.category, "kurulus");
  assert.equal(parsed.type, "event");
  assert.deepEqual(parsed.tags, ["tbmm"]);
  assert.equal(parsed.text, "cumhuriyet ilanı");
  assert.equal(parseSearchQuery("yil:1920-1923").yearFrom, 1920);
  assert.equal(parseSearchQuery("yil:1920-1923").yearTo, 1923);
  assert.equal(parseSearchQuery("bilinmeyen:deger").text, "bilinmeyen:deger");
});

test("başlık eşleşmesi özet eşleşmesinden daha yüksek puan alır", () => {
  const hits = searchRecords(records, "cumhuriyet");
  assert.equal(hits[0].record.id, "cumhuriyetin-ilani-1923");
  assert.ok(hits[0].score > 0);
  assert.ok(hits[0].matchedFields.includes("title"));
});

test("getRecordById ve getRecordYearRange", () => {
  assert.equal(getRecordById(records, "cumhuriyetin-ilani-1923").title, "Cumhuriyet'in İlanı");
  assert.equal(getRecordById(records, "yok"), null);
  assert.deepEqual(getRecordYearRange(records[0]), { startYear: 1921, endYear: 1921 });
  assert.deepEqual(
    getRecordYearRange({ date: { start: "1920-04-23", end: "1924-10-15" } }),
    { startYear: 1920, endYear: 1924 }
  );
  assert.equal(getRecordYearRange({ date: { start: null } }), null);
});
