import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import type { RecommendationItem, RecommendationResult } from "./types";

const normalized = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
const overlap = (a: readonly string[], b: readonly string[]) => a.filter((item) => b.some((other) => normalized(other) === normalized(item)));

/** Metadata-only, deterministic recommender. It makes no historical causality claim. */
export function getRecommendations(target: ArchiveRecord, eligibleRecords: readonly ArchiveRecord[], limit = 6): RecommendationResult {
  const max = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 6, 1), 12);
  const candidates: RecommendationItem[] = [];
  for (const candidate of eligibleRecords) {
    if (candidate.id === target.id || candidate.verification.status !== "published") continue;
    const reasons: string[] = []; const codes: string[] = []; let score = 0;
    if (target.relatedIds?.includes(candidate.id)) { score += 30; codes.push("explicit_related_id"); reasons.push("Bu kayıt, katalogdaki ilgili kayıt kimliğiyle bağlantılıdır."); }
    const categories = overlap(target.categories, candidate.categories); if (categories.length) { score += Math.min(12, categories.length * 4); codes.push("shared_category"); reasons.push(`Aynı kategori etiketi: ${categories.join(", ")}.`); }
    const tags = overlap(target.tags, candidate.tags); if (tags.length) { score += Math.min(8, tags.length * 2); codes.push("shared_tag"); reasons.push(`Ortak etiket: ${tags.join(", ")}.`); }
    const places = overlap(target.locations.map((item) => item.city ?? item.name), candidate.locations.map((item) => item.city ?? item.name)); if (places.length) { score += 5; codes.push("shared_place"); reasons.push(`Aynı kaydedilmiş yer: ${places[0]}.`); }
    if (target.date.start && candidate.date.start && target.date.start.slice(0, 4) === candidate.date.start.slice(0, 4)) { score += 2; codes.push("same_year"); reasons.push("Kayıt tarihi aynı yıl içindedir."); }
    if (score > 0) candidates.push({ recordId: candidate.id, slug: candidate.slug, title: candidate.title, type: candidate.type, dateDisplay: candidate.date.display, summary: candidate.summary, reasonCodes: codes, reasons, score, sourceInstitution: candidate.source.institution });
  }
  candidates.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "tr") || a.recordId.localeCompare(b.recordId));
  return { algorithmVersion: "v1", items: candidates.slice(0, max) };
}
