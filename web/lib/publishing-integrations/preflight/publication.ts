import type { ArchiveRecord } from "../../../../schemas/archive-record.types";
import type { PublicationLedgerEntry, PublicationRecord } from "../../../../schemas/publication-record.types";
import { validatePublication } from "../../publishing/model.ts";
import { planScheduledPublications } from "../../publishing/scheduler.ts";
import type { PublicationDryRunResult, PublicationLedgerAudit, PublicationPreflightOptions, PublicationPreflightResult, PublicationReferenceValidation, PublishingFinding } from "../contracts/types.ts";
import { computeArchiveReferenceFingerprint, computePublicationRevision } from "../revision.ts";

const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const validTimestamp = (value: unknown) => typeof value === "string" && UTC_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));
const finding = (code: PublishingFinding["code"], severity: PublishingFinding["severity"], message: string, path?: string): PublishingFinding => ({ code, severity, message, path });

export function validatePublicationReferences(record: PublicationRecord, archiveRecords: readonly ArchiveRecord[]): PublicationReferenceValidation {
  const index = new Map(archiveRecords.map((archive) => [archive.id, archive]));
  const findings: PublishingFinding[] = [];
  const related = new Set<string>();
  const relatedRecords: ArchiveRecord[] = [];
  for (const id of record.relatedArchiveIds) {
    if (related.has(id)) {
      findings.push(finding("ARCHIVE_REFERENCE_DUPLICATE", "blocker", `Arşiv ilişkisi iki kez verilmiş: ${id}`, "relatedArchiveIds"));
      continue;
    }
    related.add(id);
    const archive = index.get(id);
    if (!archive) findings.push(finding("ARCHIVE_REFERENCE_MISSING", "blocker", `İlişkili arşiv kaydı bulunamadı: ${id}`, "relatedArchiveIds"));
    else if (archive.verification.status !== "published") findings.push(finding("ARCHIVE_REFERENCE_NOT_PUBLISHED", "blocker", `İlişkili arşiv kaydı kamu yayın kapısından geçmemiş: ${id}`, "relatedArchiveIds"));
    else relatedRecords.push(archive);
  }
  if (record.automation) {
    const sources = [...new Set(record.automation.sourceArchiveIds)].sort();
    const relationIds = [...related].sort();
    if (sources.length !== relationIds.length || sources.some((id, index) => id !== relationIds[index])) {
      findings.push(finding("AUTOMATION_SOURCE_MISMATCH", "blocker", "Otomasyon kaynakları ilgili arşiv kimlikleriyle birebir eşleşmiyor.", "automation.sourceArchiveIds"));
    }
  }
  return { findings, archiveFingerprint: computeArchiveReferenceFingerprint(relatedRecords) };
}

export function runPublicationPreflight(record: PublicationRecord, options: PublicationPreflightOptions): PublicationPreflightResult {
  const findings: PublishingFinding[] = [];
  const validation = validatePublication(record);
  if (!validation.ok) findings.push(...validation.errors.map((message) => finding("PUBLICATION_INVALID", "blocker", message)));
  const references = validatePublicationReferences(record, options.archiveRecords);
  findings.push(...references.findings);
  const missingDependencies: string[] = [];
  if (!options.hasVerifiedHumanApproval) {
    missingDependencies.push("verified-human-approval-provider");
    findings.push(finding("AUTH_PROVIDER_UNAVAILABLE", "blocker", "Doğrulanmış insan aktörü sağlayan kimlik sistemi yok; approval JSON alanı yayın yetkisi sayılmaz."));
  }
  if (!options.hasAuditStore) {
    missingDependencies.push("persistent-audit-store");
    findings.push(finding("AUDIT_STORE_UNAVAILABLE", "blocker", "Kalıcı, doğrulanabilir denetim deposu yok; yayın geçişi kapalıdır."));
  }
  if (record.approval) findings.push(finding("HUMAN_APPROVAL_UNVERIFIED", "warning", "Kayıttaki approval metadatası gerçek aktör/doğrulama kanıtı değildir."));
  const blockers = findings.filter((item) => item.severity === "blocker");
  const warnings = findings.filter((item) => item.severity === "warning");
  return {
    inputVersion: "1.0.0", policyVersion: "1.0.0", publicationId: record.id, revision: computePublicationRevision(record),
    eligibility: blockers.length ? "blocked" : record.status === "scheduled" ? "ready_for_dry_run" : "review_required",
    blockers, warnings,
    evidence: { relatedArchiveIds: [...record.relatedArchiveIds], archiveFingerprint: references.archiveFingerprint, evaluatedAt: options.now },
    missingDependencies,
  };
}

