import type { PublicationLedgerEntry, PublicationRecord } from "../../../schemas/publication-record.types";
import { validatePublication } from "./model.ts";

export interface ScheduledAction { idempotencyKey: string; publicationId: string; slug: string; scheduledAt: string }
export interface SchedulePlan { dryRun: true; ready: ScheduledAction[]; skipped: Array<{ publicationId: string; reason: string }> }

export function publicationIdempotencyKey(record: PublicationRecord) { return `publication:${record.id}:${record.scheduledAt ?? "unscheduled"}`; }

export function planScheduledPublications(records: readonly PublicationRecord[], ledger: readonly PublicationLedgerEntry[], now: string): SchedulePlan {
  const current = Date.parse(now); if (Number.isNaN(current)) throw new Error("Geçerli bir UTC çalışma zamanı gereklidir.");
  const completed = new Set(ledger.map((entry) => entry.idempotencyKey)); const ready: ScheduledAction[] = []; const skipped: SchedulePlan["skipped"] = [];
  for (const record of records) {
    if (record.status !== "scheduled") { skipped.push({ publicationId: record.id, reason: "Durum scheduled değil." }); continue; }
    const validation = validatePublication(record); if (!validation.ok) { skipped.push({ publicationId: record.id, reason: validation.errors.join(" ") }); continue; }
    if (!record.approval || record.approval.kind !== "human") { skipped.push({ publicationId: record.id, reason: "İnsan editör onayı yok." }); continue; }
    if (!record.scheduledAt || Date.parse(record.scheduledAt) > current) { skipped.push({ publicationId: record.id, reason: "Yayın zamanı gelmedi." }); continue; }
    const idempotencyKey = publicationIdempotencyKey(record); if (completed.has(idempotencyKey)) { skipped.push({ publicationId: record.id, reason: "Daha önce yayımlanmış; tekrar çalıştırma atlandı." }); continue; }
    ready.push({ idempotencyKey, publicationId: record.id, slug: record.slug, scheduledAt: record.scheduledAt });
  }
  return { dryRun: true, ready, skipped };
}
