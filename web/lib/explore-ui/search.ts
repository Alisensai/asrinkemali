import type { ArchiveRecordType } from "../../../schemas/archive-record.types";
import {
  determineHistoricalPeriod,
  foldTurkish,
} from "./recommendations";
import type {
  ExploreFilterState,
  ExploreRecordDTO,
  ExploreSearchHit,
} from "./types";

export interface SearchExploreOptions {
  q?: string;
  tur?: ArchiveRecordType;
  kategori?: string;
  donem?: string;
  siralama?: "alaka" | "yeni" | "eski";
  sayfa?: number;
  pageSize?: number;
}

export interface SearchExploreResult {
  hits: ExploreSearchHit[];
  items: ExploreRecordDTO[];
  total: number;
  page: number;
  pageCount: number;
  availableCategories: { name: string; count: number }[];
  availableTypes: { type: ArchiveRecordType; label: string; count: number }[];
}

const TYPE_NAMES: Record<ArchiveRecordType, string> = {
  photograph: "Fotoğraf",
  document: "Belge",
  speech: "Konuşma",
  event: "Olay",
  publication: "Yayın",
  place: "Mekân",
};

/**
 * Arama sorgusu ve filtreler doğrultusunda kayıtları süzer, puanlar ve sıralar.
 */
export function searchExploreRecords(
  records: readonly ExploreRecordDTO[],
  options: SearchExploreOptions = {}
): SearchExploreResult {
  const query = foldTurkish(options.q || "");
  const queryTokens = query.split(/\s+/).filter((t) => t.length > 0);

  const typeFilter = options.tur;
  const categoryFilter = options.kategori ? foldTurkish(options.kategori) : "";
  const periodFilter = options.donem;
  const sortMode = options.siralama || "alaka";
  const page = Math.max(1, options.sayfa || 1);
  const pageSize = Math.max(1, Math.min(100, options.pageSize || 12));

  // Kategori ve tür sayıları için sayaçlar
  const categoryCountMap = new Map<string, number>();
  const typeCountMap = new Map<ArchiveRecordType, number>();

  const filteredHits: ExploreSearchHit[] = [];

  for (const record of records) {
    // 1. Tür filtresi
    if (typeFilter && record.type !== typeFilter) {
      continue;
    }

    // 2. Kategori filtresi
    if (
      categoryFilter &&
      !record.categories.some((c) => foldTurkish(c).includes(categoryFilter))
    ) {
      continue;
    }

    // 3. Dönem filtresi
    if (periodFilter) {
      const recPeriod = determineHistoricalPeriod(record);
      if (!recPeriod || recPeriod.id !== periodFilter) {
        continue;
      }
    }

    // Sayaçları güncelle
    for (const cat of record.categories) {
      categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + 1);
    }
    typeCountMap.set(record.type, (typeCountMap.get(record.type) || 0) + 1);

    // 4. Arama sorgusu puanlama
    let score = 10;
    const matchedFields: string[] = [];

    if (queryTokens.length > 0) {
      const titleFolded = foldTurkish(record.title);
      const summaryFolded = foldTurkish(record.summary);
      const descFolded = foldTurkish(record.description || "");
      const tagsFolded = record.tags.map(foldTurkish);
      const catFolded = record.categories.map(foldTurkish);
      const peopleFolded = record.people.map((p) => foldTurkish(p.name));
      const locFolded = record.locations.map((l) => foldTurkish(`${l.city || ""} ${l.name}`));
      const instFolded = foldTurkish(record.source.institution);

      let allTokensMatch = true;

      for (const token of queryTokens) {
        let tokenMatched = false;

        if (titleFolded.includes(token)) {
          score += 25;
          tokenMatched = true;
          if (!matchedFields.includes("başlık")) matchedFields.push("başlık");
        }
        if (tagsFolded.some((t) => t.includes(token))) {
          score += 15;
          tokenMatched = true;
          if (!matchedFields.includes("etiketler")) matchedFields.push("etiketler");
        }
        if (catFolded.some((c) => c.includes(token))) {
          score += 15;
          tokenMatched = true;
          if (!matchedFields.includes("kategoriler")) matchedFields.push("kategoriler");
        }
        if (peopleFolded.some((p) => p.includes(token))) {
          score += 15;
          tokenMatched = true;
          if (!matchedFields.includes("şahsiyetler")) matchedFields.push("şahsiyetler");
        }
        if (locFolded.some((l) => l.includes(token))) {
          score += 12;
          tokenMatched = true;
          if (!matchedFields.includes("mekânlar")) matchedFields.push("mekânlar");
        }
        if (summaryFolded.includes(token) || descFolded.includes(token)) {
          score += 10;
          tokenMatched = true;
          if (!matchedFields.includes("özet")) matchedFields.push("özet");
        }
        if (instFolded.includes(token)) {
          score += 8;
          tokenMatched = true;
          if (!matchedFields.includes("kurum")) matchedFields.push("kurum");
        }

        if (!tokenMatched) {
          allTokensMatch = false;
          break;
        }
      }

      if (!allTokensMatch) {
        continue;
      }
    }

    filteredHits.push({
      record,
      score,
      matchedFields,
      snippet: record.summary,
    });
  }

  // 5. Deterministik sıralama
  filteredHits.sort((a, b) => {
    if (sortMode === "alaka") {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const dateA = a.record.date.start || "";
      const dateB = b.record.date.start || "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.record.id.localeCompare(b.record.id, "tr");
    } else if (sortMode === "yeni") {
      const dateA = a.record.date.start || "";
      const dateB = b.record.date.start || "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.record.id.localeCompare(b.record.id, "tr");
    } else {
      // eski
      const dateA = a.record.date.start || "";
      const dateB = b.record.date.start || "";
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return a.record.id.localeCompare(b.record.id, "tr");
    }
  });

  const total = filteredHits.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const validPage = Math.min(page, pageCount);
  const pagedHits = filteredHits.slice((validPage - 1) * pageSize, validPage * pageSize);

  // Kategori listesini sıklığa göre sırala
  const availableCategories = Array.from(categoryCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));

  // Tür listesini sırala
  const allTypes: ArchiveRecordType[] = [
    "photograph",
    "document",
    "speech",
    "event",
    "publication",
    "place",
  ];
  const availableTypes = allTypes.map((type) => ({
    type,
    label: TYPE_NAMES[type] || type,
    count: typeCountMap.get(type) || 0,
  }));

  return {
    hits: pagedHits,
    items: pagedHits.map((h) => h.record),
    total,
    page: validPage,
    pageCount,
    availableCategories,
    availableTypes,
  };
}

