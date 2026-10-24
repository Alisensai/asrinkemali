import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { appendAuditEvent, authorize, decideAccess, isAdminPath, REGISTERED_PROVIDER, validateSession, validateSessionCookie, verifyApprovalBinding, verifyAuditChain, verifyCsrf } from "../lib/security/access-contract.ts";

const now = Date.parse("2026-10-23T12:00:00Z");
const session = (overrides = {}) => ({ subject: "editor-1", roles: ["editor"], issuedAt: now - 60_000, expiresAt: now + 3_600_000, authenticatedVia: "oidc", mfa: true, ...overrides });
const sha = (value) => createHash("sha256").update(value).digest("hex");
const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
const previewEnv = { ASRIN_DEPLOY_ENV: "preview", ASRIN_PREVIEW_USER: "onizleme", ASRIN_PREVIEW_PASSWORD_SHA256: sha("guclu-ve-uzun-parola") };

test("kayıtlı kimlik sağlayıcı yok: yönetim rotaları her ortamda 404 (kapalı-başarısız)", () => {
  assert.equal(REGISTERED_PROVIDER, null);
  for (const env of [{}, { ASRIN_DEPLOY_ENV: "production" }, previewEnv, { ASRIN_AUTH_PROVIDER: "oidc", ASRIN_ADMIN_ENABLED: "1" }]) {
    for (const path of ["/admin", "/admin/kullanicilar", "/ADMIN", "/yonetim", "/api/admin/publish", "/panel/x", "/editor"]) {
      const decision = decideAccess(path, basic("onizleme", "guclu-ve-uzun-parola"), env);
      assert.equal(decision.action, "deny", `${path} ${JSON.stringify(env)}`); assert.equal(decision.status, 404);
    }
  }
  assert.equal(isAdminPath("/administrasyon-hakkinda"), false, "önek eşleşmesi yol segmenti düzeyinde olmalı");
});

test("varsayılan ortamda normal sayfalar etkilenmez", () => {
  for (const path of ["/", "/ataturk", "/arsiv/anitkabir", "/api/health"]) assert.deepEqual(decideAccess(path, null, {}), { action: "allow" });
});

test("önizleme: kimlik bilgisi yapılandırılmamışsa tüm site 503 (açık kalmaz)", () => {
  for (const env of [{ ASRIN_DEPLOY_ENV: "preview" }, { ...previewEnv, ASRIN_PREVIEW_PASSWORD_SHA256: "kisa" }, { ...previewEnv, ASRIN_PREVIEW_USER: "" }]) {
    const decision = decideAccess("/", null, env);
    assert.equal(decision.status, 503); assert.match(decision.headers["X-Robots-Tag"], /noindex/);
  }
});

test("önizleme: doğru kimlik bilgisi geçer, eksik/yanlış/bozuk olan 401 alır; noindex her yanıtta", () => {
  assert.equal(decideAccess("/ataturk", basic("onizleme", "guclu-ve-uzun-parola"), previewEnv).action, "allow");
  assert.match(decideAccess("/ataturk", basic("onizleme", "guclu-ve-uzun-parola"), previewEnv).headers["X-Robots-Tag"], /noindex/);
  for (const header of [null, basic("onizleme", "yanlis"), basic("baskasi", "guclu-ve-uzun-parola"), "Basic %%%", "Bearer abc", basic("onizleme:guclu-ve-uzun-parola", "")]) {
    const decision = decideAccess("/ataturk", header, previewEnv);
    assert.equal(decision.status, 401, String(header)); assert.match(decision.headers["WWW-Authenticate"], /Basic/);
  }
  assert.equal(decideAccess("/api/health", null, previewEnv).action, "allow", "platform canlılık denetimi açık kalır");
});

test("oturum doğrulama: süresi dolmuş, gelecekte verilmiş, aşırı uzun veya öznesiz oturum reddedilir", () => {
  assert.equal(validateSession(session(), now).valid, true);
  assert.equal(validateSession(null, now).reason, "no-session");
  assert.equal(validateSession(session({ expiresAt: now - 1 }), now).reason, "expired");
  assert.equal(validateSession(session({ issuedAt: now + 3_600_000 }), now).reason, "issued-in-future");
  assert.equal(validateSession(session({ expiresAt: now + 48 * 3_600_000 }), now).reason, "lifetime-too-long");
  assert.equal(validateSession(session({ subject: " " }), now).reason, "no-subject");
});

