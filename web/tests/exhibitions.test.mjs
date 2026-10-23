import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");

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
