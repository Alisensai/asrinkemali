import type { PublicationLedgerEntry, PublicationRecord } from "../../../schemas/publication-record.types";
import { validatePublication } from "./model.ts";

export interface ScheduledAction { idempotencyKey: string; publicationId: string; slug: string; scheduledAt: string }
export interface SchedulePlan { dryRun: true; ready: ScheduledAction[]; skipped: Array<{ publicationId: string; reason: string }> }

export function publicationIdempotencyKey(record: PublicationRecord) { return `publication:${record.id}:${record.scheduledAt ?? "unscheduled"}`; }

/**
 * Zamanı gelmiş, insan onaylı yayınları planlar; hiçbir şeyi yayımlamaz (dry-run).
 *
 * Tekrar yayın engeli iki katmanlıdır: aynı idempotency anahtarı ve aynı yayın kimliği.
 * Daha önce yayımlanmış bir kayıt yeni bir zamana alınsa bile (anahtar değişir) kimlik
 * defterde olduğu için yeniden planlanmaz. Aynı çalışmadaki yinelenen kimlik/slug da atlanır.
 */
export function planScheduledPublications(records: readonly PublicationRecord[], ledger: readonly PublicationLedgerEntry[], now: string): SchedulePlan {
  const current = Date.parse(now); if (Number.isNaN(current)) throw new Error("Geçerli bir UTC çalışma zamanı gereklidir.");
  const completedKeys = new Set(ledger.map((entry) => entry.idempotencyKey));
  const publishedIds = new Set(ledger.map((entry) => entry.publicationId));
  const plannedIds = new Set<string>(); const plannedSlugs = new Set<string>();
  const ready: ScheduledAction[] = []; const skipped: SchedulePlan["skipped"] = [];
  for (const record of records) {
    const id = typeof record?.id === "string" ? record.id : "(kimliksiz kayıt)";
    if (record?.status !== "scheduled") { skipped.push({ publicationId: id, reason: "Durum scheduled değil." }); continue; }
    const validation = validatePublication(record); if (!validation.ok) { skipped.push({ publicationId: id, reason: validation.errors.join(" ") }); continue; }
    if (!record.approval || record.approval.kind !== "human") { skipped.push({ publicationId: id, reason: "İnsan editör onayı yok." }); continue; }
    if (!record.scheduledAt || Date.parse(record.scheduledAt) > current) { skipped.push({ publicationId: id, reason: "Yayın zamanı gelmedi." }); continue; }
    const approvedAt = Date.parse(record.approval.approvedAt);
    if (approvedAt > current || approvedAt > Date.parse(record.scheduledAt)) { skipped.push({ publicationId: id, reason: "İnsan editör onayı yayın zamanından sonra veya gelecekte tarihli; onay yenilenmeli." }); continue; }
    const idempotencyKey = publicationIdempotencyKey(record);
    if (completedKeys.has(idempotencyKey) || publishedIds.has(record.id)) { skipped.push({ publicationId: id, reason: "Daha önce yayımlanmış; tekrar çalıştırma atlandı." }); continue; }
    if (plannedIds.has(record.id) || plannedSlugs.has(record.slug)) { skipped.push({ publicationId: id, reason: "Aynı çalışmada yinelenen kimlik veya slug; yalnız ilk kayıt planlandı." }); continue; }
    plannedIds.add(record.id); plannedSlugs.add(record.slug);
    ready.push({ idempotencyKey, publicationId: record.id, slug: record.slug, scheduledAt: record.scheduledAt });
  }
  return { dryRun: true, ready, skipped };
}
