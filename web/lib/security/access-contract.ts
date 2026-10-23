/**
 * MKA FORTRESS — yönetim paneli ve korumalı önizleme için güvenlik sözleşmesi.
 *
 * Bu dosya Copilot MKA CONTROL CENTER (V0.8) ve gelecekteki kimlik doğrulama altyapısının uyması
 * gereken arayüzleri ve KAPALI-BAŞARISIZ (fail-closed) karar fonksiyonlarını tanımlar.
 * Bugün kayıtlı gerçek bir kimlik sağlayıcı YOKTUR: `REGISTERED_PROVIDER` null olduğu sürece
 * yönetim rotaları her ortamda erişilemezdir. Ortam değişkeni ayarlamak bunu açmaz; açmak için
 * kodda gerçek, test edilmiş bir sağlayıcı kaydedilmesi gerekir.
 */
import { createHash, timingSafeEqual } from "node:crypto";

// ---- Kimlik doğrulama ve oturum ----
export type Role = "viewer" | "contributor" | "historian" | "editor" | "admin";
export interface Session { subject: string; roles: Role[]; issuedAt: number; expiresAt: number; authenticatedVia: string; mfa: boolean }
export interface AuthenticationProvider {
  readonly id: string;
  /** İmzalı/şifreli oturum çerezini doğrular; geçersizse null döner (asla istisna ile açık kalmaz). */
  verifySession(cookieValue: string | undefined, now: number): Promise<Session | null>;
}
/** Kayıtlı gerçek sağlayıcı. null olduğu sürece yönetim paneli kapalıdır. */
export const REGISTERED_PROVIDER: AuthenticationProvider | null = null;

export function validateSession(session: Session | null | undefined, now: number, maxAgeMs = 8 * 60 * 60 * 1000): { valid: boolean; reason: string } {
  if (!session) return { valid: false, reason: "no-session" };
  if (!session.subject?.trim()) return { valid: false, reason: "no-subject" };
  if (!Number.isFinite(session.issuedAt) || !Number.isFinite(session.expiresAt)) return { valid: false, reason: "bad-timestamps" };
  if (session.issuedAt > now + 60_000) return { valid: false, reason: "issued-in-future" };
  if (session.expiresAt <= now) return { valid: false, reason: "expired" };
  if (session.expiresAt - session.issuedAt > maxAgeMs) return { valid: false, reason: "lifetime-too-long" };
  return { valid: true, reason: "ok" };
}

// ---- Yetkilendirme (RBAC + görev ayrılığı) ----
export type Permission = "archive.read_drafts" | "archive.edit" | "review.submit_expert" | "publication.edit" | "publication.approve" | "publication.schedule" | "audit.read" | "users.manage";
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: [],
  contributor: ["archive.read_drafts", "archive.edit", "publication.edit"],
  historian: ["archive.read_drafts", "review.submit_expert"],
  editor: ["archive.read_drafts", "publication.edit", "publication.approve", "publication.schedule", "audit.read"],
  admin: ["audit.read", "users.manage"],
};
/** Yüksek riskli işlemler MFA ister; admin rolü içerik onayı veremez (görev ayrılığı). */
const MFA_REQUIRED: readonly Permission[] = ["publication.approve", "publication.schedule", "review.submit_expert", "users.manage"];

export interface AuthorizationContext { resourceAuthor?: string }
export function authorize(session: Session | null | undefined, permission: Permission, now: number, context: AuthorizationContext = {}): { allowed: boolean; reason: string } {
  const validity = validateSession(session, now);
  if (!validity.valid || !session) return { allowed: false, reason: validity.reason };
  const granted = session.roles.filter((role) => role in ROLE_PERMISSIONS).some((role) => ROLE_PERMISSIONS[role].includes(permission));
  if (!granted) return { allowed: false, reason: "permission-denied" };
  if (MFA_REQUIRED.includes(permission) && !session.mfa) return { allowed: false, reason: "mfa-required" };
  // Kişi kendi yazdığı içeriği onaylayamaz veya uzman incelemesi olarak işaretleyemez.
  if ((permission === "publication.approve" || permission === "review.submit_expert") && context.resourceAuthor && context.resourceAuthor === session.subject) return { allowed: false, reason: "self-approval" };
  return { allowed: true, reason: "ok" };
}

// ---- CSRF ----
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
export function safeEqual(a: string, b: string) { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }
/** Durum değiştiren isteklerde: aynı köken (Origin/Referer) VE çift gönderimli belirteç eşleşmesi. */
export function verifyCsrf(input: { method: string; origin?: string | null; referer?: string | null; expectedOrigin: string; headerToken?: string | null; cookieToken?: string | null }): { ok: boolean; reason: string } {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return { ok: true, reason: "safe-method" };
  const source = input.origin ?? (input.referer ? (() => { try { return new URL(input.referer).origin; } catch { return null; } })() : null);
  if (!source || source !== input.expectedOrigin) return { ok: false, reason: "origin-mismatch" };
  if (!input.headerToken || !input.cookieToken || input.headerToken.length < 32) return { ok: false, reason: "token-missing" };
  return safeEqual(input.headerToken, input.cookieToken) ? { ok: true, reason: "ok" } : { ok: false, reason: "token-mismatch" };
}

// ---- Oturum çerezi politikası ----
export function validateSessionCookie(setCookie: string): { ok: boolean; missing: string[] } {
  const lower = setCookie.toLowerCase(); const missing: string[] = [];
  if (!setCookie.startsWith("__Host-")) missing.push("__Host- öneki");
  if (!/;\s*secure(;|$)/.test(lower)) missing.push("Secure");
  if (!/;\s*httponly(;|$)/.test(lower)) missing.push("HttpOnly");
  if (!/;\s*samesite=strict(;|$)/.test(lower)) missing.push("SameSite=Strict");
  if (!/;\s*path=\/(;|$)/.test(lower)) missing.push("Path=/");
  if (/;\s*domain=/.test(lower)) missing.push("Domain belirtilmemeli");
  return { ok: missing.length === 0, missing };
}

