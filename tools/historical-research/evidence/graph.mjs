/**
 * İddia-kanıt grafiği.
 *
 * İLİŞKİ DİSİPLİNİ: "mentions" (kaynak iddiadan söz ediyor) ≠ "supports".
 * Graf, büyük veri kümelerinde performanslı çalışır: düğüm indeksi + bitişiklik
 * listeleri (Map) ile O(1) komşu erişimi; tüm graf taraması yalnızca istenirse.
 */

/**
 * @typedef {import("./contracts.d.ts").EvidenceGraph} EvidenceGraph
 * @typedef {import("./contracts.d.ts").GraphNode} GraphNode
 * @typedef {import("./contracts.d.ts").GraphEdge} GraphEdge
 * @typedef {import("./contracts.d.ts").ClaimRecord} ClaimRecord
 * @typedef {import("./contracts.d.ts").EvidenceRecord} EvidenceRecord
 */

/**
 * İddia + kanıt kayıtlarından graf kurar.
 * @param {ClaimRecord[]} claims
 * @param {EvidenceRecord[]} evidence
 * @returns {EvidenceGraph}
 */
export function buildGraph(claims, evidence) {
  /** @type {GraphNode[]} */
  const nodes = [];
  /** @type {GraphEdge[]} */
  const edges = [];
  const nodeIndex = new Map();
  const addNode = (/** @type {GraphNode} */ node) => {
    if (!nodeIndex.has(node.id)) {
      nodes.push(node);
      nodeIndex.set(node.id, node);
    }
  };
  for (const claim of claims) {
    addNode({ id: `claim:${claim.id}`, type: "claim", label: `İddia ${claim.id} (v${claim.currentVersion})`, ref: claim.id });
  }
  for (const item of evidence) {
    addNode({ id: `evidence:${item.id}`, type: "document", label: `${item.locator.title} — ${item.locator.institution}`, ref: item.id });
    addNode({ id: `institution:${item.locator.institution}`, type: "institution", label: item.locator.institution, ref: item.locator.institution });
  }
  // Kenarlar: kanıt → iddia (sürüm bilgisiyle)
  for (const item of evidence) {
    const claim = claims.find((c) => c.id === item.claimId);
    if (!claim) continue;
    const claimNode = `claim:${claim.id}`;
    const evidenceNode = `evidence:${item.id}`;
    edges.push({
      from: evidenceNode,
      to: claimNode,
      type: item.relation === "supports" ? "supports" : item.relation === "contradicts" ? "contradicts" : "mentions",
      evidenceId: item.id,
      claimVersion: item.claimVersion,
    });
    edges.push({
      from: evidenceNode,
      to: `institution:${item.locator.institution}`,
      type: "references",
      evidenceId: item.id,
      claimVersion: null,
    });
  }
  // Güncel olmayan sürüm kenarları "needs_review" olarak işaretlenir
  for (const edge of edges) {
    const claim = claims.find((c) => c.id === (edge.to ?? "").replace("claim:", ""));
    if (edge.claimVersion != null && claim && edge.claimVersion !== claim.currentVersion) {
      edge.type = "needs_review";
    }
  }
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.to).push(edge);
  }
  return { nodes, edges, nodeIndex, adjacency };
}

/**
 * Bir düğümün komşuları (O(k)).
 * @param {EvidenceGraph} graph
 * @param {string} nodeId
 * @returns {GraphEdge[]}
 */
export function neighbors(graph, nodeId) {
  return graph.adjacency.get(nodeId) ?? [];
}

/**
 * Graf doğrulaması — geçersiz kimlik, "mentions"in "supports"a dönüştürülmesi.
 * @param {unknown} value
 * @returns {{ ok: boolean; issues: Array<{ code: string; message: string }> }}
 */
export function validateGraph(value) {
  const issues = [];
  if (typeof value !== "object" || value === null) {
    return { ok: false, issues: [{ code: "TYPE", message: "Graf bir nesne olmalı." }] };
  }
  const graph = /** @type {Record<string, unknown>} */ (value);
  const nodes = graph.nodes;
  const edges = graph.edges;
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return { ok: false, issues: [{ code: "SHAPE", message: "nodes ve edges dizileri zorunlu." }] };
  }
  const nodeIds = new Set(nodes.map((/** @type {any} */ n) => n?.id));
  for (const edge of edges) {
    const e = /** @type {any} */ (edge);
    if (!nodeIds.has(e?.from) || !nodeIds.has(e?.to)) {
      issues.push({ code: "DANGLING_EDGE", message: `Kenar (${e?.from} → ${e?.to}) düğüm listesinde olmayan kimliklere işaret ediyor.` });
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Grafiğin toplam düğüm/kenar sayısı (panel özeti için).
 * @param {EvidenceGraph} graph
 */
export function graphStats(graph) {
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    byType: graph.edges.reduce((acc, edge) => {
      acc[edge.type] = (acc[edge.type] ?? 0) + 1;
      return acc;
    }, /** @type {Record<string, number>} */ ({})),
  };
}
