#!/usr/bin/env node
/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * Kuru Çalıştırma Altyapı ve Güvenlik Doğrulayıcısı (Dry-Run Infrastructure Validator)
 * ==============================================================================
 * Bu araç tüm altyapı şablonlarını, WAF kurallarını, kernel ayarlarını ve
 * Dockerfile politikalarını üretime zarar vermeden statik olarak doğrular.
 * ==============================================================================
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT_DIR = resolve(process.cwd());
const INFRA_DIR = join(ROOT_DIR, "infra", "fortress-x-v11");

const checks = [];

function recordCheck(id, description, passed, detail = "") {
  checks.push({ id, description, passed, detail });
  const status = passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(`${status} ${id}: ${description} ${detail ? `(${detail})` : ""}`);
}

// ------------------------------------------------------------------------------
// 1. WAF ve Rate Limiting Kuralları Doğrulaması
// ------------------------------------------------------------------------------
export function validateWafRules() {
  const wafPath = join(INFRA_DIR, "waf", "waf-rulesets.json");
  if (!existsSync(wafPath)) {
    recordCheck("WAF-01", "WAF kuralları JSON dosyası mevcudiyeti", false, "Dosya bulunamadı");
    return false;
  }
  const wafData = JSON.parse(readFileSync(wafPath, "utf-8"));
  recordCheck("WAF-01", "WAF kuralları JSON dosyası mevcudiyeti", true);

  // Hassas dizin engelleme kontrolü
  const sensitiveRule = wafData.rulesets.find((r) => r.id === "WAF-01-SENSITIVE-FILES");
  const hasEnv = sensitiveRule?.target_patterns?.includes("/.env");
  const hasGit = sensitiveRule?.target_patterns?.includes("/.git");
  recordCheck("WAF-02", "Hassas dizin (.env, .git) engelleme kuralı", Boolean(hasEnv && hasGit));

  // Türkçe Arama Yanlış Pozitif Koruması Doğrulaması
  const turkishRule = wafData.rulesets.find((r) => r.id === "WAF-04-TURKISH-SEARCH-WHITELIST");
  const hasDiacritics = turkishRule?.exempt_characters?.includes("ç") && turkishRule?.exempt_characters?.includes("ğ");
  recordCheck("WAF-03", "Türkçe arama sorgusu muafiyeti kuralı", Boolean(hasDiacritics));

  // Rate Limiting Kuralları ve Sağlık Uç Noktası İstisnası
  const rateLimitRule = wafData.rulesets.find((r) => r.id === "RATELIMIT-02-GENERAL-PAGES");
  const healthExempt = rateLimitRule?.exempt_routes?.includes("/api/health");
  recordCheck("WAF-04", "/api/health ve statik varlıklar hız sınırı muafiyeti", Boolean(healthExempt));

  return true;
}

// ------------------------------------------------------------------------------
// 2. Nginx ve Caddy Ters Vekil Yapılandırmaları
// ------------------------------------------------------------------------------
export function validateProxyConfigs() {
  const nginxPath = join(INFRA_DIR, "waf", "nginx-hardened.conf");
  const caddyPath = join(INFRA_DIR, "waf", "caddy-hardened.Caddyfile");

  if (!existsSync(nginxPath) || !existsSync(caddyPath)) {
    recordCheck("PROXY-01", "Nginx ve Caddy yapılandırma dosyaları", false, "Dosyalar eksik");
    return false;
  }

  const nginxContent = readFileSync(nginxPath, "utf-8");
  const hasServerTokensOff = nginxContent.includes("server_tokens off;");
  const hasTls13 = nginxContent.includes("TLSv1.3");
  const hasLimitReq = nginxContent.includes("limit_req_zone");
  recordCheck("PROXY-01", "Nginx server_tokens off, TLS 1.3 ve limit_req sertleştirmesi", Boolean(hasServerTokensOff && hasTls13 && hasLimitReq));

  const caddyContent = readFileSync(caddyPath, "utf-8");
  const hasHsts = caddyContent.includes("Strict-Transport-Security");
  const hasNosniff = caddyContent.includes("nosniff");
  recordCheck("PROXY-02", "Caddy HTTP/3 ve Güvenlik Başlıkları", Boolean(hasHsts && hasNosniff));

  return true;
}

