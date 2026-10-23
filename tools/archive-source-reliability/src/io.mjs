/**
 * Dosya giriş/çıkış yardımcıları.
 *
 * Güvenlik kuralı: rapor çıktısı gerçek arşiv dizinlerine (`data/archive`,
 * `content/archive`) yazılamaz. Araç, arşiv kayıtları için salt okunurdur.
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function readJson(filePath, fallback = null) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

export async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

export function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeOutputDir(outDir, repoRoot) {
  const resolved = path.resolve(outDir);
  const forbidden = [
    path.join(repoRoot, "data", "archive"),
    path.join(repoRoot, "content", "archive"),
    path.join(repoRoot, ".git"),
  ];
  for (const directory of forbidden) {
    if (isInside(directory, resolved)) {
      throw new Error(
        `Güvenlik: rapor çıktısı arşiv/git dizinine yazılamaz (${resolved}). ` +
          "Bu araç gerçek arşiv dosyaları için salt okunurdur."
      );
    }
  }
  return resolved;
}

export async function fileSha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function directoryFileHashes(directory) {
  const hashes = {};
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return hashes;
    throw error;
  }
  for (const entry of entries.filter((item) => item.isFile()).sort((a, b) => a.name.localeCompare(b.name, "tr"))) {
    hashes[entry.name] = await fileSha256(path.join(directory, entry.name));
  }
  return hashes;
}
