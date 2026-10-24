/**
 * Atatürk Dijital Yaşam Deneyimi — saf veri katmanı.
 *
 * Bu modül sunucuya özel değildir ve dosya sistemine dokunmaz: `app/ataturk/page.tsx`
 * kayıtları `lib/archive.ts` üzerinden okur, buraya verir ve dönen serileştirilebilir
 * görünüm modelini istemci bileşenlerine aktarır. Kayıt dışı tarih/olay üretilmez;
 * dönem ve tema metinleri yalnızca arşiv gruplamasını tarif eder.
 */
import type { ArchiveDate, ArchiveRecord, ArchiveRecordType, RightsStatus } from "../../schemas/archive-record.types";

export type CoverageLevel = "available" | "partial" | "none";

export type ExperienceLink = { slug: string; title: string };

export type ExperienceRecord = {
  id: string;
  slug: string;
  title: string;
  type: ArchiveRecordType;
  typeLabel: string;
  summary: string;
  description: string;
  dateDisplay: string;
  dateStart: string | null;
  year: number | null;
  dateNote: string | null;
  periodId: string;
  institution: string;
  institutionUrl: string | null;
  sourceTitle: string;
  sourceUrl: string | null;
  citation: string;
  archiveIdentifier: string | null;
  rightsLabel: string;
  rightsNote: string;
  credit: string | null;
  imageNote: string | null;
  reviewLabel: string;
  reviewNote: string;
  categories: string[];
  themeIds: string[];
  locations: string[];
  people: string[];
  related: ExperienceLink[];
};

export type ExperiencePeriod = {
  id: string;
  title: string;
  range: string;
  intro: string;
  recordSlugs: string[];
  years: number[];
  emptyYears: number[];
  inLifetime: boolean;
};

export type ExperienceTheme = { id: string; title: string; description: string; count: number; coverage: CoverageLevel; note: string | null };
export type YearMark = { year: number; count: number; periodId: string };
/** Yıl rayı öğesi: kayıtlı yıl, art arda kayıtsız yıllar aralığı veya yaşam dışı dönem kısayolu. */
export type RailItem =
  | { kind: "year"; year: number; count: number; periodId: string }
  | { kind: "gap"; from: number; to: number }
  | { kind: "period"; periodId: string; label: string; count: number };
export type ExperienceQuote = { text: string; work: string; dateDisplay: string; context: string; sourceUrl: string; sourceTitle: string; verifiedBy: string; recordSlug: string };

export type AtaturkExperience = {
  records: ExperienceRecord[];
  periods: ExperiencePeriod[];
  themes: ExperienceTheme[];
  yearMarks: YearMark[];
  rail: RailItem[];
  quote: ExperienceQuote | null;
  stats: { records: number; institutions: number; photographs: number; documents: number; firstYear: number | null; firstLifetimeYear: number | null; lastLifetimeYear: number | null; undated: number; earlyRecords: number };
  typeCounts: { type: ArchiveRecordType; label: string; count: number }[];
};

const TYPE_LABELS: Record<ArchiveRecordType, string> = { photograph: "Fotoğraf", document: "Belge", speech: "Konuşma", event: "Olay", publication: "Yayın", place: "Mekân" };
const TYPE_ORDER: ArchiveRecordType[] = ["photograph", "document", "speech", "event", "publication", "place"];
const CATEGORY_LABELS: Record<string, string> = { "milli-mucadele": "Millî Mücadele", kurulus: "Kuruluş", siyaset: "Siyaset", hukuk: "Hukuk", cumhuriyet: "Cumhuriyet", kultur: "Kültür", egitim: "Eğitim", tbmm: "TBMM", toplum: "Toplum", mekan: "Mekân", yayin: "Yayın", konusma: "Konuşma", fotograf: "Fotoğraf" };
const RIGHTS_LABELS: Record<RightsStatus, string> = { public_domain: "Kamu malı", open_license: "Açık lisans", official_link_only: "Yalnız kurumsal kaynak bağlantısı", institutional_terms: "Kurumun kullanım koşulları geçerli", unknown: "Kullanım hakkı belirsiz", permission_required: "Kullanım izni gerekli", ai_representative: "Temsilî / yapay zekâ" };

