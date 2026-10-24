/**
 * Tek gerçek arşiv bağlamı (Görev 07).
 *
 * OpenCode'un `scripts/archive/lib/load.mjs` okuyucusu yeniden kullanılır (kendi
 * JSON okuyucusu yok, çift sayım yok). Bu katman şunları ekler:
 *  - dosya kökeni (hangi kök, hangi dosya) ile birlikte değişmez (frozen) bağlam;
 *  - iki kök arasında aynı `id` / aynı `slug` çakışma raporu (birleştirme yok);
 *  - arşiv dosyalarının SHA-256 anlık görüntüsü (okuma öncesi/sonrası karşılaştırma);
 *  - loader'ın MAX_RECORDS sınırı aşıldığında açık `limitExceeded` bayrağı
 *    (sınır sessizce yükseltilmez; kısmi veriyle "tam" sonuç iddia edilmez).
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO_ROOT } from "./safe-output.mjs";

export const ARCHIVE_ROOTS = Object.freeze(["content/archive/records", "data/archive/catalog"]);
export const INTEGRITY_PATHS = Object.freeze([
  "content/archive/records",
  "data/archive/catalog",
  "docs/editorial/forms",
  "content/publications",
  "data/research/candidates/pool.json",
  "data/research/candidates/claims.json",
]);

async function loader(root) {
  return import(pathToFileURL(path.join(root, "scripts", "archive", "lib", "load.mjs")).href);
}

async function securityLimits(root) {
  try {
    return await import(pathToFileURL(path.join(root, "scripts", "archive", "lib", "security.mjs")).href);
  } catch {
    return { MAX_RECORDS: null };
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Dosya veya dizin ağacının belirlenimci SHA-256 özeti (göreli yol + içerik). */
export function treeDigest(root, relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return { path: relative, exists: false, files: 0, sha256: null };
  const stat = fs.lstatSync(absolute);
  if (stat.isFile()) return { path: relative, exists: true, files: 1, sha256: sha256(fs.readFileSync(absolute)) };
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  walk(absolute);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(absolute, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(sha256(fs.readFileSync(file)));
    hash.update("\n");
  }
  return { path: relative, exists: true, files: files.length, sha256: hash.digest("hex") };
}

/** Korunan veri yollarının bütünlük anlık görüntüsü. */
export function integritySnapshot(root = REPO_ROOT, paths = INTEGRITY_PATHS) {
  return Object.freeze(paths.map((relative) => Object.freeze(treeDigest(root, relative))));
}

export function diffIntegrity(before, after) {
  const byPath = new Map(after.map((entry) => [entry.path, entry]));
  return before.filter((entry) => {
    const other = byPath.get(entry.path);
    return !other || other.sha256 !== entry.sha256 || other.files !== entry.files;
  }).map((entry) => entry.path);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

/**
 * @param {string} [root]
 * @returns {Promise<Readonly<ArchiveContext>>}
 */
export async function loadArchiveContext(root = REPO_ROOT) {
  const resolvedRoot = path.resolve(root);
  const lib = await loader(resolvedRoot);
  const { MAX_RECORDS = null } = await securityLimits(resolvedRoot);
  const result = await lib.loadArchive(resolvedRoot);
  const entries = result.records.map((record, index) => ({ record, file: result.files[index]?.path ?? null, source: result.files[index]?.source ?? null }));
  const byId = new Map();
  const bySlug = new Map();
  const idCollisions = [];
  const slugCollisions = [];
  for (const entry of entries) {
    const id = typeof entry.record?.id === "string" ? entry.record.id : null;
    const slug = typeof entry.record?.slug === "string" ? entry.record.slug : null;
    if (id) {
      if (byId.has(id)) idCollisions.push({ severity: "critical", code: "ARCHIVE_ID_COLLISION", id, files: [byId.get(id).file, entry.file] });
      else byId.set(id, entry);
    }
    if (slug) {
      if (bySlug.has(slug) && bySlug.get(slug).record.id !== id) slugCollisions.push({ severity: "critical", code: "ARCHIVE_SLUG_COLLISION", slug, ids: [bySlug.get(slug).record.id, id], files: [bySlug.get(slug).file, entry.file] });
      else if (!bySlug.has(slug)) bySlug.set(slug, entry);
    }
  }
  const limitExceeded = MAX_RECORDS != null && result.errors.some((error) => String(error).includes(String(MAX_RECORDS)));
  const statusCounts = { published: 0, reviewed: 0, draft: 0, other: 0 };
  for (const entry of entries) {
    const status = entry.record?.verification?.status;
    statusCounts[Object.hasOwn(statusCounts, status) ? status : "other"] += 1;
  }
  const integrity = ARCHIVE_ROOTS.map((relative) => treeDigest(resolvedRoot, relative));
  const archiveSnapshotSha = sha256(Buffer.from(integrity.map((entry) => `${entry.path}:${entry.sha256}`).join("\n")));
  return deepFreeze({
    schemaVersion: "1.0.0",
    roots: [...ARCHIVE_ROOTS],
    records: entries.map((entry) => entry.record),
    files: entries.map(({ file, source }) => ({ file, source })),
    counts: {
      files: entries.length,
      uniqueIds: byId.size,
      /** Teknik etiket; insan onayı değildir. */
      technicalStatus: statusCounts,
      humanApproved: 0,
    },
    collisions: { ids: idCollisions, slugs: slugCollisions },
    limit: { maxRecords: MAX_RECORDS, limitExceeded, complete: !limitExceeded && result.errors.length === 0 },
    errors: [...result.errors],
    warnings: [...result.warnings],
    taxonomy: result.taxonomy ?? null,
    recordSchema: result.recordSchema ?? null,
    taxonomySchema: result.taxonomySchema ?? null,
    archiveSnapshotSha,
    integrity,
  });
}

/** Sunucu/istemci sınırı için kayıt başına güvenli DTO (yol ve iç alan yok). */
export function archiveRecordReference(record) {
  return {
    id: String(record?.id ?? ""),
    slug: String(record?.slug ?? ""),
    title: String(record?.title ?? ""),
    detailPath: `/arsiv/${encodeURIComponent(String(record?.slug ?? ""))}`,
    technicalStatus: String(record?.verification?.status ?? "unknown"),
    humanExpertApproved: false,
  };
}
