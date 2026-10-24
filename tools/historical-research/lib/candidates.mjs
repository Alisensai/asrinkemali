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
import { CANDIDATE_STATES, CANDIDATE_TRANSITIONS, TRANSITIONS_REQUIRING_REASON, INSTITUTION_TYPES, DOCUMENT_TYPES, SOURCE_NATURES, assertNoCatalogWrite } from "./types.mjs";
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
  // Görev 07 ek doğrulamaları: varsayılan atanmaz, alana özgü sorun üretilir.
  if (!SOURCE_NATURES.includes(candidate.sourceNature)) {
    issues.push({ code: "BAD_SOURCE_NATURE", path: "$.sourceNature", message: "Kaynak niteliği primary/secondary/unknown olmalı; birincil varsayılmaz." });
  }
  if (typeof candidate.accessedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.accessedAt) && !isCalendarDate(candidate.accessedAt)) {
    issues.push({ code: "BAD_ACCESSED_AT", path: "$.accessedAt", message: "Erişim tarihi takvimde yok." });
  }
  if (candidate.publishedAt !== null && candidate.publishedAt !== undefined && !isPartialDate(candidate.publishedAt)) {
    issues.push({ code: "BAD_PUBLISHED_AT", path: "$.publishedAt", message: "Yayın tarihi YYYY, YYYY-MM veya geçerli YYYY-MM-DD olmalı." });
  }
  for (const field of ["eventYear", "periodStart", "periodEnd"]) {
    const value = candidate[field];
    if (value !== null && value !== undefined && !(Number.isInteger(value) && value >= 1000 && value <= 2100)) {
      issues.push({ code: "BAD_YEAR", path: `$.${field}`, message: `${field} tam sayı yıl veya null olmalı.` });
    }
  }
  if (Number.isInteger(candidate.periodStart) && Number.isInteger(candidate.periodEnd) && candidate.periodStart > candidate.periodEnd) {
    issues.push({ code: "PERIOD_REVERSED", path: "$.periodStart", message: "Dönem başlangıcı bitişten büyük olamaz." });
  }
  if (candidate.rights !== undefined && (candidate.rights === null || typeof candidate.rights !== "object" || Array.isArray(candidate.rights))) {
    issues.push({ code: "BAD_RIGHTS", path: "$.rights", message: "Hak alanı nesne olmalı." });
  }
  if (candidate.verification !== undefined && (candidate.verification === null || typeof candidate.verification !== "object" || Array.isArray(candidate.verification))) {
    issues.push({ code: "BAD_VERIFICATION", path: "$.verification", message: "Doğrulama alanı nesne olmalı." });
  }
  if (candidate.authors !== undefined && (!Array.isArray(candidate.authors) || candidate.authors.some((author) => !author || typeof author.name !== "string" || !author.name.trim()))) {
    issues.push({ code: "BAD_AUTHORS", path: "$.authors", message: "Yazarlar {name} nesnelerinden oluşan dizi olmalı; boş ad yer tutucu olarak yazılmaz." });
  }
  const sourceId = typeof candidate.id === "string" ? candidate.id : null;
  for (const issue of issues) {
    // Bu doğrulayıcının bütün bulguları adayı geçersiz yapar; uyarılar ayrı katmanda.
    issue.severity ??= "error";
    issue.sourceId ??= sourceId;
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
export function transitionState(candidate, nextState, note = "", options = {}) {
  if (!CANDIDATE_STATES.includes(nextState)) {
    throw new Error(`Geçersiz aday durumu: ${nextState}`);
  }
  const previous = candidate.state;
  // Görev 07: açık izin matrisi. Reddedilen geçişte aday DEĞİŞTİRİLMEZ.
  if (previous === nextState) return candidate; // aynı geçiş tekrar edilirse geçmiş çoğaltılmaz
  if (!(CANDIDATE_TRANSITIONS[previous] ?? []).includes(nextState)) {
    throw new Error(`İzin verilmeyen aday geçişi: ${previous} → ${nextState}`);
  }
  if (TRANSITIONS_REQUIRING_REASON.includes(`${previous}->${nextState}`) && !String(note).trim()) {
    throw new Error(`Bu geçiş gerekçe ister: ${previous} → ${nextState}`);
  }
  const at = options.at ?? new Date().toISOString();
  if (typeof at !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(at) || Number.isNaN(Date.parse(at))) {
    throw new Error("Geçiş zamanı saat dilimli ISO 8601 olmalı.");
  }
  if (!Array.isArray(candidate.stateHistory)) candidate.stateHistory = [];
  candidate.state = nextState;
  candidate.stateHistory.push({ state: nextState, at, note: `${previous} → ${nextState}${note ? ` — ${note}` : ""}` });
  return candidate;
}

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isPartialDate(value) {
  if (typeof value !== "string") return false;
  if (/^\d{4}$/.test(value)) return true;
  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) return Number(month[2]) >= 1 && Number(month[2]) <= 12;
  return isCalendarDate(value);
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
