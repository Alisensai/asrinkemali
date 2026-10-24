/**
 * Kaynak adayı sözleşmesi: güvenilmeyen girdi temizliği, saf geçiş ve atomik
 * havuz birleştirme (Görev 07). #19 `SourceCandidate` v1.0.0 sözleşmesi değişmez.
 */

import { addCandidate, transitionState, validateCandidate } from "../candidates.mjs";
import { normalizeUrl } from "../dedupe.mjs";

export const INPUT_LIMITS = Object.freeze({ maxBytes: 10 * 1024 * 1024, maxCandidates: 50_000, maxDepth: 16 });

/** Dışarıdan gelen ve karar kanıtı SAYILMAYAN alanlar. */
export const UNTRUSTED_DECISION_FIELDS = Object.freeze(["approvedBy", "approvedAt", "publicationApproval", "reviewedBy", "humanApproval", "approval", "editorApproval"]);

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function depthOf(value, depth = 0) {
  if (depth > INPUT_LIMITS.maxDepth || value === null || typeof value !== "object") return depth;
  let max = depth + 1;
  for (const inner of Object.values(value)) max = Math.max(max, depthOf(inner, depth + 1));
  return max;
}

/**
 * Güvenilmeyen JSON metnini sınırlarla ayrıştırır. Prototip anahtarları, aşırı
 * derinlik ve büyük girdi açık hata koduyla reddedilir; ayrıştırıcı mesajı (yerel
 * yol veya içerik parçası taşıyabilir) dışarı sızdırılmaz.
 */
export function parseUntrustedJson(text) {
  if (typeof text !== "string") return { ok: false, code: "INPUT_NOT_TEXT" };
  if (Buffer.byteLength(text, "utf8") > INPUT_LIMITS.maxBytes) return { ok: false, code: "INPUT_TOO_LARGE" };
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let forbidden = false;
  let value;
  try {
    value = JSON.parse(clean, (key, inner) => {
      if (FORBIDDEN_KEYS.has(key)) forbidden = true;
      return inner;
    });
  } catch {
    return { ok: false, code: "JSON_PARSE" };
  }
  if (forbidden) return { ok: false, code: "PROTOTYPE_KEY" };
  if (depthOf(value) > INPUT_LIMITS.maxDepth) return { ok: false, code: "INPUT_TOO_DEEP" };
  return { ok: true, value };
}

/**
 * İçe aktarılan adayı güvenli forma indirger: inceleme/onay/erişim/hak iddiaları
 * sıfırlanır, karar alanları atılır, sentetik işareti korunur (gerçek kaynağa
 * dönüştürülmez). Orijinal nesne değiştirilmez.
 * @param {object} candidate
 * @param {{now: string, source: string}} context
 */
export function sanitizeImportedCandidate(candidate, context) {
  const removed = [];
  const copy = structuredClone(candidate);
  for (const field of UNTRUSTED_DECISION_FIELDS) {
    if (Object.hasOwn(copy, field)) {
      removed.push(field);
      delete copy[field];
    }
  }
  if (copy.rights && copy.rights.status && copy.rights.status !== "unknown") removed.push("rights.status");
  if (copy.urlStatus && copy.urlStatus !== "unchecked") removed.push("urlStatus");
  if (copy.verification && Object.values(copy.verification).some((value) => value === true)) removed.push("verification.*");
  if (copy.state && copy.state !== "new") removed.push("state");
  return {
    candidate: {
      ...copy,
      // İçe aktarılan sentetik veri sentetik kalır; "synthetic:false" yazmak gerçek kaynak yapmaz.
      synthetic: copy.synthetic === true,
      urlStatus: "unchecked",
      urlCheckedAt: null,
      rights: {
        status: "unknown",
        license: null,
        licenseUrl: null,
        termsUrl: null,
        credit: typeof copy.institution === "string" ? copy.institution : "",
        imageReuse: "not_downloaded",
        note: "İçe aktarma: hak bilgisi doğrulanmadı; yalnız kaynak bağlantısı gösterilir.",
      },
      verification: { urlReachable: false, citationComplete: false, rightsKnown: false, duplicateChecked: false, aiReviewed: false, humanReviewed: false, notes: "" },
      state: "new",
      stateHistory: [{ state: "new", at: context.now, note: `${context.source} içe aktarması; onay ve güven iddiaları sıfırlandı` }],
      importTrust: "unverified",
    },
    removedClaims: removed.sort(),
  };
}

/**
 * Havuzu DEĞİŞTİRMEDEN birleştirme sonucu üretir. Her aday ayrı kabul/ret alır;
 * yeni havuz yalnız sonuçta döner (yarım değiştirilmiş havuz yoktur).
 * @returns {{pool: Array, accepted: string[], rejected: Array<{id: string|null, code: string, message: string}>, warnings: Array}}
 */
export function mergeIntoPoolAtomic(pool, incoming) {
  const working = pool.map((candidate) => structuredClone(candidate));
  const accepted = [];
  const rejected = [];
  const warnings = [];
  for (const candidate of incoming) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      rejected.push({ id: null, code: "NOT_OBJECT", message: "Aday nesne değil." });
      continue;
    }
    const result = addCandidate(working, structuredClone(candidate));
    if (result.ok) accepted.push(candidate.id);
    else rejected.push({ id: typeof candidate.id === "string" ? candidate.id : null, code: result.issues[0]?.code ?? "UNKNOWN", message: result.issues.map((issue) => issue.message).join(" ") });
  }
  const byUrl = new Map();
  for (const candidate of working) {
    const key = normalizeUrl(candidate.url);
    if (key && byUrl.has(key)) warnings.push({ code: "URL_COLLISION_AFTER_MERGE", ids: [byUrl.get(key), candidate.id] });
    if (key) byUrl.set(key, candidate.id);
  }
  const sort = (a, b) => String(a.id ?? "").localeCompare(String(b.id ?? ""), "en");
  return { pool: working, accepted: accepted.sort(), rejected: rejected.sort(sort), warnings };
}

/**
 * Saf aday geçişi: girdiyi değiştirmez; izin matrisini #19 `transitionState`
 * üzerinden uygular. Ret durumunda `{ok:false}` döner.
 */
export function transitionCandidate(candidate, nextState, { reason = "", at }) {
  const copy = structuredClone(candidate);
  try {
    transitionState(copy, nextState, reason, { at });
    return { ok: true, candidate: copy };
  } catch (error) {
    return { ok: false, code: "TRANSITION_REJECTED", message: error instanceof Error ? error.message : "Geçiş reddedildi." };
  }
}

/** Alan bazlı sorun listesi (code/severity/path/message/sourceId). */
export function candidateIssues(candidate) {
  const result = validateCandidate(candidate);
  return result.issues.map((issue) => ({ code: issue.code, severity: issue.severity ?? "error", path: issue.path, message: issue.message, sourceId: issue.sourceId ?? null }));
}
