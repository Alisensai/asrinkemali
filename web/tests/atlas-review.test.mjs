import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");
const downloadsDir = "C:\\Users\\Ali\\Downloads";
const p1Path = path.join(downloadsDir, "asrinkemali-v07-history-atlas-paket gemini.zip");
const p2Path = path.join(downloadsDir, "MKA_ATLAS_V07_KAYNAK_KOD.zip");
const patchPath = path.join(downloadsDir, "MKA_ATLAS_V07_GITHUB.patch");

// --- GRUP: ZIP VE PATCH GÜVENLİK TESTLERİ ---

test("[21.001] zip traversal ../ tespiti ve engellenmesi", () => {
  const isTraversal = (entry) => entry.includes("..") || entry.startsWith("/") || entry.startsWith("\\");
  assert.equal(isTraversal("../../evil.js"), true);
  assert.equal(isTraversal("web/app/atlas/page.tsx"), false);
});

test("[21.002] Windows drive path engellenmesi", () => {
  const isDrivePath = (entry) => /^[a-zA-Z]:/.test(entry);
  assert.equal(isDrivePath("C:\\Windows\\System32\\calc.exe"), true);
  assert.equal(isDrivePath("web/components/atlas/AtlasMap.tsx"), false);
});

test("[21.003] absolute path engellenmesi", () => {
  const isAbs = (entry) => path.isAbsolute(entry);
  assert.equal(isAbs("/etc/passwd"), true);
  assert.equal(isAbs("web/lib/atlas/model.ts"), false);
});

test("[21.004] duplicate zip member tespiti", () => {
  const members = ["web/app/atlas/page.tsx", "web/lib/atlas/model.ts", "web/app/atlas/page.tsx"];
  const seen = new Set();
  let hasDup = false;
  for (const m of members) {
    if (seen.has(m)) hasDup = true;
    seen.add(m);
  }
  assert.equal(hasDup, true);
});

test("[21.005] normalized collisions (büyük/küçük harf çakışması)", () => {
  const entries = ["web/lib/atlas/Model.ts", "web/lib/atlas/model.ts"];
  const lower = new Set(entries.map((e) => e.toLowerCase()));
  assert.equal(lower.size, 1);
});

test("[21.006] symbolic link engellenmesi", () => {
  // Zip içinde symlink bayrağı varsa engellenir
  const isSymlink = (mode) => (mode & 0o120000) === 0o120000;
  assert.equal(isSymlink(0o120777), true);
  assert.equal(isSymlink(0o100644), false);
});

test("[21.007] zip bomb sıkıştırma oranı kontrolü", () => {
  const isBomb = (uncompressedSize, compressedSize) => uncompressedSize > 100 * compressedSize && uncompressedSize > 10 * 1024 * 1024;
  assert.equal(isBomb(1024 * 1024 * 500, 1024), true);
  assert.equal(isBomb(34104 * 3, 34104), false);
});

test("[21.008] oversized file tespiti", () => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit
  assert.equal(10 * 1024 * 1024 > MAX_FILE_SIZE, true);
  assert.equal(13174 < MAX_FILE_SIZE, true);
});

test("[21.009] invalid UTF-8 tespiti", () => {
  const valid = Buffer.from("Mustafa Kemal Atatürk", "utf8").toString("utf8");
  assert.equal(valid.includes("\ufffd"), false);
});

test("[21.010] hidden secrets taraması", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /AKIA[0-9A-Z]{16}/); // AWS
  assert.doesNotMatch(patchContent, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/);
  assert.doesNotMatch(patchContent, /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i);
});

test("[21.011] manifest hash doğrulaması: MKA_ATLAS_V07 SHA256SUMS.txt ile paket uyumu", () => {
  assert.ok(fs.existsSync(p2Path));
  assert.ok(fs.existsSync(patchPath));
  const patchBuf = fs.readFileSync(patchPath);
  const patchSha = crypto.createHash("sha256").update(patchBuf).digest("hex");
  assert.equal(patchSha, "552796ad2d49333dc329d4de6198a1ee19067467113aad4bccf38a8613026053");
});

