import type { ArchiveRecord, ArchiveRecordType, DatePrecision, DateCertainty, RightsStatus } from "../../../schemas/archive-record.types";

/** Pure, serializable read-only Atlas model; never expose full archive records to the browser. */
export type AtlasRecordType = ArchiveRecordType;
export type AtlasDateKind = "historical-event" | "place-history" | "publication-date" | "document-date" | "catalog-date";
export type AtlasLocation = { city: string; country: string; label: string; scope: "city"; region: "turkiye" | "international" };
export type AtlasRecord = {
  id: string; slug: string; title: string; summary: string; type: ArchiveRecordType;
  date: { start: string | null; end: string | null; display: string; precision: DatePrecision; certainty: DateCertainty; kind: AtlasDateKind };
  locations: AtlasLocation[]; people: string[]; categories: string[];
  institution: string; sourceTitle: string; sourceUrl: string | null; citation: string | null;
  sourceDate: string | null; provenance: { institution: string; identifier: string | null; url: string | null }[]; rights: RightsStatus; review: "published"; relatedIds: string[];
  /** The source schema has no lat/lng; never synthesize a point from the city centre. */
  coordinate: null;
};
export type AtlasEdge = { from: string; to: string; kind: "explicit-archive-related-id"; evidence: "record.relatedIds" };
export type AtlasFilters = {
  search: string; city: string; region: "all" | "turkiye" | "international";
  type: "all" | ArchiveRecordType; institution: string; person: string; category: string;
  from: number | null; to: number | null; dateKind: "all" | AtlasDateKind;
  certainty: "all" | DateCertainty; location: "all" | "city" | "unknown"; page: number;
};
export type AtlasDataset = { records: AtlasRecord[]; edges: AtlasEdge[]; generatedFrom: "published-archive" };

const TURKEY_CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkâri","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir","Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"
] as const;
export const FEATURED_CITIES = ["Ankara", "İstanbul", "Samsun", "İzmir", "Erzurum", "Sivas", "Çanakkale"] as const;
export const INTERNATIONAL_CITIES = ["Selanik", "Manastır", "Sofya", "Şam", "Trablusgarp"] as const;
const knownTurkish = new Set<string>(TURKEY_CITIES);
const knownInternational = new Set<string>(INTERNATIONAL_CITIES);
const safeSlug = /^[a-z0-9-]{1,120}$/;

