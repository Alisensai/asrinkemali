import { sha256CanonicalJson } from "./canonical-hash.ts";

export const AUDIT_ACTIONS = [
  "login_attempt",
  "authorization_denied",
  "review_started",
  "review_decision",
  "editorial_decision",
  "publication_draft_created",
  "publication_updated",
  "schedule_changed",
  "role_changed",
  "record_mutation_attempt",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditResult = "success" | "denied" | "failed" | "dry_run";

export interface AdminAuditEvent {
  eventId: string;
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  targetId: string | null;
  occurredAt: string;
  result: AuditResult;
  recordVersion: string | null;
  detail: string;
}

const SECRET_KEY = /password|token|secret|api[-_]?key|authorization|cookie/i;
const PII_KEY = /e-?mail|phone|telephone|address|display.?name|full.?name|personal.?name|ip.?address|subject|actor.?id|user.?id/i;
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ACTOR_ROLES = ["system_admin", "chief_editor", "historian", "content_editor", "researcher", "readonly_auditor"] as const;
const GENESIS_HASH = "0".repeat(64);

function redactRecord(input: object): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        SECRET_KEY.test(key) || PII_KEY.test(key) ? "[REDACTED]" : redactValue(value),
      ]),
    ),
  );
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return Object.freeze(value.map(redactValue));
  if (!value || typeof value !== "object") return value;
  return redactRecord(value);
}

export function validateAdminAuditEvent(value: unknown): value is AdminAuditEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.eventId === "string" &&
    Boolean(event.eventId.trim()) &&
    typeof event.action === "string" &&
    AUDIT_ACTIONS.includes(event.action as AuditAction) &&
    typeof event.occurredAt === "string" &&
    RFC3339.test(event.occurredAt) &&
    !Number.isNaN(Date.parse(event.occurredAt)) &&
    typeof event.result === "string" &&
    ["success", "denied", "failed", "dry_run"].includes(event.result) &&
    typeof event.detail === "string" &&
    (event.actorId === null || typeof event.actorId === "string") &&
    (event.actorRole === null || (typeof event.actorRole === "string" && ACTOR_ROLES.includes(event.actorRole as (typeof ACTOR_ROLES)[number]))) &&
    ((event.actorId === null && event.actorRole === null) || (typeof event.actorId === "string" && Boolean(event.actorId.trim()) && event.actorRole !== null)) &&
    (event.targetId === null || typeof event.targetId === "string") &&
    (event.recordVersion === null || typeof event.recordVersion === "string")
  );
}

export interface ChainedAuditEvent {
  sequence: number;
  previousHash: string;
  hash: string;
  event: AdminAuditEvent;
}

export function verifyAdminAuditChain(chain: readonly ChainedAuditEvent[]): { valid: boolean; brokenAt: number | null } {
  let previousHash = GENESIS_HASH;
  const eventIds = new Set<string>();

  for (const [index, entry] of chain.entries()) {
    const sequence = index + 1;
    if (
      entry.sequence !== sequence ||
      entry.previousHash !== previousHash ||
      !validateAdminAuditEvent(entry.event) ||
      eventIds.has(entry.event.eventId) ||
      !/^[0-9a-f]{64}$/.test(entry.hash) ||
      entry.hash !== sha256CanonicalJson({ sequence, previousHash, event: entry.event })
    ) {
      return { valid: false, brokenAt: sequence };
    }
    eventIds.add(entry.event.eventId);
    previousHash = entry.hash;
  }

  return { valid: true, brokenAt: null };
}

export function appendAdminAuditEvent(
  chain: readonly ChainedAuditEvent[],
  event: AdminAuditEvent,
): readonly ChainedAuditEvent[] {
  if (!validateAdminAuditEvent(event)) throw new Error("Audit olayı geçersiz.");
  const verification = verifyAdminAuditChain(chain);
  if (!verification.valid) throw new Error(`Audit zinciri bozuk; sıra ${verification.brokenAt} doğrulanamadı.`);
  if (chain.some((entry) => entry.event.eventId === event.eventId)) throw new Error("Audit eventId daha önce kullanılmış.");

  const previousHash = chain.at(-1)?.hash ?? GENESIS_HASH;
  const sequence = chain.length + 1;
  const hash = sha256CanonicalJson({ sequence, previousHash, event });
  return Object.freeze([...chain, Object.freeze({ sequence, previousHash, hash, event: Object.freeze({ ...event }) })]);
}

export function auditActorMatches(
  event: AdminAuditEvent,
  actor: { subject: string; role: string },
): boolean {
  return Boolean(
    actor.subject.trim() &&
    ACTOR_ROLES.includes(actor.role as (typeof ACTOR_ROLES)[number]) &&
    event.actorId === actor.subject &&
    event.actorRole === actor.role,
  );
}

export function redactAuditDetails(input: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return redactRecord(input);
}

export interface AuditRepository {
  append(event: AdminAuditEvent): Promise<void>;
  list(limit: number): Promise<readonly AdminAuditEvent[]>;
}

export const unavailableAuditRepository: AuditRepository = Object.freeze({
  async append() {
    throw new Error("Kalıcı audit repository yapılandırılmadığı için işlem kaydedilemez.");
  },
  async list() {
    return Object.freeze([]);
  },
});
