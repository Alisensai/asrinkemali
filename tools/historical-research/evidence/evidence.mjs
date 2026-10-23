/**
 * Kanıt (EvidenceRecord) ve kanıt konumu (locator) sistemi.
 *
 * KURALLAR:
 * - Bir kitap/PDF'ın yalnızca BAŞLIĞINDA konu geçmesi, iddianın desteklendiği
 *   anlamına gelmez → supportAssessment.method = "title_only" destek KANITI sayılmaz.
 * - Destekleyici pasaj bulunamazsa alan BOŞ bırakılır ve inceleme gerektiği gösterilir.
 * - Kısa alıntı ≤ 300 karakter (telif güvenli); uzun kopya yasak.
 * - İnsan onayı taklidi reddedilir: mock "reviewed: true" asla kayda geçmez.
 */

/**
 * @typedef {import("./contracts.d.ts").EvidenceRecord} EvidenceRecord
 * @typedef {import("./contracts.d.ts").EvidenceLocator} EvidenceLocator
 * @typedef {import("./contracts.d.ts").SupportAssessment} SupportAssessment
 * @typedef {import("./contracts.d.ts").VerificationLevel} VerificationLevel
 */

/** Alıntı üst sınırı — telif güvenliği. */
export const MAX_QUOTE_CHARS = 300;

/**
 * Yeni kanıt kaydı oluşturur.
 * @param {object} input
 * @param {string} input.id
 * @param {string} input.claimId
 * @param {number} input.claimVersion
 * @param {"supports"|"contradicts"|"partial"|"mentions"} input.relation
 * @param {EvidenceLocator} input.locator
 * @param {string|null} [input.shortQuote]
 * @param {string} input.accessDate ISO tam tarih (YYYY-MM-DD)
 * @param {string|null} [input.candidateId]
 * @param {boolean} [input.synthetic]
 * @returns {EvidenceRecord}
 */
