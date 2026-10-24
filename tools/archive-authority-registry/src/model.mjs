/**
 * ASRIN KEMALİ — Authority Registry Veri Modeli ve Doğrulama
 * 
 * Güvenlik ve Uyumluluk:
 * - Deterministik kimlik üretimi (mka:person:*, mka:place:*, mka:institution:*, mka:event:*, mka:work:*)
 * - Türkçe karakter ve Unicode (NFC/NFD) normalizasyonu
 * - fail-closed insan onay alanı (humanApproval: null)
 */

import crypto from "node:crypto";

export const ENTITY_KINDS = Object.freeze([
  "person",
  "place",
  "institution",
  "event",
  "source_work",
  "source_manifestation",
  "source_item"
]);

// Geriye dönük uyumluluk için alias
export const ENTITY_TYPES = ENTITY_KINDS;

export const RECORD_RELATIONS = Object.freeze([
  "mentioned_in_record",
  "held_by_institution",
  "authored_work_candidate",
  "appears_in_event",
  "located_in",
  "alias_of_candidate",
  "same_work_family",
  "cites",
  "duplicate_candidate",
  "contradicts_candidate"
]);

/**
 * Türkçe harf duyarlı küçük harfe dönüştürme ve normalizasyon
 */
export function foldTurkish(text) {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFC")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .trim();
}

/**
 * URL ve ID dostu slug üretir
 */
export function slugify(text) {
  return foldTurkish(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deterministik Authority ID üretir.
 * Namespace: mka:<kind>:<slug> (veya auth:<kind>:<slug> uyumlu)
 */
export function createAuthorityId(kind, identifier, namespace = "mka") {
  const normKind = kind === "type" ? "person" : kind;
  if (!ENTITY_KINDS.includes(normKind)) {
    throw new Error(`Geçersiz varlık türü: ${kind}`);
  }
  const slug = slugify(identifier);
  if (!slug) {
    throw new Error(`Varlık kimliği oluşturulamadı (boş tanımlayıcı): ${identifier}`);
  }
  return `${namespace}:${normKind}:${slug}`;
}

/**
 * Kayıt veya metin parçası için SHA-256 hash üretir
 */
export function computeContentHash(data) {
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
}

/**
 * Varlık nesnesini doğrular
 */
export function validateEntity(entity) {
  if (!entity || typeof entity !== "object") {
    return { valid: false, error: "Varlık bir nesne olmalıdır" };
  }
  const id = entity.authorityId || entity.id;
  if (!id || !/^(mka|auth):[a-z_]+:[a-z0-9-]+$/.test(id)) {
    return { valid: false, error: `Geçersiz authority ID formatı: ${id}` };
  }
  const kind = entity.kind || entity.type;
  if (!ENTITY_KINDS.includes(kind)) {
    return { valid: false, error: `Geçersiz varlık türü: ${kind}` };
  }
  const preferredName = entity.preferredLabel || entity.preferredName;
  if (!preferredName || typeof preferredName !== "string") {
    return { valid: false, error: "preferredLabel veya preferredName zorunludur" };
  }
  if (entity.aliases && !Array.isArray(entity.aliases)) {
    return { valid: false, error: "aliases bir dizi olmalıdır" };
  }
  const refs = entity.sourceRecordReferences || entity.recordRefs;
  if (refs && !Array.isArray(refs)) {
    return { valid: false, error: "recordRefs / sourceRecordReferences bir dizi olmalıdır" };
  }

  // Güvenlik Kuralı: humanApproval sahte/onaysız olamaz
  if (entity.humanApproval !== undefined && entity.humanApproval !== null) {
    if (typeof entity.humanApproval !== "object" || !entity.humanApproval.verifiedBy) {
      return { valid: false, error: "humanApproval yalnızca doğrulanmış aktör nesnesi veya null olabilir" };
    }
  }

  return { valid: true };
}

/**
 * Kayıt üzerinden çıkarılan bir gözlem (Observation) nesnesi oluşturur
 */
export function createObservation({ recordId, sourcePath, observedText, role = null, recordHash = null }) {
  if (!recordId || !sourcePath || !observedText) {
    throw new Error("Gözlem için recordId, sourcePath ve observedText zorunludur");
  }
  return {
    observationId: `obs:${recordId}:${slugify(sourcePath)}:${slugify(observedText).slice(0, 32)}`,
    recordId,
    sourcePath,
    observedText: String(observedText).trim(),
    normalizedText: foldTurkish(observedText),
    role: role || null,
    recordHash,
    extractedAt: "2026-10-24T00:00:00.000Z",
  };
}
