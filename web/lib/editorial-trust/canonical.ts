import { createHash } from "node:crypto";

import type { PublicationRecord } from "../../../schemas/publication-record.types";
import { computePublicationRevision } from "../publishing-integrations/revision.ts";
import type { SnapshotAlgorithm, SubjectType } from "./model.ts";

/**
 * Python `json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))`
 * ile bayt düzeyinde aynı çıktı. PR #15 formlarındaki `record_snapshot_sha256` bununla
 * hesaplanmıştır; 168/168 gerçek formla eşleştiği test edilir.
 *
 * Sınır: Python `1.0` değerini "1.0", JavaScript "1" yazar. Arşiv kayıtlarında kesirli
 * sayı yoktur; tam sayı dışı sayı görülürse hata verilir ki sessizce farklı hash üretilmesin.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TypeError("canonical_number_unsupported");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.keys(value as object)
      .sort(compareCodePoints)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new TypeError("canonical_value_unsupported");
}

// Python dizgileri kod noktasına göre sıralar; UTF-16 sıralaması BMP dışında farklıdır.
function compareCodePoints(a: string, b: string): number {
  const left = Array.from(a);
  const right = Array.from(b);
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    const diff = (left[i].codePointAt(0) ?? 0) - (right[i].codePointAt(0) ?? 0);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** PR #15 uyumlu: kaydın tamamının kanonik JSON hash'i (v1). */
export function legacyRecordHash(record: unknown): string {
  return sha256Hex(canonicalJson(record));
}

/**
 * v2 alan politikası: inceleme sürecinin kendisinin değiştirdiği alanlar hash dışıdır;
 * aksi hâlde onayı kaydetmek kaydı stale yapardı. Tarihî içerik, kaynak, hak ve görsel
 * alanlarının tamamı içeridedir.
 */
export const SNAPSHOT_EXCLUDED_FIELDS: Readonly<Record<SubjectType, readonly string[]>> = Object.freeze({
  archive_record: Object.freeze(["verification", "publicationApproval", "updatedAt"]),
  publication_record: Object.freeze(["status", "approval", "scheduledAt", "publishedAt", "updatedAt"]),
  exhibition_record: Object.freeze(["reviewStatus", "approval", "publishedAt", "updatedAt"]),
});

function normalizeDeep(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(normalizeDeep);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      const normalizedKey = key.normalize("NFC");
      if (Object.hasOwn(out, normalizedKey)) throw new TypeError("canonical_key_collision_after_nfc");
      out[normalizedKey] = normalizeDeep(inner);
    }
    return out;
  }
  return value;
}

export function snapshotV2Payload(subjectType: SubjectType, record: Record<string, unknown>): Record<string, unknown> {
  const excluded = new Set(SNAPSHOT_EXCLUDED_FIELDS[subjectType]);
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) if (!excluded.has(key)) kept[key] = value;
  return normalizeDeep(kept) as Record<string, unknown>;
}

/** Konuya göre varsayılan revizyon algoritması. Makaleler için Prompt 03 (PR #29) özeti tek otoritedir. */
export function defaultSnapshotAlgorithm(subjectType: SubjectType): SnapshotAlgorithm {
  return subjectType === "publication_record" ? "publication-revision-v1" : "nfc-policy-sha256-v2";
}

export function snapshotHash(subjectType: SubjectType, record: Record<string, unknown>, algorithm: SnapshotAlgorithm = defaultSnapshotAlgorithm(subjectType)): string {
  if (algorithm === "legacy-record-sha256-v1") return legacyRecordHash(record);
  // Yinelenen mantık yerine yayın motorunun kendi revizyon özeti (web/lib/publishing-integrations/revision.ts).
  if (algorithm === "publication-revision-v1") return computePublicationRevision(record as unknown as PublicationRecord);
  return sha256Hex(`${algorithm}\n${subjectType}\n${canonicalJson(snapshotV2Payload(subjectType, record))}`);
}

/** İki kaydın v2 politikasına göre değişen üst düzey alanları (snapshot-diff). */
export function changedSnapshotFields(subjectType: SubjectType, before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const a = snapshotV2Payload(subjectType, before);
  const b = snapshotV2Payload(subjectType, after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => !Object.hasOwn(a, key) || !Object.hasOwn(b, key) || canonicalJson(a[key]) !== canonicalJson(b[key]))
    .sort();
}
