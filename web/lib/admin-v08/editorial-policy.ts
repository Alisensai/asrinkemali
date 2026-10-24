import { auditActorMatches, validateAdminAuditEvent, verifyAdminAuditChain, type AdminAuditEvent, type ChainedAuditEvent } from "./audit.ts";
import { authorizeAdminMutation, type AdminPermissionGrant } from "./fortress-role-adapter.ts";

export type EditorialDecisionReadiness =
  | { ready: true }
  | { ready: false; reason: "stale_content" | "missing_expert_review" | "missing_editor_approval" | "same_actor" | "missing_mfa" | "audit_unavailable" | "invalid_audit" };

interface RecordedDecision {
  grant: AdminPermissionGrant | null;
  event: AdminAuditEvent | null;
  chain: readonly ChainedAuditEvent[] | null;
  recordSha256: string;
  occurredAt: string;
}

export function evaluateEditorialDecisionReadiness(input: {
  currentRecordSha256: string;
  contentUpdatedAt: string;
  expertReview: RecordedDecision | null;
  editorApproval: RecordedDecision | null;
}): EditorialDecisionReadiness {
  if (
    !/^[0-9a-f]{64}$/.test(input.currentRecordSha256) ||
    Number.isNaN(Date.parse(input.contentUpdatedAt))
  ) return { ready: false, reason: "stale_content" };
  if (!input.expertReview || !input.expertReview.grant || !input.expertReview.event) {
    return { ready: false, reason: "missing_expert_review" };
  }
  if (!input.editorApproval || !input.editorApproval.grant || !input.editorApproval.event) {
    return { ready: false, reason: "missing_editor_approval" };
  }
  if (!input.expertReview.chain || !input.editorApproval.chain) return { ready: false, reason: "audit_unavailable" };
  if (
    input.expertReview.recordSha256 !== input.currentRecordSha256 ||
    input.editorApproval.recordSha256 !== input.currentRecordSha256
  ) {
    return { ready: false, reason: "stale_content" };
  }
  if (input.expertReview.grant.subject === input.editorApproval.grant.subject) return { ready: false, reason: "same_actor" };

  const expertAuthorization = authorizeAdminMutation(input.expertReview.grant, "review.submit_expert");
  const editorAuthorization = authorizeAdminMutation(input.editorApproval.grant, "publication.approve");
  if (
    expertAuthorization.reason === "mfa-required" ||
    editorAuthorization.reason === "mfa-required"
  ) {
    return { ready: false, reason: "missing_mfa" };
  }
  if (!expertAuthorization.allowed || !editorAuthorization.allowed) return { ready: false, reason: "missing_expert_review" };

  const expertEvent = input.expertReview.event;
  const editorEvent = input.editorApproval.event;
  const expertChainContainsEvent = input.expertReview.chain.some((entry) => entry.event.eventId === expertEvent.eventId);
  const editorChainContainsEvent = input.editorApproval.chain.some((entry) => entry.event.eventId === editorEvent.eventId);
  if (
    !validateAdminAuditEvent(expertEvent) ||
    !validateAdminAuditEvent(editorEvent) ||
    input.expertReview.grant.role !== "historian" ||
    input.editorApproval.grant.role !== "chief_editor" ||
    expertEvent.action !== "review_decision" ||
    editorEvent.action !== "editorial_decision" ||
    expertEvent.result !== "success" ||
    editorEvent.result !== "success" ||
    expertEvent.recordVersion !== input.currentRecordSha256 ||
    editorEvent.recordVersion !== input.currentRecordSha256 ||
    !auditActorMatches(expertEvent, { subject: input.expertReview.grant.subject, role: input.expertReview.grant.role }) ||
    !auditActorMatches(editorEvent, { subject: input.editorApproval.grant.subject, role: input.editorApproval.grant.role }) ||
    Date.parse(input.expertReview.occurredAt) < Date.parse(input.contentUpdatedAt) ||
    Date.parse(input.editorApproval.occurredAt) < Date.parse(input.contentUpdatedAt) ||
    Date.parse(input.expertReview.occurredAt) > Date.parse(input.editorApproval.occurredAt) ||
    expertEvent.occurredAt !== input.expertReview.occurredAt ||
    editorEvent.occurredAt !== input.editorApproval.occurredAt ||
    !expertChainContainsEvent ||
    !editorChainContainsEvent ||
    !verifyAdminAuditChain(input.expertReview.chain).valid ||
    !verifyAdminAuditChain(input.editorApproval.chain).valid
  ) {
    return { ready: false, reason: "invalid_audit" };
  }
  return { ready: true };
}
