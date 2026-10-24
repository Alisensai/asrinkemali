import { buildAuditEvent, type AuditEventType } from "./audit.ts";
import { defaultSnapshotAlgorithm, sha256Hex, snapshotHash } from "./canonical.ts";
import { authorizeDecision, type ActorResolver, type AuthorizationError, type EditorialPolicy, type IdentityError } from "./identity.ts";
import {
  DECISION_KINDS,
  DECISION_OUTCOMES,
  INVALIDATION_REASONS,
  SUBJECT_TYPES,
  isOneOf,
  type DecisionKind,
  type DecisionReceipt,
  type DecisionRequest,
  type InvalidationReason,
  type SubjectType,
} from "./model.ts";
import type { ArchiveSnapshotReader, AuditEventSink, ReviewDecisionRepository } from "./repositories.ts";
import { parseStrictTimestamp } from "./time.ts";

export type DecisionError =
  | IdentityError
  | AuthorizationError
  | "invalid_request"
  | "untrusted_identity_field"
  | "subject_not_found"
  | "revision_token_required"
  | "stale_snapshot"
  | "revision_conflict"
  | "idempotency_key_conflict"
  | "historian_review_required"
  | "partial_write_requires_reconciliation"
  | "write_failed";

export type DecisionResult =
  | { ok: true; receipt: DecisionReceipt; replayed: boolean }
  | { ok: false; error: DecisionError; httpStatus: 400 | 401 | 403 | 404 | 409 | 500 | 503 };

const REQUEST_FIELDS = new Set(["requestId", "idempotencyKey", "subjectType", "recordId", "decisionKind", "outcome", "expectedSnapshotHash", "evidenceReferences", "rationale"]);
const IDENTITY_FIELDS = /^(actor|actorId|actorRole|role|roles|approvedBy|reviewer|user|session|proof|authorization|isAdmin|admin)$/i;
const HEX = /^[0-9a-f]{64}$/;
const MAX_TEXT = 4000;

const HTTP: Record<DecisionError, 400 | 401 | 403 | 404 | 409 | 500 | 503> = {
  not_configured: 503,
  test_provider_forbidden_in_production: 503,
  identity_unavailable: 401,
  session_invalid: 401,
  session_expired: 401,
  unknown_role: 403,
  policy_unconfigured: 503,
  actor_not_server_resolved: 401,
  role_not_permitted: 403,
  conflict_of_interest_author: 403,
  separation_of_duties: 403,
  invalid_request: 400,
  untrusted_identity_field: 400,
  subject_not_found: 404,
  revision_token_required: 409,
  stale_snapshot: 409,
  revision_conflict: 409,
  idempotency_key_conflict: 409,
  historian_review_required: 409,
  partial_write_requires_reconciliation: 500,
  write_failed: 500,
};

function fail(error: DecisionError): DecisionResult {
  return { ok: false, error, httpStatus: HTTP[error] };
}

/** Gelen istek gövdesinin katı doğrulaması. Kimlik/rol alanı taşıyan gövde reddedilir. */
export function parseDecisionRequest(body: unknown): { ok: true; request: DecisionRequest } | { ok: false; error: "invalid_request" | "untrusted_identity_field" | "revision_token_required" } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_request" };
  const keys = Object.keys(body);
  if (keys.some((key) => IDENTITY_FIELDS.test(key))) return { ok: false, error: "untrusted_identity_field" };
  if (keys.some((key) => !REQUEST_FIELDS.has(key))) return { ok: false, error: "invalid_request" };
  const value = body as Record<string, unknown>;
  if (value.expectedSnapshotHash === undefined || value.expectedSnapshotHash === null || value.expectedSnapshotHash === "") {
    return { ok: false, error: "revision_token_required" };
  }
  const text = (field: unknown) => typeof field === "string" && field.trim().length > 0 && field.length <= MAX_TEXT;
  const valid =
    text(value.requestId) &&
    text(value.idempotencyKey) &&
    text(value.recordId) &&
    isOneOf(SUBJECT_TYPES, value.subjectType) &&
    isOneOf(DECISION_KINDS, value.decisionKind) &&
    isOneOf(DECISION_OUTCOMES, value.outcome) &&
    typeof value.expectedSnapshotHash === "string" &&
    HEX.test(value.expectedSnapshotHash) &&
    Array.isArray(value.evidenceReferences) &&
    value.evidenceReferences.length > 0 &&
    value.evidenceReferences.length <= 50 &&
    value.evidenceReferences.every(text) &&
    text(value.rationale);
  if (!valid) return { ok: false, error: "invalid_request" };
  return { ok: true, request: value as unknown as DecisionRequest };
}