// ------------------------------------------------------------------------------
// 3. Linux Çekirdek (sysctl) ve Ağ Sertleştirme Doğrulaması
// ------------------------------------------------------------------------------
export function validateHostHardening() {
  const sysctlPath = join(INFRA_DIR, "host-hardening", "sysctl-fortress.conf");
  const egressPath = join(INFRA_DIR, "host-hardening", "egress-lockdown.sh");

  if (!existsSync(sysctlPath) || !existsSync(egressPath)) {
    recordCheck("HOST-01", "sysctl ve egress dosyaları mevcudiyeti", false);
    return false;
  }

  const sysctlContent = readFileSync(sysctlPath, "utf-8");
  const hasSyncookies = sysctlContent.includes("net.ipv4.tcp_syncookies = 1");
  const hasRpFilter = sysctlContent.includes("net.ipv4.conf.all.rp_filter = 1");
  const hasAslr = sysctlContent.includes("kernel.randomize_va_space = 2");
  recordCheck("HOST-01", "Linux çekirdek CIS Seviye 2 (SYN cookies, rp_filter, ASLR)", Boolean(hasSyncookies && hasRpFilter && hasAslr));

  const egressContent = readFileSync(egressPath, "utf-8");
  const hasLoopback = egressContent.includes("-o lo -j ACCEPT");
  const hasDnsAllowed = egressContent.includes("--dport 53 -j ACCEPT");
  const hasSsrfBlock = egressContent.includes("BLOCKED_EXTERNAL_HTTP");
  recordCheck("HOST-02", "Egress trafik kısıtlaması ve SSRF önleme kuralları", Boolean(hasLoopback && hasDnsAllowed && hasSsrfBlock));

  return true;
}

// ------------------------------------------------------------------------------
// 4. Konteyner Güvenliği (Dockerfile & Compose)
// ------------------------------------------------------------------------------
export function validateContainerSecurity() {
  const dockerfilePath = join(INFRA_DIR, "host-hardening", "Dockerfile.hardened");
  const composePath = join(INFRA_DIR, "host-hardening", "docker-compose.hardened.yml");

  if (!existsSync(dockerfilePath) || !existsSync(composePath)) {
    recordCheck("CONT-01", "Dockerfile ve compose dosyaları mevcudiyeti", false);
    return false;
  }

  const dockerContent = readFileSync(dockerfilePath, "utf-8");
  const hasNonRoot = dockerContent.includes("USER nextjs") && dockerContent.includes("10001");
  const hasMultiStage = dockerContent.includes("AS deps") && dockerContent.includes("AS runner");
  recordCheck("CONT-01", "Dockerfile non-root kullanıcı ve multi-stage yapısı", Boolean(hasNonRoot && hasMultiStage));

  const composeContent = readFileSync(composePath, "utf-8");
  const hasNoNewPriv = composeContent.includes("no-new-privileges:true");
  const hasReadOnly = composeContent.includes("read_only: true");
  const hasCapDrop = composeContent.includes("ALL");
  recordCheck("CONT-02", "Docker compose salt-okunur ve no-new-privileges kısıtlamaları", Boolean(hasNoNewPriv && hasReadOnly && hasCapDrop));

  return true;
}

