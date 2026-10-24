import type { ArchiveRecordType } from "../../../schemas/archive-record.types";

/**
 * Kamuya açık, arındırılmış istemci kayıt modeli.
 * İç denetim, taslak alanları ve ham araştırma verilerini içermez.
 */
export interface ExploreRecordDTO {
  id: string;
  slug: string;
  title: string;
  type: ArchiveRecordType;
  typeLabel: string;
  date: {
    start: string | null;
    end: string | null;
    display: string;
  };
  source: {
    institution: string;
    title: string;
    url: string;
    citation?: string;
  };
  rights: {
    status: string;
    label: string;
    note?: string;
  };
  verification: {
    status: "published";
    label: string;
  };
  categories: string[];
  tags: string[];
  topics: string[];
  people: {
    name: string;
    role: string;
  }[];
  locations: {
    name: string;
    city?: string;
  }[];
  summary: string;
  description?: string;
  relatedIds: string[];
  hasImage: boolean;
  imageUrl?: string;
  imageAlt?: string;
}

/**
 * Öneri gerekçe kodları.
 */
export type RecommendationReasonCode =
  | "related_id"
  | "same_person"
  | "same_location"
  | "same_category"
  | "same_period"
  | "shared_tag"
  | "same_type";

/**
 * Tekil gerekçe öğesi.
 */
export interface RecommendationReason {
  code: RecommendationReasonCode;
  label: string;
  weight: number;
  detail: string;
}

/**
 * Açıklanabilir öneri nesnesi.
 */
export interface ExploreRecommendation {
  record: ExploreRecordDTO;
  score: number;
  primaryReason: string;
  reasons: RecommendationReason[];
  evidenceRecordId: string;
  evidenceRecordTitle?: string;
  explanation: string;
}

/**
 * Tematik keşif kümesi.
 */
export interface ExploreCluster {
  id: string;
  title: string;
  description: string;
  category: string;
  period?: string;
  itemCount: number;
  records: ExploreRecordDTO[];
}

/**
 * Tarihsel dönem tanımı.
 */
export interface HistoricalPeriod {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  description: string;
}

/**
 * Arama ve filtreleme durumları.
 */
export interface ExploreFilterState {
  q: string;
  tur?: ArchiveRecordType;
  kategori?: string;
  donem?: string;
  kayit?: string;
  siralama: "alaka" | "yeni" | "eski";
  sayfa: number;
}

/**
 * Skor ağırlıkları yapılandırması.
 */
export interface RecommendationWeights {
  relatedId: number;
  samePerson: number;
  sameLocation: number;
  sameCategory: number;
  samePeriod: number;
  sharedTag: number;
  sameType: number;
}

/**
 * Arama sonucu öğesi.
 */
export interface ExploreSearchHit {
  record: ExploreRecordDTO;
  score: number;
  matchedFields: string[];
  snippet: string;
}

/**
 * Arama ve filtreleme yanıtı.
 */
export interface ExploreQueryResult {
  items: ExploreRecordDTO[];
  recommendations: ExploreRecommendation[];
  total: number;
  page: number;
  pageCount: number;
  activeFilters: {
    q?: string;
    tur?: string;
    kategori?: string;
    donem?: string;
    kayit?: string;
    siralama?: string;
  };
}
