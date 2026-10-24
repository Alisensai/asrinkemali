#!/usr/bin/env node
/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * File Integrity Monitoring (FIM) — Bağımsız Dosya Bütünlüğü İzleme Aracı
 * ==============================================================================
 * Sıfır dış bağımlılıklı saf Node.js motoru.
 * Kritik kaynak kod, statik varlıklar ve arşiv veri bütünlüğünü SHA-256 ile doğrular.
 * Yetkisiz dosya değişikliği, ekleme veya silinmeleri anında tespit eder.
 * ==============================================================================
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, join, posix } from "node:path";
import { createHash } from "node:crypto";

const IGNORE_PATTERNS = [
  /(?:^|[\\/])\.git(?:[\\/]|$)/,
  /(?:^|[\\/])node_modules(?:[\\/]|$)/,
  /(?:^|[\\/])\.next(?:[\\/]|$)/,
  /(?:^|[\\/])dist(?:[\\/]|$)/,
  /(?:^|[\\/])\.turbo(?:[\\/]|$)/,
  /(?:^|[\\/])coverage(?:[\\/]|$)/,
  /\.DS_Store$/,
  /thumbs\.db$/i,
];

function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function computeSha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function scanDirectory(targetDir, baseDir = targetDir) {
  const fileEntries = [];
  const entries = readdirSync(targetDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(targetDir, entry.name);
    if (shouldIgnore(fullPath)) continue;

    if (entry.isDirectory()) {
      fileEntries.push(...scanDirectory(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = relative(baseDir, fullPath).replace(/\\/g, "/");
      const buffer = readFileSync(fullPath);
      const sha256 = computeSha256(buffer);
      fileEntries.push({
        path: relPath,
        sizeBytes: buffer.length,
        sha256
      });
    }
  }

  return fileEntries.sort((a, b) => a.path.localeCompare(b.path));
}

export function generateManifest(targetDir) {
  const files = scanDirectory(targetDir);
  const manifestData = {
    version: "1.1.0",
    generatedAt: new Date().toISOString(),
    targetDirectory: relative(process.cwd(), targetDir).replace(/\\/g, "/") || ".",
    fileCount: files.length,
    files
  };
  return manifestData;
}

export function verifyManifest(targetDir, manifestData) {
  const currentFiles = scanDirectory(targetDir);
  const currentMap = new Map(currentFiles.map((f) => [f.path, f]));
  const baselineMap = new Map(manifestData.files.map((f) => [f.path, f]));

  const matched = [];
  const modified = [];
  const added = [];
  const deleted = [];

  for (const [path, baseFile] of baselineMap.entries()) {
    const currFile = currentMap.get(path);
    if (!currFile) {
      deleted.push(path);
    } else if (currFile.sha256 !== baseFile.sha256) {
      modified.push({
        path,
        expectedSha256: baseFile.sha256,
        actualSha256: currFile.sha256,
        oldSize: baseFile.sizeBytes,
        newSize: currFile.sizeBytes
      });
    } else {
      matched.push(path);
    }
  }

  for (const [path] of currentMap.entries()) {
    if (!baselineMap.has(path)) {
      added.push(path);
    }
  }

  const isValid = modified.length === 0 && added.length === 0 && deleted.length === 0;

  return {
    isValid,
    summary: {
      totalBaseline: baselineMap.size,
      totalCurrent: currentMap.size,
      matchedCount: matched.length,
      modifiedCount: modified.length,
      addedCount: added.length,
      deletedCount: deleted.length
    },
    details: {
      matched,
      modified,
      added,
      deleted
    }
  };
}

// CLI Yürütücüsü
function runCli() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(`ASRIN KEMALİ FIM (File Integrity Monitoring) v1.1
Kullanım:
  node fim.mjs manifest --dir=<dizin> [--out=<manifest.json>]
  node fim.mjs verify --manifest=<manifest.json> [--dir=<dizin>]
`);
    process.exit(0);
  }

  const getArg = (name) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split("=")[1] : null;
  };

  if (command === "manifest") {
    const dirArg = getArg("dir") || ".";
    const outArg = getArg("out");
    const targetDir = resolve(process.cwd(), dirArg);
    const manifest = generateManifest(targetDir);

    if (outArg) {
      const outPath = resolve(process.cwd(), outArg);
      writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf-8");
      console.log(`[✓] Manifest başarıyla oluşturuldu: ${outArg} (${manifest.fileCount} dosya taranmıştır)`);
    } else {
      console.log(JSON.stringify(manifest, null, 2));
    }
    process.exit(0);
  }

  if (command === "verify") {
    const manifestArg = getArg("manifest");
    if (!manifestArg) {
      console.error("[!] Hata: --manifest parametresi zorunludur.");
      process.exit(1);
    }
    const dirArg = getArg("dir") || ".";
    const targetDir = resolve(process.cwd(), dirArg);
    const manifestContent = JSON.parse(readFileSync(resolve(process.cwd(), manifestArg), "utf-8"));
    const report = verifyManifest(targetDir, manifestContent);

    console.log("=== ASRIN KEMALİ FIM Bütünlük Raporu ===");
    console.log(`Eşleşen: ${report.summary.matchedCount} dosya`);
    console.log(`Değiştirilen: ${report.summary.modifiedCount} dosya`);
    console.log(`Eklenen: ${report.summary.addedCount} dosya`);
    console.log(`Silinen: ${report.summary.deletedCount} dosya`);

    if (report.isValid) {
      console.log("[✓] BÜTÜNLÜK TAM: Hiçbir yetkisiz değişiklik tespit edilmedi.");
      process.exit(0);
    } else {
      console.error("[!] BÜTÜNLÜK İHLALİ TESPİT EDİLDİ (SEV-1)!");
      if (report.details.modified.length > 0) {
        console.error("Değiştirilen dosyalar:", report.details.modified);
      }
      if (report.details.added.length > 0) {
        console.error("Yeni eklenen dosyalar:", report.details.added);
      }
      if (report.details.deleted.length > 0) {
        console.error("Silinen dosyalar:", report.details.deleted);
      }
      process.exit(1);
    }
  }

  console.error(`[!] Geçersiz komut: ${command}`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith("fim.mjs")) {
  runCli();
}
