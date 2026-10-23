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

export async function loadRecords(root) {
  const resolvedRoot = resolveRoot(root);
  const recordsDir = path.join(resolvedRoot, "content", "archive", "records");
  const errors = [];
  const warnings = [];
  const records = [];
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(recordsDir, { withFileTypes: true });
  } catch (error) {
    return {
      records,
      files,
      errors: [`Kayıt dizini okunamadı: ${error.message}`],
      warnings,
    };
  }
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "tr"));
  if (jsonFiles.length === 0) {
    errors.push("Kayıt dizininde hiç JSON dosyası yok.");
  }
  for (const name of jsonFiles) {
    const filePath = path.join(recordsDir, name);
    const result = await readJsonFile(filePath);
    warnings.push(...result.warnings.map((warning) => `${name}: ${warning}`));
    if (result.errors.length > 0) {
      errors.push(...result.errors.map((error) => `${name}: ${error}`));
      continue;
    }
    const data = result.data;
    if (Array.isArray(data)) {
      data.forEach((record, index) => {
        records.push(record);
        files.push({ file: name, index });
      });
    } else if (data && typeof data === "object") {
      records.push(data);
      files.push({ file: name, index: null });
    } else {
      errors.push(`${name}: kök değer nesne veya dizi olmalı.`);
    }
    if (records.length > MAX_RECORDS) {
      errors.push(`Kayıt sayısı ${MAX_RECORDS} sınırını aşıyor.`);
      break;
    }
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
