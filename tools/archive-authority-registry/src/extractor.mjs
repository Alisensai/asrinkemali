/**
 * ASRIN KEMALİ — Arşiv Kayıtlarından Otorite Varlığı ve Gözlem Çıkarıcı
 * Salt-okunur; arşiv dosyalarını asla değiştirmez.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthorityId, createObservation, computeContentHash } from "./model.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

export function findRepoRoot(startDir = process.cwd()) {
  let curr = path.resolve(startDir);
  while (curr !== path.dirname(curr)) {
    if (
      fs.existsSync(path.join(curr, "data", "archive", "catalog")) ||
      fs.existsSync(path.join(curr, "content", "archive", "records"))
    ) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return REPO_ROOT;
}

/**
 * Arşiv kayıtlarını salt okunur yükler.
 * scripts/archive/lib/load.mjs mevcutsa onu kullanır, aksi halde güvenli dosya taraması yapar.
 */
export async function loadCatalogRecords(repoRoot = findRepoRoot()) {
  const loadScriptPath = path.join(repoRoot, "scripts", "archive", "lib", "load.mjs");
  if (fs.existsSync(loadScriptPath)) {
    try {
      const { loadArchive } = await import(loadScriptPath);
      const archive = await loadArchive(repoRoot);
      if (archive && Array.isArray(archive.records) && archive.records.length > 0) {
        return archive.records.filter((r) => r && typeof r === "object");
      }
    } catch {
      // Fallback'e devam et
    }
  }

  // Doğrudan dizinlerden yükleme
  const recordDirs = [
    path.join(repoRoot, "content", "archive", "records"),
    path.join(repoRoot, "data", "archive", "catalog"),
  ];

  const records = [];
  for (const dir of recordDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
      try {
        const content = fs.readFileSync(path.join(dir, entry.name), "utf8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          records.push(...parsed);
        } else if (parsed && typeof parsed === "object") {
          records.push(parsed);
        }
      } catch {
        // Hatalı kayıtları atla
      }
    }
  }

  return records;
}

/**
 * Senkron yardımcı (test ve cli için)
 */
export function loadCatalogRecordsSync(repoRoot = findRepoRoot()) {
  const recordDirs = [
    path.join(repoRoot, "content", "archive", "records"),
    path.join(repoRoot, "data", "archive", "catalog"),
  ];

  const records = [];
  for (const dir of recordDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue;
      try {
        const content = fs.readFileSync(path.join(dir, entry.name), "utf8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          records.push(...parsed);
        } else if (parsed && typeof parsed === "object") {
          records.push(parsed);
        }
      } catch {
        // Hatalı JSON dosyasını atla
      }
    }
  }
  return records;
}