export function createEvidenceRecord(input) {
  if (!input.id || typeof input.id !== "string") throw new Error("Kanıt kimliği zorunlu.");
  if (!input.claimId || typeof input.claimId !== "string") throw new Error("Kanıt, bir iddiaya bağlanmalı.");
  if (!Number.isInteger(input.claimVersion) || input.claimVersion < 1) {
    throw new Error("Kanıt, iddia sürümüne bağlanmalı (claimVersion ≥ 1).");
  }
  if (!input.locator || typeof input.locator.url !== "string") {
    throw new Error("Kanıt konumu (locator) zorunludur.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.accessDate ?? "")) {
    throw new Error("Erişim tarihi ISO tam tarih (YYYY-MM-DD) olmalı.");
  }
  if (input.shortQuote != null) {
    if (typeof input.shortQuote !== "string" || input.shortQuote.length === 0) {
      throw new Error("Alıntı boş dizge olamaz; kullanılmıyorsa null verin.");
    }
    if (input.shortQuote.length > MAX_QUOTE_CHARS) {
      throw new Error(`Alıntı en fazla ${MAX_QUOTE_CHARS} karakter olabilir (telif güvenliği).`);
    }
  }
  /** @type {SupportAssessment} */
  const assessment = {
    assessed: false,
    actuallySupports: null,
    method: null,
    note: null,
  };
  return {
    schemaVersion: "1.0.0",
    id: input.id,
    claimId: input.claimId,
    claimVersion: input.claimVersion,
    candidateId: input.candidateId ?? null,
    relation: input.relation,
    locator: input.locator,
    shortQuote: input.shortQuote ?? null,
    accessDate: input.accessDate,
    supportAssessment: assessment,
    verificationLevel: "unverified",
    humanReview: { reviewed: false, reviewer: null, reviewedAt: null },
    synthetic: input.synthetic === true,
  };
}

/**
 * Kanıtın iddiayı GERÇEKTEN destekleyip desteklemediğini kaydeder.
 * "title_only"/"metadata_only" YÖNTEMLERİYLE actuallySupports=true YAZILAMAZ.
 * @param {EvidenceRecord} record
 * @param {object} input
 * @param {boolean|null} input.actuallySupports
 * @param {"direct_passage"|"title_only"|"metadata_only"} input.method
 * @param {string|null} [input.note]
 * @returns {EvidenceRecord}
 */
export function assessSupport(record, input) {
  if (input.method === "title_only" || input.method === "metadata_only") {
    if (input.actuallySupports === true) {
      throw new Error(
        "Başlık/künye incelemesiyle 'destekliyor' kararı verilemez: ilgili pasaj okunmadan iddianın desteklendiği söylenemez (method=direct_passage gerekir)."
      );
    }
  }
  /** @type {VerificationLevel} */
  let level = record.verificationLevel;
  if (input.method === "direct_passage") {
    level = record.humanReview.reviewed ? "human_verified" : "passage_reviewed";
  }
  return {
    ...record,
    supportAssessment: {
      assessed: true,
      actuallySupports: input.actuallySupports,
      method: input.method,
      note: input.note ?? null,
    },
    verificationLevel: level,
  };
}

/**
 * İnsan uzman incelemesi kaydı — yalnızca GERÇEK kimlikle.
 * Mock kullanıcı/otomatik kararlar kabul edilmez (test bağlamı hariç tutulur).
 * @param {EvidenceRecord} record
 * @param {object} input
 * @param {string} input.reviewer
 * @param {string} input.reviewedAt ISO tarih
 * @param {boolean} [input.isTestContext] yalnızca testlerde true
 * @returns {EvidenceRecord}
 */
export function recordHumanReview(record, input) {
  if (input.isTestContext !== true && (input.reviewer ?? "").startsWith("mock")) {
    throw new Error("Mock kullanıcı gerçek insan incelemesi olarak kaydedilemez.");
  }
  return {
    ...record,
    humanReview: {
      reviewed: true,
      reviewer: input.reviewer,
      reviewedAt: input.reviewedAt,
    },
    verificationLevel: "human_verified",
  };
}

/**
 * EvidenceRecord doğrulaması — sahte onay, eksik alan, sürüm bağlanmamış kanıt reddi.
 * @param {unknown} value
 * @returns {{ ok: boolean; issues: Array<{ code: string; message: string }> }}
 */
export function validateEvidenceRecord(value) {
  const issues = [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, issues: [{ code: "TYPE", message: "EvidenceRecord bir nesne olmalı." }] };
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (record.schemaVersion !== "1.0.0") issues.push({ code: "SCHEMA", message: "schemaVersion 1.0.0 olmalı." });
  if (typeof record.id !== "string" || record.id.length === 0) issues.push({ code: "ID", message: "id zorunlu." });
  if (typeof record.claimId !== "string" || record.claimId.length === 0) issues.push({ code: "CLAIM", message: "claimId zorunlu." });
  const claimVersion = record.claimVersion;
  if (!Number.isInteger(claimVersion) || /** @type {number} */ (claimVersion) < 1) {
    issues.push({ code: "VERSION", message: "claimVersion ≥ 1 olmalı — iddia metni değişince kanıt otomatik geçerli kalmaz." });
  }
  const locator = record.locator;
  if (typeof locator !== "object" || locator === null) {
    issues.push({ code: "LOCATOR", message: "Kanıt konumu (locator) zorunlu." });
  } else {
    const loc = /** @type {Record<string, unknown>} */ (locator);
    if (typeof loc.url !== "string" || !/^https:\/\//.test(loc.url)) {
      issues.push({ code: "LOCATOR_URL", message: "Kanıt URL'si https:// ile başlamalı." });
    }
    if (typeof loc.title !== "string" || loc.title.length === 0) {
      issues.push({ code: "LOCATOR_TITLE", message: "Belge başlığı zorunlu." });
    }
    if (typeof loc.institution !== "string" || loc.institution.length === 0) {
      issues.push({ code: "LOCATOR_INST", message: "Kaynak kurum zorunlu." });
    }
  }
  if (typeof record.shortQuote === "string" && record.shortQuote.length > MAX_QUOTE_CHARS) {
    issues.push({ code: "QUOTE_LEN", message: `Alıntı en fazla ${MAX_QUOTE_CHARS} karakter olabilir.` });
  }
  // Sahte insan onayı reddi
  const humanRaw = record.humanReview;
  const human = typeof humanRaw === "object" && humanRaw !== null ? /** @type {Record<string, unknown>} */ (humanRaw) : null;
  if (human && human.reviewed === true) {
    const reviewer = human.reviewer;
    if (typeof reviewer !== "string" || reviewer.length === 0 || reviewer.startsWith("mock")) {
      issues.push({ code: "FAKE_HUMAN_REVIEW", message: "İnsan incelemesi kaydı geçersiz (mock/boş inceleyici)." });
    }
  }
  // verificationLevel = human_verified ama inceleme kaydı yok → tutarsızlık
  if (record.verificationLevel === "human_verified" && !(human && human.reviewed === true)) {
    issues.push({ code: "UNBACKED_VERIFIED", message: "human_verified seviyesi, insan inceleme kaydı olmadan tutarsız." });
  }
  // title_only ile "destekliyor" iddiası → geçersiz
  const assessmentRaw = record.supportAssessment;
  const assessment = typeof assessmentRaw === "object" && assessmentRaw !== null ? /** @type {Record<string, unknown>} */ (assessmentRaw) : null;
  if (assessment) {
    if (assessment.method === "title_only" && assessment.actuallySupports === true) {
      issues.push({ code: "TITLE_ONLY_SUPPORT", message: "Yalnızca başlık incelemesiyle destek kararı verilemez." });
    }
    if (assessment.method === "metadata_only" && assessment.actuallySupports === true) {
      issues.push({ code: "METADATA_ONLY_SUPPORT", message: "Yalnızca künye incelemesiyle destek kararı verilemez." });
    }
  }
  return { ok: issues.length === 0, issues };
}
