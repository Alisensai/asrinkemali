/**
 * Editoryal güven modeli (V0.7, Görev 04).
 *
 * Bu modül yalnız sabitler ve tipler içerir; karar vermez, yazmaz, ağ çağrısı yapmaz.
 * Yayın ekseni (draft → in_review → approved → scheduled → published) burada yeniden
 * tanımlanmaz; inceleme ekseni ondan ayrı ve bağımsızdır.
 */

export const TRUST_MODEL_VERSION = "1.0.0" as const;

/** Bir kanıtın ulaşabildiği en yüksek güven sınıfı; sıralıdır. */
export const TRUST_CLASSES = [
  "structural_valid",
  "submitted_claim_unverified",
  "authenticated_actor_required",
  "authorization_verified",
  "evidence_review_completed",
  "editorial_decision_verified",
  "publication_gate_passed",
] as const;
export type TrustClass = (typeof TRUST_CLASSES)[number];

export const REVIEW_STATES = [
  "not_started",
  "pending",
  "assigned",
  "in_progress",
  "changes_requested",
  "submitted",
  "awaiting_identity_verification",
  "awaiting_editor",
  "rejected",
  "completed",
  "superseded",
  "stale",
  "invalid",
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

/** İki ayrı insan kararı. Biri diğerinin yerine geçmez. */
export const DECISION_KINDS = ["historian_review", "publication_editor"] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export const DECISION_OUTCOMES = ["approved", "changes_requested", "rejected"] as const;
export type DecisionOutcome = (typeof DECISION_OUTCOMES)[number];

export const INVALIDATION_REASONS = ["revoked", "superseded", "needs_revalidation", "expired_by_policy", "stale"] as const;
export type InvalidationReason = (typeof INVALIDATION_REASONS)[number];

export const SUBJECT_TYPES = ["archive_record", "publication_record", "exhibition_record"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

/** PR #26 Control Center rolleri; burada yeniden tanımlanmaz, aynı dizgiler kullanılır. */
export const ACTOR_ROLES = ["system_admin", "chief_editor", "historian", "content_editor", "researcher", "readonly_auditor"] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export const EVIDENCE_CHECKS = [
  "source_provenance",
  "original_document_identity",
  "institutional_catalogue_reference",
  "event_date",
  "document_date",
  "date_precision",
  "authorship_or_attribution",
  "quote_or_transcription",
  "image_is_original_or_representative",
  "rights_and_reuse",
  "source_record_consistency",
  "contradictory_evidence",
  "missing_evidence",
] as const;
export type EvidenceCheck = (typeof EVIDENCE_CHECKS)[number];

export const CHECK_RESULTS = ["pass", "fail", "needs_review", "not_applicable"] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];

export const READINESS_RESULTS = ["allow", "deny", "needs_review", "not_configured"] as const;
export type ReadinessResult = (typeof READINESS_RESULTS)[number];

/**
 * Sabit, dokümante bulgu kodları. Değiştirmek bir sözleşme değişikliğidir
 * (docs/editorial/trust-gates/06-GATE-COMPATIBILITY.md).
 */
export const FINDING_CODES = [
  "missing_historian_review",
  "missing_editor_approval",
  "unverified_actor_claim",
  "stale_record_snapshot",
  "permission_required",
  "evidence_location_missing",
  "audit_chain_invalid",
  "revision_conflict",
  "credential_provider_unavailable",
  "approval_timestamp_invalid",
  "release_blocked_by_policy",
  "schema_invalid",
  "review_form_missing",
  "review_form_invalid",
  "duplicate_record_id",
  "orphan_review_form",
  "rights_unclear",
  "ai_representation_as_original",
  "decision_revoked",
] as const;
export type FindingCode = (typeof FINDING_CODES)[number];

export type Severity = "critical" | "error" | "warning" | "info";

export interface TrustFinding {
  code: FindingCode;
  severity: Severity;
  subjectType: SubjectType;
  recordId: string | null;
  recordSlug: string | null;
  sourceFile: string | null;
  expectedSnapshotHash: string | null;
  actualSnapshotHash: string | null;
  gate: string;
  reason: string;
  remediation: string;
  actorVerificationState: ActorVerificationState;
  hasHumanApproval: false | "claimed_unverified" | "verified";
}

export type ActorVerificationState = "not_applicable" | "no_claim" | "claim_unverified" | "identity_unavailable" | "verified";

/** Sunucu tarafında güvenilir sağlayıcıdan gelen kimlik kanıtı. İstemci JSON'undan kurulamaz. */
export interface ActorIdentityEvidence {
  readonly actorId: string;
  readonly role: ActorRole;
  readonly provider: string;
  readonly sessionId: string;
  readonly authenticatedAt: string;
  readonly expiresAt: string;
}

export interface AuthorizationProof {
  readonly actor: ActorIdentityEvidence;
  readonly decisionKind: DecisionKind;
  readonly subjectType: SubjectType;
  readonly policyVersion: string;
}

export interface ContentRevisionProof {
  readonly subjectType: SubjectType;
  readonly recordId: string;
  readonly snapshotAlgorithm: SnapshotAlgorithm;
  readonly snapshotHash: string;
}

export type SnapshotAlgorithm = "legacy-record-sha256-v1" | "nfc-policy-sha256-v2" | "publication-revision-v1";

/** Kullanıcı girdisi: kimlik veya rol taşımaz; bunlar sunucuda çözülür. */
export interface DecisionRequest {
  requestId: string;
  idempotencyKey: string;
  subjectType: SubjectType;
  recordId: string;
  decisionKind: DecisionKind;
  outcome: DecisionOutcome;
  expectedSnapshotHash: string;
  evidenceReferences: string[];
  rationale: string;
}

export interface DecisionReceipt {
  readonly decisionId: string;
  readonly decisionKind: DecisionKind;
  readonly outcome: DecisionOutcome;
  readonly subjectType: SubjectType;
  readonly recordId: string;
  readonly revision: ContentRevisionProof;
  readonly actorId: string;
  readonly actorRole: ActorRole;
  readonly recordedAt: string;
  readonly auditEventHash: string;
  readonly invalidatedBy: InvalidationReason | null;
}

export interface EditorialReadinessFlags {
  technical_tests_passed: boolean;
  schema_valid: boolean;
  source_provenance_sufficient: boolean;
  human_historian_review_verified: boolean;
  human_editor_approval_verified: boolean;
  rights_status_acceptable: boolean;
  current_revision_matched: boolean;
  audit_integrity_verified: boolean;
  release_ready: boolean;
}

export interface SubjectReadiness {
  subjectType: SubjectType;
  recordId: string;
  result: ReadinessResult;
  flags: EditorialReadinessFlags;
  findings: TrustFinding[];
}

/**
 * Yayın motoru (Prompt 03 / PR #29) ile tek bağlantı noktası. Burada yayın mantığı
 * kopyalanmaz; motor yalnız bu sonucu okur.
 */
export interface PublicationApprovalGateAdapter {
  readinessFor(subjectType: SubjectType, recordId: string): Promise<SubjectReadiness>;
}

/** PR #27 sergi motoru gibi dış modüllerin ileride uygulayacağı salt-okunur sözleşme. */
export interface SubjectReadinessAdapter {
  readonly subjectType: SubjectType;
  listSubjectIds(): Promise<readonly string[]>;
  readSubject(recordId: string): Promise<Readonly<Record<string, unknown>> | null>;
}

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}