const ATATURK = "Mustafa Kemal Atatürk";
const LIFETIME_END = "1938-11-10";
const UNDATED_PERIOD = "tarihsiz";

type PeriodDefinition = { id: string; title: string; range: string; from: string; to: string; intro: string; emptyIntro?: string; inLifetime: boolean };

/** Arşiv gruplaması için dönem sınırları (ISO tarih karşılaştırması). */
export const PERIOD_DEFINITIONS: readonly PeriodDefinition[] = [
  { id: "oncesi", title: "1881 öncesi: mekân ve kurumların geçmişi", range: "1881 öncesi", from: "0001-01-01", to: "1880-12-31", inLifetime: false, intro: "Bu kayıtların tarihleri mekânın veya kurumun kendi geçmişine aittir (ör. inşa veya kuruluş yılı); Atatürk'ün yaşamındaki bir olayı göstermez." },
  { id: "erken-yillar", title: "Çocukluk, öğrenim ve askerlik yılları", range: "1881–1918", from: "1881-01-01", to: "1918-12-31", inLifetime: true, intro: "Bu döneme tarihlenen sınırlı sayıda kaynaklı kayıt. Kapsam eksiktir; mekân kayıtlarındaki tarihler mekânın kendi geçmişine ait olabilir.", emptyIntro: "Bu döneme ait kaynak denetiminden geçmiş ve yayımlanmış arşiv kaydı henüz bulunmuyor. Kayıtlar doğrulandıkça çizelgeye eklenecektir." },
  { id: "milli-mucadele", title: "Millî Mücadele", range: "1919–1922", from: "1919-01-01", to: "1922-10-31", inLifetime: true, intro: "Genelgeler, kongreler, Büyük Millet Meclisinin açılışı ve cephe gelişmelerine ilişkin kaynaklı kayıtlar." },
  { id: "kurulus", title: "Cumhuriyet'in kuruluşu", range: "1922–1924", from: "1922-11-01", to: "1924-04-30", inLifetime: true, intro: "Saltanatın kaldırılmasından 1924 Anayasası'na uzanan kuruluş adımlarına ait kayıtlar." },
  { id: "inkilaplar", title: "İnkılaplar ve yeni kurumlar", range: "1924–1932", from: "1924-05-01", to: "1932-12-31", inLifetime: true, intro: "Hukuk, eğitim, yazı ve toplumsal yaşamdaki dönüşümlere ilişkin belgeler, olaylar ve fotoğraflar." },
  { id: "son-yillar", title: "Onuncu yıl ve son yıllar", range: "1933–1938", from: "1933-01-01", to: LIFETIME_END, inLifetime: true, intro: "Cumhuriyet'in onuncu yılından Montrö Sözleşmesi'ne ve on beşinci yıl kutlamalarına uzanan kayıtlar." },
  { id: "miras", title: "1938 sonrası: hafıza ve miras", range: "1938 sonrası", from: "1938-11-11", to: "2100-12-31", inLifetime: false, intro: "Yaşam çizelgesinin parçası olmayan; sonraki dönemde kurulan mekânlar ve kurumsal yayınlar." },
];

type ThemeDefinition = { id: string; title: string; description: string; note: string | null; match: (record: ArchiveRecord, periodId: string) => boolean };
const has = (record: ArchiveRecord, category: string) => record.categories.includes(category);
const fold = (value: string) => value.toLocaleLowerCase("tr-TR");

