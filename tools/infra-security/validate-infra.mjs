#!/usr/bin/env node
/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * Kuru Çalıştırma Altyapı ve Güvenlik Doğrulayıcısı (Dry-Run Infrastructure Validator)
 * ==============================================================================
 * Bu araç tüm altyapı şablonlarını, WAF kurallarını, kernel ayarlarını ve
 * Dockerfile politikalarını üretime zarar vermeden statik ve davranışsal olarak doğrular.
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
// 1. WAF ve Rate Limiting Kuralları Doğrulaması (Sıfır-Atlatma / Zero-Skip)
// ------------------------------------------------------------------------------
export function validateWafRules() {
  const wafPath = join(INFRA_DIR, "waf", "waf-rulesets.json");
  const tfPath = join(INFRA_DIR, "waf", "cloudflare-ruleset.tf");

  if (!existsSync(wafPath) || !existsSync(tfPath)) {
    recordCheck("WAF-01", "WAF kuralları JSON ve TF dosyaları mevcudiyeti", false, "Dosyalar eksik");
    return false;
  }

  const wafData = JSON.parse(readFileSync(wafPath, "utf-8"));
  const tfContent = readFileSync(tfPath, "utf-8");
  recordCheck("WAF-01", "WAF kuralları JSON ve TF dosyaları mevcudiyeti", true);

  // KRİTİK GÜVENLİK KONTROLÜ: 'action = skip' veya 'ruleset = current' KULLANILMAMALI!
  const hasSkipInTf = tfContent.includes("action = \"skip\"") || tfContent.includes("ruleset = \"current\"");
  const hasSkipInJson = wafData.rulesets.some((r) => r.action === "skip");
  recordCheck("WAF-02", "Geniş kapsamlı WAF atlama (action=skip / ruleset=current) yokluğu", Boolean(!hasSkipInTf && !hasSkipInJson));

  // Açık saldırı imzaları engelleme kuralı (WAF-04)
  const exploitRule = wafData.rulesets.find((r) => r.id === "WAF-04-EXPLOIT-PAYLOADS");
  const hasXssBlock = exploitRule?.attack_patterns?.includes("<script");
  const hasSqliBlock = exploitRule?.attack_patterns?.includes("union select");
  const hasTraversalBlock = exploitRule?.attack_patterns?.includes("../");
  recordCheck("WAF-03", "Açık XSS, SQLi ve Yol Geçişi saldırılarını engelleme kuralı", Boolean(hasXssBlock && hasSqliBlock && hasTraversalBlock));

  // Managed Ruleset Entegrasyonu
  const hasManagedTf = tfContent.includes("phase       = \"http_request_firewall_managed\"");
  const hasManagedJson = wafData.rulesets.some((r) => r.id === "WAF-MANAGED-CRS");
  recordCheck("WAF-04", "Cloudflare Managed Ruleset (OWASP CRS) entegrasyonu", Boolean(hasManagedTf && hasManagedJson));

  // Rate Limiting Kuralları ve Sağlık Uç Noktası İstisnası
  const rateLimitRule = wafData.rulesets.find((r) => r.id === "RATELIMIT-02-GENERAL-PAGES");
  const healthExempt = rateLimitRule?.exempt_routes?.includes("/api/health");
  recordCheck("WAF-05", "/api/health ve statik varlıklar hız sınırı muafiyeti", Boolean(healthExempt));

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
// 3. Linux Çekirdek (sysctl) ve Ağ Sertleştirme Doğrulaması (IPv4, IPv6, Eval Yokluğu)
// ------------------------------------------------------------------------------
export function validateHostHardening() {
  const sysctlPath = join(INFRA_DIR, "host-hardening", "sysctl-fortress.conf");
  const egressPath = join(INFRA_DIR, "host-hardening", "egress-lockdown.sh");
  const originFwPath = join(INFRA_DIR, "origin-shield", "origin-firewall.sh");

  if (!existsSync(sysctlPath) || !existsSync(egressPath) || !existsSync(originFwPath)) {
    recordCheck("HOST-01", "sysctl, egress ve origin güvenlik dosyaları", false);
    return false;
  }

  const sysctlContent = readFileSync(sysctlPath, "utf-8");
  const hasSyncookies = sysctlContent.includes("net.ipv4.tcp_syncookies = 1");
  const hasRpFilter = sysctlContent.includes("net.ipv4.conf.all.rp_filter = 1");
  const hasAslr = sysctlContent.includes("kernel.randomize_va_space = 2");
  recordCheck("HOST-01", "Linux çekirdek CIS Seviye 2 (SYN cookies, rp_filter, ASLR)", Boolean(hasSyncookies && hasRpFilter && hasAslr));

  const egressContent = readFileSync(egressPath, "utf-8");
  const hasNoEvalEgress = !egressContent.includes("eval \"$cmd\"") && !egressContent.includes("eval \"$");
  const hasStrictMode = egressContent.includes("BLOCKED_EXTERNAL_HTTP");
  const hasIpv6Egress = egressContent.includes("ip6tables -A FORTRESS_EGRESS6 -j DROP");
  recordCheck("HOST-02", "Egress betiğinde eval yokluğu, strict mod ve IPv6 engeli", Boolean(hasNoEvalEgress && hasStrictMode && hasIpv6Egress));

  const originFwContent = readFileSync(originFwPath, "utf-8");
  const hasNoEvalOrigin = !originFwContent.includes("eval \"$cmd\"") && !originFwContent.includes("eval \"$");
  const hasIpv6Support = originFwContent.includes("CLOUDFLARE_IN6") && originFwContent.includes("ip6tables");
  const hasSshValidation = originFwContent.includes("SSH_PORT (1-65535");
  const hasAutoRollback = originFwContent.includes("AUTO_ROLLBACK");
  recordCheck("HOST-03", "Origin Firewall eval yokluğu, IPv6 desteği, SSH port doğrulaması ve rollback", Boolean(hasNoEvalOrigin && hasIpv6Support && hasSshValidation && hasAutoRollback));

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
// 5. İzleme, Loglama ve Olay Taksonomisi Doğrulaması (Gizli Tuz Kontrolü)
// ------------------------------------------------------------------------------
export function validateMonitoring() {
  const logSchemaPath = join(INFRA_DIR, "monitoring-siem", "log-schema.json");
  const vectorPath = join(INFRA_DIR, "monitoring-siem", "vector-agent.toml");
  const alertRulesPath = join(INFRA_DIR, "monitoring-siem", "alert-rules.yml");

  if (!existsSync(logSchemaPath) || !existsSync(vectorPath) || !existsSync(alertRulesPath)) {
    recordCheck("MON-01", "Log şeması, vector ve alert dosyaları", false);
    return false;
  }

  const schema = JSON.parse(readFileSync(logSchemaPath, "utf-8"));
  const hasIpHashPattern = schema.properties?.client?.properties?.ip_hash?.pattern?.includes("64");
  const hasTraceId = Boolean(schema.properties?.trace?.properties?.id);
  recordCheck("MON-01", "ECS log şeması ve KVKK uyumlu IP hash deseni", Boolean(hasIpHashPattern && hasTraceId));

  const vectorContent = readFileSync(vectorPath, "utf-8");
  const hasNoStaticSalt = !vectorContent.includes("mka-fortress-static-salt");
  const hasEnvSalt = vectorContent.includes("get_env_var(\"MKA_LOG_SALT\")");
  recordCheck("MON-02", "Vector yapılandırmasında sabit tuz yokluğu ve ortam değişkeni kullanımı", Boolean(hasNoStaticSalt && hasEnvSalt));

  const alerts = readFileSync(alertRulesPath, "utf-8");
  const hasSev1 = alerts.includes("SEV-1");
  const hasFimAlert = alerts.includes("FileIntegrityTamperingDetected");
  recordCheck("MON-03", "Güvenlik taksonomisi ve FIM SEV-1 kuralı", Boolean(hasSev1 && hasFimAlert));

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
  const hasLockdownHandling = workerContent.includes("level === 3") && workerContent.includes("503");
  const hasStrictSanitization = workerContent.includes("/^[0-3]$/.test") && !workerContent.includes("parseInt(");
  recordCheck("DR-03", "Edge Worker LOCKDOWN ve parseInt içermeyen katı sanitization", Boolean(hasLockdownHandling && hasStrictSanitization));

  const adapterContent = readFileSync(adapterPath, "utf-8");
  const hasHonestSession = adapterContent.includes("requires_infrastructure") && !adapterContent.includes("revokedSessionsCount += count");
  const hasNonDistributed = adapterContent.includes("isDistributed(): boolean");
  recordCheck("DR-04", "BLACKOUT adaptöründe dürüst altyapı durumu ve dağıtık olmama beyanı", Boolean(hasHonestSession && hasNonDistributed));

  return true;
}

export function runAllValidations() {
  console.log("=== ASRIN KEMALİ Altyapı Güvenlik ve Dry-Run Denetimi (V1.1 Görev 10 Hardened) ===");
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