export function auditPublicationLedger(ledger: unknown, records: readonly PublicationRecord[]): PublicationLedgerAudit {
  if (!Array.isArray(ledger)) return { ok: false, validEntries: [], findings: [finding("LEDGER_INVALID", "blocker", "Yayın defteri bir dizi olmalıdır.")] };
  const knownIds = new Set(records.map((record) => record.id));
  const keys = new Set<string>(); const ids = new Set<string>(); const findings: PublishingFinding[] = []; const validEntries: PublicationLedgerEntry[] = [];
  for (const [index, entry] of ledger.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) { findings.push(finding("LEDGER_INVALID", "blocker", "Yayın defteri girdisi nesne olmalıdır.", `ledger[${index}]`)); continue; }
    const item = entry as Partial<PublicationLedgerEntry>;
    if (typeof item.idempotencyKey !== "string" || typeof item.publicationId !== "string" || !validTimestamp(item.publishedAt)) { findings.push(finding("LEDGER_INVALID", "blocker", "Yayın defteri girdisinin kimlik, anahtar ve geçerli zamanı olmalıdır.", `ledger[${index}]`)); continue; }
    if (keys.has(item.idempotencyKey)) findings.push(finding("LEDGER_DUPLICATE_KEY", "blocker", `Tekrar eden idempotency anahtarı: ${item.idempotencyKey}`, `ledger[${index}]`));
    if (ids.has(item.publicationId)) findings.push(finding("LEDGER_DUPLICATE_ID", "blocker", `Tekrar eden yayın kimliği: ${item.publicationId}`, `ledger[${index}]`));
    if (!knownIds.has(item.publicationId)) findings.push(finding("LEDGER_UNKNOWN_PUBLICATION", "warning", `Defterdeki yayın çalışma kümesinde yok: ${item.publicationId}`, `ledger[${index}]`));
    keys.add(item.idempotencyKey); ids.add(item.publicationId); validEntries.push(item as PublicationLedgerEntry);
  }
  return { ok: !findings.some((item) => item.severity === "blocker"), findings, validEntries };
}

/** Salt-okunur plan: preflight kapıları geçmeden mevcut scheduler'ın hazır listesi dışarı taşmaz. */
export function planPublicationDryRun(input: { records: readonly PublicationRecord[]; ledger: unknown; archiveRecords: readonly ArchiveRecord[]; now: string }): PublicationDryRunResult {
  const ledgerAudit = auditPublicationLedger(input.ledger, input.records);
  const preflight = new Map(input.records.map((record) => [record.id, runPublicationPreflight(record, { archiveRecords: input.archiveRecords, now: input.now })]));
  const base = ledgerAudit.ok ? planScheduledPublications(input.records, ledgerAudit.validEntries, input.now) : { ready: [], skipped: input.records.map((record) => ({ publicationId: record.id, reason: "Yayın defteri denetimi başarısız." })) };
  const ready = base.ready.filter((action) => preflight.get(action.publicationId)?.eligibility === "ready_for_dry_run");
  const blocked = input.records.map((record) => preflight.get(record.id)!).filter((result) => result.blockers.length > 0).map((result) => ({ publicationId: result.publicationId, findings: result.blockers }));
  return { dryRun: true, ready, blocked, skipped: base.skipped, ledgerAudit };
}
