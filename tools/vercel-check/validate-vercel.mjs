#!/usr/bin/env node
/**
 * ==============================================================================
 * ASRIN KEMALİ — Vercel Yapılandırması ve Güvenlik Hazırlığı Doğrulayıcısı
 * ==============================================================================
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT_DIR = process.cwd();
const WEB_DIR = join(ROOT_DIR, "web");
const DOCS_DIR = join(ROOT_DIR, "docs", "vercel");

const checks = [];

function recordCheck(id, description, passed, detail = "") {
  checks.push({ id, description, passed, detail });
  const mark = passed ? "[PASS]" : "[FAIL]";
  console.log(`${mark} ${id}: ${description} ${detail ? `(${detail})` : ""}`);
}

export function validateVercelConfig() {
  const vercelJsonPath = join(WEB_DIR, "vercel.json");
  if (!existsSync(vercelJsonPath)) {
    recordCheck("VCL-01", "web/vercel.json dosyasının mevcudiyeti", false, "Dosya bulunamadı");
    return false;
  }

  const vercelData = JSON.parse(readFileSync(vercelJsonPath, "utf-8"));
  const hasFramework = vercelData.framework === "nextjs";
  const hasCleanUrls = vercelData.cleanUrls === true;
  const hasBuildCmd = vercelData.buildCommand === "next build";
  recordCheck("VCL-01", "web/vercel.json framework (nextjs) ve build yapılandırması", Boolean(hasFramework && hasCleanUrls && hasBuildCmd));

  const nextConfigPath = join(WEB_DIR, "next.config.ts");
  const nextConfig = readFileSync(nextConfigPath, "utf-8");
  const hasNoPoweredBy = nextConfig.includes("poweredByHeader: false");
  const hasSecurityHeaders = nextConfig.includes("securityHeaders(headerOptions)");
  recordCheck("VCL-02", "Next.js poweredByHeader: false ve güvenlik başlıkları entegrasyonu", Boolean(hasNoPoweredBy && hasSecurityHeaders));

  const headersPath = join(WEB_DIR, "lib", "security", "headers.ts");
  const headersContent = readFileSync(headersPath, "utf-8");
  const hasCsp = headersContent.includes("frame-ancestors") && headersContent.includes("'none'");
  const hasNosniff = headersContent.includes("nosniff");
  const hasHsts = headersContent.includes("Strict-Transport-Security");
  recordCheck("VCL-03", "Kapsamlı CSP, nosniff ve koşullu HSTS politikası", Boolean(hasCsp && hasNosniff && hasHsts));

  const accessContractPath = join(WEB_DIR, "lib", "security", "access-contract.ts");
  const accessContract = readFileSync(accessContractPath, "utf-8");
  const hasPreviewGuard = accessContract.includes('env.VERCEL_ENV === "preview"') && accessContract.includes('ASRIN_DEPLOY_ENV === "preview"');
  const hasPreview503 = accessContract.includes("preview-auth-not-configured") && accessContract.includes("503");
  const hasNoindex = accessContract.includes("X-Robots-Tag") && accessContract.includes("noindex");
  recordCheck("VCL-04", "Preview fail-closed (503) koruması ve Vercel VERCEL_ENV algılama", Boolean(hasPreviewGuard && hasPreview503 && hasNoindex));

  const guidePath = join(DOCS_DIR, "VERCEL-DEPLOYMENT-GUIDE.md");
  if (!existsSync(guidePath)) {
    recordCheck("VCL-05", "Vercel ve Natro dağıtım rehberi mevcudiyeti", false, "Rehber eksik");
    return false;
  }
  const guideContent = readFileSync(guidePath, "utf-8");
  const hasApexA = guideContent.includes("76.76.21.21");
  const hasCname = guideContent.includes("cname.vercel-dns.com");
  const hasTxt = guideContent.includes("_vercel");
  const hasNatroSteps = guideContent.includes("Natro DNS Panelinde Kayıt Giriş Adımları");
  recordCheck("VCL-05", "Natro DNS A (76.76.21.21), CNAME ve TXT doğrulaması kılavuzu", Boolean(hasApexA && hasCname && hasTxt && hasNatroSteps));

  // VCL-06: Dokümantasyonda sabit/kırılabilir parola özeti bulunmaması kontrolü
  const hasNoHardcodedHash = !guideContent.includes("4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945");
  recordCheck("VCL-06", "Dokümantasyonda sabit parola özeti bulunmaması (placeholder kullanımı)", Boolean(hasNoHardcodedHash));

  // VCL-07: Monorepo üst dizin erişimi (content/ ve data/ mevcudiyeti)
  const hasContentDir = existsSync(join(ROOT_DIR, "content", "archive", "records"));
  const hasDataDir = existsSync(join(ROOT_DIR, "data", "archive", "catalog"));
  const guideMentionsIncludeSource = guideContent.includes("Include source files outside of the Root Directory");
  recordCheck("VCL-07", "Monorepo arşiv/veri dizinleri mevcudiyeti ve Vercel Root Directory ayar beyanı", Boolean(hasContentDir && hasDataDir && guideMentionsIncludeSource));

  return checks.every((c) => c.passed);
}

export function runAllValidations() {
  console.log("=== ASRIN KEMALİ Vercel & Domain Dağıtım Hazırlığı Denetimi ===");
  const ok = validateVercelConfig();
  const passedCount = checks.filter((c) => c.passed).length;
  console.log("---------------------------------------------------------");
  console.log(`Sonuç: ${passedCount}/${checks.length} kontrol başarılı.`);
  if (ok) {
    console.log("[✓] Tüm Vercel dağıtım hazırlıkları ve güvenlik sözleşmeleri doğrulandı.");
  } else {
    console.log("[!] Bazı kontroller başarısız oldu.");
  }
  return ok;
}

if (process.argv[1]?.endsWith("validate-vercel.mjs")) {
  const success = runAllValidations();
  process.exit(success ? 0 : 1);
}
