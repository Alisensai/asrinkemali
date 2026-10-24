import { canonicalJson, sha256Hex } from "./canonical.ts";
import { ACTOR_ROLES, SUBJECT_TYPES, isOneOf, type ActorRole, type SubjectType } from "./model.ts";
import { parseStrictTimestamp } from "./time.ts";

/**
 * Editoryal güven audit olayları ve hash zinciri doğrulayıcısı.
 *
 * Dürüst sınır: hash zinciri yalnız tamper-evident'tır. Zincirin tamamı yeniden yazılırsa
 * kendi içinde yine tutarlı görünür; bunu yalnız harici bir çapa (`anchor`) yakalar.
 * İmzalı veya değiştirilemez depolama sağlanmadı; sahte imza üretilmez.
 * PR #15'in `tools/editorial-review/audit_ledger.py` doğrulayıcısı değiştirilmez.
 */

export const AUDIT_SCHEMA = "editorial-trust-audit/1" as const;
export const GENESIS_HASH = "0".repeat(64);
export const MAX_AUDIT_PAYLOAD_BYTES = 8 * 1024;

export const AUDIT_EVENT_TYPES = [
  "review_requested",
  "review_assigned",
  "review_opened",
  "review_note_added",
  "review_changes_requested",
  "review_submitted_claim",
  "actor_verified",
  "review_accepted_by_trusted_system",
  "review_rejected",
  "editor_decision_requested",
  "editor_decision_recorded",
  "approval_revoked",
  "record_changed",
  "snapshot_stale_detected",
  "publication_gate_evaluated",
  "publication_attempt_denied",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

/** Gerçek insan kararını temsil eden olaylar: doğrulanmış aktör ve revizyon bağı zorunlu. */
export const DECISION_EVENT_TYPES: readonly AuditEventType[] = Object.freeze([
  "review_accepted_by_trusted_system",
  "review_rejected",
  "review_changes_requested",
  "editor_decision_recorded",
  "approval_revoked",
]);

const DECISION_FORBIDDEN_ROLES: readonly ActorRole[] = Object.freeze(["readonly_auditor", "researcher"]);
const SENSITIVE_KEY = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|tckn|tc[_-]?kimlik|national[_-]?id|ip[_-]?address|user[_-]?agent/i;
const HEX = /^[0-9a-f]{64}$/;
const utf8 = new TextEncoder();

function utf8Length(text: string): number {
  return utf8.encode(text).length;
}

export interface AuditEvent {
  schema: typeof AUDIT_SCHEMA;
  sequence: number;
  eventId: string;
  idempotencyKey: string;
  type: AuditEventType;
  timestamp: string;
  requestId: string;
  actorId: string | null;
  actorRole: ActorRole | null;
  actorVerified: boolean;
  subjectType: SubjectType;
  recordId: string;
  snapshotHash: string | null;
  decisionRef: string | null;
  payload: Record<string, unknown>;
  payloadDigest: string;
  prevHash: string;
  hash: string;
}

export type AuditEventInput = Omit<AuditEvent, "schema" | "sequence" | "payloadDigest" | "prevHash" | "hash" | "eventId">;

export function auditEventHash(event: Omit<AuditEvent, "hash">): string {
  return sha256Hex(canonicalJson(event));
}

export function sensitivePayloadKeys(payload: unknown, prefix = ""): string[] {
  if (payload === null || typeof payload !== "object") return [];
  return Object.entries(payload as Record<string, unknown>).flatMap(([key, value]) => [
    ...(SENSITIVE_KEY.test(key) ? [`${prefix}${key}`] : []),
    ...sensitivePayloadKeys(value, `${prefix}${key}.`),
  ]);
}

/** Saf: zincirin sonuna eklenecek olayı üretir; yazmaz. */
export function buildAuditEvent(previous: AuditEvent | null, input: AuditEventInput): AuditEvent {
  const sensitive = sensitivePayloadKeys(input.payload);
  if (sensitive.length) throw new Error(`audit_sensitive_field:${sensitive.join(",")}`);
  const payloadText = canonicalJson(input.payload);
  if (utf8Length(payloadText) > MAX_AUDIT_PAYLOAD_BYTES) throw new Error("audit_payload_too_large");
  const sequence = (previous?.sequence ?? 0) + 1;
  const base = {
    schema: AUDIT_SCHEMA,
    sequence,
    ...input,
    eventId: `evt-${sequence}-${sha256Hex(`${input.idempotencyKey}\n${input.type}`).slice(0, 16)}`,
    payloadDigest: sha256Hex(payloadText),
    prevHash: previous?.hash ?? GENESIS_HASH,
  };
  return Object.freeze({ ...base, hash: auditEventHash(base) });
}

export interface AuditFinding {
  index: number;
  code: string;
}

export interface AuditVerification {
  valid: boolean;
  eventCount: number;
  validEventCount: number;
  findings: AuditFinding[];
  integrityLevel: "hash_chain_tamper_evident" | "hash_chain_with_external_anchor";
  identityAuthenticityProven: false;
}

export function verifyAuditChain(
  events: readonly unknown[],
  options: { now: number; anchor?: { sequence: number; hash: string } },
): AuditVerification {
  const findings: AuditFinding[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Map<string, string>();
  let previousHash = GENESIS_HASH;
  let previousTime = Number.NEGATIVE_INFINITY;
  let valid = 0;
  events.forEach((raw, index) => {
    const add = (code: string) => findings.push({ index, code });
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return add("event_not_object");
    const event = raw as Partial<AuditEvent>;
    const before = findings.length;
    if (event.schema !== AUDIT_SCHEMA) add("unsupported_schema");
    if (event.sequence !== index + 1) add("invalid_sequence");
    if (!isOneOf(AUDIT_EVENT_TYPES, event.type)) add("invalid_event_type");
    if (!isOneOf(SUBJECT_TYPES, event.subjectType)) add("invalid_subject_type");
    if (typeof event.recordId !== "string" || !event.recordId) add("invalid_record_id");
    if (typeof event.requestId !== "string" || !event.requestId) add("invalid_request_id");
    if (event.prevHash !== previousHash) add("broken_prev_hash");
    const time = parseStrictTimestamp(event.timestamp, options.now);
    if (!time.ok) add(`timestamp_${time.error}`);
    else if (time.epochMs < previousTime) add("timestamp_out_of_order");
    if (event.actorRole !== null && !isOneOf(ACTOR_ROLES, event.actorRole)) add("invalid_actor_role");
    if (isOneOf(DECISION_EVENT_TYPES, event.type)) {
      if (event.actorVerified !== true || typeof event.actorId !== "string" || !event.actorId) add("decision_without_verified_actor");
      if (event.actorRole === null || isOneOf(DECISION_FORBIDDEN_ROLES, event.actorRole)) add("decision_role_forbidden");
      if (typeof event.snapshotHash !== "string" || !HEX.test(event.snapshotHash)) add("decision_without_revision_link");
    }
    const payloadText = (() => {
      try {
        return canonicalJson(event.payload ?? null);
      } catch {
        return null;
      }
    })();
    if (payloadText === null || typeof event.payload !== "object" || event.payload === null) add("invalid_payload");
    else {
      if (utf8Length(payloadText) > MAX_AUDIT_PAYLOAD_BYTES) add("payload_too_large");
      if (sha256Hex(payloadText) !== event.payloadDigest) add("payload_digest_mismatch");
      if (sensitivePayloadKeys(event.payload).length) add("sensitive_field_in_payload");
    }
    if (typeof event.eventId !== "string" || seenIds.has(event.eventId)) add("duplicate_or_missing_event_id");
    if (typeof event.idempotencyKey === "string") {
      const fingerprint = `${event.type}|${event.recordId}|${event.snapshotHash}|${event.decisionRef}`;
      const prior = seenKeys.get(event.idempotencyKey);
      if (prior !== undefined) add(prior === fingerprint ? "duplicate_idempotent_event" : "idempotency_key_conflict");
      seenKeys.set(event.idempotencyKey, fingerprint);
    } else add("missing_idempotency_key");
    const { hash, ...withoutHash } = event as AuditEvent;
    let computed: string | null = null;
    try {
      computed = auditEventHash(withoutHash);
    } catch {
      computed = null;
    }
    if (typeof hash !== "string" || !HEX.test(hash) || hash !== computed) add("event_hash_mismatch");
    if (findings.length === before) valid += 1;
    if (typeof event.eventId === "string") seenIds.add(event.eventId);
    if (typeof hash === "string") previousHash = hash;
    if (time.ok) previousTime = Math.max(previousTime, time.epochMs);
  });
  if (options.anchor) {
    const anchored = events[options.anchor.sequence - 1] as Partial<AuditEvent> | undefined;
    if (!anchored || anchored.hash !== options.anchor.hash) findings.push({ index: options.anchor.sequence - 1, code: "external_anchor_mismatch" });
  }
  return {
    valid: findings.length === 0,
    eventCount: events.length,
    validEventCount: valid,
    findings,
    integrityLevel: options.anchor ? "hash_chain_with_external_anchor" : "hash_chain_tamper_evident",
    identityAuthenticityProven: false,
  };
}
