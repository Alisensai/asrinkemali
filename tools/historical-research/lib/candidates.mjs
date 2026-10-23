/**
 * Kaynak adayı havuzu.
 *
 * Adaylar gerçek yayımlanmış arşive ASLA doğrudan girmez. Her aday bir durum
 * makinesi izler ve hiçbir durum otomatik olarak insan uzman/editör onayı
 * üretmez. `import_ready` bile dönüşüm ön hazırlığıdır; yayımlama kararı
 * insan incelemesiyle ayrıca verilir.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CANDIDATE_STATES, INSTITUTION_TYPES, DOCUMENT_TYPES, assertNoCatalogWrite } from "./types.mjs";
import { validateExternalUrl } from "./url-security.mjs";
import { normalizeUrl } from "./dedupe.mjs";

/**
 * Adayın yapısal doğrulaması. Künye eksikliği uydurulmadan "eksik" olarak işaretlenir.
 * @param {object} candidate
 * @returns {{ok: boolean, issues: Array<{code: string, path: string, message: string}>}}
 */
export function validateCandidate(candidate) {
  const issues = [];
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, issues: [{ code: "NOT_OBJECT", path: "$", message: "Aday bir nesne olmalı." }] };
  }
  if (!/^src-\d{4}-\d{3,6}$/.test(candidate.id ?? "")) {
    issues.push({ code: "BAD_ID", path: "$.id", message: "Kimlik 'src-YYYY-NNNN' biçiminde olmalı." });
  }
  if (typeof candidate.title !== "string" || candidate.title.trim().length < 3) {
    issues.push({ code: "MISSING_TITLE", path: "$.title", message: "Başlık en az 3 karakter olmalı." });
  }
  if (!INSTITUTION_TYPES.includes(candidate.institutionType)) {
    issues.push({ code: "BAD_INSTITUTION_TYPE", path: "$.institutionType", message: "Bilinmeyen kurum türü." });
  }
  if (!DOCUMENT_TYPES.includes(candidate.documentType)) {
    issues.push({ code: "BAD_DOCUMENT_TYPE", path: "$.documentType", message: "Bilinmeyen belge türü." });
  }
  if (!CANDIDATE_STATES.includes(candidate.state)) {
    issues.push({ code: "BAD_STATE", path: "$.state", message: "Bilinmeyen aday durumu." });
  }
  const urlCheck = validateExternalUrl(candidate.url ?? "");
  if (!urlCheck.ok) {
    for (const error of urlCheck.errors) {
      issues.push({ code: `URL_${error.code}`, path: "$.url", message: error.message });
    }
  }
  if (!candidate.institution || typeof candidate.institution !== "string") {
    issues.push({ code: "MISSING_INSTITUTION", path: "$.institution", message: "Kaynak kurum zorunlu." });
  }
  if (typeof candidate.accessedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.accessedAt)) {
    issues.push({ code: "BAD_ACCESSED_AT", path: "$.accessedAt", message: "Erişim tarihi YYYY-MM-DD olmalı." });
  }
  // Künye bütünlüğü: yazar yoksa bu UYDURULMAZ, eksiklik olarak işaretlenir.
  const citationComplete =
    Boolean(candidate.title && candidate.institution && candidate.url) &&
    (Array.isArray(candidate.authors) ? candidate.authors.length > 0 : false) &&
    Boolean(candidate.publishedAt);
  // Hak bilgisi bilinmiyorsa yalnızca bağlantı sunulur.
  const rightsKnown = Boolean(candidate?.rights?.status && candidate.rights.status !== "unknown");
  return { ok: issues.length === 0, issues, citationComplete, rightsKnown };
}

/**
 * Aday durumunu değiştirir. Geçişler tek yönlü denetlenir ve her değişiklik
 * stateHistory'ye yazılır. "published" gibi bir durum YOKTUR: havuz, yayımlama
 * kararı üretmez.
 */
export function transitionState(candidate, nextState, note = "") {
  if (!CANDIDATE_STATES.includes(nextState)) {
    throw new Error(`Geçersiz aday durumu: ${nextState}`);
  }
  const previous = candidate.state;
  // Reddedilen aday yeniden açılabilir (insan kararıyla), ancak otomatik
  // yükseltme zinciri yoktur: rejected → awaiting_human_review gibi geçişler
  // yalnızca insan kararıyla yapılır ve not ister.
  candidate.state = nextState;
  candidate.stateHistory.push({ state: nextState, at: new Date().toISOString(), note: `${previous} → ${nextState}${note ? ` — ${note}` : ""}` });
  return candidate;
}

/** Havuza yeni aday ekler (kimlik ve URL tekrarı denetimli). */
export function addCandidate(pool, candidate) {
  const validation = validateCandidate(candidate);
  if (!validation.ok) {
    return { ok: false, issues: validation.issues };
  }
  if (pool.some((existing) => existing.id === candidate.id)) {
    return { ok: false, issues: [{ code: "DUPLICATE_ID", path: "$.id", message: `Aday kimliği zaten havuzda: ${candidate.id}` }] };
  }
  const normalized = normalizeUrl(candidate.url);
  if (pool.some((existing) => normalizeUrl(existing.url) === normalized)) {
    return { ok: false, issues: [{ code: "DUPLICATE_URL", path: "$.url", message: "Aynı URL havuzda zaten var." }] };
  }
  pool.push(candidate);
  return { ok: true, issues: [] };
}

/**
 * Havuzu diskten yükler.
 * @param {string} poolPath
 */
export async function loadPool(poolPath) {
  const text = await fs.readFile(poolPath, "utf8");
  const data = JSON.parse(text);
  return { schemaVersion: data.schemaVersion, candidates: data.candidates ?? [], meta: data.meta ?? {} };
}

/**
 * Havuzu diske yazar. Korumalı arşiv yollarına yazma reddedilir.
 */
export async function savePool(poolPath, pool) {
  assertNoCatalogWrite(poolPath);
  await fs.mkdir(path.dirname(poolPath), { recursive: true });
  const payload = {
    schemaVersion: "1.0.0",
    meta: {
      ...pool.meta,
      note: "Aday havuzu: bu kayıtlar yayımlanmış arşiv DEĞİLDİR; hiçbiri insan onayı olmadan yayımlanmaz.",
      updatedAt: new Date().toISOString(),
    },
    candidates: pool.candidates,
  };
  await fs.writeFile(poolPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

/**
 * Havuz özet istatistiği.
 */
export function poolSummary(pool) {
  const byState = Object.fromEntries(CANDIDATE_STATES.map((state) => [state, 0]));
  const byInstitution = {};
  const byTheme = {};
  for (const candidate of pool) {
    byState[candidate.state] = (byState[candidate.state] ?? 0) + 1;
    byInstitution[candidate.institution] = (byInstitution[candidate.institution] ?? 0) + 1;
    for (const theme of candidate.researchThemes ?? []) {
      byTheme[theme] = (byTheme[theme] ?? 0) + 1;
    }
  }
  return {
    total: pool.length,
    synthetic: pool.filter((candidate) => candidate.synthetic).length,
    byState,
    byInstitution,
    byTheme,
  };
}