/**
 * URL sorgu dizesini ayrıştırır.
 */
export function parseExploreSearchParams(
  params: Record<string, string | string[] | undefined>
): ExploreFilterState {
  const one = (val: string | string[] | undefined) =>
    Array.isArray(val) ? val[0] || "" : val || "";

  const q = one(params.q).trim().slice(0, 100);
  const rawTur = one(params.tur).trim().toLowerCase();
  const kategori = one(params.kategori).trim().slice(0, 80);
  const donem = one(params.donem).trim().slice(0, 50);
  const kayit = one(params.kayit).trim().slice(0, 120);
  const rawSiralama = one(params.siralama).trim().toLowerCase();
  const rawPage = one(params.sayfa);

  const validTypes: Record<string, ArchiveRecordType> = {
    fotograf: "photograph",
    photograph: "photograph",
    belge: "document",
    document: "document",
    konusma: "speech",
    speech: "speech",
    olay: "event",
    event: "event",
    yayin: "publication",
    publication: "publication",
    mekan: "place",
    place: "place",
  };

  const tur = validTypes[rawTur] || undefined;
  const siralama =
    rawSiralama === "yeni" || rawSiralama === "eski" ? rawSiralama : "alaka";
  const sayfa = /^\d+$/.test(rawPage) ? Math.max(1, parseInt(rawPage, 10)) : 1;

  return {
    q,
    tur,
    kategori: kategori || undefined,
    donem: donem || undefined,
    kayit: /^[a-z0-9-]{1,120}$/.test(kayit) ? kayit : undefined,
    siralama,
    sayfa,
  };
}
