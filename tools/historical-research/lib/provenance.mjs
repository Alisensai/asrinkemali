/**
 * Provenans ve iddia karşılaştırma.
 *
 * Zincir: arşiv kaydı → tarihî iddia → kaynak adayı → kurum → özgün belge.
 *
 * İlkeler:
 *  - Aynı özgün belgeden türeyen sayfalar bağımsız kanıt sayılmaz.
 *  - Çelişkiler otomatik KESİN SONUCA bağlanmaz; "contested" olarak işaretlenir
 *    ve insan incelemesine bırakılır.
 *  - Yapay zekâ incelemesi insan uzman onayı değildir; kanıt kaydı bunu ayrı tutar.
 */

/**
 * İddia için kanıt ağı kurar ve durumu değerlendirir.
 * @param {HistoricalClaim} claim
 * @param {Array} candidates
 * @returns {{status: "unverified"|"corroborated"|"contested", evidenceCount: number,
 *            independentInstitutions: number, conflicts: Array, notes: Array}}
 */
export function evaluateClaim(claim, candidates) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const evidence = (claim.evidence ?? [])
    .map((link) => ({ ...link, candidate: byId.get(link.candidateId) }))
    .filter((link) => Boolean(link.candidate));

  const supporting = evidence.filter((link) => link.relation === "supports" || link.relation === "partial");
  const contradicting = evidence.filter((link) => link.relation === "contradicts");

  // Bağımsızlık: aynı kurum + aynı arşiv kimliği yalnızca bir kez sayılır.
  const seenRoots = new Set();
  let independent = 0;
  for (const link of supporting) {
    const root = `${link.candidate.institution}::${link.candidate.archiveIdentifier ?? normalize(link.candidate.url)}`;
    if (!seenRoots.has(root)) {
      seenRoots.add(root);
      independent += 1;
    }
  }

  const conflicts = [];
  if (contradicting.length > 0) {
    conflicts.push({
      code: "EVIDENCE_CONTRADICTION",
      message:
        `${contradicting.length} kaynak bu iddiayla çelişiyor. Çelişki otomatik olarak çözülmez; ` +
        "insan incelemesi gerekir.",
      candidateIds: contradicting.map((link) => link.candidateId),
    });
  }

  let status = "unverified";
  if (evidence.length === 0) {
    status = "unverified";
  } else if (contradicting.length > 0) {
    status = "contested";
  } else if (independent >= 2) {
    status = "corroborated";
  }

  const notes = [];
  if (supporting.length > independent) {
    notes.push({
      code: "DEPENDENT_EVIDENCE",
      message: "Kanıtlardan bazıları aynı özgün belgeden türemiş; bağımsız kanıt sayılmaz.",
    });
  }

  return {
    status,
    evidenceCount: evidence.length,
    independentInstitutions: independent,
    conflicts,
    notes,
  };
}

function normalize(url) {
  return String(url ?? "").replace(/#.*$/, "");
}

/**
 * İddia tarihleri arasında çelişki kontrolü.
 * @param {Array<HistoricalClaim>} claims
 * @returns {Array<{claimA: string, claimB: string, note: string}>}
 */
export function findDateConflicts(claims) {
  const conflicts = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i];
      const b = claims[j];
      // Aynı iddiaya benzer metin ama farklı kesin tarih
      const sameSubject =
        fold(a.text) === fold(b.text) ||
        wordOverlap(a.text, b.text) >= 0.6;
      const dateA = a.date?.start;
      const dateB = b.date?.start;
      if (sameSubject && dateA && dateB && dateA !== dateB) {
        conflicts.push({
          claimA: a.id,
          claimB: b.id,
          note: `Benzer iddialarda farklı tarihler: ${dateA} ve ${dateB}. Kaynaklar incelenmelidir; otomatik karar verilmez.`,
        });
      }
    }
  }
  return conflicts;
}

function fold(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR");
}

function wordOverlap(a, b) {
  const wordsA = new Set(fold(a).split(/\W+/).filter((word) => word.length > 3));
  const wordsB = new Set(fold(b).split(/\W+/).filter((word) => word.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let hits = 0;
  for (const word of wordsA) if (wordsB.has(word)) hits += 1;
  return hits / Math.max(wordsA.size, wordsB.size);
}

/**
 * Provenans zinciri kaydı üretir: kayıt → iddia → kaynak → kurum → özgün belge.
 */
export function provenanceChain(recordId, claim, candidates) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return {
    record: recordId,
    claim: { id: claim.id, text: claim.text, date: claim.date },
    sources: (claim.evidence ?? []).map((link) => {
      const candidate = byId.get(link.candidateId);
      if (!candidate) return null;
      return {
        candidateId: candidate.id,
        relation: link.relation,
        institution: candidate.institution,
        originalDocument: {
          identifier: candidate.archiveIdentifier ?? null,
          url: candidate.url,
          publishedAt: candidate.publishedAt ?? null,
        },
      };
    }).filter(Boolean),
    note: "Zincirdeki her halka, kaynağın hangi iddiayı hangi ölçüde desteklediğini belgelemek içindir; otomatik doğruluk kararı içermez.",
  };
}