export function extractEntitiesFromRecords(records) {
  const persons = new Map();
  const places = new Map();
  const institutions = new Map();
  const events = new Map();
  const sourceWorks = new Map();
  const observations = [];

  for (const rec of records) {
    const recordId = rec.id || rec.slug;
    if (!recordId) continue;
    const recordTitle = rec.title || "";
    const recordHash = computeContentHash(rec);

    // 1. Şahıslar (People)
    if (Array.isArray(rec.people)) {
      rec.people.forEach((p, idx) => {
        const name = typeof p === "string" ? p : p?.name;
        if (!name || name.trim().length === 0) return;
        const cleanName = name.trim();
        const role = typeof p === "object" ? p.role || null : null;

        const obs = createObservation({
          recordId,
          sourcePath: `people[${idx}]`,
          observedText: cleanName,
          role,
          recordHash,
        });
        observations.push(obs);

        const id = createAuthorityId("person", cleanName);
        if (!persons.has(id)) {
          persons.set(id, {
            schemaVersion: "1.0.0",
            authorityId: id,
            id,
            kind: "person",
            type: "person",
            preferredLabel: cleanName,
            preferredName: cleanName,
            aliases: [],
            roles: new Set(),
            sourceRecordReferences: [],
            recordRefs: [],
            humanApproval: null,
            status: "provisional",
          });
        }
        const entity = persons.get(id);
        if (role) entity.roles.add(role);
        if (!entity.recordRefs.some((r) => r.recordId === recordId)) {
          const ref = { recordId, recordTitle, role };
          entity.recordRefs.push(ref);
          entity.sourceRecordReferences.push(ref);
        }
      });
    }

    // 2. Mekânlar ve Şehirler (Locations)
    if (Array.isArray(rec.locations)) {
      rec.locations.forEach((loc, idx) => {
        const locName = typeof loc === "string" ? loc : loc?.city || loc?.name;
        if (!locName || locName.trim().length === 0) return;
        const cleanLoc = locName.trim();

        const obs = createObservation({
          recordId,
          sourcePath: `locations[${idx}]`,
          observedText: cleanLoc,
          recordHash,
        });
        observations.push(obs);

        const id = createAuthorityId("place", cleanLoc);
        if (!places.has(id)) {
          places.set(id, {
            schemaVersion: "1.0.0",
            authorityId: id,
            id,
            kind: "place",
            type: "place",
            preferredLabel: cleanLoc,
            preferredName: cleanLoc,
            country: typeof loc === "object" ? loc.country || "Türkiye" : "Türkiye",
            city: typeof loc === "object" ? loc.city || cleanLoc : cleanLoc,
            aliases: [],
            sourceRecordReferences: [],
            recordRefs: [],
            humanApproval: null,
            status: "provisional",
          });
        }
        const entity = places.get(id);
        if (!entity.recordRefs.some((r) => r.recordId === recordId)) {
          const ref = { recordId, recordTitle };
          entity.recordRefs.push(ref);
          entity.sourceRecordReferences.push(ref);
        }
      });
    }

    // 3. Kurumlar (Source & Provenance Institutions)
    if (rec.source && rec.source.institution) {
      const instName = rec.source.institution.trim();
      const obs = createObservation({
        recordId,
        sourcePath: "source.institution",
        observedText: instName,
        recordHash,
      });
      observations.push(obs);

      const id = createAuthorityId("institution", instName);
      if (!institutions.has(id)) {
        institutions.set(id, {
          schemaVersion: "1.0.0",
          authorityId: id,
          id,
          kind: "institution",
          type: "institution",
          preferredLabel: instName,
          preferredName: instName,
          institutionType: rec.source.institutionType || "institutional",
          url: rec.source.url || rec.source.institutionUrl || null,
          aliases: [],
          sourceRecordReferences: [],
          recordRefs: [],
          humanApproval: null,
          status: "provisional",
        });
      }
      const entity = institutions.get(id);
      if (!entity.recordRefs.some((r) => r.recordId === recordId)) {
        const ref = { recordId, recordTitle, sourceField: "source.institution" };
        entity.recordRefs.push(ref);
        entity.sourceRecordReferences.push(ref);
      }
    }

    if (Array.isArray(rec.provenance)) {
      rec.provenance.forEach((prov, idx) => {
        if (!prov.institution) return;
        const instName = prov.institution.trim();
        const obs = createObservation({
          recordId,
          sourcePath: `provenance[${idx}].institution`,
          observedText: instName,
          recordHash,
        });
        observations.push(obs);

        const id = createAuthorityId("institution", instName);
        if (!institutions.has(id)) {
          institutions.set(id, {
            schemaVersion: "1.0.0",
            authorityId: id,
            id,
            kind: "institution",
            type: "institution",
            preferredLabel: instName,
            preferredName: instName,
            institutionType: "archive_holder",
            url: prov.url || null,
            aliases: [],
            sourceRecordReferences: [],
            recordRefs: [],
            humanApproval: null,
            status: "provisional",
          });
        }
        const entity = institutions.get(id);
        if (!entity.recordRefs.some((r) => r.recordId === recordId)) {
          const ref = { recordId, recordTitle, sourceField: `provenance[${idx}]` };
          entity.recordRefs.push(ref);
          entity.sourceRecordReferences.push(ref);
        }
      });
    }

    // 4. Tarihî Olaylar (Event type records)
    if (rec.type === "event" && rec.title) {
      const eventTitle = rec.title.trim();
      const obs = createObservation({
        recordId,
        sourcePath: "title",
        observedText: eventTitle,
        recordHash,
      });
      observations.push(obs);

      const id = createAuthorityId("event", eventTitle);
      if (!events.has(id)) {
        events.set(id, {
          schemaVersion: "1.0.0",
          authorityId: id,
          id,
          kind: "event",
          type: "event",
          preferredLabel: eventTitle,
          preferredName: eventTitle,
          date: rec.date?.display || rec.date?.start || null,
          aliases: [],
          sourceRecordReferences: [],
          recordRefs: [],
          humanApproval: null,
          status: "provisional",
        });
      }
      const entity = events.get(id);
      if (!entity.recordRefs.some((r) => r.recordId === recordId)) {
        const ref = { recordId, recordTitle };
        entity.recordRefs.push(ref);
        entity.sourceRecordReferences.push(ref);
      }
    }

    // 5. Kaynak Eserler (Source Works)
    if (rec.source && rec.source.title) {
      const workTitle = rec.source.title.trim();
      const obs = createObservation({
        recordId,
        sourcePath: "source.title",
        observedText: workTitle,
        recordHash,
      });
      observations.push(obs);

      const id = createAuthorityId("source_work", workTitle);
      if (!sourceWorks.has(id)) {
        sourceWorks.set(id, {
          schemaVersion: "1.0.0",
          authorityId: id,
          id,
          kind: "source_work",
          type: "source_work",
          preferredLabel: workTitle,
          preferredName: workTitle,
          sourceType: rec.source.type || "reference",
          archiveIdentifier: rec.source.archiveIdentifier || null,
          aliases: [],
          sourceRecordReferences: [],
          recordRefs: [],
          humanApproval: null,
          status: "provisional",
        });
      }
      const entity = sourceWorks.get(id);
      if (!entity.recordRefs.some((r) => r.recordId === recordId)) {
        const ref = { recordId, recordTitle };
        entity.recordRefs.push(ref);
        entity.sourceRecordReferences.push(ref);
      }
    }
  }

  // Set'leri array'e dönüştür
  for (const p of persons.values()) {
    p.roles = Array.from(p.roles);
  }

  return {
    persons: Array.from(persons.values()),
    places: Array.from(places.values()),
    institutions: Array.from(institutions.values()),
    events: Array.from(events.values()),
    sourceWorks: Array.from(sourceWorks.values()),
    observations,
    totalEntitiesCount:
      persons.size + places.size + institutions.size + events.size + sourceWorks.size,
  };
}
