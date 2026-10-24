/**
 * Kaynak adayı gelişmiş denetimi — 10 boyutlu değerlendirme.
 *
 * Her boyut [0-1] puanlanır; toplam skor DEĞİL, eksiklik listesi esas alınır.
 * Hiçbir puan otomatik "yayıma uygun" kararı üretmez.
 */

/**
 * @typedef {Object} CandidateAudit
 * @property {string} candidateId
 * @property {string} auditedAt
 * @property {{ accessibility: number; bibliographicIntegrity: number; sourceNatureClarity: number; periodRelevance: number; provenanceIntegrity: number; copyrightClarity: number; independence: number; duplicationRisk: number; humanReviewNeed: number }} scores
 * @property {string[]} findings
 * @property {string[]} reviewQuestions
 * @property {boolean} readyForImport
 */

/**
 * Aday denetimi puanlar.
 * @param {{ id: string; title: string; institution: string; url: string; authors?: Array<{name: string}>; publishedAt?: string|null; periodStart?: number|null; periodEnd?: number|null; verification?: Record<string, unknown>; state?: string; sourceNature?: string }} candidate
 * @param {{ targetStart?: number; targetEnd?: number; duplicateOfArchive?: boolean }} [context]
 * @returns {CandidateAudit}
 */
export function auditCandidate(candidate, context = {}) {
  const targetStart = context.targetStart ?? 1881;
  const targetEnd = context.targetEnd ?? 1918;
  const findings = [];
  const reviewQuestions = [];
  const verification = candidate.verification ?? {};

  // Erişilebilirlik
  const accessibility = verification.urlReachable === true ? 1 : 0;
  if (!accessibility) findings.push("Bağlantı erişilebilirlik denetimi kaydı yok veya başarısız.");

  // Bibliyografik bütünlük
  const hasAuthor = (candidate.authors ?? []).length > 0;
  const hasDate = Boolean(candidate.publishedAt && /^\d{4}/.test(String(candidate.publishedAt)));
  const bibliographicIntegrity = (hasAuthor ? 0.5 : 0) + (hasDate ? 0.5 : 0);
  if (!hasAuthor) findings.push("Yazar bilgisi eksik — resmî künye sayfasından doğrulanmalı.");
  if (!hasDate) findings.push("Yayın tarihi eksik — resmî künye sayfasından doğrulanmalı.");

  // Kaynak niteliği netliği
  const sourceNatureClarity = candidate.sourceNature === "unknown" ? 0 : 1;
  if (!sourceNatureClarity) findings.push("Kaynak niteliği (birincil/ikincil) belirsiz.");

  // Dönem ilgisi
  const periodStart = candidate.periodStart ?? null;
  const periodEnd = candidate.periodEnd ?? null;
  let periodRelevance = 0;
  if (periodStart != null && periodEnd != null) {
    const overlaps = periodStart <= targetEnd && periodEnd >= targetStart;
    periodRelevance = overlaps ? 1 : 0;
    if (!overlaps) findings.push(`Aday, hedef dönem (${targetStart}-${targetEnd}) ile örtüşmüyor.`);
  } else {
    findings.push("Dönem aralığı kaydedilmemiş.");
  }

  // Provenans bütünlüğü
  const provenanceIntegrity = verification.citationComplete === true ? 1 : 0.3;
  if (verification.citationComplete !== true) findings.push("Künye tamamlanmamış.");

  // Telif durumu — hiçbir aday için izin DOĞRULANMADI (varsayılan 0)
  const copyrightClarity = 0;
  findings.push("Telif/yeniden kullanım izni doğrulanmadı — kurumsal bağlantı dışında kullanım öncesi insan incelemesi şart.");

  // Bağımsızlık — bu aday için değerlendirme kaydı yok
  const independence = 0.5;
  reviewQuestions.push("Bu kaynak, aynı iddiayı destekleyen diğer kaynaklardan bağımsız mı (ayna/kopya/türetilmiş değil mi)?");

  // Tekrar olasılığı
  const duplicationRisk = context.duplicateOfArchive ? 0 : 0.7;
  if (context.duplicateOfArchive) findings.push("Mevcut arşivle tekrar riski.");

  // İnsan incelemesi ihtiyacı
  const humanReviewNeed = verification.humanReviewed === true ? 0 : 1;

  return {
    candidateId: candidate.id,
    auditedAt: new Date().toISOString(),
    scores: {
      accessibility,
      bibliographicIntegrity,
      sourceNatureClarity,
      periodRelevance,
      provenanceIntegrity,
      copyrightClarity,
      independence,
      duplicationRisk,
      humanReviewNeed,
    },
    findings,
    reviewQuestions,
    readyForImport: false, // asla otomatik true üretilmez
  };
}

/**
 * Denetim doğrulaması — sahte hazır bayrağı reddi.
 * @param {unknown} value
 * @returns {{ ok: boolean; issues: Array<{ code: string; message: string }> }}
 */
export function validateAudit(value) {
  const issues = [];
  if (typeof value !== "object" || value === null) {
    return { ok: false, issues: [{ code: "TYPE", message: "Denetim bir nesne olmalı." }] };
  }
  const audit = /** @type {Record<string, unknown>} */ (value);
  if (audit.readyForImport === true) {
    issues.push({ code: "AUTO_READY", message: "Denetim otomatik 'içe aktarıma uygun' üretemez; insan onayı gerekir." });
  }
  if (audit.copyrightVerified === true) {
    issues.push({ code: "AUTO_COPYRIGHT", message: "Telif doğrulaması otomatik verilemez." });
  }
  return { ok: issues.length === 0, issues };
}
