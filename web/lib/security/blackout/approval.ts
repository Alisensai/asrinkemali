import { createHash } from "node:crypto";
import type { ActionImpact, ActionType, BlackoutLevel, ResponseAction } from "./types.ts";

/**
 * Yüksek etkili müdahaleler için insan onayı kapısı (kapalı-başarısız).
 *
 * - Kanıt koruma ve bildirim otomatiktir (yıkıcı değil, geri alınması gerekmez).
 * - Şüpheli oturumları iptal tek doğrulanmış onay ister.
 * - API kapatma, yazma dondurma, salt-okunur mod ve bunların geri alınması iki farklı kişiden
 *   doğrulanmış, MFA'lı, plan özetine bağlı ve süresi dolmamış onay ister.
 * - Kayıtlı onay doğrulayıcısı yoksa (bugünkü durum) onay gerektiren hiçbir adım yürütülemez.
 */

export const ACTION_IMPACT: Record<ActionType, ActionImpact> = {
  preserve_evidence: "automatic",
  notify_responders: "automatic",
  revoke_sessions: "single_approval",
  disable_critical_api: "dual_approval",
  enable_critical_api: "dual_approval",
  freeze_writes: "dual_approval",
  unfreeze_writes: "dual_approval",
  enable_read_only_mode: "dual_approval",
  disable_read_only_mode: "dual_approval",
};

export function impactOf(action: ResponseAction): ActionImpact {
  // Ayrıcalıklı veya tüm oturumların iptali daha geniş etkilidir.
  if (action.type === "revoke_sessions" && action.scope !== "suspicious") return "dual_approval";
  return ACTION_IMPACT[action.type];
}

export interface ResponsePlan {
  incidentId: string;
  requestedBy: string;
  targetLevel: BlackoutLevel;
  actions: ResponseAction[];
  createdAt: number;
}

/** Onayın bağlandığı kanonik plan özeti; plan değişirse onay geçersizleşir. */
export function planDigest(plan: ResponsePlan): string {
  const canonical = JSON.stringify([plan.incidentId, plan.requestedBy, plan.targetLevel, plan.actions.map((a) => [a.type, "scope" in a ? a.scope : null]), plan.createdAt]);
  return createHash("sha256").update(canonical).digest("hex");
}

export interface ApprovalRecord {
  /** Kimlik sağlayıcısının imzalı onay belirteci; içeriği doğrulayıcı çözer. */
  token: string;
  planSha256: string;
}

export interface VerifiedApproval {
  subject: string;
  roles: string[];
  mfa: boolean;
  issuedAt: number;
  expiresAt: number;
}

/** Gerçek kimlik altyapısı (OIDC + MFA/FIDO2) tarafından uygulanacak arayüz. */
export interface ApprovalVerifier {
  readonly id: string;
  verify(record: ApprovalRecord, now: number): Promise<VerifiedApproval | null>;
}

/** Bu repoda kayıtlı onay doğrulayıcısı YOKTUR; onay gerektiren adımlar kapalıdır. */
export const REGISTERED_APPROVAL_VERIFIER: ApprovalVerifier | null = null;

export const APPROVER_ROLES = ["security_officer", "incident_commander"] as const;
export const APPROVAL_MAX_AGE_MS = 15 * 60_000;

export interface ApprovalCheck {
  executable: ResponseAction[];
  blocked: { action: ResponseAction; reason: string }[];
  approvers: string[];
  rejectedApprovals: { reason: string }[];
}

export async function checkApprovals(
  plan: ResponsePlan,
  records: readonly ApprovalRecord[],
  verifier: ApprovalVerifier | null,
  now: number,
): Promise<ApprovalCheck> {
  const digest = planDigest(plan);
  const approvers = new Set<string>();
  const rejectedApprovals: ApprovalCheck["rejectedApprovals"] = [];

  if (verifier) {
    for (const record of records) {
      if (record.planSha256 !== digest) { rejectedApprovals.push({ reason: "plan-özeti-uyuşmuyor" }); continue; }
      let verified: VerifiedApproval | null = null;
      try { verified = await verifier.verify(record, now); } catch { verified = null; }
      if (!verified) { rejectedApprovals.push({ reason: "doğrulanamadı" }); continue; }
      if (!verified.mfa) { rejectedApprovals.push({ reason: "mfa-yok" }); continue; }
      if (!verified.roles.some((role) => (APPROVER_ROLES as readonly string[]).includes(role))) { rejectedApprovals.push({ reason: "yetkisiz-rol" }); continue; }
      if (verified.expiresAt <= now || now - verified.issuedAt > APPROVAL_MAX_AGE_MS || verified.issuedAt > now + 60_000) { rejectedApprovals.push({ reason: "süre-geçersiz" }); continue; }
      if (verified.subject === plan.requestedBy) { rejectedApprovals.push({ reason: "talep-eden-onaylayamaz" }); continue; }
      approvers.add(verified.subject);
    }
  }

  const executable: ResponseAction[] = [];
  const blocked: ApprovalCheck["blocked"] = [];
  for (const action of plan.actions) {
    const impact = impactOf(action);
    if (impact === "automatic") executable.push(action);
    else if (!verifier) blocked.push({ action, reason: "onay-doğrulayıcısı-kayıtlı-değil" });
    else if (impact === "single_approval" && approvers.size >= 1) executable.push(action);
    else if (impact === "dual_approval" && approvers.size >= 2) executable.push(action);
    else blocked.push({ action, reason: impact === "dual_approval" ? "iki-farklı-onay-gerekli" : "onay-gerekli" });
  }
  return { executable, blocked, approvers: [...approvers], rejectedApprovals };
}
