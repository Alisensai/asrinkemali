import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { computeSha256, generateManifest, verifyManifest } from "../fim.mjs";
import {
  runAllValidations,
  validateWafRules,
  validateHostHardening,
  validateContainerSecurity,
  validateMonitoring,
  validateDisasterRecovery
} from "../validate-infra.mjs";
import {
  createInfraBlackoutPorts,
  InfraSessionRevoker,
  ProcessLocalStateStore,
  ProcessLocalEvidenceSink
} from "../../../infra/fortress-x-v11/blackout-adapters/infra-ports-adapter.ts";
import {
  sanitizeBlackoutLevel,
  resolveBlackoutLevel,
  handleEdgeRequest
} from "../../../infra/fortress-x-v11/disaster-recovery/blackout-edge-fallback/edge-blackout-worker.js";

describe("MKA FORTRESS X V1.1 — Sertleştirilmiş Altyapı ve Güvenlik Testleri", () => {
  describe("1. File Integrity Monitoring (FIM) Testleri", () => {
    let testDir;

    before(() => {
      testDir = mkdtempSync(join(tmpdir(), "mka-fim-test-"));
      writeFileSync(join(testDir, "fileA.txt"), "Asrın Kemali Arşiv Verisi A", "utf-8");
      writeFileSync(join(testDir, "fileB.txt"), "Mustafa Kemal Atatürk Belge B", "utf-8");
    });

    after(() => {
      if (testDir) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    test("computeSha256: Deterministik ve doğru SHA-256 özeti üretmeli", () => {
      const hash1 = computeSha256("Mustafa Kemal Atatürk");
      const hash2 = computeSha256("Mustafa Kemal Atatürk");
      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64);
      assert.match(hash1, /^[a-f0-9]{64}$/);
    });

    test("generateManifest: Dizin taranmalı ve geçerli manifest üretilmeli", () => {
      const manifest = generateManifest(testDir);
      assert.equal(manifest.version, "1.1.0");
      assert.equal(manifest.fileCount, 2);
      assert.equal(manifest.files.length, 2);
      assert.equal(manifest.files[0].path, "fileA.txt");
      assert.equal(manifest.files[1].path, "fileB.txt");
    });

    test("verifyManifest: Değişmemiş dizinde doğrulama geçerli olmalı", () => {
      const manifest = generateManifest(testDir);
      const result = verifyManifest(testDir, manifest);
      assert.equal(result.isValid, true);
      assert.equal(result.summary.matchedCount, 2);
      assert.equal(result.summary.modifiedCount, 0);
      assert.equal(result.summary.addedCount, 0);
      assert.equal(result.summary.deletedCount, 0);
    });

    test("verifyManifest: Dosya içeriği kurcalandığında (tampering) SEV-1 ihlali yakalanmalı", () => {
      const manifest = generateManifest(testDir);
      writeFileSync(join(testDir, "fileA.txt"), "Yetkisiz Değişiklik Yapıldı!", "utf-8");

      const result = verifyManifest(testDir, manifest);
      assert.equal(result.isValid, false);
      assert.equal(result.summary.modifiedCount, 1);
      assert.equal(result.details.modified[0].path, "fileA.txt");

      // Geri yükle
      writeFileSync(join(testDir, "fileA.txt"), "Asrın Kemali Arşiv Verisi A", "utf-8");
    });

    test("verifyManifest: Yeni yetkisiz dosya eklendiğinde tespit edilmeli", () => {
      const manifest = generateManifest(testDir);
      writeFileSync(join(testDir, "malicious.js"), "console.log('unauthorized')", "utf-8");

      const result = verifyManifest(testDir, manifest);
      assert.equal(result.isValid, false);
      assert.equal(result.summary.addedCount, 1);
      assert.equal(result.details.added[0], "malicious.js");

      // Temizle
      rmSync(join(testDir, "malicious.js"), { force: true });
    });

    test("verifyManifest: Kritik dosya silindiğinde tespit edilmeli", () => {
      const manifest = generateManifest(testDir);
      rmSync(join(testDir, "fileB.txt"), { force: true });

      const result = verifyManifest(testDir, manifest);
      assert.equal(result.isValid, false);
      assert.equal(result.summary.deletedCount, 1);
      assert.equal(result.details.deleted[0], "fileB.txt");

      // Geri yükle
      writeFileSync(join(testDir, "fileB.txt"), "Mustafa Kemal Atatürk Belge B", "utf-8");
    });
  });

  describe("2. WAF Davranışsal ve Negatif Güvenlik Testleri (Sıfır-Atlatma Mimarisi)", () => {
    const wafData = JSON.parse(readFileSync("infra/fortress-x-v11/waf/waf-rulesets.json", "utf-8"));
    const tfRuleset = readFileSync("infra/fortress-x-v11/waf/cloudflare-ruleset.tf", "utf-8");
    const exploitRule = wafData.rulesets.find((r) => r.id === "WAF-04-EXPLOIT-PAYLOADS");

    test("SIFIR-ATLATMA DOĞRULAMASI: WAF kurallarında genel bypass ('action = skip' / 'ruleset = current') bulunmamalı", () => {
      // Terraform şablonunda hiçbir 'action = "skip"' veya 'ruleset = "current"' olmamalı
      assert.ok(!tfRuleset.includes('action = "skip"'), "Terraform içinde geniş WAF atlama (action = skip) bulunmamalı");
      assert.ok(!tfRuleset.includes('ruleset = "current"'), "Terraform içinde 'ruleset = current' atlatma direktifi bulunmamalı");

      // JSON şablonunda da hiçbir skip eylemi bulunmamalı
      const hasSkipAction = wafData.rulesets.some((r) => r.action === "skip");
      assert.equal(hasSkipAction, false, "JSON kurallarında hiçbir skip eylemi bulunmamalı");
    });

    test("NEGATİF TEST: /arsiv rotasına gönderilen XSS yükü WAF filtresini atlatamamalı", () => {
      const maliciousQueries = [
        "<script>alert('xss')</script>",
        "javascript:void(0)",
        "q=Mustafa%20Kemal<script>",
        "onerror=alert(1)",
        "onload=fetch('//evil.com')"
      ];

      for (const query of maliciousQueries) {
        const matchedExploit = exploitRule.attack_patterns.some((pattern) => query.toLowerCase().includes(pattern.toLowerCase()));
        assert.ok(matchedExploit, `XSS saldırısı WAF-04 tarafından yakalanmalı: ${query}`);
      }
    });

    test("NEGATİF TEST: /arsiv rotasına gönderilen SQLi yükü WAF filtresinden kaçamamalı", () => {
      const sqlInjections = [
        "union select 1,2,3",
        "union all select 1,2,3",
        "' or '1'='1",
        "'; drop table users; --",
        "waitfor delay '0:0:5'",
        "information_schema.tables",
        "sleep(5)"
      ];

      for (const sqli of sqlInjections) {
        const matchedExploit = exploitRule.attack_patterns.some((p) => sqli.toLowerCase().includes(p.toLowerCase()));
        assert.ok(matchedExploit, `SQLi saldırısı engellenmeli: ${sqli}`);
      }
    });

    test("NEGATİF TEST: /arsiv rotasında Yol Geçişi (Path Traversal) denemeleri engellenmeli", () => {
      const traversals = [
        "../../etc/passwd",
        "..%2f..%2fconfig.json"
      ];

      for (const pt of traversals) {
        const matched = exploitRule.attack_patterns.some((p) => pt.toLowerCase().includes(p.toLowerCase()));
        assert.ok(matched, `Yol geçişi engellenmeli: ${pt}`);
      }
    });

    test("POZİTİF TEST: Temiz Türkçe arama terimleri exploit kalıplarına takılmadan izin almalı", () => {
      const legitimateSearches = [
        "Mustafa Kemal Çanakkale Zaferi 1915",
        "Nutuk ve TBMM Belgeleri",
        "İzmir'in Kurtuluşu ve Lozan Barış Antlaşması",
        "Cumhuriyetin İlanı ve Türk Çağdaşlaşması",
        "Gazi Paşa Maarif Kongresi"
      ];

      for (const cleanQuery of legitimateSearches) {
        const hasExploit = exploitRule.attack_patterns.some((p) => cleanQuery.toLowerCase().includes(p.toLowerCase()));
        assert.equal(hasExploit, false, `Temiz Türkçe sorgu exploit sayılmamalı: ${cleanQuery}`);
      }
    });

    test("MANAGED CRS KONTROLÜ: Cloudflare Managed Ruleset (OWASP CRS) yapılandırması mevcut olmalı", () => {
      assert.ok(tfRuleset.includes('"http_request_firewall_managed"'), "Managed phase bulunmalı");
      assert.ok(tfRuleset.includes('action = "execute"'), "execute aksiyonu bulunmalı");
      assert.ok(tfRuleset.includes('"waf_managed_tuning"'), "waf_managed_tuning kaynağı bulunmalı");
    });
  });

  describe("3. PROJECT BLACKOUT Kenar ve Kesinti Yönetimi Testleri", () => {
    test("sanitizeBlackoutLevel: Geçerli seviyeleri (0..3) doğru ayrıştırmalı", () => {
      assert.equal(sanitizeBlackoutLevel(0), 0);
      assert.equal(sanitizeBlackoutLevel(1), 1);
      assert.equal(sanitizeBlackoutLevel(2), 2);
      assert.equal(sanitizeBlackoutLevel(3), 3);
      assert.equal(sanitizeBlackoutLevel("0"), 0);
      assert.equal(sanitizeBlackoutLevel("1"), 1);
      assert.equal(sanitizeBlackoutLevel("2"), 2);
      assert.equal(sanitizeBlackoutLevel("3"), 3);
      assert.equal(sanitizeBlackoutLevel(" 3 "), 3);
    });

    test("sanitizeBlackoutLevel: parseInt zafiyeti ve tip dönüşüm hataları (2admin, 1.99, 0foo) kesinlikle reddedilmeli", () => {
      // parseInt("2admin", 10) === 2 döner; katı sanitization ise null dönmelidir
      assert.equal(sanitizeBlackoutLevel("2admin"), null, "'2admin' gibi zararlı girdiler reddedilmeli");
      assert.equal(sanitizeBlackoutLevel("0foo"), null, "'0foo' reddedilmeli");
      assert.equal(sanitizeBlackoutLevel("1.99"), null, "Küsüratlı dize reddedilmeli");
      assert.equal(sanitizeBlackoutLevel(1.5), null, "Float sayı tipi reddedilmeli");
      assert.equal(sanitizeBlackoutLevel([2]), null, "Dizi tipi reddedilmeli");
      assert.equal(sanitizeBlackoutLevel({ level: 2 }), null, "Nesne tipi reddedilmeli");
      assert.equal(sanitizeBlackoutLevel(null), null);
      assert.equal(sanitizeBlackoutLevel(undefined), null);
      assert.equal(sanitizeBlackoutLevel("corrupted"), null);
      assert.equal(sanitizeBlackoutLevel("-1"), null);
      assert.equal(sanitizeBlackoutLevel(-1), null);
      assert.equal(sanitizeBlackoutLevel(4), null);
      assert.equal(sanitizeBlackoutLevel("4"), null);
      assert.equal(sanitizeBlackoutLevel(99), null);
      assert.equal(sanitizeBlackoutLevel("NaN"), null);
      assert.equal(sanitizeBlackoutLevel(NaN), null);
      assert.equal(sanitizeBlackoutLevel(true), null);
      assert.equal(sanitizeBlackoutLevel(false), null);
      assert.equal(sanitizeBlackoutLevel(""), null);
    });

    test("resolveBlackoutLevel: KV deposu kesintisinde fail-open NORMAL olmamalı, WATCH (1) veya son bilinen durumu korumalı", async () => {
      const faultyEnv = {
        BLACKOUT_KV: {
          get: async () => {
            throw new Error("KV_NETWORK_TIMEOUT");
          }
        }
      };

      const result = await resolveBlackoutLevel(faultyEnv);
      assert.equal(result.isDegraded, true);
      // Asla 0 (NORMAL) olmamalı; en az 1 (WATCH) olmalı ki hassas rotalar açık kalmasın
      assert.ok(result.level >= 1, "Kesintide fail-open 0 olmamalı");
    });

    test("edge-blackout-worker.js: İzolat belleği dağıtık olmama uyarısı ve KV gereksinimi belgelenmiş olmalı", () => {
      const workerContent = readFileSync("infra/fortress-x-v11/disaster-recovery/blackout-edge-fallback/edge-blackout-worker.js", "utf-8");
      assert.ok(workerContent.includes("PoP"), "Çoklu PoP uyarısı bulunmalı");
      assert.ok(workerContent.includes("dağıtık"), "Dağıtık olmama uyarısı bulunmalı");
    });

    test("handleEdgeRequest: LOCKDOWN (3) seviyesinde statik 503 blackout sayfası dönmeli", async () => {
      const mockEnv = { MKA_BLACKOUT_LEVEL: "3" };
      const req = new Request("https://asrinkemali.org/arsiv");
      const res = await handleEdgeRequest(req, mockEnv);

      assert.equal(res.status, 503);
      assert.equal(res.headers.get("X-Fortress-State"), "LOCKDOWN");
      assert.equal(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
      const text = await res.text();
      assert.ok(text.includes("Sistem Güvenlik İncelemesinde"));
    });

    test("handleEdgeRequest: LOCKDOWN anında bile /api/health denetimi 200 dönmeli", async () => {
      const mockEnv = { MKA_BLACKOUT_LEVEL: "3" };
      const req = new Request("https://asrinkemali.org/api/health");
      const mockFetch = async () => new Response(JSON.stringify({ status: "healthy" }), { status: 200 });
      const res = await handleEdgeRequest(req, mockEnv, mockFetch);

      assert.equal(res.status, 200);
    });

    test("handleEdgeRequest: RESTRICTED (2) seviyesinde hassas /api/arastirma rotası 403 ile kesilmeli", async () => {
      const mockEnv = { MKA_BLACKOUT_LEVEL: "2" };
      const req = new Request("https://asrinkemali.org/api/arastirma-laboratuvari/export");
      const res = await handleEdgeRequest(req, mockEnv);

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error, "restricted_mode_active");
    });
  });

  describe("4. Ağ ve Güvenlik Duvarı Sıkılaştırma Testleri", () => {
    test("origin-firewall.sh ve egress-lockdown.sh: Güvenlik betiklerinde 'eval' ASLA kullanılmamalı", () => {
      const originFw = readFileSync("infra/fortress-x-v11/origin-shield/origin-firewall.sh", "utf-8");
      const egressFw = readFileSync("infra/fortress-x-v11/host-hardening/egress-lockdown.sh", "utf-8");

      assert.ok(!/(^|\n)\s*eval\s+/.test(originFw), "origin-firewall.sh içinde 'eval' komutu bulunmamalı");
      assert.ok(!originFw.includes("eval \"$"), "origin-firewall.sh içinde 'eval \"$' bulunmamalı");
      assert.ok(!/(^|\n)\s*eval\s+/.test(egressFw), "egress-lockdown.sh içinde 'eval' komutu bulunmamalı");
      assert.ok(!egressFw.includes("eval \"$"), "egress-lockdown.sh içinde 'eval \"$' bulunmamalı");
    });

    test("origin-firewall.sh: Hem IPv4 hem de IPv6 (ip6tables) desteği barındırmalı", () => {
      const script = readFileSync("infra/fortress-x-v11/origin-shield/origin-firewall.sh", "utf-8");
      assert.ok(script.includes("CLOUDFLARE_IN"));
      assert.ok(script.includes("CLOUDFLARE_IN6"));
      assert.ok(script.includes("ip6tables -A CLOUDFLARE_IN6"));
      assert.ok(script.includes("2606:4700::/32"), "Cloudflare IPv6 CIDR bulunmalı");
    });

    test("origin-firewall.sh: SSH port doğrulaması yapmalı (1-65535) ve erişimi korumalı", () => {
      const script = readFileSync("infra/fortress-x-v11/origin-shield/origin-firewall.sh", "utf-8");
      assert.ok(script.includes("--dport $SSH_PORT -j ACCEPT"));
      assert.ok(script.includes("AUTO_ROLLBACK"), "Otomatik geri alma parametresi bulunmalı");
      assert.ok(script.includes("65535"), "SSH portu üst sınır (65535) doğrulaması bulunmalı");
    });

    test("egress-lockdown.sh: Strict modu bilinmeyen dış HTTP/HTTPS'i loglayıp engellemeli, Maintenance modu güncellemelere izin vermeli", () => {
      const script = readFileSync("infra/fortress-x-v11/host-hardening/egress-lockdown.sh", "utf-8");
      assert.ok(script.includes("--dport 53 -j ACCEPT"), "DNS çıkışına izin verilmeli");
      assert.ok(script.includes("--mode=strict"), "Strict mod seçeneği olmalı");
      assert.ok(script.includes("--mode=maintenance"), "Maintenance mod seçeneği olmalı");
      assert.ok(script.includes("FORTRESS-SSRF-BLOCKED"), "SSRF koruma logu bulunmalı");
      assert.ok(script.includes("PACKAGE_MIRROR_HTTP"), "Bakım modu paket aynası izni bulunmalı");
      assert.ok(script.includes("ip6tables -A FORTRESS_EGRESS6 -j DROP"), "IPv6 kaçak çıkışı engellenmeli");
    });

    test("origin-pull-mtls.md: 4 Origin koruma mimarisini karşılaştırmalı ve IP taklit riskini belgelemeli", () => {
      const doc = readFileSync("infra/fortress-x-v11/origin-shield/origin-pull-mtls.md", "utf-8");
      assert.ok(doc.includes("Authenticated Origin Pulls"), "mTLS seçeneği yer almalı");
      assert.ok(doc.includes("Cloudflare Tunnel"), "Cloudflare Tunnel seçeneği yer almalı");
      assert.ok(doc.includes("Strict SNI"), "Strict SNI seçeneği yer almalı");
      assert.ok(doc.includes("IP Beyaz Liste"), "IP Beyaz liste seçeneği yer almalı");
      assert.ok(doc.includes("Kiracı Taklit Riski") || doc.toLowerCase().includes("tenant impersonation"), "Kiracı taklidi zafiyeti açıklanmalı");
      assert.ok(doc.includes("Tavsiye Edilen En Güvenli Mimari"), "Tavsiye bölümü bulunmalı");
    });
  });

  describe("5. BLACKOUT Adaptörü Dürüst Durum ve Altyapı Sözleşmesi Testleri", () => {
    test("InfraSessionRevoker: Canlı oturum deposu yokken sahte sayı (42/5) DÖNDÜRMEMELİ", async () => {
      const revoker = new InfraSessionRevoker(false, false); // dryRun=false, hasRealStore=false
      const result = await revoker.revoke("all", "security-incident");

      assert.equal(result.revoked, 0, "Canlı depo yokken sahte iptal sayısı dönülmemeli");
      assert.equal(result.requiresInfrastructure, true);
      assert.equal(result.status, "requires_infrastructure");
      assert.ok(result.detail.includes("yapılandırılmamış"));
    });

    test("ProcessLocalStateStore: Dağıtık bir küme olmadığını (isDistributed=false) açıkça belirtmeli", async () => {
      const store = new ProcessLocalStateStore(0);
      assert.equal(store.isDistributed(), false);
      assert.equal(await store.currentLevel(), 0);
      await store.setLevel(2);
      assert.equal(await store.currentLevel(), 2);
    });

    test("ProcessLocalEvidenceSink: Bellek içi test sink'i olduğunu ve kalıcı WORM olmadığını belirtmeli", async () => {
      const sink = new ProcessLocalEvidenceSink();
      assert.equal(sink.isPersistentStorage(), false);
      await sink.append({
        timestamp: new Date().toISOString(),
        incidentId: "INC-TEST",
        hash: "a".repeat(64),
        previousHash: "0".repeat(64),
        payload: { action: "test" }
      });
      assert.equal(sink.getEntries().length, 1);
    });
  });

  describe("6. Log ve Kurtarma Güvenliği Testleri", () => {
    test("vector-agent.toml: Kod içine gömülü sabit tuz barındırmamalı", () => {
      const vector = readFileSync("infra/fortress-x-v11/monitoring-siem/vector-agent.toml", "utf-8");
      assert.ok(!vector.includes("mka-fortress-static-salt"));
      assert.ok(vector.includes("get_env_var(\"MKA_LOG_SALT\")"));
      assert.ok(vector.includes(".password = \"[REDACTED]\""));
      assert.ok(vector.includes(".token = \"[REDACTED]\""));
    });

    test("DISASTER-RECOVERY-RUNBOOK.md: Doğrudan git reset --hard yerine adli delil koruması içermeli", () => {
      const runbook = readFileSync("docs/infrastructure/fortress-x-v11/DISASTER-RECOVERY-RUNBOOK.md", "utf-8");
      assert.ok(runbook.includes("ADLİ DELİL KORUMASI"));
      assert.ok(runbook.includes("forensic-snapshot-"));
      assert.ok(runbook.includes("COMPLIANCE Modu Geri Alınamaz"));
    });
  });

  describe("7. Kapsamlı Dry-Run Validator Testi", () => {
    test("runAllValidations: Tüm güncellenmiş kurallar başarıyla geçmeli", () => {
      const allPassed = runAllValidations();
      assert.equal(allPassed, true);
    });
  });
});
