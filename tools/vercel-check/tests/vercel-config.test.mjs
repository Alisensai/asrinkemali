import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validateVercelConfig, runAllValidations } from "../validate-vercel.mjs";
import { decideAccess } from "../../../web/lib/security/access-contract.ts";
import { securityHeaders, headerOptionsFromEnv } from "../../../web/lib/security/headers.ts";

describe("ASRIN KEMALİ — Vercel ve Resmî Domain Yapılandırma Testleri", () => {
  describe("1. Vercel Yapılandırma Dosyası Doğrulaması", () => {
    test("web/vercel.json: Şemaya uygun olmalı ve Next.js framework parametresi içermeli", () => {
      const vercelJsonPath = join(process.cwd(), "web", "vercel.json");
      assert.ok(existsSync(vercelJsonPath), "web/vercel.json mevcut olmalı");

      const config = JSON.parse(readFileSync(vercelJsonPath, "utf-8"));
      assert.equal(config.framework, "nextjs");
      assert.equal(config.cleanUrls, true);
      assert.equal(config.trailingSlash, false);
      assert.equal(config.buildCommand, "next build");
      assert.equal(config.installCommand, "npm ci");
    });
  });

  describe("2. Gizli Preview Test Ortamı Güvenlik Sözleşmesi", () => {
    test("decideAccess: ASRIN_DEPLOY_ENV=preview durumunda yapılandırılmamışsa fail-closed (503) dönmeli", () => {
      const emptyEnv = { ASRIN_DEPLOY_ENV: "preview" };
      const decision = decideAccess("/", null, emptyEnv);

      assert.equal(decision.action, "deny");
      assert.equal(decision.status, 503);
      assert.equal(decision.reason, "preview-auth-not-configured");
      assert.match(decision.headers["X-Robots-Tag"], /noindex/);
    });

    test("decideAccess: Preview ortamında yetkisiz istekler 401 ve WWW-Authenticate Basic almalı", () => {
      const configuredEnv = {
        ASRIN_DEPLOY_ENV: "preview",
        ASRIN_PREVIEW_USER: "onizleme",
        ASRIN_PREVIEW_PASSWORD_SHA256: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      };

      const unauthenticated = decideAccess("/", null, configuredEnv);
      assert.equal(unauthenticated.action, "deny");
      assert.equal(unauthenticated.status, 401);
      assert.ok(unauthenticated.headers["WWW-Authenticate"].includes("Basic"));
      assert.match(unauthenticated.headers["X-Robots-Tag"], /noindex/);
    });

    test("decideAccess: Preview ortamında bile platform canlılık denetimi (/api/health) açık kalmalı", () => {
      const configuredEnv = {
        ASRIN_DEPLOY_ENV: "preview",
        ASRIN_PREVIEW_USER: "onizleme",
        ASRIN_PREVIEW_PASSWORD_SHA256: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      };

      const healthCheck = decideAccess("/api/health", null, configuredEnv);
      assert.equal(healthCheck.action, "allow");
      assert.match(healthCheck.headers["X-Robots-Tag"], /noindex/);
    });
  });

  describe("3. HTTP Güvenlik Başlıkları ve CSP Testleri", () => {
    test("securityHeaders: frame-ancestors 'none', nosniff ve katı politikalar üretmeli", () => {
      const opts = headerOptionsFromEnv({ NODE_ENV: "production", ASRIN_CSP_MODE: "enforce", ASRIN_ENABLE_HSTS: "1" });
      const headers = securityHeaders(opts);

      const headerMap = Object.fromEntries(headers.map((h) => [h.key, h.value]));
      assert.equal(headerMap["X-Frame-Options"], "DENY");
      assert.equal(headerMap["X-Content-Type-Options"], "nosniff");
      assert.equal(headerMap["Cross-Origin-Opener-Policy"], "same-origin");
      assert.ok(headerMap["Content-Security-Policy"].includes("frame-ancestors 'none'"));
      assert.ok(headerMap["Content-Security-Policy"].includes("object-src 'none'"));
      assert.ok(headerMap["Strict-Transport-Security"].includes("max-age=31536000"));
    });
  });

  describe("4. Natro DNS ve Alan Adı Kılavuzu Doğrulaması", () => {
    test("VERCEL-DEPLOYMENT-GUIDE.md: Gerçek Vercel A (76.76.21.21) ve CNAME kayıtlarını içermeli", () => {
      const guidePath = join(process.cwd(), "docs", "vercel", "VERCEL-DEPLOYMENT-GUIDE.md");
      assert.ok(existsSync(guidePath), "Rehber dosyası mevcut olmalı");

      const guide = readFileSync(guidePath, "utf-8");
      assert.ok(guide.includes("76.76.21.21"), "Vercel Anycast A kaydı bulunmalı");
      assert.ok(guide.includes("cname.vercel-dns.com"), "Vercel CNAME kaydı bulunmalı");
      assert.ok(guide.includes("asrinkemali.com.tr"), "Resmî alan adı bulunmalı");
      assert.ok(guide.includes("Natro"), "Natro sağlayıcı yönergeleri bulunmalı");
      assert.ok(guide.includes("HENÜZ DEĞİŞTİRMEYİN"), "Erken DNS yönlendirmesi engeli uyarısı bulunmalı");
    });
  });

  describe("5. Kapsamlı Validator Testi", () => {
    test("validateVercelConfig: Tüm dağıtım kontrolleri başarıyla geçmeli", () => {
      const result = runAllValidations();
      assert.equal(result, true);
    });
  });
});
