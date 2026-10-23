/**
 * Uçtan uca iş akışı: iddia → revizyon → kanıt → bağımsızlık → değerlendirme.
 *
 * Değerlendirme kuralı: bir iddianın "güncel değerlendirmesi" yalnızca
 * GÜNCEL SÜRÜME bağlı, DOĞRUDAN PASAJ temelli ve BAĞIMSIZ kanıtlardan üretilir.
 * Tek başına başlık/künye incelemesi, ayna/kopya kaynak veya eski sürüme bağlı
 * kanıt, iddiayı destekliyor SAYMAZ — insan incelemesi bekler olarak kalır.
 */

/**
 * @typedef {import("./contracts.d.ts").ClaimRecord} ClaimRecord
 * @typedef {import("./contracts.d.ts").EvidenceRecord} EvidenceRecord
 * @typedef {import("./contracts.d.ts").IndependenceAssessment} IndependenceAssessment
 */

/**
 * Kanıtı iddianın GÜNCEL sürümüne bağlar (eski sürüme bağlanamaz).
 * @param {ClaimRecord} claim
 * @param {EvidenceRecord} evidence
 * @returns {{ claim: ClaimRecord; evidence: EvidenceRecord }}
 */
export function bindEvidence(claim, evidence) {
  if (evidence.claimId !== claim.id) {
    throw new Error(`Kanıt ${evidence.id} başka bir iddiaya (${evidence.claimId}) bağlı.`);
  }
  if (evidence.claimVersion !== claim.currentVersion) {
    throw new Error(
      `Kanıt ${evidence.id} iddia sürümü ${evidence.claimVersion}'e bağlı; güncel sürüm ${claim.currentVersion}. ` +
        "İddia metni değiştiğinde kanıt otomatik geçerli sayılmaz — kanıt yeniden değerlendirilmeli."
    );
  }
  const current = claim.revisions.find((revision) => revision.version === claim.currentVersion);
  if (!current) throw new Error("Güncel revizyon bulunamadı.");
  if (current.evidenceIds.includes(evidence.id)) {
    throw new Error(`Kanıt ${evidence.id} zaten bağlı (çift sayım engeli).`);
  }
  const revisions = claim.revisions.map((revision) =>
    revision.version === claim.currentVersion
      ? { ...revision, evidenceIds: [...revision.evidenceIds, evidence.id] }
      : revision
  );
  return { claim: { ...claim, revisions, updatedAt: new Date().toISOString() }, evidence };
}

/**
 * İddiyanın GÜNCEL değerlendirmesini üretir.
 * @param {ClaimRecord} claim
 * @param {EvidenceRecord[]} evidence
 * @param {(a: EvidenceRecord, b: EvidenceRecord) => IndependenceAssessment} [relationFn]
 *   iki kanıtın bağımsızlık ilişkisini değerlendiren işlev (independence.mjs)
 * @returns {{
 *   claimId: string;
 *   claimVersion: number;
 *   currentEvidenceCount: number;
 *   passageBackedSupportCount: number;
 *   independentSupportCount: number;
 *   contradictionCount: number;
 *   status: "insufficient_evidence" | "awaiting_human_review" | "contested";
 *   issues: string[];
 * }}
 */
export function assessClaim(claim, evidence, relationFn) {
  const issues = [];
  const current = claim.revisions.find((revision) => revision.version === claim.currentVersion);
  if (!current) throw new Error("Güncel revizyon bulunamadı.");
  const currentEvidence = evidence.filter(
    (item) => item.claimId === claim.id && item.claimVersion === claim.currentVersion
  );
  if (currentEvidence.length !== current.evidenceIds.length) {
    issues.push("Kanıt kayıtları ile iddia sürümü bağları arasında tutarsızlık var (eksik/eksik kayıt).");
  }
  const passageBacked = currentEvidence.filter(
    (item) =>
      item.supportAssessment.method === "direct_passage" &&
      item.supportAssessment.actuallySupports === true
  );
  const contradictions = currentEvidence.filter(
    (item) => item.relation === "contradicts" && item.supportAssessment.assessed
  );
  // Bağımsız destek: her destekleyici pasaj için, kendisinden sonra gelen
  // kanıtlarla bağımsızlık ilişkisi "unknown/copy/citing/same" ise bağımsız SAYILMAZ.
  let independentCount = 0;
  if (relationFn) {
    for (const item of passageBacked) {
      let independent = true;
      for (const other of passageBacked) {
        if (other.id === item.id) continue;
        const relation = relationFn(item, other);
        if (relation.type !== "separate_primary_document") {
          independent = false;
          if (relation.uncertain) issues.push(
            `Kanıt ${item.id} ile ${other.id} arasındaki bağımsızlık belirsiz — bağımsız kanıt sayılmaz.`
          );
        }
      }
      if (independent) independentCount += 1;
    }
  } else {
    independentCount = passageBacked.length;
  }
  /** @type {"insufficient_evidence" | "awaiting_human_review" | "contested"} */
  let status;
  if (contradictions.length > 0) {
    status = "contested";
  } else if (passageBacked.length === 0) {
    status = "insufficient_evidence";
  } else {
    status = "awaiting_human_review";
  }
  return {
    claimId: claim.id,
    claimVersion: claim.currentVersion,
    currentEvidenceCount: currentEvidence.length,
    passageBackedSupportCount: passageBacked.length,
    independentSupportCount: independentCount,
    contradictionCount: contradictions.length,
    status,
    issues,
  };
}

/**
 * İddia metni değişince kanıtların durumu: stale listesi + uyarı.
 * @param {ClaimRecord} claim
 * @param {EvidenceRecord[]} evidence
 * @returns {{ staleEvidenceIds: string[]; requiresReassessment: boolean; note: string }}
 */
export function staleEvidenceReport(claim, evidence) {
  const currentVersion = claim.currentVersion;
  const staleIds = new Set(
    claim.revisions
      .filter((revision) => revision.version !== currentVersion)
      .flatMap((revision) => revision.evidenceIds)
  );
  const orphans = evidence.filter(
    (item) => item.claimId === claim.id && item.claimVersion !== currentVersion && !staleIds.has(item.id)
  );
  return {
    staleEvidenceIds: [...staleIds, ...orphans.map((item) => item.id)],
    requiresReassessment: staleIds.size + orphans.length > 0,
    note:
      "İddia metni değiştiğinde eski kanıtların geçerliliği otomatik varsayılmaz; her kanıt yeni sürüm için yeniden değerlendirilmelidir.",
  };
}
