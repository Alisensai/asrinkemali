/**
 * Asrın Kemali — Tarihî dönem motoru (saf fonksiyonlar, bağımsız modül).
 *
 * Sunucu, istemci ve node:test ortamlarında çalışır; fs/ağ bağımlılığı yoktur.
 * Kayıtlar yalnızca arşiv şeması (schemas/archive-record.types.ts) ile
 * uyumlu nesneler olarak tüketilir. Hiçbir tarihsel nedensellik üretilmez;
 * yalnızca kayıtların nesnel alanları sayılır ve gruplandırılır.
 */

/** Çakışmasız dönem sınırları (ISO tarih). end: null = açık uçlu. */
export const PERIODS = Object.freeze([
  {
    id: "ilk-yillar-ve-egitim",
    title: "İlk Yıllar ve Eğitim",
    start: "1881-01-01",
    end: "1905-12-31",
    summary:
      "Mustafa Kemal'in Selânik'te doğuşu, eğitim yılları ve askerî öğreniminin başlangıcı.",
  },
  {
    id: "osmanlinin-son-donemi",
    title: "Osmanlı'nın Son Dönemi",
    start: "1906-01-01",
    end: "1919-05-18",
    summary:
      "Osmanlı Devleti'nin son yıllarında askerî ve idarî görevler; I. Dünya Savaşı yılları.",
  },
  {
    id: "milli-mucadele",
    title: "Millî Mücadele",
    start: "1919-05-19",
    end: "1920-04-22",
    summary:
      "Samsun'a çıkıştan TBMM'nin açılışına kadar Anadolu'daki ulusal direnişin örgütlenmesi.",
  },
  {
    id: "tbmm-kurulusu",
    title: "TBMM'nin Kuruluşu",
    start: "1920-04-23",
    end: "1923-10-28",
    summary:
      "Meclis'in açılışı, Başkomutanlık yılları ve Lozan'a giden süreç.",
  },
  {
    id: "cumhuriyetin-ilk-yillari",
    title: "Cumhuriyet'in İlk Yılları",
    start: "1923-10-29",
    end: "1925-12-31",
    summary:
      "Cumhuriyet'in ilanı, 1924 Anayasası ve ilk kurumsal düzenlemeler.",
  },
  {
    id: "reformlar-ve-kurumsal-donusum",
    title: "Reformlar ve Kurumsal Dönüşüm",
    start: "1926-01-01",
    end: "1929-12-31",
    summary:
      "Hukuk, eğitim ve kültür alanında köklü kurumsal dönüşümler.",
  },
  {
    id: "1930lu-yillar",
    title: "1930'lu Yıllar",
    start: "1930-01-01",
    end: "1938-11-09",
    summary:
      "Cumhuriyet'in ikinci on yılı: iç politika, ekonomi ve dış politika adımları.",
  },
  {
    id: "ataturk-sonrasi-tarihi-miras",
    title: "Atatürk Sonrası Tarihî Miras",
    start: "1938-11-10",
    end: null,
    summary:
      "10 Kasım 1938 ve sonrasında biriken anma, koruma ve araştırma mirası.",
  },
]);

const PERIOD_BY_ID = new Map(PERIODS.map((p) => [p.id, p]));
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export function getPeriodById(id) {
  return typeof id === "string" ? PERIOD_BY_ID.get(id) ?? null : null;
}

export function listPeriods() {
  return PERIODS.slice();
}

/** Kaydın yıl sınırları; tarih yoksa null. */
export function recordYearBounds(record) {
  const start = record?.date?.start ? Number(record.date.start.slice(0, 4)) : null;
  const end = record?.date?.end ? Number(record.date.end.slice(0, 4)) : start;
  return { start, end };
}

/**
 * Kaydı tek bir döneme atar. Tarihi yoksa veya tüm dönemlerin dışındaysa null.
 * Sınır günü hassasiyeti: kayıt `start` gününe göre eşitlikte önceki döneme dahil olmaz.
 */
export function assignRecordToPeriod(record) {
  const start = record?.date?.start;
  if (!start || typeof start !== "string") return null;
  const normalized = start.length === 4 ? `${start}-01-01` : (start.length === 7 ? `${start}-01` : start);
  for (const period of PERIODS) {
    if (normalized >= period.start && (!period.end || normalized <= period.end)) {
      return period.id;
    }
  }
  return null;
}

