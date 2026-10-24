import type { DecisionKind, SubjectType } from "./model.ts";
import type { ReviewAssignment } from "./repositories.ts";

/**
 * Atama planları ve düzeltme önerileri. İkisi de varsayılan olarak yalnız plandır:
 * kalıcı depo, güvenilir kimlik ve audit yokken hiçbir şey yazılmaz. Tarihî alanlar
 * (tarih, doğum yeri, özgün arşiv kimliği) otomatik olarak üzerine yazılmaz.
 */

export interface AssignmentPlanInput {
  recordId: string;
  recordRevision: string;
  reviewKind: DecisionKind;
  candidateActorIds: readonly string[];
  /** Kaydı oluşturan/değiştiren aktörler: aynı kaydı bağımsız inceleyemezler. */
  authorActorIds: readonly string[];
  /** Aynı revizyonun diğer karar türüne atanmış aktörler (görev ayrılığı). */
  otherKindActorIds: readonly string[];
  requestedBy: string;
  createdAt: string;
  reason: string;
}

export function planAssignment(input: AssignmentPlanInput): { dryRun: true; assignment: ReviewAssignment | null; excluded: Record<string, string> } {
  const excluded: Record<string, string> = {};
  let chosen: string | null = null;
  for (const actorId of [...input.candidateActorIds].sort()) {
    if (input.authorActorIds.includes(actorId)) excluded[actorId] = "conflict_of_interest_author";
    else if (input.otherKindActorIds.includes(actorId)) excluded[actorId] = "separation_of_duties";
    else if (actorId === input.requestedBy) excluded[actorId] = "self_assignment";
    else chosen ??= actorId;
  }
  return {
    dryRun: true,
    excluded,
    assignment: chosen
      ? {
          assignmentId: `plan-${input.recordId}-${input.reviewKind}-${input.recordRevision.slice(0, 12)}`,
          recordId: input.recordId,
          recordRevision: input.recordRevision,
          reviewKind: input.reviewKind,
          assignedActorId: chosen,
          requestedBy: input.requestedBy,
          createdAt: input.createdAt,
          dueAt: null,
          state: "assigned",
          expectedSnapshotHash: input.recordRevision,
          reason: input.reason,
        }
      : null,
  };
}

export const PROTECTED_HISTORICAL_PATHS = Object.freeze(["/date", "/source/archiveIdentifier", "/provenance", "/locations", "/people", "/quotation"]);

export interface JsonPatchOperation {
  op: "replace" | "add" | "remove";
  path: string;
  value?: unknown;
}

export interface CorrectionRequest {
  recordId: string;
  subjectType: SubjectType;
  snapshotHash: string;
  fieldPath: string;
  reason: string;
  evidenceReferences: readonly string[];
  priority: "low" | "normal" | "high";
  status: "open" | "stale_snapshot" | "accepted_by_human" | "rejected_by_human";
  createdByTrustedActor: string | null;
  proposedPatch: readonly JsonPatchOperation[];
  dryRun: true;
}

export type CorrectionEvaluation =
  | { state: "stale_snapshot"; httpStatus: 409; preserved: CorrectionRequest }
  | { state: "requires_human_decision"; protectedFieldTouched: boolean; preserved: CorrectionRequest };

/**
 * Öneriyi değerlendirir ama UYGULAMAZ. Eski revizyona bağlı öneri güncel kayda sessizce
 * uygulanmaz (409 / stale_snapshot); öneri silinmez, korunur.
 */
export function evaluateCorrection(request: CorrectionRequest, currentSnapshotHash: string): CorrectionEvaluation {
  if (request.snapshotHash !== currentSnapshotHash) {
    return { state: "stale_snapshot", httpStatus: 409, preserved: { ...request, status: "stale_snapshot" } };
  }
  const protectedFieldTouched = request.proposedPatch.some((operation) => PROTECTED_HISTORICAL_PATHS.some((path) => operation.path === path || operation.path.startsWith(`${path}/`)));
  return { state: "requires_human_decision", protectedFieldTouched, preserved: request };
}
