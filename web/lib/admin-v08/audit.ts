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
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function redactRecord(input: object): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : redactValue(value)]),
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
    (event.actorRole === null || typeof event.actorRole === "string") &&
    (event.targetId === null || typeof event.targetId === "string") &&
    (event.recordVersion === null || typeof event.recordVersion === "string")
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