/** Tema eşleştirmeleri yalnızca kaydın kendi kategori, tür, kişi ve başlık alanlarına dayanır. */
export const THEME_DEFINITIONS: readonly ThemeDefinition[] = [
  { id: "cocukluk-ogrenim", title: "Çocukluğu ve öğrenim hayatı", description: "Doğduğu şehir, aile çevresi ve okul yılları.", note: "Yalnız öğrenim hayatına doğrudan ilişkin, mekân dışı kayıtlar gösterilir; okul ve kurum kayıtları kuruluş tarihleriyle “Tarihî mekânlar” temasındadır.", match: (record, periodId) => periodId === "erken-yillar" && record.type !== "place" && has(record, "egitim") },
  { id: "askeri-kariyer", title: "Askerî kariyeri", description: "Komuta, muharebe ve başkomutanlık kayıtları.", note: "1919 öncesi askerî kariyerine ilişkin olay kaydı yok; yalnız Millî Mücadele dönemindeki komuta kayıtları gösterilir.", match: (record) => has(record, "milli-mucadele") && /muharebe|taarruz|başkomutan|mütareke|zafer|cephe/.test(fold(`${record.title} ${record.tags.join(" ")}`)) },
  { id: "milli-mucadele", title: "Millî Mücadele", description: "Genelgeler, kongreler ve cephe gelişmeleri.", note: null, match: (record) => has(record, "milli-mucadele") },
  { id: "cumhuriyet", title: "Cumhuriyet'in kuruluşu", description: "Meclis, saltanatın kaldırılması, Lozan ve Cumhuriyet'in ilanı.", note: null, match: (record) => has(record, "kurulus") },
  { id: "egitim-kultur", title: "Eğitim ve kültür", description: "Öğretim birliği, harf inkılabı ve kültür hayatı.", note: null, match: (record) => has(record, "egitim") || has(record, "kultur") },
  { id: "modernlesme", title: "Bilim ve modernleşme", description: "Hukukî ve toplumsal yenileşme adımları.", note: "Bilim ve teknoloji alanına özgü kaynaklı kayıt henüz yok; bu alan toplumsal ve hukukî modernleşme kayıtlarını gösterir.", match: (record) => has(record, "toplum") },
  { id: "konusmalar-eserler", title: "Konuşmalar ve eserler", description: "Nutuklar, konuşmalar ve Atatürk'ün yazdığı eserler.", note: null, match: (record) => record.type === "speech" || has(record, "konusma") || record.people.some((person) => person.name === ATATURK && (person.role === "author" || person.role === "speaker")) },
  { id: "mekanlar-kisiler", title: "Tarihî mekânlar ve kişiler", description: "Mekân kayıtları ve kayıtlarda adı geçen kişiler.", note: "Kişiler, kayıtlardaki kişi alanlarından türetilir; ayrı biyografi kayıtları henüz yok.", match: (record) => record.type === "place" || has(record, "mekan") || record.people.some((person) => person.name !== ATATURK && person.role !== "author") },
];

export function typeLabel(type: ArchiveRecordType) { return TYPE_LABELS[type] ?? type; }
export function categoryLabel(category: string) { return CATEGORY_LABELS[category] ?? category; }
export function rightsLabel(status: RightsStatus) { return RIGHTS_LABELS[status] ?? "Kullanım hakkı belirsiz"; }

/** Yalnız http(s) bağlantılarını kabul eder; bozuk/eksik kaynak bağlantısı null döner. */
export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}

function isoDate(value: string | null | undefined) { return value && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value) ? value : null; }
function recordYear(date: ArchiveDate) { const start = isoDate(date.start); return start ? Number(start.slice(0, 4)) : null; }

/** Tarih kesinliği ve hassasiyeti için dürüst açıklama; tam gün ve kesin tarihlerde null. */
export function dateNote(date: ArchiveDate) {
  const notes: string[] = [];
  if (!isoDate(date.start) || date.precision === "unknown" || date.certainty === "unknown") notes.push("Tarih bilinmiyor veya kaynakta belirtilmemiş.");
  else {
    if (date.precision === "year") notes.push("Kaynak yalnız yılı belirtir; gün ve ay bilinmiyor.");
    if (date.precision === "month") notes.push("Kaynak ay düzeyinde tarih verir; gün bilinmiyor.");
    if (date.precision === "range") notes.push("Tek gün değil, tarih aralığı olarak kayıtlıdır.");
    if (date.certainty === "estimated") notes.push("Tarih tahminidir.");
  }
  if (date.note) notes.push(date.note);
  return notes.length ? notes.join(" ") : null;
}

/** Mekân kayıtlarında tarih, mekânın kendi geçmişine aittir; yaşam olayı gibi sunulmaz. */
export const PLACE_DATE_NOTE = "Mekân kaydı: tarih, mekânın veya kurumun kendi geçmişine aittir (ör. inşa ya da kuruluş); Atatürk'ün o tarihte orada bulunduğunu göstermez.";

