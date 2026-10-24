import type { ArchiveRecord, ArchiveRecordType } from "../../../schemas/archive-record.types";
import { checkDateOverlap, formatDateContext } from "./dates";
import type { OverlapResult, RecordDateInfo } from "./dates";

export const RECORD_TYPE_LABELS: Record<ArchiveRecordType, string> = {
  photograph: "Fotoğraf",
  document: "Belge",
  speech: "Konuşma",
  event: "Olay",
  publication: "Yayın",
  place: "Mekân",
};

export interface ComparisonProvenance {
  institution: string;
  identifier?: string | null;
  url?: string;
}

export interface ComparisonLocation {
  city: string;
  country: string;
}

export interface ComparisonRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: ArchiveRecordType;
  typeLabel: string;
  date: RecordDateInfo;
  institution: string;
  sourceTitle: string;
  sourceUrl: string | null;
  citation: string | null;
  rights: string;
  review: string;
  locations: ComparisonLocation[];
  people: string[];
  categories: string[];
  provenance: ComparisonProvenance[];
  relatedIds: string[];
}

export interface ComparisonDataset {
  records: ComparisonRecord[];
  bySlug: Map<string, ComparisonRecord>;
  byId: Map<string, ComparisonRecord>;
  types: ArchiveRecordType[];
  institutions: string[];
}

export interface ComparisonFieldRow {
  key: string;
  label: string;
  valueA: string;
  valueB: string;
  isDifferent: boolean;
  externalUrlA?: string | null;
  externalUrlB?: string | null;
}

export interface ComparisonResult {
  docA: ComparisonRecord;
  docB: ComparisonRecord;
  commonPeople: string[];
  commonLocations: string[];
  commonCategories: string[];
  dateOverlap: OverlapResult;
  fieldRows: ComparisonFieldRow[];
}

export function foldTurkish(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

export function isSafeUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^file:/i.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function toComparisonRecord(record: ArchiveRecord): ComparisonRecord {
  const safeSourceUrl = isSafeUrl(record.source?.url);
  const locations: ComparisonLocation[] = (record.locations ?? [])
    .map((l) => ({
      city: l.city?.trim() || l.name?.trim() || "",
      country: l.country?.trim() || "Türkiye",
    }))
    .filter((l) => l.city.length > 0);

  const people = (record.people ?? [])
    .map((p) => (typeof p === "string" ? p : p.name))
    .filter(Boolean);

  const categories = record.categories ?? [];

  const provenance: ComparisonProvenance[] = (record.provenance ?? []).map((p) => ({
    institution: p.institution || "Belirtilmemiş",
    identifier: p.identifier,
    url: isSafeUrl(p.url) ?? undefined,
  }));

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    summary: record.summary || "Özet bilgi bulunmuyor.",
    type: record.type,
    typeLabel: RECORD_TYPE_LABELS[record.type] || record.type,
    date: {
      display: record.date?.display || "Tarih bilinmiyor",
      start: record.date?.start ?? null,
      end: record.date?.end ?? null,
      precision: record.date?.precision ?? "unknown",
      certainty: record.date?.certainty ?? "unknown",
    },
    institution: record.source?.institution || "Belirtilmemiş",
    sourceTitle: record.source?.title || "Belirtilmemiş",
    sourceUrl: safeSourceUrl,
    citation: record.source?.citation ?? null,
    rights: record.rights?.status ? record.rights.status.replace(/_/g, " ") : "Bilinmiyor",
    review: "Yayıma açık katalog kaydı",
    locations,
    people,
    categories,
    provenance,
    relatedIds: record.relatedIds ?? [],
  };
}

export function toComparisonDataset(records: readonly ArchiveRecord[]): ComparisonDataset {
  // Only technical published records pass the visibility gate
  const published = records.filter((r) => r.verification?.status === "published");
  const compRecords = published.map(toComparisonRecord);

  const bySlug = new Map<string, ComparisonRecord>();
  const byId = new Map<string, ComparisonRecord>();
  const institutionsSet = new Set<string>();

  for (const r of compRecords) {
    bySlug.set(r.slug, r);
    byId.set(r.id, r);
    if (r.institution) institutionsSet.add(r.institution);
  }

  const types = Object.keys(RECORD_TYPE_LABELS) as ArchiveRecordType[];
  const institutions = [...institutionsSet].sort((a, b) => a.localeCompare(b, "tr"));

  return {
    records: compRecords,
    bySlug,
    byId,
    types,
    institutions,
  };
}

