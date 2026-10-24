/**
 * Arşiv bağlamı: mevcut salt okunur arşiv yükleyicisini kullanır, araç veri
 * dosyalarını (kapsam dönemleri, sınıflandırma geçersiz kılmaları, kaynak
 * geçmişi, adaylar) okur. Arşiv kayıtlarına hiçbir zaman yazmaz.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadArchive } from "../../../scripts/archive/lib/load.mjs";
import { readJson } from "./io.mjs";
import { normalizeSourceIdentifier } from "./util.mjs";

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = path.resolve(TOOL_ROOT, "..", "..");

export const DEFAULT_PATHS = Object.freeze({
  reportsDir: path.join(TOOL_ROOT, "reports"),
  coverageConfig: path.join(TOOL_ROOT, "data", "coverage-periods.json"),
  candidateFile: path.join(TOOL_ROOT, "data", "early-period-candidates.json"),
  classificationOverrides: path.join(TOOL_ROOT, "data", "classification-overrides.json"),
  sourceHistory: path.join(TOOL_ROOT, "data", "source-history.json"),
});

export function resolvePath(value, fallback) {
  return value ? path.resolve(value) : fallback;
}

export async function loadArchiveContext({ root = REPO_ROOT } = {}) {
  const archive = await loadArchive(root);
  const records = archive.records.filter((record) => record && typeof record === "object" && !Array.isArray(record));
  const byId = new Map();
  for (const record of records) {
    if (typeof record.id === "string") byId.set(record.id, record);
  }
  return {
    root: archive.root,
    archive,
    records,
    byId,
    errors: archive.errors,
    warnings: archive.warnings,
    fileCount: archive.files.length,
  };
}

export async function loadCoverageConfig(filePath = DEFAULT_PATHS.coverageConfig) {
  const fallback = {
    schemaVersion: "1.0.0",
    period: { id: "1881-1918", start: "1881-01-01", end: "1918-12-31", label: "Atatürk'ün 1881-1918 dönemi" },
    phases: [],
  };
  return (await readJson(filePath, fallback)) ?? fallback;
}

export async function loadClassificationOverrides(filePath = DEFAULT_PATHS.classificationOverrides) {
  const fallback = { schemaVersion: "1.0.0", overrides: {} };
  return (await readJson(filePath, fallback)) ?? fallback;
}

export async function loadSourceHistory(filePath = DEFAULT_PATHS.sourceHistory) {
  const fallback = {
    schemaVersion: "1.0.0",
    updatedAt: null,
    policy: "Kaynak URL'si değiştiğinde eski URL silinmez; değişiklik kaydı bu dosyada tutulur.",
    sources: [],
  };
  return (await readJson(filePath, fallback)) ?? fallback;
}

export async function loadCandidateFile(filePath = DEFAULT_PATHS.candidateFile) {
  const fallback = {
    schemaVersion: "1.0.0",
    discoveredAt: null,
    status: "unverified",
    ingestPolicy: "manual_expert_verification_required",
    candidates: [],
  };
  return (await readJson(filePath, fallback)) ?? fallback;
}

export function indexSourceHistory(history) {
  const byRecordId = new Map();
  for (const entry of history?.sources ?? []) {
    if (entry?.recordId) byRecordId.set(entry.recordId, entry);
  }
  return byRecordId;
}

export function sourceIdentifierKeys(record) {
  const keys = new Set();
  const sourceId = normalizeSourceIdentifier(record?.source?.archiveIdentifier);
  if (sourceId) keys.add(`source:${sourceId}`);
  for (const provenance of record?.provenance ?? []) {
    const identifier = normalizeSourceIdentifier(provenance?.identifier);
    if (identifier) keys.add(`provenance:${identifier}`);
  }
  return [...keys];
}
