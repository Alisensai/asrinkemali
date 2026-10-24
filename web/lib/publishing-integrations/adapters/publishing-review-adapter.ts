import type { PublicationRecord, PublicationStatus } from "../../../../schemas/publication-record.types";
import { computePublicationRevision } from "../revision.ts";

export interface PublishingReviewTask {
  publicationId: string;
  status: PublicationStatus;
  revision: string;
  action: "review_content" | "verify_human_approval" | "schedule_publication";
  reason: string;
}

export interface PublishingReviewAdapter {
  readonly mode: "read_only_fail_closed";
  getTasks(record: PublicationRecord): readonly PublishingReviewTask[];
  verifyPublicationApproval(record: PublicationRecord): { verified: false; reason: string };
  requestTransition(record: PublicationRecord, target: PublicationStatus): { allowed: false; reason: string };
}

/**
 * V0.8 yönetim ekranının varlığı yetki değildir. Gerçek sağlayıcı, aktör doğrulaması,
 * revizyona bağlı imza ve kalıcı denetim kaydı kurulana kadar bu adapter her mutasyonu reddeder.
 */
export function createFailClosedPublishingReviewAdapter(): PublishingReviewAdapter {
  return {
    mode: "read_only_fail_closed",
    getTasks(record) {
      const revision = computePublicationRevision(record);
      if (record.status === "draft" || record.status === "in_review") return [{ publicationId: record.id, status: record.status, revision, action: "review_content", reason: "İnsan uzman ve editör incelemesi bekliyor." }];
      if (record.status === "approved") return [{ publicationId: record.id, status: record.status, revision, action: "verify_human_approval", reason: "Doğrulanmış aktör ve revision-bound onay kanıtı yok." }];
      return [{ publicationId: record.id, status: record.status, revision, action: "schedule_publication", reason: "Gerçek kimlik sağlayıcı ve denetim deposu olmadan zamanlama yapılamaz." }];
    },
    verifyPublicationApproval() {
      return { verified: false, reason: "Kayıtlı gerçek kimlik sağlayıcı ve revision-bound insan onayı yok; kapalı-başarısız davranıldı." };
    },
    requestTransition(_record, target) {
      return { allowed: false, reason: `${target} durumuna geçiş salt-okunur adapter tarafından reddedildi.` };
    },
  };
}