export function compareDocuments(docA: ComparisonRecord, docB: ComparisonRecord): ComparisonResult {
  const foldedPeopleA = new Set(docA.people.map(foldTurkish));
  const commonPeople = docB.people.filter((p) => foldedPeopleA.has(foldTurkish(p)));

  const foldedLocsA = new Set(docA.locations.map((l) => foldTurkish(l.city)));
  const commonLocations = docB.locations
    .filter((l) => foldedLocsA.has(foldTurkish(l.city)))
    .map((l) => l.city);

  const foldedCatsA = new Set(docA.categories.map(foldTurkish));
  const commonCategories = docB.categories.filter((c) => foldedCatsA.has(foldTurkish(c)));

  const dateOverlap = checkDateOverlap(docA.date, docB.date);

  const formatLocs = (locs: ComparisonLocation[]) =>
    locs.length ? locs.map((l) => `${l.city} (${l.country})`).join(", ") : "Belirtilmemiş";

  const formatProv = (prov: ComparisonProvenance[]) =>
    prov.length
      ? prov.map((p) => `${p.institution}${p.identifier ? ` — ${p.identifier}` : ""}`).join("; ")
      : "Provenans kaydı yok";

  const rows: ComparisonFieldRow[] = [
    {
      key: "title",
      label: "Katalog Başlığı",
      valueA: docA.title,
      valueB: docB.title,
      isDifferent: foldTurkish(docA.title) !== foldTurkish(docB.title),
    },
    {
      key: "type",
      label: "Kayıt / Belge Türü",
      valueA: docA.typeLabel,
      valueB: docB.typeLabel,
      isDifferent: docA.type !== docB.type,
    },
    {
      key: "date",
      label: "Tarih ve Hassasiyet",
      valueA: formatDateContext(docA.date),
      valueB: formatDateContext(docB.date),
      isDifferent:
        docA.date.display !== docB.date.display ||
        docA.date.start !== docB.date.start ||
        docA.date.end !== docB.date.end,
    },
    {
      key: "institution",
      label: "Kaynak Kurumu",
      valueA: docA.institution,
      valueB: docB.institution,
      isDifferent: foldTurkish(docA.institution) !== foldTurkish(docB.institution),
    },
    {
      key: "sourceTitle",
      label: "Kaynak Künye Başlığı",
      valueA: docA.sourceTitle,
      valueB: docB.sourceTitle,
      isDifferent: foldTurkish(docA.sourceTitle) !== foldTurkish(docB.sourceTitle),
    },
    {
      key: "citation",
      label: "Bibliyografik Künye",
      valueA: docA.citation || "Künye metni bulunmuyor",
      valueB: docB.citation || "Künye metni bulunmuyor",
      isDifferent: foldTurkish(docA.citation) !== foldTurkish(docB.citation),
    },
    {
      key: "sourceUrl",
      label: "Özgün Kaynak Bağlantısı",
      valueA: docA.sourceUrl ? "Kurumsal bağlantı mevcut ↗" : "Bağlantı bulunmuyor",
      valueB: docB.sourceUrl ? "Kurumsal bağlantı mevcut ↗" : "Bağlantı bulunmuyor",
      isDifferent: docA.sourceUrl !== docB.sourceUrl,
      externalUrlA: docA.sourceUrl,
      externalUrlB: docB.sourceUrl,
    },
    {
      key: "rights",
      label: "Kullanım ve Yayın Hakkı",
      valueA: docA.rights,
      valueB: docB.rights,
      isDifferent: docA.rights !== docB.rights,
    },
    {
      key: "locations",
      label: "Kayıtlı Konumlar",
      valueA: formatLocs(docA.locations),
      valueB: formatLocs(docB.locations),
      isDifferent: formatLocs(docA.locations) !== formatLocs(docB.locations),
    },
    {
      key: "people",
      label: "Kayıtta Geçen Kişiler",
      valueA: docA.people.length ? docA.people.join(", ") : "Kişi belirtilmemiş",
      valueB: docB.people.length ? docB.people.join(", ") : "Kişi belirtilmemiş",
      isDifferent: docA.people.join(",") !== docB.people.join(","),
    },
    {
      key: "categories",
      label: "Kategoriler",
      valueA: docA.categories.length ? docA.categories.join(", ") : "Kategori yok",
      valueB: docB.categories.length ? docB.categories.join(", ") : "Kategori yok",
      isDifferent: docA.categories.join(",") !== docB.categories.join(","),
    },
    {
      key: "provenance",
      label: "Provenans Kaydı",
      valueA: formatProv(docA.provenance),
      valueB: formatProv(docB.provenance),
      isDifferent: formatProv(docA.provenance) !== formatProv(docB.provenance),
    },
    {
      key: "review",
      label: "Doğrulama Statüsü",
      valueA: "Yayıma açık katalog kaydı (Uzman teyidi anlamına gelmez)",
      valueB: "Yayıma açık katalog kaydı (Uzman teyidi anlamına gelmez)",
      isDifferent: false,
    },
  ];

  return {
    docA,
    docB,
    commonPeople,
    commonLocations,
    commonCategories,
    dateOverlap,
    fieldRows: rows,
  };
}

export function parseComparisonParams(
  params: Record<string, string | string[] | undefined>
): { slugA: string | null; slugB: string | null; warnings: string[] } {
  const warnings: string[] = [];

  const getSlug = (key: string): string | null => {
    const val = params[key];
    if (!val) return null;
    const str = Array.isArray(val) ? val[0] : val;
    if (typeof str !== "string") return null;
    const clean = str.trim().toLowerCase();
    if (clean.length > 100) {
      warnings.push(`'${key}' parametresi çok uzun olduğundan sınırlandı.`);
      return clean.slice(0, 100);
    }
    // Allow standard alphanumeric and dashes
    if (!/^[a-z0-9-]+$/.test(clean)) {
      warnings.push(`Geçersiz '${key}' slug formatı yok sayıldı.`);
      return null;
    }
    return clean;
  };

  const slugA = getSlug("a");
  const slugB = getSlug("b");

  if (slugA && slugB && slugA === slugB) {
    warnings.push("Aynı belge iki kez seçilemez. Karşılaştırma için iki farklı belge seçiniz.");
    return { slugA, slugB: null, warnings };
  }

  return { slugA, slugB, warnings };
}

export function filterRecords(
  records: readonly ComparisonRecord[],
  query: string,
  typeFilter: string,
  instFilter: string
): ComparisonRecord[] {
  const q = foldTurkish(query);
  const tf = typeFilter && typeFilter !== "all" ? typeFilter : null;
  const inf = instFilter ? foldTurkish(instFilter) : null;

  return records.filter((r) => {
    if (tf && r.type !== tf) return false;
    if (inf && !foldTurkish(r.institution).includes(inf)) return false;
    if (q) {
      const haystack = foldTurkish(
        `${r.title} ${r.summary} ${r.people.join(" ")} ${r.categories.join(" ")} ${r.institution} ${r.locations.map((l) => l.city).join(" ")}`
      );
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
