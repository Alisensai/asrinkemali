import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { computeSha256, generateManifest, verifyManifest } from "../fim.mjs";
import { runAllValidations, validateWafRules, validateHostHardening, validateContainerSecurity, validateMonitoring, validateDisasterRecovery } from "../validate-infra.mjs";
import { createInfraBlackoutPorts } from "../../../infra/fortress-x-v11/blackout-adapters/infra-ports-adapter.ts";

describe("MKA FORTRESS X V1.1 — Altyapı Güvenlik ve Doğrulama Testleri", () => {
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
      // Kurcalama simülasyonu
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

  describe("2. WAF ve Rate Limiting Doğrulama Testleri", () => {
    test("validateWafRules: WAF kuralları ve Türkçe arama muafiyeti doğrulanmalı", () => {
      const ok = validateWafRules();
      assert.equal(ok, true);
    });

    test("Türkçe karakter içeren arama sorguları WAF filtresini tetiklememeli", () => {
      const wafData = JSON.parse(readFileSync("infra/fortress-x-v11/waf/waf-rulesets.json", "utf-8"));
      const turkishRule = wafData.rulesets.find((r) => r.id === "WAF-04-TURKISH-SEARCH-WHITELIST");
      assert.ok(turkishRule, "WAF-04 kuralı mevcut olmalı");
      assert.equal(turkishRule.action, "skip");

      const testQueries = [
        "Mustafa Kemal Çanakkale 1915",
        "TBMM Açılışı ve Nutuk",
        "İzmir'in Kurtuluşu ve Lozan Barış Antlaşması",
        "Cumhuriyetin İlanı ve Çağdaşlaşma"
      ];

      for (const query of testQueries) {
        assert.ok(query.length <= turkishRule.max_query_length, `Sorgu uzunluğu sınır içinde olmalı: ${query}`);
      }
    });

    test("Hassas dosya desenleri eksiksiz engellenmeli", () => {
      const wafData = JSON.parse(readFileSync("infra/fortress-x-v11/waf/waf-rulesets.json", "utf-8"));
      const sensitiveRule = wafData.rulesets.find((r) => r.id === "WAF-01-SENSITIVE-FILES");
      assert.ok(sensitiveRule.target_patterns.includes("/.env"));
      assert.ok(sensitiveRule.target_patterns.includes("/.git"));
      assert.ok(sensitiveRule.target_patterns.includes("/wp-login"));
    });
  });

  describe("3. Sunucu, Konteyner ve Ağ Sertleştirme Testleri", () => {
    test("validateHostHardening: sysctl ve egress kısıtlamaları geçerli olmalı", () => {
      assert.equal(validateHostHardening(), true);
    });

    test("validateContainerSecurity: Dockerfile ve Compose politikaları geçerli olmalı", () => {
      assert.equal(validateContainerSecurity(), true);
    });

    test("Dockerfile non-root kullanıcısı UID 10001 olmalı", () => {
      const content = readFileSync("infra/fortress-x-v11/host-hardening/Dockerfile.hardened", "utf-8");
      assert.match(content, /--uid 10001 nextjs/);
      assert.match(content, /USER nextjs/);
    });
  });

  describe("4. İzleme, Log Şeması ve Taksonomi Testleri", () => {
    test("validateMonitoring: ECS log şeması ve alert kuralları doğrulanmalı", () => {
      assert.equal(validateMonitoring(), true);
    });

    test("Log şeması istemci IP özetinde 64 karakterli hex hash zorunlu kılmalı", () => {
      const schema = JSON.parse(readFileSync("infra/fortress-x-v11/monitoring-siem/log-schema.json", "utf-8"));
      const pattern = new RegExp(schema.properties.client.properties.ip_hash.pattern);
      assert.ok(pattern.test("a".repeat(64)));
      assert.ok(!pattern.test("192.168.1.1"), "Düz IP adresi şemaya uymamalı");
    });
  });

  describe("5. Kurtarma ve PROJECT BLACKOUT Altyapı Adaptör Testleri", () => {
    test("validateDisasterRecovery: WORM yedek, blackout.html ve worker doğrulanmalı", () => {
      assert.equal(validateDisasterRecovery(), true);
    });

    test("blackout.html harici bağımlılık içermemeli ve marka mottosunu barındırmalı", () => {
      const html = readFileSync("infra/fortress-x-v11/disaster-recovery/blackout-edge-fallback/blackout.html", "utf-8");
      assert.ok(!html.includes("<script src="));
      assert.ok(!html.includes("<link rel=\"stylesheet\" href=\"http"));
      assert.ok(html.includes("BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI"));
      assert.ok(html.includes("ASRIN KEMALİ"));
    });

    test("createInfraBlackoutPorts: Varsayılan dry-run modunda portları üretmeli", async () => {
      const infra = createInfraBlackoutPorts({ dryRun: true });
      assert.ok(infra.ports.sessions);
      assert.ok(infra.ports.criticalApi);
      assert.ok(infra.ports.writes);
      assert.ok(infra.ports.safeMode);
      assert.ok(infra.ports.notifier);
      assert.ok(infra.ports.evidence);

      // Başlangıç seviyesi 0 (NORMAL) olmalı
      const initialLevel = await infra.stateStore.currentLevel();
      assert.equal(initialLevel, 0);

      // Oturum iptali dry-run çalışmalı
      const revokeRes = await infra.sessions.revoke("all", "test-incident");
      assert.equal(revokeRes.revoked, 42);
      assert.equal(infra.sessions.revokedSessionsCount, 0, "dry-run modunda gerçek sayaç artmamalı");
      assert.equal(infra.sessions.auditHistory.length, 1);

      // Kritik API dondurma
      await infra.criticalApi.setEnabled(false, "maintenance");
      assert.equal(infra.criticalApi.isEnabled(), true, "dry-run modunda durum değişmemeli");
      assert.equal(infra.criticalApi.history.length, 1);

      // Bildirim gönderme
      await infra.notifier.notify({ incidentId: "INC-01", level: 2, summary: "Şüpheli DDoS" });
      const delivered = infra.notifier.getDeliveredNotifications();
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0].incidentId, "INC-01");

      // WORM Kanıt defterine ekleme
      await infra.evidence.append({
        timestamp: new Date().toISOString(),
        incidentId: "INC-01",
        hash: "e".repeat(64),
        previousHash: "0".repeat(64),
        payload: { test: true }
      });
      assert.equal(infra.evidence.getEntries().length, 1);
    });

    test("createInfraBlackoutPorts: Aktif modda (dryRun: false) durum güncellemelerini işletmeli", async () => {
      const infra = createInfraBlackoutPorts({ dryRun: false, initialLevel: 1 });
      
      const current = await infra.stateStore.currentLevel();
      assert.equal(current, 1);

      // Seviye LOCKDOWN (3)'e çekilmeli
      await infra.stateStore.setLevel(3);
      const updated = await infra.stateStore.currentLevel();
      assert.equal(updated, 3);

      // Safe mode aktif edilmeli
      await infra.safeMode.setReadOnly(true, "incident lockdown");
      assert.equal(infra.safeMode.isReadOnly(), true);

      // Writes dondurulmalı
      await infra.writes.setFrozen(true, "incident freeze");
      assert.equal(infra.writes.isFrozen(), true);

      // Kritik API kapatılmalı
      await infra.criticalApi.setEnabled(false, "emergency");
      assert.equal(infra.criticalApi.isEnabled(), false);
    });
  });

  describe("6. Kapsamlı Dry-Run Validator Testi", () => {
    test("runAllValidations: Tüm kontroller sıfır hatayla geçmeli", () => {
      const allPassed = runAllValidations();
      assert.equal(allPassed, true);
    });
  });
});
