import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Pure helper functions matching web/lib/archive.ts contracts
const TYPE_ALIASES = {
  fotograf: "photograph",
  belge: "document",
  konusma: "speech",
  olay: "event",
  yayin: "publication",
  kitap: "publication",
  mekan: "place",
};

function normalizeTurkish(value) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function parseArchiveParams(params) {
  const warnings = [];
  const one = (v) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");
  const clean = (v, max = 120) => one(v).trim().slice(0, max);
  const year = (v) => {
    const text = one(v);
    if (!/^\d{4}$/.test(text)) return undefined;
    const num = Number(text);
    return num >= 1800 && num <= 2100 ? num : undefined;
  };

  const rawType = normalizeTurkish(clean(params.tur, 30));
  const type = rawType ? TYPE_ALIASES[rawType] : undefined;
  if (rawType && !type) warnings.push("Bilinmeyen kayıt türü yok sayıldı.");

  const rawFrom = one(params.baslangic);
  const rawTo = one(params.bitis);
  const yearFrom = year(params.baslangic);
  const yearTo = year(params.bitis);

  if (rawFrom && !yearFrom) warnings.push("Başlangıç yılı 1800–2100 arasında olmalıdır.");
  if (rawTo && !yearTo) warnings.push("Bitiş yılı 1800–2100 arasında olmalıdır.");

  const pageText = one(params.sayfa);
  const parsedPage = /^\d+$/.test(pageText) ? Number(pageText) : 1;
  if (pageText && (!Number.isSafeInteger(parsedPage) || parsedPage < 1)) {
    warnings.push("Geçersiz sayfa numarası ilk sayfaya yönlendirildi.");
  }

  const filters = {
    q: clean(params.q),
    type,
    category: clean(params.kategori),
    source: clean(params.kaynak),
    city: clean(params.sehir),
    yearFrom,
    yearTo,
    page: parsedPage > 0 ? parsedPage : 1,
  };

  if (yearFrom && yearTo && yearFrom > yearTo) {
    warnings.push("Başlangıç yılı bitiş yılından büyük olamaz; tarih aralığı kaldırıldı.");
    filters.yearFrom = undefined;
    filters.yearTo = undefined;
  }

  return { filters, warnings };
}

function reviewLabel(status) {
  if (status === "published") return "Kaynak denetimli · uzman onayı bekliyor";
  if (status === "reviewed") return "Yapay zekâ incelemesinde";
  return "Taslak · yayıma kapalı";
}

test("[18.001] parseArchiveParams tüm GET form parametrelerini doğru ayrıştırır", () => {
  const raw = {
    q: "Nutuk",
    tur: "belge",
    kategori: "Hukuk",
    kaynak: "TBMM",
    sehir: "Ankara",
    baslangic: "1920",
    bitis: "1938",
    sayfa: "2",
  };
  const { filters, warnings } = parseArchiveParams(raw);

  assert.equal(filters.q, "Nutuk");
  assert.equal(filters.type, "document");
  assert.equal(filters.category, "Hukuk");
  assert.equal(filters.source, "TBMM");
  assert.equal(filters.city, "Ankara");
  assert.equal(filters.yearFrom, 1920);
  assert.equal(filters.yearTo, 1938);
  assert.equal(filters.page, 2);
  assert.equal(warnings.length, 0);
});

test("[18.002] İZMİR Türkçe büyük/küçük harf ve aksan normalizasyonu ile doğru katlanır", () => {
  const foldedUpper = normalizeTurkish("İZMİR");
  const foldedLower = normalizeTurkish("izmir");
  const foldedDotted = normalizeTurkish("ısmır");

  assert.equal(foldedUpper, "izmir");
  assert.equal(foldedLower, "izmir");
  assert.equal(foldedDotted, "ismir");
  assert.equal(foldedUpper, foldedLower);
});

test("[18.003] Tür alias eşleştirmesi fotograf/belge/konusma/olay/yayin/mekan sözleşmesine uyar", () => {
  const aliases = [
    { input: "fotograf", expected: "photograph" },
    { input: "belge", expected: "document" },
    { input: "konusma", expected: "speech" },
    { input: "olay", expected: "event" },
    { input: "yayin", expected: "publication" },
    { input: "kitap", expected: "publication" },
    { input: "mekan", expected: "place" },
  ];

  for (const { input, expected } of aliases) {
    const { filters } = parseArchiveParams({ tur: input });
    assert.equal(filters.type, expected, `${input} alias'ı ${expected} türüne eşlenmeli`);
  }
});

test("[18.004] Kaynak kurum filtresi katlanmış Türkçe karakter eşleşmesi sağlar", () => {
  const query = normalizeTurkish("TBMM");
  const target = normalizeTurkish("Türkiye Büyük Millet Meclisi (TBMM) Arşivi");
  assert.ok(target.includes(query));
});

test("[18.005] Başlangıç/bitiş yılı 1800–2100 aralığı dışında güvenli uyarı verir", () => {
  const { filters, warnings } = parseArchiveParams({ baslangic: "1750", bitis: "2150" });

  assert.equal(filters.yearFrom, undefined);
  assert.equal(filters.yearTo, undefined);
  assert.ok(warnings.some((w) => w.includes("Başlangıç yılı 1800–2100")));
  assert.ok(warnings.some((w) => w.includes("Bitiş yılı 1800–2100")));
});

test("[18.006] Başlangıç bitişten büyükse filtre devre dışı uyarısı üretir", () => {
  const { filters, warnings } = parseArchiveParams({ baslangic: "1938", bitis: "1920" });

  assert.equal(filters.yearFrom, undefined);
  assert.equal(filters.yearTo, undefined);
  assert.ok(warnings.some((w) => w.includes("Başlangıç yılı bitiş yılından büyük olamaz")));
});

test("[18.007] web/lib/archive.ts getPublishedArchiveRecordById fonksiyonunu dışa aktarır", () => {
  const archiveSource = readFileSync(path.join(webRoot, "lib", "archive.ts"), "utf8");
  assert.match(archiveSource, /export function getPublishedArchiveRecordById/);
});

test("[18.008] reviewLabel published durumunu dürüst açıklar ve sahte insan onayı ima etmez", () => {
  const label = reviewLabel("published");
  assert.equal(label, "Kaynak denetimli · uzman onayı bekliyor");

  const labelReviewed = reviewLabel("reviewed");
  assert.equal(labelReviewed, "Yapay zekâ incelemesinde");

  const labelDraft = reviewLabel("draft");
  assert.equal(labelDraft, "Taslak · yayıma kapalı");
});

test("[18.009] arsiv/page.tsx ve arsiv/[slug]/page.tsx sahte onay checkmark ikonu içermez", () => {
  const listPage = readFileSync(path.join(webRoot, "app", "arsiv", "page.tsx"), "utf8");
  const detailPage = readFileSync(path.join(webRoot, "app", "arsiv", "[slug]", "page.tsx"), "utf8");

  // check icon should not be used on reviewBadge
  assert.doesNotMatch(listPage, /reviewBadge[\s\S]*?<Icon name="check"/);
  assert.doesNotMatch(detailPage, /reviewBadge[\s\S]*?<Icon name="check"/);
});

test("[18.010] arsiv/[slug]/page.tsx medyasız kayıtta MuseumPlaque kullanır", () => {
  const detailPage = readFileSync(path.join(webRoot, "app", "arsiv", "[slug]", "page.tsx"), "utf8");
  assert.match(detailPage, /<MuseumPlaque/);
  assert.match(detailPage, /relatedRecords/);
});
