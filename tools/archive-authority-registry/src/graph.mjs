/**
 * ASRIN KEMALİ — Otorite İlişki Grafı (Authority Graph)
 * 
 * Varlıklar ve arşiv kayıtları arasındaki ilişkileri modelleyen yönlü graf.
 * Döngü tespiti, kanıt referansı ve soy ağacı (lineage) takibi sağlar.
 */

import { RECORD_RELATIONS } from "./model.mjs";

export class AuthorityGraph {
  constructor() {
    this.nodes = new Map(); // id -> node data
    this.edges = []; // array of AuthorityEdge
    this.adjacency = new Map(); // fromId -> Set of edge objects
  }

  addNode(id, data = {}) {
    if (!id) return;
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, ...data });
      this.adjacency.set(id, new Set());
    }
  }

  addEdge({
    fromId,
    toId,
    relation,
    evidenceReferences = [],
    certainty = "provisional",
    reviewRequired = true,
  }) {
    if (!fromId || !toId || !relation) {
      throw new Error("Edge için fromId, toId ve relation zorunludur");
    }

    this.addNode(fromId);
    this.addNode(toId);

    const edge = {
      fromId,
      toId,
      relation,
      evidenceReferences: Array.isArray(evidenceReferences) ? evidenceReferences : [evidenceReferences],
      certainty,
      reviewRequired,
      createdAt: "2026-10-24T00:00:00.000Z",
    };

    this.edges.push(edge);
    this.adjacency.get(fromId).add(edge);
    return edge;
  }

  getOutboundEdges(nodeId) {
    return Array.from(this.adjacency.get(nodeId) || []);
  }

  getInboundEdges(nodeId) {
    return this.edges.filter((e) => e.toId === nodeId);
  }

  /**
   * Graf üzerinde belirli bir relation için döngü (cycle) var mı denetler.
   * (Örn. derived_from veya part_of ilişkilerinde sonsuz döngüyü engeller)
   */
  hasCycle(relationFilter = null) {
    const visited = new Set();
    const inStack = new Set();

    const dfs = (nodeId) => {
      visited.add(nodeId);
      inStack.add(nodeId);

      const edges = this.getOutboundEdges(nodeId);
      for (const edge of edges) {
        if (relationFilter && edge.relation !== relationFilter) continue;
        const neighbor = edge.toId;
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (inStack.has(neighbor)) {
          return true; // Döngü tespit edildi
        }
      }

      inStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return true;
      }
    }
    return false;
  }

  toJSON() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }
}

/**
 * Çıkarılan varlık ve kayıtlardan graf üretir
 */
export function buildGraphFromEntities(extractedData) {
  const graph = new AuthorityGraph();

  const addEntityRefs = (entityList, defaultRel) => {
    for (const entity of entityList) {
      const authId = entity.authorityId || entity.id;
      graph.addNode(authId, { kind: entity.kind || entity.type, label: entity.preferredLabel || entity.preferredName });

      if (Array.isArray(entity.recordRefs)) {
        for (const ref of entity.recordRefs) {
          const recordNodeId = `rec:${ref.recordId}`;
          graph.addNode(recordNodeId, { kind: "archive_record", title: ref.recordTitle });
          graph.addEdge({
            fromId: authId,
            toId: recordNodeId,
            relation: defaultRel,
            evidenceReferences: [ref.recordId],
            certainty: "provisional",
            reviewRequired: true,
          });
        }
      }
    }
  };

  if (extractedData.persons) addEntityRefs(extractedData.persons, "mentioned_in_record");
  if (extractedData.places) addEntityRefs(extractedData.places, "located_in");
  if (extractedData.institutions) addEntityRefs(extractedData.institutions, "held_by_institution");
  if (extractedData.events) addEntityRefs(extractedData.events, "appears_in_event");
  if (extractedData.sourceWorks) addEntityRefs(extractedData.sourceWorks, "cites");

  return graph;
}
