/**
 * Kanıt grafiği ve iddia değerlendirmesi (Görev 07).
 *
 * #19 `evaluateClaim` künye düzeyindeki "supports" bağlantısını tam destek sayar,
 * eksik adaya işaret eden kenarı sessizce düşürür ve bağımsızlığı kurum+kimlik
 * dizgisiyle hesaplar. Bu modül:
 *  - Pasaj/konum bilgisi olmayan desteği `metadata_only` olarak ayırır; tam destek saymaz.
 *  - Pasaj bilgisi olan desteği bile `passage_cited_unverified` sayar (pasajın kaynakta
 *    gerçekten bulunduğu Prompt 08 / insan doğrulamasıdır).
 *  - Eksik adayı `unresolved` kenar olarak raporlar; ad uydurmaz.
 *  - Bağımsız kökleri birleşim-bul ile hesaplar: aynı normalleştirilmiş URL, aynı
 *    kurum + arşiv kimliği ve farklı kurumdaki ayna/türev künye tek kök sayılır.
 *  - Asla "verified" üretmez; en yüksek durum `provisional_support`'tur.
 * PR #24 `evidence/independence.mjs` kopyalanmadı; bu yalnız backend sözleşmesidir.
 */

import { foldTr, normalizeUrl, titleSimilarity } from "../dedupe.mjs";

export const ASSESSMENT_VERSION = "evidence-assessment/1.0.0";
export const CLAIM_ASSESSMENT_STATES = Object.freeze(["unverified", "provisional_support", "contested_needs_review"]);

function createUnionFind() {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    let current = x;
    while (parent.get(current) !== root) {
      const next = parent.get(current);
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  };
  return { find, union };
}

/** Destekleyici adayların bağımsız kök grupları. */
export function independenceRoots(candidates) {
  const uf = createUnionFind();
  const byUrl = new Map();
  const byIdentifier = new Map();
  for (const candidate of candidates) {
    uf.find(candidate.id);
    const url = normalizeUrl(candidate.url);
    if (url) {
      if (byUrl.has(url)) uf.union(byUrl.get(url), candidate.id);
      else byUrl.set(url, candidate.id);
    }
    const id = String(candidate.archiveIdentifier ?? "").trim().toUpperCase();
    if (id && candidate.institution) {
      const key = `${foldTr(candidate.institution)}::${id}`;
      if (byIdentifier.has(key)) uf.union(byIdentifier.get(key), candidate.id);
      else byIdentifier.set(key, candidate.id);
    }
  }
  // Farklı kurumda aynı olay yılı + çok benzer başlık: ayna/türev kabul edilir (bağımsız değil).
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.institution === b.institution) continue;
      if (Number.isInteger(a.eventYear) && a.eventYear === b.eventYear && titleSimilarity(a.title, b.title) >= 0.8) uf.union(a.id, b.id);
    }
  }
  const groups = new Map();
  for (const candidate of candidates) {
    const root = uf.find(candidate.id);
    groups.set(root, [...(groups.get(root) ?? []), candidate.id].sort());
  }
  return [...groups.values()].sort((a, b) => a[0].localeCompare(b[0], "en"));
}

function evidenceGrade(link) {
  const hasPassage = (typeof link.quote === "string" && link.quote.trim().length > 0) || (link.locator !== undefined && link.locator !== null && String(link.locator).trim().length > 0);
  return hasPassage ? "passage_cited_unverified" : "metadata_only";
}

/**
 * @returns {{claimId: string, status: string, algorithmicLabel: string, humanVerified: false, edges: Array, unresolvedEdges: Array, independentRoots: Array, counts: object, reviewQueue: Array, limitations: string[]}}
 */
