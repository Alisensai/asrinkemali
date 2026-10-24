/**
 * Arşiv boşluk analizi.
 *
 * - Kayıt sayısı ve durum dağılımı (yayımlandı/incelendi/taslak).
 * - Yıl bazlı kayıt yoğunluğu ve yıl aralıkları.
 * - Araştırma teması kapsamı (kayıt yok ≠ tarihî olay yok ilkesiyle).
 * - Hedef dönem için eksik aralık raporu.
 *
 * Bu analiz "bu yılda tarihî olay yok" DEMEZ; yalnızca "bu yılda arşiv kaydı
 * yok" der. Tema eşleşmesi anahtar kelime temellidir; kesin tema doğrulaması
 * insan incelemesi gerektirir.
 */

import { RESEARCH_THEMES } from "./types.mjs";

const THEME_LABELS = {
  "cocukluk": "Çocukluğu ve aile yaşamı",
  "selanik": "Selanik dönemi",
  "egitim": "İlk öğrenim ve askerî okullar",
  "manastir": "Manastır yılları",
  "harp-okulu": "Harp Okulu",
  "harp-akademisi": "Harp Akademisi",
  "ilk-gorevler": "İlk askerî görevleri",
  "sam": "Şam dönemi",
  "trablusgarp": "Trablusgarp Savaşı",
  "balkan-savaslari": "Balkan Savaşları",
  "canakkale": "Çanakkale Savaşları",
  "dogu-cephesi": "Doğu Cephesi",
  "1917-1918": "1917–1918 dönemi",
  "kisiler": "Dönemin tarihî kişileri",
  "mekanlar": "Dönemin tarihî mekânları",
  "genel": "Genel yaşam",
};

/** Kaydın kapsadığı yıl aralığını çıkarır. */
export function recordYearRange(record) {
  const start = record?.date?.start ? Number(String(record.date.start).slice(0, 4)) : null;
  const end = record?.date?.end ? Number(String(record.date.end).slice(0, 4)) : start;
  return { start, end: end ?? start };
}

/** Türkçe metin için kelime-sınırı eşleştirme (alt dizgi yanlış pozitiflerini önler). */
function matchPhrase(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "u");
  return pattern.test(haystack);
}

/** Kaydın metin alanlarında tema anahtar kelime araması yapar. */
function recordThemeHits(record) {
  const haystack = [
    record?.title ?? "",
    record?.summary ?? "",
    record?.description ?? "",
    ...(record?.tags ?? []),
    ...(record?.categories ?? []),
  ].join(" ").toLocaleLowerCase("tr-TR");

  const hits = new Set();
  const addIf = (theme, needles) => {
    for (const needle of needles) {
      if (matchPhrase(haystack, needle.toLocaleLowerCase("tr-TR"))) {
        hits.add(theme);
        break;
      }
    }
  };
  addIf("cocukluk", ["çocukluk", "çocukluğu", "ailesi", "annesi", "zubeyde", "rüştü eşik", "ali rıza"]);
  addIf("selanik", ["selanik", "selanik'te", "selanikte"]);
  addIf("egitim", ["öğrenim", "okulu", "idadisi", "rüştiyesi", "mahalle mektebi", "askerî rüştiye", "askeri rüştiye"]);
  addIf("manastir", ["manastır"]);
  addIf("harp-okulu", ["harp okulu", "harbiye", "harbokulu"]);
  addIf("harp-akademisi", ["harp akademisi", "erkân-ı harbiye", "erkan-i harbiye", "kurmay"]);
  addIf("ilk-gorevler", ["ilk görev", "staj", "5. ordu", "beşinci ordu"]);
  addIf("sam", ["şam", "şam'da", "şamda", "hafız ahmet", "lodi kasabası"]);
  addIf("trablusgarp", ["trablusgarp", "trablus", "derne", "sirenayka"]);
  addIf("balkan-savaslari", ["balkan savaşı", "balkan savaşları", "balkan harbi", "edirne'nin kurtuluşu", "bulgar"]);
  addIf("canakkale", ["çanakkale", "anafartalar", "arıburnu", "gallipoli", "18 mart 1915", "seddülbahir"]);
  addIf("dogu-cephesi", ["doğu cephesi", "doğu ordusu", "muş", "bitlis", "kafkas cephesi", "16. kolordu"]);
  addIf("1917-1918", ["1917", "1918", "hızır bey", "vahidettin", "veliaht", "almanya seyahati", "suriye cephesi", "yıldırım orduları"]);
  addIf("kisiler", ["mustafa kemal'in", "arkadaşı", "yaver", "subay"]);
  addIf("mekanlar", ["ev", "müze", "evi", "kışla", "okul binası"]);
  addIf("genel", ["hayatı", "biyografi", "ansiklopedi"]);
  return hits;
}