export function foldTurkish(input: string): string {
  return input.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
}
const trCountry = /^(türkiye|turkey|türkiye cumhuriyeti|tr)$/i;
const internationalCountry = /^(yunanistan|greece|bulgaristan|bulgaria|suriye|syria|libya|libya|kuzey makedonya|north macedonia|osmanlı imparatorluğu)$/i;
function countryOf(city: string, raw?: string): string | null {
  if (raw?.trim() && trCountry.test(raw.trim())) return "Türkiye";
  if (raw?.trim() && internationalCountry.test(raw.trim())) return raw.trim();
  if (raw?.trim() && !trCountry.test(raw.trim())) return raw.trim();
  if (knownTurkish.has(city)) return "Türkiye";
  if (knownInternational.has(city)) return "Tarihî konum — ülke bilgisi belirtilmemiş";
  return null;
}
/** Only exact, explicitly supplied city names count. Never geocode a title, tag, or description. */
export function extractLocations(record: Pick<ArchiveRecord,"locations">): AtlasLocation[] {
  const locations: AtlasLocation[] = []; const seen = new Set<string>();
  for (const location of record.locations ?? []) {
    const city = (location.city || (knownTurkish.has(location.name) || knownInternational.has(location.name) ? location.name : "")).trim();
    if (!city) continue;
    const country = countryOf(city, location.country);
    if (!country) continue;
    const region = trCountry.test(country) ? "turkiye" : "international";
    const key = `${foldTurkish(city)}|${foldTurkish(country)}`;
    if (seen.has(key)) continue;
    seen.add(key); locations.push({ city, country, label: `${city} — şehir düzeyi`, scope: "city", region });
  }
  return locations;
}
export function safeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const parsed = new URL(value); return ["http:","https:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.toString() : null; }
  catch { return null; }
}
export function dateKind(type: ArchiveRecordType): AtlasDateKind {
  if (type === "event") return "historical-event";
  if (type === "place") return "place-history";
  if (type === "publication") return "publication-date";
  if (type === "document" || type === "speech" || type === "photograph") return "document-date";
  return "catalog-date";
}
function validYear(date: string | null): number | null {
  if (!date || !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date)) return null;
  const value = Number(date.slice(0, 4)); return value >= 1000 && value <= 2100 ? value : null;
}
export function yearSpan(record: Pick<AtlasRecord,"date">): { from: number | null; to: number | null } {
  const from = validYear(record.date.start); const to = validYear(record.date.end) ?? from;
  return { from, to };
}
export function toAtlasDataset(records: readonly ArchiveRecord[]): AtlasDataset {
  const mapped = new Map<string, AtlasRecord>();
  // Same visibility rule as getPublishedArchiveRecords() and /arsiv/[slug].
  for (const record of records) {
    if (record.verification.status !== "published" || !safeSlug.test(record.slug) || mapped.has(record.id)) continue;
    mapped.set(record.id, {
      id: record.id, slug: record.slug, title: record.title, summary: record.summary, type: record.type,
      date: { start: record.date.start, end: record.date.end, display: record.date.display, precision: record.date.precision,
        certainty: record.date.certainty, kind: dateKind(record.type) },
      locations: extractLocations(record), people: [...new Set(record.people.map(p => p.name.trim()).filter(Boolean))],
      categories: [...new Set(record.categories)], institution: record.source.institution,
      sourceTitle: record.source.title, sourceUrl: safeSourceUrl(record.source.url),
      citation: record.source.citation ?? null, sourceDate: record.source.publishedAt ?? null,
      provenance: record.provenance.map(p => ({ institution:p.institution, identifier:p.identifier ?? null, url:safeSourceUrl(p.url) })),
      rights: record.rights.status, review: "published", relatedIds: (record.relatedIds ?? []).filter(id => id !== record.id), coordinate: null
    });
  }
  const edges: AtlasEdge[] = []; const edgeKeys = new Set<string>();
  for (const record of mapped.values()) {
    record.relatedIds = [...new Set(record.relatedIds)].filter(id => mapped.has(id));
    for (const target of record.relatedIds) {
      const key = `${record.id}|${target}`;
      if (!edgeKeys.has(key)) { edgeKeys.add(key); edges.push({ from: record.id, to: target, kind: "explicit-archive-related-id", evidence: "record.relatedIds" }); }
    }
  }
  return { records: [...mapped.values()], edges, generatedFrom: "published-archive" };
}
export const DEFAULT_FILTERS: AtlasFilters = { search:"", city:"", region:"all", type:"all", institution:"", person:"", category:"", from:null, to:null, dateKind:"all", certainty:"all", location:"all", page:1 };
const TYPES: ArchiveRecordType[] = ["photograph","document","speech","event","publication","place"];
const KINDS: AtlasDateKind[] = ["historical-event","place-history","publication-date","document-date","catalog-date"];
const CERTAINTIES: DateCertainty[] = ["exact","estimated","unknown"];
/** The same parser can be applied to Next searchParams or URLSearchParams. */
export function parseAtlasParams(params: Record<string, string | string[] | undefined>): { filters: AtlasFilters; warnings: string[] } {
  const warnings: string[] = [];
  const first = (key: string) => { const v = params[key]; return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 120) ?? ""; };
  const choice = <T extends string>(key: string, valid: readonly T[], fallback: T) => { const v = first(key); if (!v) return fallback; if (valid.includes(v as T)) return v as T; warnings.push(`Geçersiz ${key} filtresi yok sayıldı.`); return fallback; };
  const year = (key: string) => { const v=first(key); if(!v) return null; if(!/^\d{4}$/.test(v) || Number(v)<1000 || Number(v)>2100) { warnings.push(`${key} geçersiz: 1000–2100 arası yıl bekleniyor.`); return null; } return Number(v); };
  let from=year("baslangic"),to=year("bitis");
  if(from!==null && to!==null && from>to) {warnings.push("Başlangıç yılı bitiş yılından büyük olamaz.");from=null;to=null;}
  const p=first("sayfa"); const page = /^\d+$/.test(p) && Number.isSafeInteger(Number(p)) && Number(p)>=1 ? Number(p) : 1;
  if(p && page===1 && p!=="1") warnings.push("Geçersiz sayfa numarası yok sayıldı.");
  return { filters: {
    search:first("q"), city:first("sehir"), region:choice("bolge",["all","turkiye","international"] as const,"all"),
    type:choice("tur",["all",...TYPES] as const,"all"), institution:first("kaynak"), person:first("kisi"), category:first("kategori"),
    from,to,dateKind:choice("tarihTuru",["all",...KINDS] as const,"all"),
    certainty:choice("kesinlik",["all",...CERTAINTIES] as const,"all"),location:choice("konum",["all","city","unknown"] as const,"all"),page
  },warnings };
}
export function queryAtlas(dataset: AtlasDataset, filters: AtlasFilters, pageSize=12) {
  const search = foldTurkish(filters.search), city=foldTurkish(filters.city), institution=foldTurkish(filters.institution), person=foldTurkish(filters.person), category=foldTurkish(filters.category);
  const filtered = dataset.records.filter(record => {
    if (filters.type!=="all" && filters.type!==record.type) return false;
    if (filters.dateKind!=="all" && filters.dateKind!==record.date.kind) return false;
    if (filters.certainty!=="all" && filters.certainty!==record.date.certainty) return false;
    if (filters.region!=="all" && !record.locations.some(l=>l.region===filters.region)) return false;
    if (filters.location==="city" && !record.locations.length) return false;
    if (filters.location==="unknown" && record.locations.length) return false;
    if (city && !record.locations.some(l=>foldTurkish(l.city)===city)) return false;
    if (institution && !foldTurkish(record.institution).includes(institution)) return false;
    if (person && !record.people.some(p=>foldTurkish(p).includes(person))) return false;
    if (category && !record.categories.some(p=>foldTurkish(p).includes(category))) return false;
    const years=yearSpan(record);
    if(filters.from!==null && (years.to===null || years.to<filters.from)) return false;
    if(filters.to!==null && (years.from===null || years.from>filters.to)) return false;
    if (search && !search.split(/\s+/).every(term=>foldTurkish([record.title,record.summary,...record.people,...record.categories,record.institution,...record.locations.map(l=>l.city)].join(" ")).includes(term))) return false;
    return true;
  }).sort((a,b)=>(b.date.start??"").localeCompare(a.date.start??"") || a.title.localeCompare(b.title,"tr"));
  const safeSize=Math.max(1,Math.min(100,Math.floor(pageSize)||12));
  const pageCount=Math.max(1,Math.ceil(filtered.length/safeSize)); const page=Math.min(Math.max(1,filters.page),pageCount);
  return { total:filtered.length, page, pageCount, items:filtered.slice((page-1)*safeSize,page*safeSize), all:filtered };
}
export function recordsByCity(records: readonly AtlasRecord[]) {
  const counts = new Map<string,number>();
  for (const record of records) for(const city of new Set(record.locations.map(l=>l.city))) counts.set(city,(counts.get(city)??0)+1);
  return counts;
}
export function cityComparison(records: readonly AtlasRecord[], first: string, second: string) {
  const examine = (city: string) => { const selected=records.filter(r=>r.locations.some(l=>foldTurkish(l.city)===foldTurkish(city)));
    const types: Record<string,number>={},sources:Record<string,number>={},years:Record<string,number>={};
    for (const record of selected) { types[record.type]=(types[record.type]??0)+1; sources[record.institution]=(sources[record.institution]??0)+1;
      const year=yearSpan(record).from; if(year!==null) years[String(year)]=(years[String(year)]??0)+1;
    } return {city,total:selected.length,types,sources,years};};
  return { first:examine(first), second:examine(second) };
}
