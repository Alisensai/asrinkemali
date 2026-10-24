/**
 * Tarihî kapsam analizi.
 *
 * SINIFLANDIRMA KURALI: Bir mekânın kuruluş tarihi, Atatürk'ün yaşam olayı
 * gibi sınıflandırılamaz. Kayıtlar "popülasyon"lara ayrılır:
 * doğrudan biyografik / mekân tarihçesi / kurum tarihçesi / olay kaydı /
 * tanımsız.
 */

/**
 * @typedef {Object} CoverageReport
 * @property {{ total: number }} records
 * @property {{ biographic: number; place_history: number; institution_history: number; event_record: number; unclassified: number }} populations
 * @property {Array<{ year: number; biographic: number; place_history: number; institution_history: number; event_record: number; unclassified: number; total: number }>} byYear
 * @property {{ distinctBiographic: number; placeHistoryCount: number }} targetPeriod
 */

/**
 * Arşiv kaydını popülasyona sınıflandırır.
 * Biyografik sınıflandırma yalnız kaydın öznesi Atatürk ise verilir;
 * kurum/mekân tarihi kayıtları biyografik SAYILMAZ.
 * @param {{ id: string; title: string; categories?: string[]; tags?: string[]; people?: string[]; summary?: string; year?: number|null; eventYear?: number|null }} record
 * @returns {"biographic"|"place_history"|"institution_history"|"event_record"|"unclassified"}
 */
export function classifyRecord(record) {
  const categories = record.categories ?? [];
  const people = record.people ?? [];
  const title = String(record.title ?? "").toLowerCase();
  const isAtaturkSubject =
    people.some((person) => /atat/i.test(String(person))) ||
    /mustafa kemal|atatürk/.test(title);
  const isBiographicCategory = categories.some((category) => category === "biyografi");
  if (isAtaturkSubject && (isBiographicCategory || people.length > 0)) {
    return "biographic";
  }
  if (categories.includes("mekan") || /tarihçesi|kuruluş|kuruluşu/.test(title)) {
    return categories.includes("kurulus") ? "institution_history" : "place_history";
  }
  if (categories.includes("kurulus")) return "institution_history";
  if (categories.includes("siyaset") || categories.includes("milli-mucadele")) return "event_record";
  return "unclassified";
}

/**
 * Kapsam analizi üretir.
 * @param {Array<Record<string, unknown>>} archiveRecords
 * @param {{ targetStart?: number; targetEnd?: number }} options
 * @returns {CoverageReport}
 */
export function coverageAnalysis(archiveRecords, options = {}) {
  const targetStart = options.targetStart ?? 1881;
  const targetEnd = options.targetEnd ?? 1918;
  /** @type {CoverageReport["populations"]} */
  const populations = { biographic: 0, place_history: 0, institution_history: 0, event_record: 0, unclassified: 0 };
  const byYearMap = new Map();
  const biographicIds = new Set();
  let placeHistoryCount = 0;
  for (const raw of archiveRecords) {
    const record = /** @type {any} */ (raw);
    const population = classifyRecord(record);
    populations[population] += 1;
    if (population === "biographic") biographicIds.add(record.id);
    if (population === "place_history") placeHistoryCount += 1;
    const years = collectYears(record);
    for (const year of years) {
      if (!byYearMap.has(year)) {
        byYearMap.set(year, { year, biographic: 0, place_history: 0, institution_history: 0, event_record: 0, unclassified: 0, total: 0 });
      }
      const row = byYearMap.get(year);
      row[population] += 1;
      row.total += 1;
    }
  }
  const byYear = [...byYearMap.values()].sort((a, b) => a.year - b.year);
  return {
    records: { total: archiveRecords.length },
    populations,
    byYear,
    targetPeriod: {
      distinctBiographic: biographicIds.size,
      placeHistoryCount,
    },
  };
}

/**
 * Kaydın kapsadığı yıllar (olay yılı + dönem aralığı).
 * @param {{ eventYear?: number, dateRange?: object, period?: object, id?: string }} record
 */
function collectYears(record) {
  const years = new Set();
  if (Number.isFinite(record.eventYear)) years.add(record.eventYear);
  const range = record.dateRange ?? record.period;
  if (range && typeof range === "object") {
    const r = /** @type {{ start?: string|number, end?: string|number|null, periodStart?: string|number, periodEnd?: string|number }} */ (range);
    const start = Number(r.start ?? r.periodStart);
    const end = Number(r.end ?? r.periodEnd ?? r.start ?? r.periodStart);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start < 200) {
      for (let year = start; year <= end; year += 1) years.add(year);
    }
  }
  return [...years].filter((year) => Number.isFinite(year));
}