/** Ardışık yılları aralıklara indirger: [1929, 1931, 1932] → "1929, 1931–1932". */
export function formatYearRanges(years: readonly number[]) {
  const sorted = [...new Set(years)].sort((a, b) => a - b); const parts: string[] = [];
  for (let index = 0; index < sorted.length; index += 1) { const start = sorted[index]; let end = start; while (sorted[index + 1] === end + 1) { end += 1; index += 1; } parts.push(start === end ? String(start) : `${start}–${end}`); }
  return parts.join(", ");
}

export function periodFor(date: ArchiveDate) {
  const start = isoDate(date.start);
  if (!start) return UNDATED_PERIOD;
  const key = start.length === 4 ? `${start}-01-01` : start.length === 7 ? `${start}-01` : start;
  return PERIOD_DEFINITIONS.find((period) => key >= period.from && key <= period.to)?.id ?? UNDATED_PERIOD;
}

function reviewTexts(record: ArchiveRecord) {
  const reviewer = record.verification.reviewedBy ?? "";
  const ai = /yapay zek|\bai\b|opencode|codex|copilot/i.test(reviewer);
  const label = "Kaynak denetimli · uzman onayı bekliyor";
  const note = ai ? `${reviewer} tarafından otomatik kaynak denetimi yapıldı. Bu inceleme insan tarihçi onayı değildir.` : reviewer ? `İnceleyen: ${reviewer}. İnsan tarih editörü onayı henüz kayıtlı değildir.` : "İnceleyen bilgisi kayıtlı değil. İnsan tarih editörü onayı henüz kayıtlı değildir.";
  return { label, note };
}

function compareRecords(a: ArchiveRecord, b: ArchiveRecord) { return (isoDate(a.date.start) ?? "9999").localeCompare(isoDate(b.date.start) ?? "9999") || a.title.localeCompare(b.title, "tr"); }

function toExperienceRecord(record: ArchiveRecord, published: Map<string, ArchiveRecord>): ExperienceRecord {
  const periodId = periodFor(record.date);
  const review = reviewTexts(record);
  const image = record.image && record.image.kind !== "none" ? record.image : null;
  const imageNote = image ? image.kind === "ai_representative" ? "Temsilî yapay zekâ görseli; tarihî fotoğraf değildir." : image.displayPolicy === "embedded_allowed" ? null : "Görselin yeniden kullanım hakkı doğrulanmadığı için burada gösterilmez; kaynak kurumun sayfasında görüntülenebilir." : null;
  const related = (record.relatedIds ?? []).map((id) => published.get(id)).filter((item): item is ArchiveRecord => item !== undefined && item.slug !== record.slug).map((item) => ({ slug: item.slug, title: item.title }));
  return {
    id: record.id, slug: record.slug, title: record.title, type: record.type, typeLabel: typeLabel(record.type), summary: record.summary, description: record.description ?? record.summary,
    dateDisplay: record.date.display || "Tarih bilinmiyor", dateStart: isoDate(record.date.start), year: recordYear(record.date), dateNote: [record.type === "place" ? PLACE_DATE_NOTE : null, dateNote(record.date)].filter(Boolean).join(" ") || null, periodId,
    institution: record.source.institution || "Kaynak kurum belirtilmemiş", institutionUrl: safeExternalUrl(record.source.institutionUrl), sourceTitle: record.source.title || record.title, sourceUrl: safeExternalUrl(record.source.url),
    citation: record.source.citation ?? record.source.title ?? "", archiveIdentifier: record.source.archiveIdentifier ?? null,
    rightsLabel: rightsLabel(record.rights.status), rightsNote: record.rights.note, credit: record.rights.credit ?? image?.credit ?? null, imageNote,
    reviewLabel: review.label, reviewNote: review.note,
    categories: record.categories.map(categoryLabel), themeIds: THEME_DEFINITIONS.filter((theme) => theme.match(record, periodId)).map((theme) => theme.id),
    locations: record.locations.map((location) => location.city && location.city !== location.name ? `${location.name}, ${location.city}` : location.name), people: record.people.map((person) => person.name), related,
  };
}

