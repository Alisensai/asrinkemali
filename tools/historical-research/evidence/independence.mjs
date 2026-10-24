/**
 * Kaynak bağımsızlık analizi.
 *
 * İKİ TEMEL KURAL:
 * 1. Farklı iki internet sitesi aynı içeriği yayımlıyor olabilir → iki bağımsız
 *    kanıt SAYILMAZ (copy_republication).
 * 2. Bağımsızlık belirsizse ("unknown") bu belirsizlik AÇIKÇA gösterilir ve
 *    bağımsız kanıt sayılmaz.
 */

/**
 * @typedef {import("./contracts.d.ts").IndependenceAssessment} IndependenceAssessment
 * @typedef {import("./contracts.d.ts").EvidenceRecord} EvidenceRecord
 */

/**
 * İki kanıt kaydının bağımsızlık ilişkisini sınıflandırır.
 * @param {EvidenceRecord} a
 * @param {EvidenceRecord} b
 * @returns {IndependenceAssessment}
 */
export function classifyEvidenceRelation(a, b) {
  // 1) Aynı kurum + aynı sayfa → kesinlikle aynı kaynak
  if (a.locator.url === b.locator.url) {
    return { type: "same_original_work", uncertain: false, basis: "Aynı URL (aynı sayfa)." };
  }
  // 2) Aynı kurum + aynı/benzer başlık → aynı kurum içinde tekrar
  if (a.locator.institution === b.locator.institution) {
    const sameTitle = normalize(a.locator.title) === normalize(b.locator.title);
    return {
      type: "same_original_work",
      uncertain: false,
      basis: sameTitle
        ? "Aynı kurum, aynı başlık."
        : "Aynı kurumun yayınları (kurum-içi tekrar riski).",
    };
  }
  // 3) Farklı kurum + aynı özgün eser kimliği (ISBN/arşiv no eşleşmesi)
  const idA = a.locator.title + (a.candidateId ?? "");
  const idB = b.locator.title + (b.candidateId ?? "");
  if (a.candidateId && a.candidateId === b.candidateId) {
    return { type: "same_original_work", uncertain: false, basis: "Aynı havuz adayına bağlılar." };
  }
  // 4) Farklı kurum + çok benzer başlık → kopya/ayna yayını ŞÜPHESİ (belirsiz)
  const similarity = titleSimilarity(a.locator.title, b.locator.title);
  if (similarity >= 0.85) {
    return {
      type: "copy_republication",
      uncertain: true,
      basis: `Farklı kurum + çok benzer başlık (benzerlik ${(similarity * 100).toFixed(0)}%). Kopya yayın şüphesi; özgün eser kimliği karşılaştırılmalı.`,
    };
  }
  // 5) Farklı kurum + farklı başlık + aynı konu → bağımsızlık BELİRSİZ değil:
  //    ancak alıntı/türetilme ilişkisi kanıtlanmadan "bağımsız" da denemez.
  return {
    type: "unknown",
    uncertain: true,
    basis:
      "Farklı kurum ve başlık; ancak birinin özgün belgeye doğrudan, diğerinin ondan türetilmiş/alıntılayan kaynak olması ayrıca kanıtlanmalı. Bu incelemede bağımsızlık KANITLANMADI.",
  };
}

/**
 * Kanıt listesini bağımsızlık gruplarına ayırır.
 * Yalnız "separate_primary_document" ilişkisiyle birbirine bağlananlar aynı grupta
 * bağımsız sayılır; "unknown" kenarları ayrı gruba düşürür (muhafazakâr).
 * @param {EvidenceRecord[]} evidence
 * @returns {{ groups: EvidenceRecord[][]; uncertainCount: number; relations: IndependenceAssessment[] }}
 */
export function independentGroups(evidence) {
  /** @type {IndependenceAssessment[]} */
  const relations = [];
  for (let i = 0; i < evidence.length; i += 1) {
    for (let j = i + 1; j < evidence.length; j += 1) {
      relations.push(classifyEvidenceRelation(evidence[i], evidence[j]));
    }
  }
  // Union-find: yalnız kesin (uncertain=false) ve ayrım getirMEYEN türler birleştirir
  const parent = evidence.map((_, i) => i);
  /** @param {number} x @returns {number} */
  const find = (x) => (parent[x] === x ? x : find(parent[x]));
  /** @param {number} x @param {number} y */
  const union = (x, y) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[ry] = rx;
  };
  for (let i = 0; i < evidence.length; i += 1) {
    for (let j = i + 1; j < evidence.length; j += 1) {
      const relation = classifyEvidenceRelation(evidence[i], evidence[j]);
      if (!relation.uncertain && relation.type !== "separate_primary_document") {
        union(i, j); // aynı özgün eser → aynı grup
      }
    }
  }
  const groupMap = new Map();
  evidence.forEach((item, index) => {
    const root = find(index);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root).push(item);
  });
  const groups = [...groupMap.values()];
  const uncertainCount = relations.filter((relation) => relation.uncertain).length;
  return { groups, uncertainCount, relations };
}

/** Başlık benzerliği (0–1). */
/** @param {string} a @param {string} b */
function titleSimilarity(a, b) {
  const wa = normalize(a).split(/\s+/);
  const wb = normalize(b).split(/\s+/);
  const setB = new Set(wb);
  const shared = wa.filter((word) => setB.has(word)).length;
  return shared / Math.max(wa.length, wb.length, 1);
}

/** @param {string} text */
function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}