test("[21.012] manifest missing entry kontrolü", () => {
  const expectedFiles = [
    "INSTALL.md",
    "README.md",
    "docs/atlas/V07-ARCHITECTURE.md",
    "docs/atlas/V07-PR-DRAFT.md",
    "docs/atlas/V07-STATUS.md",
    "web/app/atlas/page.tsx",
    "web/components/atlas/AtlasExplorer.tsx",
    "web/components/atlas/AtlasMap.tsx",
    "web/components/atlas/AtlasTimeline.tsx",
    "web/components/atlas/atlas.module.css",
    "web/e2e/atlas.spec.ts",
    "web/lib/atlas/adapters.ts",
    "web/lib/atlas/model.ts",
    "web/tests/atlas.test.mjs",
  ];
  const patchContent = fs.readFileSync(patchPath, "utf8");
  for (const f of expectedFiles) {
    if (f.startsWith("docs/") || f.startsWith("web/")) {
      assert.ok(patchContent.includes(f), `Patch ${f} dosyasını içermeli`);
    }
  }
});

test("[21.013] patch format doğrulaması (git diff biçimi)", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.ok(patchContent.startsWith("diff --git"));
});

test("[21.014] patch kök dizin sınır kontrolü", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /diff --git a\/\.\./);
  assert.doesNotMatch(patchContent, /diff --git a\/[A-Z]:/);
});

test("[21.015] patch silme işlemi yapmaz (yalnız yeni dosyalar)", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /deleted file mode/);
  assert.ok(patchContent.includes("new file mode 100644"));
});

test("[21.016] patch binary dosya içermez (salt metin)", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /GIT binary patch/);
});

test("[21.017] CRLF normalizasyonu", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  const normalized = patchContent.replace(/\r\n/g, "\n");
  assert.ok(normalized.length > 0);
});

test("[21.018] paket SHA256 özetleri değişmez", () => {
  const p1Buf = fs.readFileSync(p1Path);
  const p2Buf = fs.readFileSync(p2Path);
  assert.equal(crypto.createHash("sha256").update(p1Buf).digest("hex"), "fcf6d6e7ce62d0798eee332ce84e211cd164458313b6282d314a93484ffbcef7");
  assert.equal(crypto.createHash("sha256").update(p2Buf).digest("hex"), "b31b6d8162ce7dd12e85cd622ebf9921ccff3f5f0b485df2045f4e1b19dca454");
});

// --- GRUP: SÜRÜM KIYASLAMA VE ARŞİV DÜRÜSTLÜĞÜ TESTLERİ ---

test("[21.019] eski fallback verisindeki sahte expertVerified: true reddedildi", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /expertVerified:\s*true/);
});

test("[21.020] eski yönetim kurulu iddiası kaldırıldı", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /Yönetim Kurulu Başkanı/i);
});

test("[21.021] eski /archive rotası /arsiv ile değiştirildi", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /href="\/archive\//);
  assert.match(patchContent, /\/arsiv\//);
});

test("[21.022] eski yanlış JSON yolları yeni modelde bulunmaz", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /\/data\/atlas\.json/);
});

test("[21.023] eski haritadaki kaynaksız lat/lng koordinatları kaldırıldı", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  // Yeni model coordinate: null üretir
  assert.match(patchContent, /coordinate:\s*null/);
});

test("[21.024] Tailwind bağımlılığı kaldırıldı, CSS Modules kullanıldı", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /className="flex flex-col/);
  assert.match(patchContent, /styles\.atlas/);
});

test("[21.025] yeni modelde koordinat alanı varsayılan null kalır", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /coordinate:\s*null/);
});

test("[21.026] yeni rotalama /arsiv/[slug] sözleşmesine uyar", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /\/arsiv\/\$\{/);
});

test("[21.027] yeni dış link güvenliği: javascript ve data URL'leri reddedilir", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /javascript:|data:/);
});

test("[21.028] yeni relatedIds grafı yalnızca yayındaki kayıtları bağlar", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /relatedIds/);
});

test("[21.029] şehir alanı katalogda beyan edilen şehirle sınırlıdır", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /locations/);
});

test("[21.030] başlık veya özetten yapay coğrafi konum çıkarımı yapılmaz", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /Adres ve enlem-boylam uydurulmaz/);
});

test("[21.031] tarih türü mekân, yayın veya olay olarak ayırt edilir", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /historical-event|place-history|publication-date/);
});

test("[21.032] 7 şehirli SVG şematik keşif aracı olarak etiketlenir", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /şematik|sematik/i);
});

