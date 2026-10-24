import fs from "node:fs";
import path from "node:path";
import type {
  AuthorityEntityDTO,
  AuthorityKind,
  AuthorityRegistrySummaryDTO,
  AtlasPlaceDTO,
  ChronologyEventDTO,
} from "./types.ts";

function getRepoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "tools", "archive-authority-registry"))) {
    return cwd;
  }
  if (fs.existsSync(path.join(cwd, "..", "tools", "archive-authority-registry"))) {
    return path.resolve(cwd, "..");
  }
  return cwd;
}

const REPO_ROOT = getRepoRoot();
const DATA_FILE = path.join(
  REPO_ROOT,
  "tools",
  "archive-authority-registry",
  "data",
  "authority-registry.json"
);

interface CachedData {
  entities: Array<{
    authorityId: string;
    id: string;
    kind: string;
    type: string;
    preferredLabel: string;
    preferredName: string;
    aliases: string[];
    status: string;
    roles?: string[];
    city?: string;
    country?: string;
    date?: string;
    sourceRecordReferences?: Array<{ recordId: string }>;
    recordRefs?: Array<{ recordId: string }>;
  }>;
  summary: {
    totalEntities: number;
    persons: number;
    places: number;
    institutions: number;
    events: number;
    sourceWorks: number;
    totalRecordReferences: number;
    totalObservations: number;
  };
}

let cachedData: CachedData | null = null;

function loadData(): CachedData {
  if (cachedData) return cachedData;

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      cachedData = JSON.parse(raw);
      return cachedData!;
    } catch {
      // JSON parse hatası
    }
  }

  // Fallback yapay/başlangıç verisi (araç henüz export edilmediyse)
  return {
    entities: [
      {
        authorityId: "mka:person:mustafa-kemal-ataturk",
        id: "mka:person:mustafa-kemal-ataturk",
        kind: "person",
        type: "person",
        preferredLabel: "Mustafa Kemal Atatürk",
        preferredName: "Mustafa Kemal Atatürk",
        aliases: ["Gazi Mustafa Kemal", "Kemal Atatürk", "Mustafa Kemal Paşa"],
        status: "provisional",
        sourceRecordReferences: [{ recordId: "nutuk-1927" }],
        recordRefs: [{ recordId: "nutuk-1927" }],
      },
      {
        authorityId: "mka:place:ankara",
        id: "mka:place:ankara",
        kind: "place",
        type: "place",
        preferredLabel: "Ankara",
        preferredName: "Ankara",
        city: "Ankara",
        country: "Türkiye",
        aliases: ["Angora"],
        status: "provisional",
        sourceRecordReferences: [{ recordId: "tbmm-1-birlesim-tutanagi-1920" }],
        recordRefs: [{ recordId: "tbmm-1-birlesim-tutanagi-1920" }],
      },
    ],
    summary: {
      totalEntities: 2,
      persons: 1,
      places: 1,
      institutions: 0,
      events: 0,
      sourceWorks: 0,
      totalRecordReferences: 2,
      totalObservations: 2,
    },
  };
}

export async function getRegistrySummary(): Promise<AuthorityRegistrySummaryDTO> {
  const data = loadData();
  const isFromFile = fs.existsSync(DATA_FILE);
  return {
    ...data.summary,
    adapterStatus: isFromFile ? "active" : "cached_fallback",
  };
}

export async function getAuthorityEntity(id: string): Promise<AuthorityEntityDTO | null> {
  const data = loadData();
  const targetId = id.startsWith("auth:") ? id.replace(/^auth:/, "mka:") : id;
  const match = data.entities.find((e) => e.authorityId === targetId || e.id === id);
  if (!match) return null;

  const refs = match.sourceRecordReferences || match.recordRefs || [];
  return {
    authorityId: match.authorityId || match.id,
    kind: (match.kind || match.type) as AuthorityKind,
    preferredLabel: match.preferredLabel || match.preferredName,
    aliases: match.aliases || [],
    recordReferencesCount: refs.length,
    status: (match.status || "provisional") as AuthorityEntityDTO["status"],
    roles: match.roles,
    city: match.city,
    country: match.country,
  };
}

export async function searchAuthorities(
  query: string,
  kind?: AuthorityKind
): Promise<AuthorityEntityDTO[]> {
  const data = loadData();
  const q = query.toLowerCase().trim();
  const results = data.entities.filter((e) => {
    const eKind = e.kind || e.type;
    if (kind && eKind !== kind) return false;
    const label = (e.preferredLabel || e.preferredName).toLowerCase();
    if (label.includes(q)) return true;
    return e.aliases?.some((a) => a.toLowerCase().includes(q));
  });

  return results.slice(0, 20).map((match) => {
    const refs = match.sourceRecordReferences || match.recordRefs || [];
    return {
      authorityId: match.authorityId || match.id,
      kind: (match.kind || match.type) as AuthorityKind,
      preferredLabel: match.preferredLabel || match.preferredName,
      aliases: match.aliases || [],
      recordReferencesCount: refs.length,
      status: (match.status || "provisional") as AuthorityEntityDTO["status"],
      roles: match.roles,
      city: match.city,
      country: match.country,
    };
  });
}

/**
 * Gemini Atlas 2.0 için DTO Sağlayıcı
 */
export async function getAtlasPlaces(): Promise<AtlasPlaceDTO[]> {
  const data = loadData();
  const placeEntities = data.entities.filter((e) => (e.kind || e.type) === "place");

  return placeEntities.map((p) => {
    const refs = p.sourceRecordReferences || p.recordRefs || [];
    return {
      placeAuthorityId: p.authorityId || p.id,
      preferredLabel: p.preferredLabel || p.preferredName,
      aliases: p.aliases || [],
      city: p.city || p.preferredLabel || p.preferredName,
      country: p.country || "Türkiye",
      geoStatus: "unknown",
      coords: null, // Güvenli: kanıtsız koordinat uydurulmaz
      linkedArchiveRecordIds: refs.map((r) => r.recordId),
    };
  });
}

/**
 * Kimi Kronoloji için DTO Sağlayıcı
 */
export async function getChronologyEvents(): Promise<ChronologyEventDTO[]> {
  const data = loadData();
  const eventEntities = data.entities.filter((e) => (e.kind || e.type) === "event");

  return eventEntities.map((ev) => {
    const refs = ev.sourceRecordReferences || ev.recordRefs || [];
    return {
      eventAuthorityId: ev.authorityId || ev.id,
      title: ev.preferredLabel || ev.preferredName,
      date: ev.date || null,
      linkedArchiveRecordIds: refs.map((r) => r.recordId),
    };
  });
}
