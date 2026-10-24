/**
 * Sergi kaynağı güven durumu — VERİYE dayalı (V1.0 arayüz güvenlik düzeltmesi).
 *
 * Önceki sürümde bileşenler kaynak inceleme paneline sabit `isVerified: true` geçiriyor ve
 * her kaynakta "DOĞRULANMIŞ KAYNAK" rozeti gösteriyordu; sergi JSON'undaki serbest metin
 * `verificationBadge` ("Doğrulanmış Kurumsal Kaynak") da yeşil "doğrulanmış" stiliyle
 * basılıyordu. Bunlar kayıt sahibinin kendi beyanıdır, insan onayı değildir.
 *
 * "verified" yalnız şu üçü birlikte sağlanınca döner:
 *  1. Editoryal güven katmanı yapılandırılmış (güvenilir kimlik sağlayıcısı + politika),
 *  2. Bu sergi revizyonu için doğrulanmış insan onayı (karar deposundan),
 *  3. Sergi sentetik önizleme veya staging taslağı değil.
 * Bu repoda sağlayıcı/politika yoktur; bu yüzden bugün hiçbir kaynak "verified" olamaz.
 */
import { editorialTrustConfigured } from "../editorial-trust/configuration.ts";

export type SourceTrustState = "verified" | "pending_review" | "synthetic_preview" | "staging_draft";

export interface SourceTrust {
  state: SourceTrustState;
  /** Rozet metni (Türkçe, büyük harf). */
  label: string;
  /** Ekran okuyucu ve açıklama metni. */
  description: string;
}

export interface SourceTrustInput {
  isSyntheticPreview: boolean;
  isStagingDraft: boolean;
  /** Karar deposundan gelen doğrulanmış insan onayı. Kayıt içi beyan bu alanı dolduramaz. */
  verifiedApproval?: boolean;
  /** Test için; varsayılan editoryal güven yapılandırmasıdır. */
  trustConfigured?: boolean;
}

const LABELS: Record<SourceTrustState, Omit<SourceTrust, "state">> = {
  verified: { label: "DOĞRULANMIŞ KAYNAK", description: "Bu kaynak, kimliği doğrulanmış uzman ve editör onayından geçmiştir." },
  pending_review: { label: "İNCELEME BEKLİYOR", description: "Bu kaynak henüz bağımsız insan uzman ve editör onayından geçmedi." },
  synthetic_preview: { label: "SENTETİK ÖNİZLEME · DOĞRULANMADI", description: "Bu sergi sentetik bir önizlemedir; kaynak bilgileri insan onayından geçmedi." },
  staging_draft: { label: "STAGING TASLAĞI · YAYINDA DEĞİL", description: "Bu sergi yalnız geliştirme ortamında görünen bir taslaktır; kaynak bilgileri insan onayından geçmedi." },
};

export function resolveSourceTrust(input: SourceTrustInput): SourceTrust {
  let state: SourceTrustState;
  if (input.isSyntheticPreview) state = "synthetic_preview";
  else if (input.isStagingDraft) state = "staging_draft";
  else if ((input.trustConfigured ?? editorialTrustConfigured()) && input.verifiedApproval === true) state = "verified";
  else state = "pending_review";
  return { state, ...LABELS[state] };
}

/**
 * Sergi verisindeki serbest metin rozet (ör. "Doğrulanmış Kurumsal Kaynak") yalnız güven
 * durumu "verified" ise gösterilir; aksi hâlde veriye dayalı güven etiketi gösterilir.
 */
export function sourceBadgeText(rawBadge: string | undefined, trust: SourceTrust): string {
  return trust.state === "verified" && rawBadge ? rawBadge : trust.label;
}
