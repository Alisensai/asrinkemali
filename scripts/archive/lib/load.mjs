/**
 * Arşiv dosyalarını diskten okur. Doğrulama katmanı bu modülün döndürdüğü
 * kayıtları denetler; okuma hataları istisna yerine hata listesi olarak döner.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertFileSize, MAX_JSON_BYTES, MAX_RECORDS } from "./security.mjs";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

export function resolveRoot(root) {
  return path.resolve(root ?? REPO_ROOT);
}

export async function readJsonFile(filePath, { maxBytes = MAX_JSON_BYTES } = {}) {
  const errors = [];
  const warnings = [];
  const sizeCheck = await assertFileSize(filePath, maxBytes, { label: "JSON" });
  if (!sizeCheck.ok) {
    return { data: null, errors: sizeCheck.errors, warnings, bytes: sizeCheck.size };
  }
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    return { data: null, errors: [`Dosya okunamadı: ${error.message}`], warnings, bytes: sizeCheck.size };
  }
  if (text.charCodeAt(0) === 0xfeff) {
    warnings.push("Dosyada UTF-8 BOM var; kaldırılması önerilir.");
    text = text.slice(1);
  }
  try {
    return { data: JSON.parse(text), errors, warnings, bytes: sizeCheck.size };
  } catch (error) {
    return {
      data: null,
      errors: [`Geçersiz JSON: ${error.message}`],
      warnings,
      bytes: sizeCheck.size,
    };
  }
}

export async function loadTaxonomy(root) {
  const resolvedRoot = resolveRoot(root);
  const filePath = path.join(resolvedRoot, "content", "archive", "taxonomy.json");
  const result = await readJsonFile(filePath);
  return {
    taxonomy: result.data,
    file: filePath,
    errors: result.errors.map((error) => `Taksonomi: ${error}`),
    warnings: result.warnings,
  };
}

export async function loadSchema(root, fileName) {
  const resolvedRoot = resolveRoot(root);
  const filePath = path.join(resolvedRoot, "schemas", fileName);
  const result = await readJsonFile(filePath);
  return {
    schema: result.data,
    file: filePath,
    errors: result.errors.map((error) => `Şema (${fileName}): ${error}`),
    warnings: result.warnings,
  };
}

export const RECORD_DIRS = Object.freeze([
  { relative: ["content", "archive", "records"], source: "legacy" },
  { relative: ["data", "archive", "catalog"], source: "catalog" },
]);

export async function loadRecords(root) {
  const resolvedRoot = resolveRoot(root);
  const errors = [];
  const warnings = [];
  const records = [];
  const files = [];
  let foundDirectory = false;

  for (const directory of RECORD_DIRS) {
    const recordsDir = path.join(resolvedRoot, ...directory.relative);
    const label = directory.relative.join("/");
    let entries;
    try {
      entries = await fs.readdir(recordsDir, { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") {
        errors.push(`Kayıt dizini okunamadı (${label}): ${error.message}`);
      }
      continue;
    }
    foundDirectory = true;
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "tr"));
    if (jsonFiles.length === 0) {
      warnings.push(`${label}: dizinde JSON dosyası yok.`);
      continue;
    }
    for (const name of jsonFiles) {
      const filePath = path.join(recordsDir, name);
      const result = await readJsonFile(filePath);
      warnings.push(...result.warnings.map((warning) => `${label}/${name}: ${warning}`));
      if (result.errors.length > 0) {
        errors.push(...result.errors.map((error) => `${label}/${name}: ${error}`));
        continue;
      }
      const data = result.data;
      if (Array.isArray(data)) {
        data.forEach((record, index) => {
          records.push(record);
          files.push({ file: name, index, source: directory.source, path: `${label}/${name}` });
        });
      } else if (data && typeof data === "object") {
        records.push(data);
        files.push({ file: name, index: null, source: directory.source, path: `${label}/${name}` });
      } else {
        errors.push(`${label}/${name}: kök değer nesne veya dizi olmalı.`);
      }
      if (records.length > MAX_RECORDS) {
        errors.push(`Kayıt sayısı ${MAX_RECORDS} sınırını aşıyor.`);
        break;
      }
    }
    if (records.length > MAX_RECORDS) break;
  }

  if (!foundDirectory) {
    errors.push(
      "Kayıt dizini okunamadı: content/archive/records veya data/archive/catalog bulunamadı."
    );
  } else if (records.length === 0) {
    errors.push("Kayıt dizinlerinde hiç JSON dosyası yok.");
  }
  return { records, files, errors, warnings };
}

export async function loadArchive(root) {
  const resolvedRoot = resolveRoot(root);
  const [taxonomyResult, recordSchemaResult, taxonomySchemaResult, recordsResult] =
    await Promise.all([
      loadTaxonomy(resolvedRoot),
      loadSchema(resolvedRoot, "archive-record.schema.json"),
      loadSchema(resolvedRoot, "archive-taxonomy.schema.json"),
      loadRecords(resolvedRoot),
    ]);
  return {
    root: resolvedRoot,
    taxonomy: taxonomyResult.taxonomy,
    recordSchema: recordSchemaResult.schema,
    taxonomySchema: taxonomySchemaResult.schema,
    records: recordsResult.records,
    files: recordsResult.files,
    errors: [
      ...taxonomyResult.errors,
      ...recordSchemaResult.errors,
      ...taxonomySchemaResult.errors,
      ...recordsResult.errors,
    ],
    warnings: [
      ...taxonomyResult.warnings,
      ...recordSchemaResult.warnings,
      ...taxonomySchemaResult.warnings,
      ...recordsResult.warnings,
    ],
  };
}
