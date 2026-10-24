/**
 * ASRIN KEMALİ — Otorite Kayıt Defteri (Registry Index)
 */

import { extractEntitiesFromRecords, loadCatalogRecords, loadCatalogRecordsSync } from "./extractor.mjs";
import { enhanceEntitiesWithAliases, resolveAliasToAuthorityId, matchCandidate } from "./matcher.mjs";
import { foldTurkish, validateEntity } from "./model.mjs";
import { buildGraphFromEntities } from "./graph.mjs";

export class AuthorityRegistry {
  constructor(options = {}) {
    this.entities = new Map();
    this.aliasIndex = new Map();
    this.observations = [];
    this.graph = null;
    this.initialized = false;
    this.repoRoot = options.repoRoot;
  }

  async init(records) {
    const rawRecords = records || (await loadCatalogRecords(this.repoRoot));
    return this._populate(rawRecords);
  }

  initSync(records) {
    const rawRecords = records || loadCatalogRecordsSync(this.repoRoot);
    return this._populate(rawRecords);
  }

  _populate(rawRecords) {
    const extracted = extractEntitiesFromRecords(rawRecords);
    this.observations = extracted.observations || [];

    const all = [
      ...extracted.persons,
      ...extracted.places,
      ...extracted.institutions,
      ...extracted.events,
      ...(extracted.sourceWorks || []),
    ];

    enhanceEntitiesWithAliases(all);

    this.entities.clear();
    this.aliasIndex.clear();

    for (const entity of all) {
      const validation = validateEntity(entity);
      if (!validation.valid) continue;

      const authId = entity.authorityId || entity.id;
      this.entities.set(authId, entity);

      // Index preferred name
      const prefFolded = foldTurkish(entity.preferredLabel || entity.preferredName);
      if (prefFolded) {
        this.aliasIndex.set(prefFolded, authId);
      }

      // Index aliases
      if (Array.isArray(entity.aliases)) {
        for (const alias of entity.aliases) {
          const aliasFolded = foldTurkish(alias);
          if (aliasFolded) {
            this.aliasIndex.set(aliasFolded, authId);
          }
        }
      }
    }

    this.graph = buildGraphFromEntities(extracted);
    this.initialized = true;
    return this;
  }

  getEntityById(id) {
    if (!id) return null;
    return this.entities.get(id) || this.entities.get(id.replace(/^auth:/, "mka:")) || null;
  }

  resolve(query, type) {
    const folded = foldTurkish(query);
    if (this.aliasIndex.has(folded)) {
      const foundId = this.aliasIndex.get(folded);
      if (!type || foundId.startsWith(`mka:${type}:`) || foundId.startsWith(`auth:${type}:`)) {
        return this.entities.get(foundId) || null;
      }
    }
    const resolvedId = resolveAliasToAuthorityId(query, type);
    return this.entities.get(resolvedId) || null;
  }

  match(query, type) {
    const matches = [];
    for (const entity of this.entities.values()) {
      if (type && entity.kind !== type && entity.type !== type) continue;
      const res = matchCandidate(query, entity);
      if (res.score > 0) {
        matches.push({ entity, ...res });
      }
    }
    return matches.sort((a, b) => b.score - a.score);
  }

  search(query, options = {}) {
    const folded = foldTurkish(query);
    const results = [];
    for (const entity of this.entities.values()) {
      const kind = entity.kind || entity.type;
      if (options.type && kind !== options.type) continue;
      const prefFolded = foldTurkish(entity.preferredLabel || entity.preferredName);
      if (prefFolded.includes(folded)) {
        results.push({ entity, matchType: "preferredName", score: 100 });
        continue;
      }
      const aliasMatch = entity.aliases?.some((a) => foldTurkish(a).includes(folded));
      if (aliasMatch) {
        results.push({ entity, matchType: "alias", score: 80 });
      }
    }
    return results.sort((a, b) => {
      const nameA = a.entity.preferredLabel || a.entity.preferredName;
      const nameB = b.entity.preferredLabel || b.entity.preferredName;
      return b.score - a.score || nameA.localeCompare(nameB, "tr");
    });
  }

  getDuplicatesRisk() {
    const groups = new Map();
    for (const entity of this.entities.values()) {
      const norm = foldTurkish(entity.preferredLabel || entity.preferredName).slice(0, 10);
      if (!groups.has(norm)) groups.set(norm, []);
      groups.get(norm).push(entity);
    }

    const duplicateRisks = [];
    for (const [key, list] of groups.entries()) {
      if (list.length > 1) {
        duplicateRisks.push({
          groupKey: key,
          candidateCount: list.length,
          candidates: list.map((e) => ({
            id: e.authorityId || e.id,
            name: e.preferredLabel || e.preferredName,
            kind: e.kind || e.type,
          })),
        });
      }
    }
    return duplicateRisks;
  }

  validate() {
    const errors = [];
    for (const [id, entity] of this.entities.entries()) {
      const res = validateEntity(entity);
      if (!res.valid) {
        errors.push(`${id}: ${res.error}`);
      }
    }
    const hasCycles = this.graph ? this.graph.hasCycle("part_of") : false;
    return {
      valid: errors.length === 0 && !hasCycles,
      entityErrors: errors,
      hasGraphCycles: hasCycles,
    };
  }

  getSummary() {
    let persons = 0;
    let places = 0;
    let institutions = 0;
    let events = 0;
    let sourceWorks = 0;
    let totalRefs = 0;

    for (const entity of this.entities.values()) {
      const refs = entity.recordRefs || entity.sourceRecordReferences;
      totalRefs += refs?.length || 0;
      const kind = entity.kind || entity.type;
      if (kind === "person") persons++;
      else if (kind === "place") places++;
      else if (kind === "institution") institutions++;
      else if (kind === "event") events++;
      else if (kind === "source_work") sourceWorks++;
    }

    return {
      totalEntities: this.entities.size,
      persons,
      places,
      institutions,
      events,
      sourceWorks,
      totalRecordReferences: totalRefs,
      totalObservations: this.observations.length,
      graphNodes: this.graph ? this.graph.nodes.size : 0,
      graphEdges: this.graph ? this.graph.edges.length : 0,
    };
  }
}
