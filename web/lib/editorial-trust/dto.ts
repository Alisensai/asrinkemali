import type { LegacyFormClassification } from "./forms.ts";
import type { DecisionKind, ReviewState, SubjectReadiness } from "./model.ts";

/**
 * Gelecekteki `/yonetim/incelemeler` ekranının tüketebileceği salt-okunur DTO.
 * İç dosya yolu, hash zinciri anahtarı, oturum/aktör kimliği veya kişisel veri içermez.
 * `verified` etiketi yalnız güvenilir oturumla kaydedilmiş kararlar için üretilir.
 */
export interface ReviewQueueItemDto {
  reviewId: string;
  recordId: string;
  title: string;
  slug: string;
  sourceInstitution: string;
  reviewState: ReviewState;
  snapshotCurrent: boolean;
  missingChecks: string[];
  pendingHumanRole: DecisionKind | null;
  lastVerifiedEventAt: string | null;
  lastTrustedDecision: string;
  nextAction: string;
  releaseReady: boolean;
}

function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").slice(0, max) : "";
}

export function toReviewQueueItem(
  record: Readonly<Record<string, unknown>>,
  classification: LegacyFormClassification,
  readiness: SubjectReadiness,
  lastVerified: { decisionKind: DecisionKind; outcome: string; recordedAt: string } | null,
  configuration: { identityConfigured: boolean; policyConfigured: boolean },
): ReviewQueueItemDto {
  const source = (record.source ?? {}) as Record<string, unknown>;
  const flags = readiness.flags;
  const pendingHumanRole: DecisionKind | null = !flags.human_historian_review_verified ? "historian_review" : !flags.human_editor_approval_verified ? "publication_editor" : null;
  const missingChecks = Object.entries(flags)
    .filter(([key, value]) => key !== "release_ready" && value === false)
    .map(([key]) => key);
  // Kritik bulgular sonucu `deny` yapsa da yapılandırma eksikliği bir sonraki adımı belirler.
  const notConfigured = !configuration.identityConfigured || !configuration.policyConfigured || readiness.result === "not_configured";
  return {
    reviewId: `review:${text(record.id, 120)}`,
    recordId: text(record.id, 120),
    title: text(record.title),
    slug: text(record.slug, 120),
    sourceInstitution: text(source.institution),
    reviewState: classification.reviewState,
    snapshotCurrent: !classification.stale && flags.current_revision_matched,
    missingChecks,
    pendingHumanRole,
    lastVerifiedEventAt: lastVerified?.recordedAt ?? null,
    lastTrustedDecision: lastVerified ? `${lastVerified.decisionKind}:${lastVerified.outcome}` : "güvenilir karar yok",
    nextAction: classification.stale
      ? "Güncel revizyonda yeniden inceleme"
      : notConfigured
        ? "Güvenilir kimlik sağlayıcısı ve editoryal politika yapılandırılmalı"
        : pendingHumanRole === "historian_review"
          ? "Tarih uzmanı incelemesi"
          : pendingHumanRole === "publication_editor"
            ? "Yayın editörü kararı"
            : "Yayın kapısı değerlendirmesi",
    releaseReady: flags.release_ready,
  };
}