export interface DecisionValidity {
  receipt: DecisionReceipt | null;
  state: "valid" | "missing" | "stale" | "invalidated" | "expired" | "not_approved";
  reason: InvalidationReason | null;
}

/**
 * Belirli bir karar türü için güncel revizyonda geçerli onayı bulur. Başka revizyonun
 * onayı ödünç alınamaz; geri çekilmiş veya süresi geçmiş onay sayılmaz.
 */
export function effectiveDecision(
  receipts: readonly DecisionReceipt[],
  kind: DecisionKind,
  currentSnapshotHash: string,
  now: number,
  policy: EditorialPolicy | null,
): DecisionValidity {
  const ofKind = receipts.filter((receipt) => receipt.decisionKind === kind);
  if (!ofKind.length) return { receipt: null, state: "missing", reason: null };
  const current = ofKind.filter((receipt) => receipt.revision.snapshotHash === currentSnapshotHash);
  if (!current.length) return { receipt: ofKind.at(-1) ?? null, state: "stale", reason: "stale" };
  const latest = current.at(-1) as DecisionReceipt;
  if (latest.invalidatedBy) return { receipt: latest, state: "invalidated", reason: latest.invalidatedBy };
  if (latest.outcome !== "approved") return { receipt: latest, state: "not_approved", reason: null };
  if (policy?.approvalValidityMs != null) {
    const recorded = parseStrictTimestamp(latest.recordedAt);
    if (!recorded.ok || recorded.epochMs + policy.approvalValidityMs < now) return { receipt: latest, state: "expired", reason: "expired_by_policy" };
  }
  return { receipt: latest, state: "valid", reason: null };
}

export interface DecisionServiceDeps {
  resolver: ActorResolver;
  policy: EditorialPolicy | null;
  subjects: ArchiveSnapshotReader;
  decisions: ReviewDecisionRepository;
  audit: AuditEventSink;
  now: () => number;
}

const EVENT_FOR: Record<DecisionKind, Record<DecisionRequest["outcome"], AuditEventType>> = {
  historian_review: { approved: "review_accepted_by_trusted_system", changes_requested: "review_changes_requested", rejected: "review_rejected" },
  publication_editor: { approved: "editor_decision_recorded", changes_requested: "editor_decision_recorded", rejected: "editor_decision_recorded" },
};