/** Dönemlere göre gruplandırma; tarihsiz kayıtlar `unassigned` altında toplanır. */
export function groupRecordsByPeriod(records) {
  const groups = new Map(PERIODS.map((p) => [p.id, []]));
  const unassigned = [];
  for (const record of records) {
    const periodId = assignRecordToPeriod(record);
    if (periodId) groups.get(periodId).push(record);
    else unassigned.push(record);
  }
  return { groups, unassigned };
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"));
}

/** Dönemin nesnel kayıt istatistikleri — yorum/nedensellik içermez. */
export function summarizePeriod(periodId, records) {
  const period = getPeriodById(periodId);
  if (!period) return null;
  const sorted = [...records].sort(
    (a, b) => (a.date.start ?? "").localeCompare(b.date.start ?? "") || a.title.localeCompare(b.title, "tr")
  );
  const years = records.map((r) => recordYearBounds(r).start).filter((y) => y !== null);
  let earliestYear = null;
  let latestYear = null;
  for (const y of years) {
    if (earliestYear === null || y < earliestYear) earliestYear = y;
    if (latestYear === null || y > latestYear) latestYear = y;
  }
  return {
    period,
    count: records.length,
    records: sorted,
    typeDistribution: countBy(records, (r) => r.type),
    categoryDistribution: countBy(records.flatMap((r) => r.categories ?? []), (c) => c),
    sources: countBy(records, (r) => r.source?.institution),
    people: countBy(records.flatMap((r) => r.people ?? []), (p) => p?.name),
    cities: countBy(
      records.flatMap((r) => r.locations ?? []),
      (l) => l?.city ?? l?.name
    ),
    earliestYear,
    latestYear,
  };
}

/**
 * İki dönemin nesnel karşılaştırması.
 * KURAL: Yalnızca kayıtlarda var olan alanlar sayılır; dönemler arası
 * neden-sonuç veya etki ilişkisi üretilmez. `sharedPeople` gibi kesişimler
 * yalnızca "aynı kişinin her iki dönemde de kaydı var" bilgisidir.
 */
export function comparePeriods(idA, idB, records) {
  const a = getPeriodById(idA);
  const b = getPeriodById(idB);
  if (!a || !b) return null;
  if (a.id === b.id) return { error: "Aynı dönem karşılaştırılamaz; farklı iki dönem seçin." };
  const { groups } = groupRecordsByPeriod(records);
  const sumA = summarizePeriod(a.id, groups.get(a.id));
  const sumB = summarizePeriod(b.id, groups.get(b.id));
  const peopleA = new Set(sumA.people.map(([name]) => name));
  const peopleB = new Set(sumB.people.map(([name]) => name));
  const sourcesA = new Set(sumA.sources.map(([s]) => s));
  const sourcesB = new Set(sumB.sources.map(([s]) => s));
  const citiesA = new Set(sumA.cities.map(([c]) => c));
  const citiesB = new Set(sumB.cities.map(([c]) => c));
  return {
    a: sumA,
    b: sumB,
    sharedPeople: [...peopleA].filter((n) => peopleB.has(n)).sort((x, y) => x.localeCompare(y, "tr")),
    sharedSources: [...sourcesA].filter((s) => sourcesB.has(s)),
    sharedCities: [...citiesA].filter((c) => citiesB.has(c)),
    causalityNote:
      "Karşılaştırma yalnızca kayıt özelliklerinin nesnel sayımıdır; dönemler arası tarihsel nedensellik iddiası içermez.",
  };
}

/**
 * URL parametrelerini doğrular. Bilinmeyen/geçersiz dönemler yok sayılır ve
 * dürüst uyarı üretilir; sessizce kabul edilmez.
 */
export function parsePeriodParams(params) {
  const warnings = [];
  const one = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
  const rawDonem = String(one(params?.donem ?? "")).trim();
  const rawKarsilastir = String(one(params?.karsilastir ?? "")).trim();
  let donem = null;
  let karsilastir = [];
  if (rawDonem) {
    if (SLUG_RE.test(rawDonem) && getPeriodById(rawDonem)) donem = rawDonem;
    else warnings.push("Geçersiz dönem kimliği yok sayıldı.");
  }
  if (rawKarsilastir) {
    const parts = rawKarsilastir.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);
    for (const part of parts) {
      if (SLUG_RE.test(part) && getPeriodById(part)) karsilastir.push(part);
      else warnings.push(`"${part}" bilinen bir dönem değil; karşılaştırmadan çıkarıldı.`);
    }
    karsilastir = [...new Set(karsilastir)];
    if (karsilastir.length === 1) warnings.push("Karşılaştırma için ikinci bir dönem gerekli.");
  }
  return { donem, karsilastir, warnings };
}
