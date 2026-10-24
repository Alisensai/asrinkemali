import type { AdminPermissionGrant } from "./fortress-role-adapter.ts";
import { authorizeAdminMutation } from "./fortress-role-adapter.ts";

const RECORD_ID = /^[a-z0-9][a-z0-9-]{0,119}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ALLOWED_FIELDS = new Set(["title", "summary", "date", "source", "rights", "image", "quotation"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export interface StagingRevisionProposal {
  revisionId: string;
  idempotencyKey: string;
  recordId: string;
  expectedRecordVersion: string;
  proposedChanges: Readonly<Record<string, unknown>>;
  createdBy: string;
  createdAt: string;
  reason: string;
  status: "review_required";
}

export interface StagingTransaction {
  commitRevisionAndAudit(input: {
    revision: StagingRevisionProposal;
    expectedRecordVersion: string;
    idempotencyKey: string;
  }): Promise<"created" | "conflict" | "duplicate">;
}

export type StageProposalResult =
  | { status: "not_configured" }
  | { status: "invalid"; reason: string }
  | { status: "conflict" }
  | { status: "duplicate" }
  | { status: "staged"; revisionId: string };

function isSafeJson(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 100 && value.every((item) => isSafeJson(item, depth + 1));
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const entries = Object.entries(value);
  return entries.length <= 100 && entries.every(
    ([key, item]) => !FORBIDDEN_KEYS.has(key) && key.length <= 120 && isSafeJson(item, depth + 1),
  );
}

function validChanges(changes: unknown): changes is Readonly<Record<string, unknown>> {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return false;
  const entries = Object.entries(changes);
  return entries.length > 0 &&
    entries.length <= ALLOWED_FIELDS.size &&
    entries.every(([key, value]) => ALLOWED_FIELDS.has(key) && isSafeJson(value));
}

export async function stageProposal(
  input: {
    revisionId: string;
    idempotencyKey: string;
    recordId: string;
    currentRecordVersion: string;
    expectedRecordVersion: string;
    proposedChanges: unknown;
    reason: string;
    createdAt: string;
    grant: AdminPermissionGrant | null;
  },
  store?: StagingTransaction,
): Promise<StageProposalResult> {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(input.revisionId) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(input.idempotencyKey) ||
    !RECORD_ID.test(input.recordId) ||
    !SHA256.test(input.currentRecordVersion) ||
    !SHA256.test(input.expectedRecordVersion) ||
    !validChanges(input.proposedChanges) ||
    input.reason.trim().length < 8 ||
    input.reason.length > 1000 ||
    Number.isNaN(Date.parse(input.createdAt))
  ) {
    return { status: "invalid", reason: "Öneri alanları veya değişiklik kümesi geçersiz." };
  }
  if (input.currentRecordVersion !== input.expectedRecordVersion) return { status: "conflict" };
  const grant = input.grant;
  if (!grant || !authorizeAdminMutation(grant, "archive.edit").allowed) {
    return { status: "invalid", reason: "Doğrulanmış archive.edit yetkisi gerekli." };
  }
  if (!store) return { status: "not_configured" };

  const revision: StagingRevisionProposal = Object.freeze({
    revisionId: input.revisionId,
    idempotencyKey: input.idempotencyKey,
    recordId: input.recordId,
    expectedRecordVersion: input.expectedRecordVersion,
    proposedChanges: Object.freeze({ ...input.proposedChanges }),
    createdBy: grant.subject,
    createdAt: input.createdAt,
    reason: input.reason.trim(),
    status: "review_required",
  });

  const result = await store.commitRevisionAndAudit({
    revision,
    expectedRecordVersion: input.expectedRecordVersion,
    idempotencyKey: input.idempotencyKey,
  });
  if (result === "created") return { status: "staged", revisionId: revision.revisionId };
  return { status: result };
}