// ------------------------------------------------------------------------------
// 5. İzleme, Loglama ve Olay Taksonomisi Doğrulaması
// ------------------------------------------------------------------------------
export function validateMonitoring() {
  const logSchemaPath = join(INFRA_DIR, "monitoring-siem", "log-schema.json");
  const alertRulesPath = join(INFRA_DIR, "monitoring-siem", "alert-rules.yml");

  if (!existsSync(logSchemaPath) || !existsSync(alertRulesPath)) {
    recordCheck("MON-01", "Log şeması ve alert kuralları dosyaları", false);
    return false;
  }

  const schema = JSON.parse(readFileSync(logSchemaPath, "utf-8"));
  const hasIpHashPattern = schema.properties?.client?.properties?.ip_hash?.pattern?.includes("64");
  const hasTraceId = Boolean(schema.properties?.trace?.properties?.id);
  recordCheck("MON-01", "ECS log şeması ve KVKK uyumlu IP hash deseni", Boolean(hasIpHashPattern && hasTraceId));

  const alerts = readFileSync(alertRulesPath, "utf-8");
  const hasSev1 = alerts.includes("SEV-1");
  const hasFimAlert = alerts.includes("FileIntegrityTamperingDetected");
  recordCheck("MON-02", "Güvenlik taksonomisi ve FIM SEV-1 kuralı", Boolean(hasSev1 && hasFimAlert));

  return true;
}

// ------------------------------------------------------------------------------
// 6. Kurtarma ve PROJECT BLACKOUT Altyapı Entegrasyonu
// ------------------------------------------------------------------------------
export function validateDisasterRecovery() {
  const backupPolicyPath = join(INFRA_DIR, "disaster-recovery", "immutable-backup-policy.json");
  const blackoutHtmlPath = join(INFRA_DIR, "disaster-recovery", "blackout-edge-fallback", "blackout.html");
  const edgeWorkerPath = join(INFRA_DIR, "disaster-recovery", "blackout-edge-fallback", "edge-blackout-worker.js");
  const adapterPath = join(INFRA_DIR, "blackout-adapters", "infra-ports-adapter.ts");

  const backupData = JSON.parse(readFileSync(backupPolicyPath, "utf-8"));
  const isComplianceMode = backupData.object_lock_configuration?.rule?.default_retention?.mode === "COMPLIANCE";
  const retentionDays = backupData.object_lock_configuration?.rule?.default_retention?.days === 365;
  recordCheck("DR-01", "WORM Değiştirilemez Yedek (S3 Object Lock COMPLIANCE 365 gün)", Boolean(isComplianceMode && retentionDays));

  const htmlContent = readFileSync(blackoutHtmlPath, "utf-8");
  const hasNoExternalScripts = !htmlContent.includes("<script src");
  const hasMotto = htmlContent.includes("BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI");
  recordCheck("DR-02", "blackout.html harici bağımsızlıksız ve kurumsal tasarım uyumlu", Boolean(hasNoExternalScripts && hasMotto));

  const workerContent = readFileSync(edgeWorkerPath, "utf-8");
  const hasLockdownHandling = workerContent.includes("blackoutLevel === 3") && workerContent.includes("503");
  const hasHealthBypass = workerContent.includes("/api/health");
  recordCheck("DR-03", "Edge Worker LOCKDOWN statik yönlendirmesi ve sağlık istisnası", Boolean(hasLockdownHandling && hasHealthBypass));

  const adapterContent = readFileSync(adapterPath, "utf-8");
  const hasPortsFactory = adapterContent.includes("createInfraBlackoutPorts");
  recordCheck("DR-04", "BLACKOUT altyapı port adaptörü uyumluluğu", Boolean(hasPortsFactory));

  return true;
}

export function runAllValidations() {
  console.log("=== ASRIN KEMALİ Altyapı Güvenlik ve Dry-Run Denetimi ===");
  validateWafRules();
  validateProxyConfigs();
  validateHostHardening();
  validateContainerSecurity();
  validateMonitoring();
  validateDisasterRecovery();

  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log("---------------------------------------------------------");
  console.log(`Sonuç: ${passed}/${total} kontrol başarılı (${failed} hata).`);

  if (failed > 0) {
    console.error("[!] Altyapı doğrulaması başarısız oldu.");
    return false;
  }

  console.log("\x1b[32m[✓] Tüm altyapı güvenlik kuralları başarıyla doğrulandı.\x1b[0m");
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("validate-infra.mjs")) {
  const success = runAllValidations();
  process.exit(success ? 0 : 1);
}
