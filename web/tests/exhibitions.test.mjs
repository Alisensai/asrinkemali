import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canExposePublicExhibition,
  validateExhibitionRecord,
  canTransitionWorkflow,
  isExhibitionPublishable,
} from "../lib/exhibitions/workflow.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");

describe("MKA Immersive Museum Hardening & Security Gate Tests (Task 26)", () => {
  test("Sergiler bileşenleri ve sözleşmeleri eksiksiz mevcuttur", () => {
    const components = [
      "DocumentShowcase.tsx",
      "SourceInspector.tsx",
      "ExhibitionHero.tsx",
      "ExhibitionTimeline.tsx",
      "VirtualGalleryRoom.tsx",
      "ExhibitionSectionRenderer.tsx",
      "ExhibitionCard.tsx",
      "ExhibitionFilterBar.tsx",
      "ExhibitionsDirectoryClient.tsx",
      "ExhibitionView.tsx",
      "exhibitions.module.css",
    ];

    for (const comp of components) {
      const fullPath = path.join(root, "components", "exhibitions", comp);
      assert.equal(existsSync(fullPath), true, `Bileşen eksik: ${comp}`);
    }
  });

  test("Sergiler rotaları ve sayfaları eksiksiz mevcuttur", () => {
    assert.equal(existsSync(path.join(root, "app", "sergiler", "page.tsx")), true, "/sergiler sayfası eksik");
    assert.equal(existsSync(path.join(root, "app", "sergiler", "[slug]", "page.tsx")), true, "/sergiler/[slug] sayfası eksik");
  });

  test("Navigasyon ve arama verisinde Sergiler rotası yer alır", () => {
    const siteData = readFileSync(path.join(root, "lib", "site-data.ts"), "utf8");
    assert.match(siteData, /href:\s*["']\/sergiler["']/);
    assert.match(siteData, /label:\s*["']Sergiler["']/);
    assert.match(siteData, /Küratöryel Sergiler/);
  });

  test("Hakkımızda sayfasında kaynaksız Atatürk alıntısı yerine tarafsız yayın ilkesi yer alır", () => {
    const aboutPage = readFileSync(path.join(root, "app", "hakkimizda", "page.tsx"), "utf8");
    assert.doesNotMatch(aboutPage, /Tarih yazmak, tarih yapmak kadar mühimdir/);
    assert.doesNotMatch(aboutPage, /Yazan yapana sadık kalmazsa/);
    assert.match(aboutPage, /Asrın Kemali Yayın ve Arşiv İlkesi/);
    assert.match(aboutPage, /Tarihî hakikat, yalnızca doğrulanmış birincil belgeler/);
  });

  test("Staging sergi JSON kayıtları geçerli şemaya ve birincil arşiv bağlantılarına sahiptir", () => {
    const stagingDir = path.join(repoRoot, "content", "exhibitions", "staging");
    assert.equal(existsSync(stagingDir), true, "staging dizini bulunamadı");

    const files = readdirSync(stagingDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 2, "En az iki sergi kaydı bulunmalı");

    const archiveRecordsDir = path.join(repoRoot, "content", "archive", "records");

    for (const file of files) {
      const content = JSON.parse(readFileSync(path.join(stagingDir, file), "utf8"));

      // Temel alanlar
      assert.ok(content.id, `${file}: id eksik`);
      assert.ok(content.slug, `${file}: slug eksik`);
      assert.ok(content.title, `${file}: title eksik`);
      assert.ok(content.summary, `${file}: summary eksik`);
      assert.ok(content.theme, `${file}: theme eksik`);
      assert.ok(content.curator?.name, `${file}: curator.name eksik`);
      assert.ok(Array.isArray(content.sections), `${file}: sections dizi olmalı`);
      assert.ok(content.sections.length >= 5, `${file}: en az 5 bölüm içermeli`);

      // Her bölümün bütünlüğü
      for (const sec of content.sections) {
        assert.ok(sec.id, `${file} bölüm id eksik`);
        assert.ok(sec.type, `${file} bölüm type eksik`);
        assert.ok(sec.title, `${file} bölüm title eksik`);
      }

      // Birincil arşiv kayıtlarının varlığı
      if (content.relatedArchiveRecordSlugs) {
        for (const recordSlug of content.relatedArchiveRecordSlugs) {
          const recordPath = path.join(archiveRecordsDir, `${recordSlug}.json`);
          assert.equal(
            existsSync(recordPath),
            true,
            `${file} içindeki arşiv bağlantısı (${recordSlug}) gerçekte mevcut olmalı`
          );
        }
      }
    }
  });

  test("CSS modülünde sanal galeri odası, kaynak çekmecesi ve mobil uyumluluk stilleri mevcuttur", () => {
    const css = readFileSync(path.join(root, "components", "exhibitions", "exhibitions.module.css"), "utf8");
    assert.match(css, /\.virtualRoom/);
    assert.match(css, /\.roomContentStage/);
    assert.match(css, /\.drawerBackdrop/);
    assert.match(css, /\.drawerPanel/);
    assert.match(css, /@media\s*\(max-width:\s*960px\)/);
    assert.match(css, /@media\s*\(max-width:\s*620px\)/);
    assert.match(css, /@media\s*\(max-width:\s*380px\)/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  // [T-26-001 - T-26-010] Güvenlik Kapısı ve Staging Sızıntısı Engeli
  test("[T-26-001 / T-26-010] canExposePublicExhibition sentetik önizleme ve taslakları kesinlikle engeller", () => {
    const stagingDir = path.join(repoRoot, "content", "exhibitions", "staging");
    const sample = JSON.parse(readFileSync(path.join(stagingDir, "cumhuriyetin-ilani.json"), "utf8"));

    // Staging sergisi isSyntheticPreview: true taşır; public sergilenemez
    assert.equal(sample.editorialReview.isSyntheticPreview, true);
    assert.equal(canExposePublicExhibition(sample), false);
    assert.equal(isExhibitionPublishable(sample), false);
  });

  test("[T-26-002] Repository kodunda üretim ortamında includeStaging bypass kapalıdır (fail-closed)", () => {
    const repoSrc = readFileSync(path.join(root, "lib", "exhibitions", "repository.ts"), "utf8");
    // allowStaging = !isProd && Boolean(filters?.includeStaging)
    assert.match(repoSrc, /allowStaging\s*=\s*!isProd/);
    assert.doesNotMatch(repoSrc, /ALLOW_STAGING_EXHIBITIONS\s*\|\|\s*filters\?\.includeStaging/);
  });

  test("[T-26-003] /sergiler sayfasında includeStaging üretimde devre dışıdır ve boş durum kartı mevcuttur", () => {
    const pageSrc = readFileSync(path.join(root, "app", "sergiler", "page.tsx"), "utf8");
    assert.match(pageSrc, /isDev\s*=\s*process\.env\.NODE_ENV\s*!==\s*["']production["']/);
    assert.match(pageSrc, /getExhibitions\(\{\s*includeStaging:\s*isDev\s*\}\)/);
    assert.match(pageSrc, /exhibitions-empty-state/);
    assert.match(pageSrc, /Yayınlanmış Sergi Hazırlanıyor/);
    assert.match(pageSrc, /href=["']\/arsiv["']/);
  });

  test("[T-26-004] /sergiler/[slug] sayfası staging ve sentetik sergilerde robots noindex uygular", () => {
    const slugPageSrc = readFileSync(path.join(root, "app", "sergiler", "[slug]", "page.tsx"), "utf8");
    assert.match(slugPageSrc, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
    assert.match(slugPageSrc, /isSyntheticPreview/);
    assert.match(slugPageSrc, /isStagingDraft/);
  });

  test("[T-26-011 - T-26-016] Editoryal onay durum makinesi sahte veya eksik onayları reddeder", () => {
    // Taslak onay durumları
    assert.equal(canTransitionWorkflow("draft", "in_review"), true);
    assert.equal(canTransitionWorkflow("draft", "published"), false); // draft direkt published olamaz
    assert.equal(canTransitionWorkflow("in_review", "approved"), true);
    assert.equal(canTransitionWorkflow("approved", "published"), true);

    // Boş onaylayan ile yayınlanamaz
    const invalidReviewRecord = {
      id: "test-exhibition",
      slug: "test-exhibition",
      title: "Test Sergi Başlığı",
      summary: "Test sergi özeti metni yeterince uzun.",
      chronologicalScope: { startYear: 1920, endYear: 1923 },
      sections: [
        { id: "hero", type: "hero", title: "Giriş" },
        { id: "s1", type: "narrative", title: "Bölüm 1" },
      ],
      editorialReview: {
        status: "published",
        reviewedBy: "", // Boş reviewer
        isSyntheticPreview: false,
      },
    };

    assert.equal(canExposePublicExhibition(invalidReviewRecord), false);
    const val = validateExhibitionRecord(invalidReviewRecord);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes("onaylayan")));
  });

  test("[T-26-020] SourceInspector bileşeni koşulsuz 'BİRİNCİL TARİHÎ KAYNAK' ve sahte mühür basmaz", () => {
    const srcInspector = readFileSync(
      path.join(root, "components", "exhibitions", "SourceInspector.tsx"),
      "utf8"
    );
    // Koşulsuz rozet kaldırıldı
    assert.doesNotMatch(srcInspector, /<span[^>]*>BİRİNCİL TARİHÎ KAYNAK<\/span>/);
    // Yalnızca tarafsız katalog kaydı ve doğrulanmış pill
    assert.match(srcInspector, /KATALOG KAYDI/);
    // V1.0: rozet, sergi verisinden türetilen güven durumuna bağlı (sabit isVerified yok).
    assert.match(srcInspector, /source\.trust\?\.state\s*===\s*"verified"\s*\?/);
    assert.match(srcInspector, /İNCELEME BEKLİYOR/);
    const sourceTrust = readFileSync(path.join(root, "lib", "exhibitions", "source-trust.ts"), "utf8");
    assert.match(sourceTrust, /DOĞRULANMIŞ KAYNAK/);
    assert.match(sourceTrust, /İNCELEME BEKLİYOR/);
    assert.match(srcInspector, /TEMSİLÎ GÖRSEL/);
  });

  test("[T-26-021] SourceInspector klavye erişilebilirliği ve focus trap içerir", () => {
    const srcInspector = readFileSync(
      path.join(root, "components", "exhibitions", "SourceInspector.tsx"),
      "utf8"
    );
    assert.match(srcInspector, /e\.key\s*===\s*["']Escape["']/);
    assert.match(srcInspector, /e\.key\s*===\s*["']Tab["']/);
    assert.match(srcInspector, /previousActiveElementRef/);
    assert.match(srcInspector, /role=["']dialog["']/);
    assert.match(srcInspector, /aria-modal=["']true["']/);
  });

  test("[T-26-022] Fail-Closed Quarantine: Staging sergileri yayındaki sergileri ezemez", () => {
    const repoSrc = readFileSync(path.join(root, "lib", "exhibitions", "repository.ts"), "utf8");
    assert.match(repoSrc, /publishedMap\.has\(item\.slug\)/);
    assert.match(repoSrc, /Güvenlik Karantinası/);
  });

  test("[T-26-023] ExhibitionView taslak sergilerde görünür 'TASLAK — İNSAN İNCELEMESİ YOK' uyarısı verir", () => {
    const viewSrc = readFileSync(path.join(root, "components", "exhibitions", "ExhibitionView.tsx"), "utf8");
    assert.match(viewSrc, /TASLAK — İNSAN İNCELEMESİ YOK/);
    assert.match(viewSrc, /isStagingDraft/);
  });
});