/**
 * Yayımlanmış kayıtlardan deneyim görünüm modelini kurar. `published` dışındaki
 * durumlar savunma amaçlı yeniden süzülür; çağıran tarafın süzmüş olması beklenir.
 */
export function buildAtaturkExperience(input: readonly ArchiveRecord[]): AtaturkExperience {
  const publishedRecords = input.filter((record) => record.verification?.status === "published").sort(compareRecords);
  const byId = new Map(publishedRecords.map((record) => [record.id, record] as const));
  const records = publishedRecords.map((record) => toExperienceRecord(record, byId));

  const periods: ExperiencePeriod[] = [...PERIOD_DEFINITIONS, { id: UNDATED_PERIOD, title: "Tarihi belirsiz kayıtlar", range: "Tarih bilinmiyor", from: "", to: "", intro: "Kaynakta tarihi belirtilmemiş kayıtlar; çizelgede tahmini bir yere yerleştirilmez.", inLifetime: false }].map((period) => {
    const inPeriod = records.filter((record) => record.periodId === period.id);
    const years = [...new Set(inPeriod.map((record) => record.year).filter((year): year is number => year !== null))];
    const fromYear = Number(period.from.slice(0, 4)); const toYear = Number(period.to.slice(0, 4));
    const emptyYears = period.inLifetime && period.id !== "erken-yillar" ? Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index).filter((year) => !years.includes(year) && !records.some((record) => record.year === year)) : [];
    return { id: period.id, title: period.title, range: period.range, intro: inPeriod.length === 0 && period.emptyIntro ? period.emptyIntro : period.intro, recordSlugs: inPeriod.map((record) => record.slug), years, emptyYears, inLifetime: period.inLifetime };
  }).filter((period) => period.inLifetime || period.recordSlugs.length > 0);

  const yearCounts = new Map<number, YearMark>();
  for (const record of records) if (record.year !== null) { const mark = yearCounts.get(record.year) ?? { year: record.year, count: 0, periodId: record.periodId }; mark.count += 1; yearCounts.set(record.year, mark); }
  const lifetimeYears = records.filter((record) => record.year !== null && PERIOD_DEFINITIONS.find((period) => period.id === record.periodId)?.inLifetime).map((record) => record.year as number);
  const firstLifetime = lifetimeYears.length ? Math.min(...lifetimeYears) : null; const lastLifetime = lifetimeYears.length ? Math.max(...lifetimeYears) : null;
  if (firstLifetime !== null && lastLifetime !== null) for (let year = firstLifetime; year <= lastLifetime; year += 1) if (!yearCounts.has(year)) yearCounts.set(year, { year, count: 0, periodId: periodFor({ start: `${year}-06-30`, end: null, precision: "year", certainty: "exact", display: String(year) }) });
  const yearMarks = [...yearCounts.values()].sort((a, b) => a.year - b.year);
  // Özet aralık mekân kayıtlarını saymaz: mekân tarihi (inşa/kuruluş) yaşam olayının tarihi değildir.
  const eventYears = records.filter((record) => record.year !== null && record.type !== "place" && PERIOD_DEFINITIONS.find((period) => period.id === record.periodId)?.inLifetime).map((record) => record.year as number);

  // Ray: yaşam dönemleri yıl yıl; üç ve daha uzun kayıtsız yıl dizileri tek aralığa iner; yaşam dışı dönemler tek kısayol olur.
  const rail: RailItem[] = [];
  const shortcut = (id: string) => { const period = periods.find((item) => item.id === id); if (period?.recordSlugs.length) rail.push({ kind: "period", periodId: id, label: period.range, count: period.recordSlugs.length }); };
  shortcut("oncesi");
  const lifetimeMarks = yearMarks.filter((mark) => PERIOD_DEFINITIONS.find((period) => period.id === mark.periodId)?.inLifetime);
  for (let index = 0; index < lifetimeMarks.length; index += 1) {
    const mark = lifetimeMarks[index];
    if (mark.count > 0) { rail.push({ kind: "year", year: mark.year, count: mark.count, periodId: mark.periodId }); continue; }
    let end = index; while (lifetimeMarks[end + 1]?.count === 0) end += 1;
    if (end - index >= 2) rail.push({ kind: "gap", from: mark.year, to: lifetimeMarks[end].year });
    else for (let gap = index; gap <= end; gap += 1) rail.push({ kind: "gap", from: lifetimeMarks[gap].year, to: lifetimeMarks[gap].year });
    index = end;
  }
  shortcut("miras"); shortcut(UNDATED_PERIOD);

  const themes = THEME_DEFINITIONS.map((theme) => { const count = records.filter((record) => record.themeIds.includes(theme.id)).length; const coverage: CoverageLevel = count === 0 ? "none" : theme.note ? "partial" : "available"; return { id: theme.id, title: theme.title, description: theme.description, count, coverage, note: count === 0 ? "Bu tema için yayımlanmış kaynaklı kayıt henüz yok." : theme.note }; });

  const quoteRecord = publishedRecords.find((record) => record.quotation?.verified && record.verification.checks.quoteVerified && safeExternalUrl(record.quotation.sourceUrl) && !/yapay zek/i.test(record.quotation.evidence.verifiedBy));
  const quote = quoteRecord?.quotation ? { text: quoteRecord.quotation.text, work: quoteRecord.quotation.work, dateDisplay: quoteRecord.date.display, context: quoteRecord.quotation.context, sourceUrl: safeExternalUrl(quoteRecord.quotation.sourceUrl) as string, sourceTitle: quoteRecord.quotation.sourceTitle, verifiedBy: quoteRecord.quotation.evidence.verifiedBy, recordSlug: quoteRecord.slug } : null;

  return {
    records, periods, themes, yearMarks, rail, quote,
    stats: { records: records.length, institutions: new Set(records.map((record) => record.institution)).size, photographs: records.filter((record) => record.type === "photograph").length, documents: records.filter((record) => record.type === "document").length, firstYear: yearMarks[0]?.year ?? null, firstLifetimeYear: eventYears.length ? Math.min(...eventYears) : null, lastLifetimeYear: eventYears.length ? Math.max(...eventYears) : null, undated: records.filter((record) => record.year === null).length, earlyRecords: records.filter((record) => record.periodId === "erken-yillar").length },
    typeCounts: TYPE_ORDER.map((type) => ({ type, label: typeLabel(type), count: records.filter((record) => record.type === type).length })).filter((item) => item.count > 0),
  };
}

