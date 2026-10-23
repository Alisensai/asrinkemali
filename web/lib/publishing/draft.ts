import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import type { PublicationRecord } from "../../../schemas/publication-record.types";

export interface DraftRequest { id: string; slug: string; title: string; category: string; author: string; archiveIds: string[]; now: string; runId: string }
export interface AiDraftPolicy { enabled: boolean; dryRun: true; maxCostCents: number; hardLimitCents: number; provider?: string; model?: string }

export function assertAiDraftPolicy(policy: AiDraftPolicy) {
  if (!policy.dryRun) throw new Error("V0.6 yalnızca dry-run AI hazırlığına izin verir.");
  if (policy.maxCostCents < 0 || policy.hardLimitCents < 0 || policy.maxCostCents > policy.hardLimitCents) throw new Error("AI maliyet sınırı geçersiz.");
  if (policy.enabled && (!policy.provider?.trim() || !policy.model?.trim())) throw new Error("AI sağlayıcı ve model açıkça seçilmelidir.");
}

export function createDeterministicDraft(request: DraftRequest, archiveRecords: readonly ArchiveRecord[]): PublicationRecord {
  const requested = new Set(request.archiveIds);
  const sources = archiveRecords.filter((record) => requested.has(record.id) && record.verification.status === "published" && record.source.url.startsWith("https://"));
  if (sources.length !== requested.size) throw new Error("Her taslak kaynağı yayın kapısından geçmiş ve HTTPS kaynaklı bir arşiv kaydı olmalıdır.");
  return {
    schemaVersion: "1.0.0", id: request.id, slug: request.slug, kind: "sourced_article", title: request.title,
    summary: "Kaynaklı arşiv kayıtlarından editör incelemesi için hazırlanmış taslak.",
    body: sources.map((source) => ({ type: "paragraph" as const, text: `${source.title}: ${source.summary}` })),
    category: request.category, tags: [], authors: [request.author],
    bibliography: sources.map((source) => ({ id: source.id, title: source.source.title, institution: source.source.institution, url: source.source.url, accessedAt: source.source.accessedAt })),
    relatedArchiveIds: sources.map((source) => source.id), rights: { license: "Editör incelemesi gerekli", holder: "ASRIN KEMALİ katkıcıları", note: "Kaynak eserlerin hakları kendi kurumlarında kalır." },
    status: "draft", approval: null, scheduledAt: null, publishedAt: null,
    automation: { mode: "deterministic", sourceArchiveIds: sources.map((source) => source.id), sourceSnapshotAt: request.now, runId: request.runId, maxCostCents: 0, actualCostCents: 0 },
    createdAt: request.now, updatedAt: request.now,
  };
}