export function assessClaimEvidence(claim, candidates) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const edges = [];
  const unresolvedEdges = [];
  for (const link of Array.isArray(claim?.evidence) ? claim.evidence : []) {
    const relation = ["supports", "partial", "contradicts"].includes(link?.relation) ? link.relation : "unknown";
    const candidate = byId.get(link?.candidateId);
    if (!candidate) {
      unresolvedEdges.push({ candidateId: typeof link?.candidateId === "string" ? link.candidateId : null, relation, state: "unresolved", reason: "Aday havuzda yok; kaynak adı uydurulmaz." });
      continue;
    }
    edges.push({ candidateId: candidate.id, relation, grade: evidenceGrade(link), institution: candidate.institution, reason: link?.note ?? null });
  }
  const fullSupports = edges.filter((edge) => edge.relation === "supports" && edge.grade === "passage_cited_unverified");
  const metadataSupports = edges.filter((edge) => edge.relation === "supports" && edge.grade === "metadata_only");
  const partial = edges.filter((edge) => edge.relation === "partial");
  const contradicting = edges.filter((edge) => edge.relation === "contradicts");
  const roots = independenceRoots(fullSupports.map((edge) => byId.get(edge.candidateId)));
  const allSupportRoots = independenceRoots([...fullSupports, ...metadataSupports].map((edge) => byId.get(edge.candidateId)));

  let status = "unverified";
  if (contradicting.length > 0) status = "contested_needs_review";
  else if (roots.length >= 2) status = "provisional_support";

  const reviewQueue = [];
  if (contradicting.length > 0) reviewQueue.push({ code: "CONTRADICTION_REVIEW", candidateIds: contradicting.map((edge) => edge.candidateId), note: "Çelişki otomatik çözülmez; tarihçi incelemesi gerekir." });
  if (metadataSupports.length > 0) reviewQueue.push({ code: "PASSAGE_MISSING", candidateIds: metadataSupports.map((edge) => edge.candidateId), note: "Künye/metadata iddiayı desteklediğini göstermez; belge pasajı gerekir (Prompt 08)." });
  if (unresolvedEdges.length > 0) reviewQueue.push({ code: "UNRESOLVED_SOURCE", candidateIds: unresolvedEdges.map((edge) => edge.candidateId), note: "Kaynak adayı bulunamadı." });
  if (allSupportRoots.length < fullSupports.length + metadataSupports.length) reviewQueue.push({ code: "DEPENDENT_EVIDENCE", note: "Bazı destekler aynı özgün belgeden/aynadan; bağımsız sayılmadı." });

  return {
    claimId: String(claim?.id ?? ""),
    status,
    legacyStatus: claim?.status ?? null,
    algorithmicLabel: status === "provisional_support" ? "algorithmic_provisional_support" : status,
    humanVerified: false,
    edges,
    unresolvedEdges,
    independentRoots: roots,
    counts: {
      resolvedEdges: edges.length,
      unresolvedEdges: unresolvedEdges.length,
      supportsWithPassage: fullSupports.length,
      supportsMetadataOnly: metadataSupports.length,
      partial: partial.length,
      contradicts: contradicting.length,
      independentPassageRoots: roots.length,
    },
    reviewQueue,
    limitations: [
      "Pasajın kaynakta bulunduğu doğrulanmadı.",
      "Bağımsızlık sezgiseldir (URL, kurum+kimlik, ayna künye); tarihsel bağımsızlık kararı değildir.",
      "Durum tarihçi onayı değildir.",
    ],
  };
}

/**
 * Tipli kanıt grafiği: kayıt → iddia → kaynak → kurum → özgün belge.
 * Ad alanları ayrıdır: "archive:", "candidate:", "claim:", "institution:", "document:".
 */
export function buildEvidenceGraph(claims, candidates, archiveRecords = []) {
  const nodes = new Map();
  const edges = [];
  const addNode = (id, type, data = {}) => {
    if (!nodes.has(id)) nodes.set(id, { id, type, ...data });
    return id;
  };
  const archiveIds = new Set(archiveRecords.map((record) => record.id));
  for (const candidate of candidates) {
    const candidateNode = addNode(`candidate:${candidate.id}`, "candidate_source", { title: candidate.title });
    const institutionNode = addNode(`institution:${foldTr(candidate.institution)}`, "institution", { name: candidate.institution });
    edges.push({ from: candidateNode, to: institutionNode, type: "held_by", degree: "declared", reason: "adayın kurum alanı" });
    const identifier = String(candidate.archiveIdentifier ?? "").trim();
    const documentNode = identifier
      ? addNode(`document:${foldTr(candidate.institution)}::${identifier.toUpperCase()}`, "original_document", { identifier, resolved: true })
      : addNode(`document:unresolved:${candidate.id}`, "original_document", { identifier: null, resolved: false });
    edges.push({ from: candidateNode, to: documentNode, type: "derived_from", degree: identifier ? "declared" : "unresolved", reason: identifier ? "kurum arşiv kimliği" : "özgün belge kimliği bilinmiyor; uydurulmadı" });
    for (const archiveId of candidate.relatedArchiveIds ?? []) {
      const known = archiveIds.has(archiveId);
      const archiveNode = addNode(`archive:${archiveId}`, "archive_record", { resolved: known });
      edges.push({ from: archiveNode, to: candidateNode, type: "cites", degree: known ? "declared" : "unresolved", reason: known ? "relatedArchiveIds" : "arşivde böyle bir kimlik yok" });
    }
  }
  const relationEdge = { supports: "supports", partial: "partially_supports", contradicts: "contradicts" };
  for (const claim of claims) {
    const claimNode = addNode(`claim:${claim.id}`, "historical_claim", { text: claim.text });
    for (const link of claim.evidence ?? []) {
      const candidateNode = `candidate:${link.candidateId}`;
      if (!nodes.has(candidateNode)) addNode(candidateNode, "candidate_source", { resolved: false });
      edges.push({ from: candidateNode, to: claimNode, type: relationEdge[link.relation] ?? "unknown", degree: evidenceGrade(link), reason: link.note ?? null });
    }
  }
  const sortedNodes = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const sortedEdges = edges.sort((a, b) => `${a.from}|${a.to}|${a.type}`.localeCompare(`${b.from}|${b.to}|${b.type}`, "en"));
  return { version: ASSESSMENT_VERSION, nodes: sortedNodes, edges: sortedEdges, counts: { nodes: sortedNodes.length, edges: sortedEdges.length, unresolvedEdges: sortedEdges.filter((edge) => edge.degree === "unresolved").length } };
}
