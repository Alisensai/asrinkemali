/**
 * Görev 07 test fikstürü: geçici dizinde sentetik, izole bir depo kökü.
 * Gerçek `data/archive`, `content/archive` veya `data/research/candidates`
 * dizinlerine YAZMAZ. Arşiv okuyucusu ve şemalar gerçek depodan kopyalanır.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function makeFixtureRepo({ catalog = {}, legacy = {}, pool = null, claims = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mka-evidence-fixture-"));
  fs.cpSync(path.join(REAL_ROOT, "scripts", "archive", "lib"), path.join(root, "scripts", "archive", "lib"), { recursive: true });
  fs.mkdirSync(path.join(root, "schemas"), { recursive: true });
  for (const name of ["archive-record.schema.json", "archive-taxonomy.schema.json"]) fs.copyFileSync(path.join(REAL_ROOT, "schemas", name), path.join(root, "schemas", name));
  fs.mkdirSync(path.join(root, "content", "archive", "records"), { recursive: true });
  fs.copyFileSync(path.join(REAL_ROOT, "content", "archive", "taxonomy.json"), path.join(root, "content", "archive", "taxonomy.json"));
  fs.mkdirSync(path.join(root, "data", "archive", "catalog"), { recursive: true });
  fs.mkdirSync(path.join(root, "data", "research", "candidates"), { recursive: true });
  for (const [name, value] of Object.entries(catalog)) fs.writeFileSync(path.join(root, "data", "archive", "catalog", name), typeof value === "string" ? value : JSON.stringify(value));
  for (const [name, value] of Object.entries(legacy)) fs.writeFileSync(path.join(root, "content", "archive", "records", name), typeof value === "string" ? value : JSON.stringify(value));
  if (pool) fs.writeFileSync(path.join(root, "data", "research", "candidates", "pool.json"), JSON.stringify({ schemaVersion: "1.0.0", meta: { synthetic: true }, candidates: pool }));
  if (claims) fs.writeFileSync(path.join(root, "data", "research", "candidates", "claims.json"), JSON.stringify({ schemaVersion: "1.0.0", meta: { synthetic: true }, claims }));
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

/** Sentetik arşiv kaydı (gerçek tarihî bilgi değildir). */
export function syntheticRecord(id, overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id,
    slug: id,
    title: `Sentetik kayıt ${id}`,
    type: "document",
    date: { start: "1920-01-01", end: null, precision: "day", certainty: "exact", display: "1 Ocak 1920" },
    people: [],
    locations: [],
    categories: ["siyaset"],
    summary: "Sentetik test kaydı.",
    description: "Sentetik test kaydı; gerçek değildir.",
    source: { institution: "Sentetik Kurum", institutionType: "archive", institutionUrl: "https://example.org/", title: `Kaynak ${id}`, url: `https://example.org/${id}`, accessedAt: "2026-10-01", publishedAt: null, archiveIdentifier: `SYN-${id}`, note: "" },
    provenance: [{ institution: "Sentetik Kurum", collection: "Test", identifier: `SYN-${id}`, url: `https://example.org/${id}`, accessedAt: "2026-10-01", note: "" }],
    rights: { status: "official_link_only", license: null, licenseUrl: null, termsUrl: null, credit: "Sentetik", imageReuse: "not_downloaded", note: "" },
    image: null,
    verification: { status: "published", reviewedBy: null, reviewedAt: null, checks: {}, notes: "" },
    tags: [],
    relatedIds: [],
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}
