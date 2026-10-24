/**
 * İddia (ClaimRecord) çekirdeği — sürümleme ve kanıt geçerliliği kuralları.
 *
 * KURAL: İddia metni değiştiğinde (revize), eski kanıtların hâlâ geçerli olduğu
 * VARSAYILMAZ. Eski kanıtlar eski sürüme bağlı kalır ve "stale" işaretlenir;
 * yeni sürüm boş kanıt listesiyle başlar.
 */

/**
 * @typedef {import("./contracts.d.ts").ClaimRecord} ClaimRecord
 * @typedef {import("./contracts.d.ts").ClaimRevision} ClaimRevision
 * @typedef {import("./contracts.d.ts").ClaimDateRange} ClaimDateRange
 */

/** @param {unknown} value */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Yeni iddia kaydı oluşturur (sürüm 1).
 * @param {object} input
 * @param {string} input.id
 * @param {string} input.text
 * @param {ClaimDateRange|null} [input.dateRange]
 * @param {string} [input.category]
 * @param {string[]} [input.relatedPeople]
 * @param {string[]} [input.relatedPlaces]
 * @param {string[]} [input.relatedEvents]
 * @param {string|null} [input.uncertaintyNote]
 * @returns {ClaimRecord}
 */
export function createClaimRecord(input) {
  if (!input || typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("İddia kimliği zorunludur.");
  }
  if (typeof input.text !== "string" || input.text.trim().length === 0) {
    throw new Error("İddia metni boş olamaz.");
  }
  const now = new Date().toISOString();
  /** @type {ClaimRevision} */
  const revision = {
    version: 1,
    text: input.text,
    dateRange: input.dateRange ?? null,
    evidenceIds: [],
    revisionNote: "İlk sürüm.",
    supersededAt: null,
    createdAt: now,
  };
  return {
    schemaVersion: "2.0.0",
    id: input.id,
    currentVersion: 1,
    revisions: [revision],
    status: "new",
    category: input.category ?? "genel",
    relatedPeople: input.relatedPeople ?? [],
    relatedPlaces: input.relatedPlaces ?? [],
    relatedEvents: input.relatedEvents ?? [],
    uncertaintyNote: input.uncertaintyNote ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * İddia metnini REVİZE eder: yeni sürüm üretir.
 * Eski kanıtlar yeni sürüme TAŞINMAZ (stale kalır — otomatik geçerli sayılmaz).
 * @param {ClaimRecord} record
 * @param {string} newText
 * @param {string} revisionNote
 * @param {ClaimDateRange|null} [newDateRange] verilmezse önceki korunur
 * @returns {ClaimRecord}
 */
export function reviseClaimText(record, newText, revisionNote, newDateRange) {
  if (typeof newText !== "string" || newText.trim().length === 0) {
    throw new Error("Revize metin boş olamaz.");
  }
  if (typeof revisionNote !== "string" || revisionNote.trim().length === 0) {
    throw new Error("Revizyon gerekçesi zorunludur (denetim izi).");
  }
  const now = new Date().toISOString();
  const current = currentRevision(record);
  /** @type {ClaimRevision} */
  const next = {
    version: record.currentVersion + 1,
    text: newText,
    dateRange: newDateRange ?? current.dateRange,
    evidenceIds: [],
    revisionNote,
    supersededAt: null,
    createdAt: now,
  };
  const revisions = record.revisions.map((revision) =>
    revision.version === record.currentVersion ? { ...revision, supersededAt: now } : revision
  );
  revisions.push(next);
  return {
    ...record,
    revisions,
    currentVersion: next.version,
    updatedAt: now,
  };
}

/**
 * Güncel revizyonu döndürür.
 * @param {ClaimRecord} record
 * @returns {ClaimRevision}
 */
export function currentRevision(record) {
  const found = record.revisions.find((revision) => revision.version === record.currentVersion);
  if (!found) throw new Error(`İddia ${record.id} için güncel sürüm bulunamadı.`);
  return found;
}

/**
 * Belirli sürümün revizyonunu döndürür.
 * @param {ClaimRecord} record
 * @param {number} version
 * @returns {ClaimRevision}
 */
export function revisionAt(record, version) {
  const found = record.revisions.find((revision) => revision.version === version);
  if (!found) throw new Error(`İddia ${record.id} sürüm ${version} bulunamadı.`);
  return found;
}

/**
 * Sürülmüş (superseded) sürümlerin kanıtları — geçerli KANIT sayılmaz ama
 * kaybolmaz (denetim izi). "Stale" terimi: yeniden değerlendirme bekler.
 * @param {ClaimRecord} record
 * @returns {string[]} eski sürümlere bağlı kanıt kimlikleri
 */
export function staleEvidenceIds(record) {
  return record.revisions
    .filter((revision) => revision.version !== record.currentVersion)
    .flatMap((revision) => revision.evidenceIds);
}

/**
 * ClaimRecord doğrulaması (içe aktarma/güvenlik).
 * @param {unknown} value
 * @returns {{ ok: boolean; issues: Array<{ code: string; message: string }> }}
 */
export function validateClaimRecord(value) {
  const issues = [];
  if (!isPlainObject(value)) return { ok: false, issues: [{ code: "TYPE", message: "ClaimRecord bir nesne olmalı." }] };
  const record = /** @type {Record<string, unknown>} */ (value);
  if (record.schemaVersion !== "2.0.0") issues.push({ code: "SCHEMA", message: "schemaVersion 2.0.0 olmalı." });
  if (typeof record.id !== "string" || record.id.length === 0) issues.push({ code: "ID", message: "id zorunlu." });
  if (!Array.isArray(record.revisions) || record.revisions.length === 0) {
    issues.push({ code: "REVISIONS", message: "En az bir revizyon gerekli." });
    return { ok: false, issues };
  }
  const versions = record.revisions.map((revision) => revision?.version);
  if (versions.some((v) => typeof v !== "number")) issues.push({ code: "VERSION", message: "Sürüm numaraları sayı olmalı." });
  const unique = new Set(versions);
  if (unique.size !== versions.length) issues.push({ code: "VERSION_DUP", message: "Sürüm numaraları benzersiz olmalı." });
  if (typeof record.currentVersion !== "number" || !unique.has(record.currentVersion)) {
    issues.push({ code: "CURRENT_VERSION", message: "currentVersion revizyonlarda bulunmalı." });
  }
  for (const revision of record.revisions) {
    if (!isPlainObject(revision)) continue;
    if (typeof revision.text !== "string" || revision.text.length === 0) {
      issues.push({ code: "TEXT", message: "Revizyon metni boş olamaz." });
    }
    if (typeof revision.revisionNote !== "string" || revision.revisionNote.length === 0) {
      issues.push({ code: "NOTE", message: "Revizyon gerekçesi zorunludur." });
    }
    if (!Array.isArray(revision.evidenceIds)) {
      issues.push({ code: "EVIDENCE_IDS", message: "evidenceIds dizi olmalı." });
    }
  }
  // Bir kanıt kimliği aynı iddiada iki farklı sürümde yer alamaz (çift sayım engeli)
  const seen = new Set();
  for (const revision of record.revisions) {
    if (!isPlainObject(revision) || !Array.isArray(revision.evidenceIds)) continue;
    for (const evidenceId of revision.evidenceIds) {
      if (typeof evidenceId === "string" && seen.has(evidenceId)) {
        issues.push({ code: "EVIDENCE_REBOUND", message: `Kanıt ${evidenceId} birden fazla sürüme bağlanmış.` });
      }
      seen.add(evidenceId);
    }
  }
  // Sahte insan onayı reddi: status asla "approved" olamaz
  if (record.status === "approved") {
    issues.push({ code: "FAKE_APPROVAL", message: '"approved" durumu üretilemez; insan onayı gerekir.' });
  }
  return { ok: issues.length === 0, issues };
}