// ---- Denetim kaydı (hash zinciri) ----
export interface AuditEvent { sequence: number; at: string; actor: string; action: string; target: string; outcome: "allowed" | "denied"; previousHash: string; hash: string }
const GENESIS = "0".repeat(64);
export function appendAuditEvent(chain: readonly AuditEvent[], event: Omit<AuditEvent, "sequence" | "previousHash" | "hash">): AuditEvent[] {
  const previousHash = chain.at(-1)?.hash ?? GENESIS; const sequence = chain.length + 1;
  const hash = createHash("sha256").update(JSON.stringify([sequence, event.at, event.actor, event.action, event.target, event.outcome, previousHash])).digest("hex");
  return [...chain, { ...event, sequence, previousHash, hash }];
}
export function verifyAuditChain(chain: readonly AuditEvent[]): { ok: boolean; brokenAt: number | null } {
  let previous = GENESIS;
  for (const [index, event] of chain.entries()) {
    const expected = createHash("sha256").update(JSON.stringify([index + 1, event.at, event.actor, event.action, event.target, event.outcome, previous])).digest("hex");
    if (event.sequence !== index + 1 || event.previousHash !== previous || event.hash !== expected) return { ok: false, brokenAt: index + 1 };
    previous = event.hash;
  }
  return { ok: true, brokenAt: null };
}

// ---- Onay–içerik bağı ----
/** Onay, onaylandığı içeriğin özetine bağlı olmalı; içerik değişince onay geçersizleşir. */
export function verifyApprovalBinding(approval: { kind: string; recordSha256?: string } | null | undefined, currentRecordSha256: string): { valid: boolean; reason: string } {
  if (!approval || approval.kind !== "human") return { valid: false, reason: "no-human-approval" };
  if (!approval.recordSha256 || !/^[0-9a-f]{64}$/.test(approval.recordSha256)) return { valid: false, reason: "approval-not-bound-to-content" };
  return safeEqual(approval.recordSha256, currentRecordSha256) ? { valid: true, reason: "ok" } : { valid: false, reason: "content-changed-after-approval" };
}

// ---- Rota erişim kararı (proxy.ts tarafından kullanılır) ----
export const ADMIN_PREFIXES = ["/admin", "/yonetim", "/panel", "/editor", "/api/admin", "/api/editor"] as const;
export const isAdminPath = (pathname: string) => { const lower = pathname.toLowerCase(); return ADMIN_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(`${prefix}/`)); };
const ALWAYS_PUBLIC = ["/api/health"];

export type AccessDecision = { action: "allow"; headers?: Record<string, string> } | { action: "deny"; status: 401 | 404 | 503; reason: string; headers?: Record<string, string> };

/**
 * Kapalı-başarısız erişim kararı.
 * - Yönetim rotaları: kayıtlı gerçek sağlayıcı yoksa her ortamda 404 (varlığı da açığa vurulmaz).
 * - ASRIN_DEPLOY_ENV=preview: tüm site HTTP Basic ile korunur; kimlik bilgisi yapılandırılmamışsa 503.
 *   Parola düz metin tutulmaz: ASRIN_PREVIEW_PASSWORD_SHA256 (hex) ile karşılaştırılır.
 * - Önizlemede her yanıta X-Robots-Tag: noindex eklenir (erişim denetiminin YERİNE GEÇMEZ).
 */
export function decideAccess(pathname: string, authorization: string | null, env: Record<string, string | undefined>, provider: AuthenticationProvider | null = REGISTERED_PROVIDER): AccessDecision {
  if (isAdminPath(pathname) && !provider) return { action: "deny", status: 404, reason: "admin-disabled-no-provider" };
  if (env.ASRIN_DEPLOY_ENV !== "preview") return { action: "allow" };
  const noindex = { "X-Robots-Tag": "noindex, nofollow, noarchive" };
  if (ALWAYS_PUBLIC.includes(pathname)) return { action: "allow", headers: noindex };
  const user = env.ASRIN_PREVIEW_USER; const passwordHash = env.ASRIN_PREVIEW_PASSWORD_SHA256?.toLowerCase();
  if (!user || !passwordHash || !/^[0-9a-f]{64}$/.test(passwordHash)) return { action: "deny", status: 503, reason: "preview-auth-not-configured", headers: noindex };
  const challenge = { ...noindex, "WWW-Authenticate": 'Basic realm="Asrin Kemali onizleme", charset="UTF-8"', "Cache-Control": "no-store" };
  if (!authorization?.startsWith("Basic ")) return { action: "deny", status: 401, reason: "credentials-required", headers: challenge };
  let decoded = ""; try { decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8"); } catch { return { action: "deny", status: 401, reason: "bad-credentials", headers: challenge }; }
  const separator = decoded.indexOf(":");
  const givenUser = separator >= 0 ? decoded.slice(0, separator) : ""; const givenPassword = separator >= 0 ? decoded.slice(separator + 1) : "";
  const userOk = safeEqual(createHash("sha256").update(givenUser).digest("hex"), createHash("sha256").update(user).digest("hex"));
  const passwordOk = safeEqual(createHash("sha256").update(givenPassword).digest("hex"), passwordHash);
  return userOk && passwordOk ? { action: "allow", headers: noindex } : { action: "deny", status: 401, reason: "bad-credentials", headers: challenge };
}
