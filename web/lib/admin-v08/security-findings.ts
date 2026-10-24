export type AdminSecurityFinding = Readonly<{
  id: "F2" | "F3" | "F4";
  severity: "critical" | "medium";
  risk: string;
  evidence: string;
  owner: string;
  proposedFix: string;
  humanDecisionNeeded: boolean;
}>;

export const ADMIN_SECURITY_FINDINGS: readonly AdminSecurityFinding[] = Object.freeze([
  Object.freeze({
    id: "F2",
    severity: "critical",
    risk: "İnceleme/onay beyanı kayıt içeriğinin tam sürüm özetiyle kalıcı biçimde bağlı olmayabilir.",
    evidence: "PR #28 FORTRESS raporu F2; editörlük formundaki record_snapshot_sha256 mevcut kayda göre karşılaştırılır, fakat onay/audit deposu uygulamada yok.",
    owner: "Copilot yönetim/editörlük altyapısı ve editörlük araçlarının sorumlusu",
    proposedFix: "Kanonik kayıt SHA-256 değerini uzman kararı, editör onayı ve atomik audit olayıyla saklayıp her geçişte transaction içinde yeniden doğrulamak.",
    humanDecisionNeeded: true,
  }),
  Object.freeze({
    id: "F3",
    severity: "critical",
    risk: "Form veya audit içindeki actor_role / reviewer adı, doğrulanmış insan kimliği yerine geçemez.",
    evidence: "PR #28 FORTRESS raporu F3; üretim kimlik sağlayıcısı bu tabanda kayıtlı değil.",
    owner: "Kimlik sağlayıcısı entegrasyonu ve güvenlik sorumlusu",
    proposedFix: "Doğrulanmış OIDC issuer-subject, MFA, görev ayrılığı ve imzalı/append-only karar denetim zinciri.",
    humanDecisionNeeded: true,
  }),
  Object.freeze({
    id: "F4",
    severity: "medium",
    risk: "Bazı link-only fotoğraf kayıtlarının source.url alanı kurum landing page yerine ham JPEG dosyasını gösteriyor.",
    evidence: "PR #28 FORTRESS raporu F4; rapor snapshot’ında üç kayıt bulunmuş. Mevcut katalog bağlantıları ayrıca salt okunur taranır.",
    owner: "OpenCode katalog sahibi ve insan editör",
    proposedFix: "Kaynak URL’sini kurumun arşiv/landing sayfasıyla karşılaştırıp provenans ve görsel kullanım kararını insan editörce doğrulamak.",
    humanDecisionNeeded: true,
  }),
]);