/**
 * İstemciye giden yükü küçültmek için az sayıda farklı değer alan metin alanları tek bir
 * dize tablosunda tutulur (ör. inceleme notu 151 kayıtta aynıdır). `unpackExperienceRecords`
 * birebir aynı kayıtları geri üretir; bileşen çıktısı değişmez.
 */
const SHARED_FIELDS = ["typeLabel", "institution", "institutionUrl", "rightsLabel", "rightsNote", "credit", "imageNote", "reviewLabel", "reviewNote", "dateNote", "periodId"] as const;
type SharedField = (typeof SHARED_FIELDS)[number];
export type PackedExperienceRecords = { strings: (string | null)[]; rows: Array<Omit<ExperienceRecord, SharedField> & { shared: number[] }> };

export function packExperienceRecords(records: readonly ExperienceRecord[]): PackedExperienceRecords {
  const strings: (string | null)[] = []; const index = new Map<string | null, number>();
  const intern = (value: string | null) => { let position = index.get(value); if (position === undefined) { position = strings.length; strings.push(value); index.set(value, position); } return position; };
  const rows = records.map((record) => {
    const row: Record<string, unknown> = { ...record };
    for (const field of SHARED_FIELDS) delete row[field];
    return { ...(row as Omit<ExperienceRecord, SharedField>), shared: SHARED_FIELDS.map((field) => intern(record[field])) };
  });
  return { strings, rows };
}

export function unpackExperienceRecords(packed: PackedExperienceRecords): ExperienceRecord[] {
  return packed.rows.map(({ shared, ...row }) => {
    const record = { ...row } as Record<string, unknown>;
    SHARED_FIELDS.forEach((field, position) => { record[field] = packed.strings[shared[position]]; });
    return record as ExperienceRecord;
  });
}