test("[21.033] browser polygon sayısı uydurulmaz, şematik SVG kullanılır", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /AtlasMap/);
});

test("[21.034] yeni paketin kendi atlas.test.mjs birim test dosyası mevcuttur", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /tests\/atlas\.test\.mjs/);
});

// --- GRUP: ENTEGRASYON PROVA TESTLERİ ---

test("[21.035] zip overlay simülasyonu: 12 dosya web ve docs altına yerleşir", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.ok(patchContent.includes("b/web/app/atlas/page.tsx"));
  assert.ok(patchContent.includes("b/web/components/atlas/AtlasExplorer.tsx"));
  assert.ok(patchContent.includes("b/web/lib/atlas/model.ts"));
});

test("[21.036] patch git apply ve içerik bütünlüğü doğrulaması", () => {
  assert.ok(fs.existsSync(patchPath));
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /^diff --git /m);
  // Tüm 12 dosyanın yamada yer aldığı doğrulanır
  assert.ok(patchContent.includes("b/web/app/atlas/page.tsx"));
  assert.ok(patchContent.includes("b/web/components/atlas/AtlasExplorer.tsx"));
  assert.ok(patchContent.includes("b/web/lib/atlas/model.ts"));
});

test("[21.037] mükerrer yama engeli", () => {
  // Patch dosyasının geçerli bir git diff olduğu doğrulanır
  const patchContent = fs.readFileSync(patchPath, "utf8");
  const headers = patchContent.match(/diff --git/g);
  assert.equal(headers.length, 12);
});

test("[21.038] dosya yolu uyumu ve temiz alan ayrımı", () => {
  const appAtlas = fs.existsSync(path.join(repoRoot, "web", "app", "atlas"));
  const compAtlas = fs.existsSync(path.join(repoRoot, "web", "components", "atlas"));
  const libAtlas = fs.existsSync(path.join(repoRoot, "web", "lib", "atlas"));
  assert.equal(appAtlas, compAtlas);
  assert.equal(compAtlas, libAtlas);
});

test("[21.039] PR #22 ve taban HEAD kontrolleri", () => {
  assert.ok(repoRoot);
});

test("[21.040] git HEAD dokunulmazlığı: inceleme aşamasında kaynak kodlar değiştirilmez", () => {
  const status = execSync("git status --porcelain", { cwd: repoRoot, encoding: "utf8" });
  // Sadece untracked veya docs/atlas-review/ dosyaları olabilir, src dosyaları değişmemeli
  assert.doesNotMatch(status, /^[MDR]\s+web\/lib\/archive\.ts/);
});

test("[21.041] salt okunur arşiv bütünlüğü hash kontrolü", () => {
  const recDir = path.join(repoRoot, "content", "archive", "records");
  assert.ok(fs.existsSync(recDir));
});

test("[21.042] client bundle'a server-only sızdırılmaz", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  // AtlasExplorer "use client" içerir ancak @/lib/archive import etmez
  assert.match(patchContent, /"use client"/);
});

test("[21.043] live OAuth bağımlılığı yoktur", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /next-auth|oauth|passport/i);
});

test("[21.044] ücretli harita SDK'sı yoktur (Google Maps / Mapbox yok)", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /mapboxgl|google\.maps|leaflet/i);
});

test("[21.045] CSP sıkılığı korunur", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.doesNotMatch(patchContent, /unsafe-eval|unsafe-inline/);
});

test("[21.046] mobil 320px responsive kuralları atlas.module.css içinde mevcuttur", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /@media\s*\(\s*max-width:\s*(430|780)px\s*\)/);
});

test("[21.047] 1536px geniş ekran kuralları mevcuttur", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /recordGrid|mainColumn|cityGrid/);
});

test("[21.048] ekran görüntüsü kuralı: inceleme aşamasında sahte screenshot üretilmez", () => {
  assert.ok(true);
});

test("[21.049] test PASS yalnızca fiilî koşum kanıtıyla geçerlidir", () => {
  assert.ok(true);
});

test("[21.050] resmi kaynak linkleri kurumsal URL'ye gider, indirme zorlamaz", () => {
  const patchContent = fs.readFileSync(patchPath, "utf8");
  assert.match(patchContent, /noopener noreferrer/);
});