export function createDecisionService(deps: DecisionServiceDeps) {
  async function recordDecision(body: unknown, untrustedRequestContext?: unknown): Promise<DecisionResult> {
    const parsed = parseDecisionRequest(body);
    if (!parsed.ok) return fail(parsed.error);
    const request = parsed.request;
    const resolved = await deps.resolver.resolve(untrustedRequestContext);
    if (!resolved.ok) return fail(resolved.error);
    const actor = resolved.actor;
    const subject = await deps.subjects.readSubject(request.subjectType, request.recordId);
    if (!subject) return fail("subject_not_found");
    const currentHash = snapshotHash(request.subjectType, subject.record as Record<string, unknown>);
    if (request.expectedSnapshotHash !== currentHash) return fail("stale_snapshot");

    const fingerprint = sha256Hex([request.subjectType, request.recordId, request.decisionKind, request.outcome, currentHash, actor.actorId].join("\n"));
    const prior = await deps.audit.findByIdempotencyKey(request.idempotencyKey);
    if (prior) {
      if (prior.payload.fingerprint !== fingerprint) return fail("idempotency_key_conflict");
      const existing = (await deps.decisions.listForSubject(request.subjectType, request.recordId)).find((receipt) => receipt.auditEventHash === prior.hash);
      if (!existing) return fail("partial_write_requires_reconciliation");
      return { ok: true, receipt: existing, replayed: true };
    }

    const receipts = await deps.decisions.listForSubject(request.subjectType, request.recordId);
    const otherKind: DecisionKind = request.decisionKind === "historian_review" ? "publication_editor" : "historian_review";
    const otherActors = receipts
      .filter((receipt) => receipt.decisionKind === otherKind && receipt.revision.snapshotHash === currentHash && !receipt.invalidatedBy)
      .map((receipt) => receipt.actorId);
    const authorization = authorizeDecision(actor, request.decisionKind, deps.policy, {
      subjectType: request.subjectType,
      authorActorIds: subject.authorActorIds,
      otherDecisionActorIds: otherActors,
    });
    if (!authorization.ok) return fail(authorization.error);
    const now = deps.now();
    if (request.decisionKind === "publication_editor" && request.outcome === "approved") {
      if (effectiveDecision(receipts, "historian_review", currentHash, now, deps.policy).state !== "valid") return fail("historian_review_required");
    }

    const recordedAt = new Date(now).toISOString();
    const previous = await deps.audit.last();
    const event = buildAuditEvent(previous, {
      idempotencyKey: request.idempotencyKey,
      type: EVENT_FOR[request.decisionKind][request.outcome],
      timestamp: recordedAt,
      requestId: request.requestId,
      actorId: actor.actorId,
      actorRole: actor.role,
      actorVerified: true,
      subjectType: request.subjectType,
      recordId: request.recordId,
      snapshotHash: currentHash,
      decisionRef: `${request.decisionKind}:${request.outcome}`,
      payload: { fingerprint, evidenceCount: request.evidenceReferences.length },
    });
    const appended = await deps.audit.append(event, previous?.hash ?? event.prevHash);
    if (!appended.ok) return fail(appended.error);
    const receipt: DecisionReceipt = Object.freeze({
      decisionId: `dec-${sha256Hex(request.idempotencyKey).slice(0, 24)}`,
      decisionKind: request.decisionKind,
      outcome: request.outcome,
      subjectType: request.subjectType,
      recordId: request.recordId,
      revision: Object.freeze({ subjectType: request.subjectType, recordId: request.recordId, snapshotAlgorithm: defaultSnapshotAlgorithm(request.subjectType), snapshotHash: currentHash }),
      actorId: actor.actorId,
      actorRole: actor.role,
      recordedAt,
      auditEventHash: event.hash,
      invalidatedBy: null,
    });
    const stored = await deps.decisions.append(receipt, receipts.length);
    // Audit yazıldı ama karar yazılamadıysa: üretimde tek transaksiyon gerekir; burada açıkça raporlanır.
    if (!stored.ok) return fail(stored.error === "revision_conflict" ? "revision_conflict" : "partial_write_requires_reconciliation");
    return { ok: true, receipt, replayed: false };
  }

  async function revokeDecision(input: { requestId: string; idempotencyKey: string; subjectType: SubjectType; recordId: string; decisionId: string; reason: InvalidationReason }): Promise<DecisionResult> {
    if (!isOneOf(INVALIDATION_REASONS, input.reason) || !isOneOf(SUBJECT_TYPES, input.subjectType)) return fail("invalid_request");
    const resolved = await deps.resolver.resolve();
    if (!resolved.ok) return fail(resolved.error);
    const receipts = await deps.decisions.listForSubject(input.subjectType, input.recordId);
    const target = receipts.find((receipt) => receipt.decisionId === input.decisionId);
    if (!target) return fail("subject_not_found");
    const prior = await deps.audit.findByIdempotencyKey(input.idempotencyKey);
    if (prior) {
      if (prior.type !== "approval_revoked" || prior.decisionRef !== target.decisionId || prior.actorId !== resolved.actor.actorId) return fail("idempotency_key_conflict");
      return { ok: true, receipt: target, replayed: true };
    }
    const authorization = authorizeDecision(resolved.actor, target.decisionKind, deps.policy, { subjectType: input.subjectType, authorActorIds: [], otherDecisionActorIds: [] });
    if (!authorization.ok) return fail(authorization.error);
    const previous = await deps.audit.last();
    const event = buildAuditEvent(previous, {
      idempotencyKey: input.idempotencyKey,
      type: "approval_revoked",
      timestamp: new Date(deps.now()).toISOString(),
      requestId: input.requestId,
      actorId: resolved.actor.actorId,
      actorRole: resolved.actor.role,
      actorVerified: true,
      subjectType: input.subjectType,
      recordId: input.recordId,
      snapshotHash: target.revision.snapshotHash,
      decisionRef: target.decisionId,
      payload: { reason: input.reason },
    });
    const appended = await deps.audit.append(event, previous?.hash ?? event.prevHash);
    if (!appended.ok) return fail(appended.error);
    const invalidated = await deps.decisions.invalidate(target.decisionId, input.reason);
    if (!invalidated.ok) return fail("partial_write_requires_reconciliation");
    return { ok: true, receipt: { ...target, invalidatedBy: input.reason }, replayed: false };
  }

  return { recordDecision, revokeDecision };
}
