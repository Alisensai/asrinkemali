import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import { reviewLabel, typeLabel } from "../archive";
import { getRecommendationsForRecord } from "./recommendations";
import type {
  ExploreRecommendation,
  ExploreRecordDTO,
  RecommendationWeights,
} from "./types";

const RIGHTS_LABELS: Record<string, string> = {
  public_domain: "Kamu Malı (Açık Erişim)",
  open_license: "Açık Lisans",
  official_link_only: "Resmî Kurum Bağlantısı",
  institutional_terms: "Kurumsal Kullanım Şartları",
  unknown: "Telif Bilgisi Belirsiz",
  permission_required: "Özel İzin Gerektirir",
  ai_representative: "Temsili İçerik",
};

/**
 * Sunucu tarafındaki ArchiveRecord modelini kamuya açık ve güvenli ExploreRecordDTO nesnesine dönüştürür.
 * İstemciye sızmaması gereken iç denetim, onay süreçleri veya hassas bilgileri temizler.
 */
export function archiveRecordToExploreDTO(record: ArchiveRecord): ExploreRecordDTO {
  const allTopics = Array.from(
    new Set([...(record.categories || []), ...(record.tags || [])])
  );

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    type: record.type,
    typeLabel: typeLabel(record.type) || record.type,
    date: {
      start: record.date.start,
      end: record.date.end,
      display: record.date.display,
    },
    source: {
      institution: record.source.institution,
      title: record.source.title,
      url: record.source.url,
      citation: record.source.citation,
    },
    rights: {
      status: record.rights.status,
      label: RIGHTS_LABELS[record.rights.status] || "Kaynak Şartları Geçerli",
      note: record.rights.note,
    },
    verification: {
      status: "published",
      label: reviewLabel(record.verification.status),
    },
    categories: [...(record.categories || [])],
    tags: [...(record.tags || [])],
    topics: allTopics,
    people: (record.people || []).map((p) => ({
      name: p.name,
      role: p.role,
    })),
    locations: (record.locations || []).map((l) => ({
      name: l.name,
      city: l.city,
    })),
    summary: record.summary,
    description: record.description,
    relatedIds: [...(record.relatedIds || [])],
    hasImage: Boolean(record.image && record.image.kind !== "none"),
    imageUrl: record.image?.url ?? undefined,
    imageAlt: record.image?.alt,
  };
}

/**
 * Öneri Servisi Sözleşmesi (Recommendation Service Contract).
 * İleride eklenebilecek haricî modeller (Qwen / DeepSeek) için genişletilebilir adaptör arayüzü.
 */
export interface RecommendationService {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  isAvailable(): boolean;
  getRecommendations(
    seed: ExploreRecordDTO,
    pool: readonly ExploreRecordDTO[],
    limit?: number,
    weights?: Partial<RecommendationWeights>
  ): Promise<ExploreRecommendation[]>;
}

/**
 * Birincil varsayılan motor: Gerçek arşiv kayıtlarından beslenen açıklanabilir, deterministik öneri motoru.
 */
export class DeterministicArchiveRecommendationService
  implements RecommendationService
{
  readonly id = "deterministic-baseline";
  readonly name = "MKA Deterministik Arşiv Öneri Motoru";
  readonly version = "1.0.0";

  isAvailable(): boolean {
    return true;
  }

  async getRecommendations(
    seed: ExploreRecordDTO,
    pool: readonly ExploreRecordDTO[],
    limit = 6,
    weights?: Partial<RecommendationWeights>
  ): Promise<ExploreRecommendation[]> {
    return getRecommendationsForRecord(seed, pool, limit, weights);
  }
}

/**
 * Qwen Haricî Öneri Adaptörü (Hazır Stub / Fallback).
 * GitHub veya ortamda haricî Qwen backend servisi bulunmadığından isAvailable() false döner
 * ve çağrıldığında güvenli bir biçimde deterministik motora delege eder.
 */
export class QwenRecommendationServiceAdapter implements RecommendationService {
  readonly id = "qwen-explore-adapter";
  readonly name = "Qwen LLM Keşif Adaptörü";
  readonly version = "0.9.0-stub";

  private fallbackService = new DeterministicArchiveRecommendationService();

  isAvailable(): boolean {
    // Haricî Qwen servisi canlıda/dalda bulunmadığı için güvenli varsayılan kapalıdır
    return false;
  }

  async getRecommendations(
    seed: ExploreRecordDTO,
    pool: readonly ExploreRecordDTO[],
    limit = 6,
    weights?: Partial<RecommendationWeights>
  ): Promise<ExploreRecommendation[]> {
    // Graceful fallback to deterministic engine
    return this.fallbackService.getRecommendations(seed, pool, limit, weights);
  }
}

/**
 * Etkin öneri servisini döner.
 */
export function getActiveRecommendationService(): RecommendationService {
  const qwenAdapter = new QwenRecommendationServiceAdapter();
  if (qwenAdapter.isAvailable()) {
    return qwenAdapter;
  }
  return new DeterministicArchiveRecommendationService();
}