function coverageFor(count) {
  if (count === 0) return "none";
  if (count <= 2) return "sparse";
  if (count <= 9) return "partial";
  return "covered";
}

/**
 * Hedef dönem içinde boş/seyrek yıl aralıklarını bulur.
 */
function findMissingRanges(years, targetStart, targetEnd, sparseThreshold = 0) {
  const set = new Set(years);
  const missing = [];
  let cursor = targetStart;
  let runStart = null;
  while (cursor <= targetEnd) {
    const count = set.has(cursor) ? 1 : 0; // yalnızca var/yok; yoğunluk ayrıca raporlanır
    const sparse = set.has(cursor) && years.filter((y) => y === cursor).length <= sparseThreshold;
    if (count === 0 || sparse) {
      if (runStart === null) runStart = cursor;
    } else if (runStart !== null) {
      missing.push({ start: runStart, end: cursor - 1, note: "Arşiv kaydı yok." });
      runStart = null;
    }
    cursor += 1;
  }
  if (runStart !== null) {
    missing.push({ start: runStart, end: targetEnd, note: "Arşiv kaydı yok." });
  }
  return missing;
}

/**
 * @param {Array} records
 * @param {{targetStart?: number, targetEnd?: number}} [options]
 * @returns {import("./types.mjs").GapReport}
 */
export function analyzeGaps(records, options = {}) {
  const targetStart = options.targetStart ?? 1881;
  const targetEnd = options.targetEnd ?? 1918;
  const counts = { total: records.length, published: 0, reviewed: 0, draft: 0 };
  const recordsByYear = {};
  const yearList = [];
  const themeCounts = Object.fromEntries(RESEARCH_THEMES.map((theme) => [theme, 0]));
  const targetPeriodRecords = [];

  for (const record of records) {
    const status = record?.verification?.status;
    if (status === "published") counts.published += 1;
    else if (status === "reviewed") counts.reviewed += 1;
    else counts.draft += 1;

    const { start, end } = recordYearRange(record);
    if (start !== null && Number.isFinite(start)) {
      for (let year = start; year <= (end ?? start); year += 1) {
        recordsByYear[year] = (recordsByYear[year] ?? 0) + 1;
        yearList.push(year);
      }
    }
    // Hedef dönemle kesişen AYRI kayıtlar (kayıt-yıl örnekleme değil)
    if (
      start !== null && Number.isFinite(start) &&
      start <= targetEnd && (end ?? start) >= targetStart
    ) {
      targetPeriodRecords.push(record);
      for (const theme of recordThemeHits(record)) {
        themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
      }
    }
  }

  const themeCoverage = RESEARCH_THEMES.map((theme) => ({
    theme,
    label: THEME_LABELS[theme] ?? theme,
    records: themeCounts[theme] ?? 0,
    coverage: coverageFor(themeCounts[theme] ?? 0),
  }));

  const targetYearList = yearList.filter((year) => year >= targetStart && year <= targetEnd);
  const missingRanges = findMissingRanges(
    yearList.filter((year) => year >= targetStart && year <= targetEnd),
    targetStart,
    targetEnd
  );

  const sortedYears = Object.keys(recordsByYear).map(Number).sort((a, b) => a - b);
  const yearRanges = [];
  if (sortedYears.length > 0) {
    let rangeStart = sortedYears[0];
    let previous = sortedYears[0];
    for (const year of sortedYears.slice(1)) {
      if (year !== previous + 1) {
        yearRanges.push({ start: rangeStart, end: previous, count: 0 });
        rangeStart = year;
      }
      previous = year;
    }
    yearRanges.push({ start: rangeStart, end: previous, count: 0 });
    for (const range of yearRanges) {
      for (let year = range.start; year <= range.end; year += 1) {
        range.count += recordsByYear[year] ?? 0;
      }
    }
  }

  return {
    counts,
    recordsByYear,
    yearRanges,
    themeCoverage,
    missingRanges,
    targetPeriod: {
      targetStart,
      targetEnd,
      distinctRecords: targetPeriodRecords.length,
      recordYearIncidences: targetYearList.length,
      share: records.length > 0 ? Number((targetPeriodRecords.length / records.length).toFixed(4)) : 0,
    },
    notes: [
      {
        code: "GAP_METHODOLOGY",
        message:
          "Bu rapor arşiv KAYIT yoğunluğunu ölçer; 'bu yılda tarihî olay yok' anlamına gelmez. " +
          "`distinctRecords` hedef dönemle kesişen ayrı kayıt sayısıdır; `recordYearIncidences` " +
          "çok yıllı kayıtların her yıl için bir örneklem üretmesidir (yüzde payı buna göre artabilir). " +
          "Tema kapsamı yalnızca hedef dönemle kesişen kayıtlar üzerinden hesaplanır; eşleştirme kelime-sınırlıdır.",
      },
    ],
  };
}
