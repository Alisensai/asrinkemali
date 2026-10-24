import type { ArchiveRecord } from "../../../../schemas/archive-record.types";
import type { PublicationLedgerEntry } from "../../../../schemas/publication-record.types";

export type PublishingFindingSeverity = "blocker" | "warning";

export type PublishingFindingCode =
  | "PUBLICATION_INVALID"
  | "ARCHIVE_REFERENCE_MISSING"
  | "ARCHIVE_REFERENCE_DUPLICATE"
  | "ARCHIVE_REFERENCE_NOT_PUBLISHED"
  | "AUTOMATION_SOURCE_MISMATCH"
  | "HUMAN_APPROVAL_UNVERIFIED"
  | "AUTH_PROVIDER_UNAVAILABLE"
  | "AUDIT_STORE_UNAVAILABLE"
  | "APPROVAL_REVISION_STALE"
  | "LEDGER_INVALID"
  | "LEDGER_DUPLICATE_ID"
  | "LEDGER_DUPLICATE_KEY"
  | "LEDGER_UNKNOWN_PUBLICATION";

export interface PublishingFinding {
  code: PublishingFindingCode;
  severity: PublishingFindingSeverity;
  message: string;
  path?: string;
}

export interface PublicationReferenceValidation {
  findings: readonly PublishingFinding[];
  archiveFingerprint: string;
}

export interface PublicationPreflightResult {
  inputVersion: "1.0.0";
  policyVersion: "1.0.0";
  publicationId: string;
  revision: string;
  eligibility: "blocked" | "review_required" | "ready_for_dry_run";
  blockers: readonly PublishingFinding[];
  warnings: readonly PublishingFinding[];
  evidence: {
    relatedArchiveIds: readonly string[];
    archiveFingerprint: string;
    evaluatedAt: string;
  };
  missingDependencies: readonly string[];
}

export interface PublicationLedgerAudit {
  ok: boolean;
  findings: readonly PublishingFinding[];
  validEntries: readonly PublicationLedgerEntry[];
}

export interface PublishingIntegrationHealth {
  overall: "blocked" | "degraded" | "available";
  dependencies: Readonly<Record<"repository" | "archive" | "auth" | "audit" | "scheduler", "available" | "blocked" | "unknown">>;
  message: string;
}

export interface PublicationPreflightOptions {
  archiveRecords: readonly ArchiveRecord[];
  now: string;
  /** Gerçek bir kimlik sağlayıcı/denetim deposu yokken bu değer false kalmalıdır. */
  hasVerifiedHumanApproval?: boolean;
  hasAuditStore?: boolean;
}

export interface PublicationDryRunResult {
  dryRun: true;
  ready: readonly { publicationId: string; slug: string; idempotencyKey: string; scheduledAt: string }[];
  blocked: readonly { publicationId: string; findings: readonly PublishingFinding[] }[];
  skipped: readonly { publicationId: string; reason: string }[];
  ledgerAudit: PublicationLedgerAudit;
}
