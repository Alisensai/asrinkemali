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

import { titleSimilarity } from "./dedupe.mjs";

/**
 * İddia için kanıt ağı kurar ve durumu değerlendirir.
 * Aynı özgün belgeden türeyen/ayna kaynaklar bağımsız sayılmaz.
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

  const supporting = evidence.filter((link) => link.relation === "supports");
  const partial = evidence.filter((link) => link.relation === "partial");
  const contradicting = evidence.filter((link) => link.relation === "contradicts");

  // Bağımsızlık: yalnız TAM DESTEK ("supports") veren kaynaklar bağımsızlık
  // sayılır. "partial" kanıttır ama tam destekleme DEĞİLDİR; tek başına
  // corroborated üretmez. Aynı kurum + aynı arşiv kimliği bir kez sayılır;
  // farklı kurumlardaki benzer künyeli (ayna/türetilmiş) kaynaklar da bağımsız
  // sayılmaz — bağımsızlık beyan edilmemişse varsayılan olarak bilinmez kalır.
  const seenRoots = new Set();
  const mirrorRoots = new Set();
  let independent = 0;
  for (const link of supporting) {
    const root = `${link.candidate.institution}::${link.candidate.archiveIdentifier ?? normalize(link.candidate.url)}`;
    if (!seenRoots.has(root)) {
      seenRoots.add(root);
      independent += 1;
    }
  }
  // Ayna/türetilmiş kaynak tespiti (farklı kurum + aynı olay yılı + benzer başlık)
  const supportingCandidates = supporting.map((link) => link.candidate);
  for (let i = 0; i < supportingCandidates.length; i += 1) {
    for (let j = i + 1; j < supportingCandidates.length; j += 1) {
      const a = supportingCandidates[i];
      const b = supportingCandidates[j];
      if (a.institution === b.institution) continue;
      if (a.eventYear != null && a.eventYear === b.eventYear && titleSimilarity(a.title, b.title) >= 0.8) {
        mirrorRoots.add(`${a.id}+${b.id}`);
      }
    }
  }
  if (mirrorRoots.size > 0 && independent > 1) {
    independent -= mirrorRoots.size; // ayna çiftleri bağımsızlığı düşürür
    if (independent < 1) independent = 1;
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
  if (status === "corroborated" && partial.length > 0 && supporting.length < 2) {
    // Tam destekleyen bağımsız kaynak yoksa doğrulanmış iddia verilemez
    status = "unverified";
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
 * Yalnızca AYNI konuyu (subject) paylaşan iddialar karşılaştırılır; farklı
 * olayların benzer ifadeleri yanlış pozitif üretmez.
 * @param {Array<HistoricalClaim & {subject?: string}>} claims
 * @returns {Array<{claimA: string, claimB: string, note: string}>}
 */
export function findDateConflicts(claims) {
  const conflicts = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i];
      const b = claims[j];
      // Konum anahtarı yoksa karşılaştırma YAPILMAZ (belirsizlik çelişki demek değildir)
      if (!a.subject || !b.subject || a.subject !== b.subject) continue;
      const dateA = a.date?.start;
      const dateB = b.date?.start;
      if (dateA && dateB && dateA !== dateB) {
        conflicts.push({
          claimA: a.id,
          claimB: b.id,
          note: `Aynı konuda (${a.subject}) farklı tarihler: ${dateA} ve ${dateB}. Kaynaklar incelenmelidir; otomatik karar verilmez.`,
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
        // Destekleyici pasaj/konum bilgisi taşınır (varsa); uydurulmaz
        supportingPassage: link.quote ?? null,
        locator: link.locator ?? null,
        note: link.note ?? null,
        institution: candidate.institution,
        originalDocument: {
          identifier: candidate.archiveIdentifier ?? null,
          url: candidate.url,
          publishedAt: candidate.publishedAt ?? null,
        },
      };
    }).filter(Boolean),
    note: "Zincirdeki her halka, kaynağın hangi iddiayı hangi ölçüde desteklediğini belgelemek içindir; otomatik doğruluk kararı içermez. Destekleyici pasaj kaydedilmemişse iddia 'unverified' kabul edilir.",
  };
}