test("RBAC: yetkisiz rol, MFA eksikliği, kendi içeriğini onaylama ve bilinmeyen rol reddedilir", () => {
  assert.equal(authorize(session(), "publication.approve", now).allowed, true);
  assert.equal(authorize(session({ roles: ["contributor"] }), "publication.approve", now).reason, "permission-denied");
  assert.equal(authorize(session({ roles: ["admin"] }), "publication.approve", now).reason, "permission-denied", "admin içerik onaylayamaz (görev ayrılığı)");
  assert.equal(authorize(session({ mfa: false }), "publication.approve", now).reason, "mfa-required");
  assert.equal(authorize(session(), "publication.approve", now, { resourceAuthor: "editor-1" }).reason, "self-approval");
  assert.equal(authorize(session({ roles: ["superuser"] }), "users.manage", now).allowed, false);
  assert.equal(authorize(session({ roles: ["historian"] }), "review.submit_expert", now).allowed, true);
  assert.equal(authorize(session({ roles: ["editor"] }), "review.submit_expert", now).allowed, false, "editör uzman incelemesi yerine geçemez");
  assert.equal(authorize(null, "audit.read", now).allowed, false);
});

test("CSRF: güvenli yöntem geçer; farklı köken, eksik veya eşleşmeyen belirteç reddedilir", () => {
  const token = "a".repeat(40); const expectedOrigin = "https://onizleme.example.org";
  assert.equal(verifyCsrf({ method: "GET", expectedOrigin }).ok, true);
  assert.equal(verifyCsrf({ method: "POST", origin: expectedOrigin, expectedOrigin, headerToken: token, cookieToken: token }).ok, true);
  assert.equal(verifyCsrf({ method: "POST", origin: "https://kotu.example", expectedOrigin, headerToken: token, cookieToken: token }).reason, "origin-mismatch");
  assert.equal(verifyCsrf({ method: "POST", expectedOrigin, headerToken: token, cookieToken: token }).reason, "origin-mismatch");
  assert.equal(verifyCsrf({ method: "POST", referer: `${expectedOrigin}/admin`, expectedOrigin, headerToken: token, cookieToken: token }).ok, true);
  assert.equal(verifyCsrf({ method: "DELETE", origin: expectedOrigin, expectedOrigin, headerToken: token, cookieToken: "b".repeat(40) }).reason, "token-mismatch");
  assert.equal(verifyCsrf({ method: "POST", origin: expectedOrigin, expectedOrigin, headerToken: "kisa", cookieToken: "kisa" }).reason, "token-missing");
});

test("oturum çerezi politikası: __Host-, Secure, HttpOnly, SameSite=Strict, Path=/ ve Domain yok", () => {
  assert.equal(validateSessionCookie("__Host-mka=abc; Path=/; Secure; HttpOnly; SameSite=Strict").ok, true);
  assert.deepEqual(validateSessionCookie("mka=abc; Domain=example.org; SameSite=Lax").missing, ["__Host- öneki", "Secure", "HttpOnly", "SameSite=Strict", "Path=/", "Domain belirtilmemeli"]);
});

test("denetim kaydı hash zinciri değiştirme, silme ve araya eklemeyi yakalar", () => {
  let chain = [];
  for (const action of ["login", "publication.approve", "logout"]) chain = appendAuditEvent(chain, { at: "2026-10-23T12:00:00Z", actor: "editor-1", action, target: "yazi-1", outcome: "allowed" });
  assert.deepEqual(verifyAuditChain(chain), { ok: true, brokenAt: null });
  assert.equal(verifyAuditChain(chain.map((event, index) => index === 1 ? { ...event, actor: "baskasi" } : event)).brokenAt, 2);
  assert.equal(verifyAuditChain([chain[0], chain[2]]).ok, false);
});

test("onay–içerik bağı: onaydan sonra değişen veya geriye tarihli sahte onay geçersizdir", () => {
  const content = sha("kayit-v1");
  assert.equal(verifyApprovalBinding({ kind: "human", recordSha256: content }, content).valid, true);
  assert.equal(verifyApprovalBinding({ kind: "human", recordSha256: content }, sha("kayit-v2")).reason, "content-changed-after-approval");
  assert.equal(verifyApprovalBinding({ kind: "human" }, content).reason, "approval-not-bound-to-content", "geçmiş tarihli ama içeriğe bağlanmamış onay kabul edilmez");
  assert.equal(verifyApprovalBinding({ kind: "ai", recordSha256: content }, content).reason, "no-human-approval");
});
