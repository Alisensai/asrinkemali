import { createHash } from "node:crypto";
import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import type { PublicationRecord } from "../../../schemas/publication-record.types";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function digest(value: unknown) {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

/**
 * İçerik/onay bağını temsil eden kararlı bir özet. Zamanlama ve onay metadatası hariçtir;
 * metin, kaynakça, haklar veya arşiv ilişkileri değiştiğinde mutlaka değişir.
 */
export function computePublicationRevision(record: PublicationRecord): string {
  return digest({
    schemaVersion: record.schemaVersion,
    id: record.id,
    slug: record.slug,
    kind: record.kind,
    title: record.title,
    summary: record.summary,
    body: record.body,
    category: record.category,
    tags: record.tags,
    authors: record.authors,
    bibliography: record.bibliography,
    relatedArchiveIds: record.relatedArchiveIds,
    rights: record.rights,
    automation: record.automation ? {
      mode: record.automation.mode,
      sourceArchiveIds: record.automation.sourceArchiveIds,
      sourceSnapshotAt: record.automation.sourceSnapshotAt,
      provider: record.automation.provider,
      model: record.automation.model,
    } : null,
  });
}

/** Kaynakların yayın açısından anlamlı alanlarını sabit sırayla özetler. */
export function computeArchiveReferenceFingerprint(records: readonly ArchiveRecord[]): string {
  return digest(records
    .map((record) => ({ id: record.id, status: record.verification.status, sourceUrl: record.source.url, rights: record.rights.status, updatedAt: record.updatedAt }))
    .sort((left, right) => left.id.localeCompare(right.id, "tr")));
}
