import type { PublishingFindingCode } from "../publishing-integrations/contracts/types.ts";
import type { FindingCode, PublicationApprovalGateAdapter, SubjectReadiness, SubjectType } from "./model.ts";
import { evaluateExhibitionReviewReadiness, evaluatePublicationReviewReadiness, type ArchiveIndex, type GateEnvironment } from "./policy.ts";
import type { PublicationGateReader } from "./repositories.ts";

/**
 * Prompt 03 (PR #29) yayın preflight'ı ile Görev 04 güven kapısı arasındaki tek bağlantı.
 * Yayın mantığı kopyalanmaz: motor `runPublicationPreflight(..., { hasVerifiedHumanApproval })`
 * çağrısında bu adapterın sonucunu kullanır. Adapter salt-okunurdur.
 */
export function createPublicationApprovalGateAdapter(deps: {
  decisions: PublicationGateReader;
  readSubject(subjectType: SubjectType, recordId: string): Promise<Record<string, unknown> | null>;
  archiveIndex: ArchiveIndex;
  environment: () => GateEnvironment;
}): PublicationApprovalGateAdapter {
  return {
    async readinessFor(subjectType, recordId) {
      const record = await deps.readSubject(subjectType, recordId);
      const environment = deps.environment();
      const decisions = await deps.decisions.listDecisions(subjectType, recordId);
      if (!record) {
        return evaluatePublicationReviewReadiness({ record: { id: recordId }, sourceFile: null, schemaErrors: ["subject_not_found"], decisions: [], archiveIndex: deps.archiveIndex }, environment);
      }
      if (subjectType === "exhibition_record") return evaluateExhibitionReviewReadiness({ record, sourceFile: null, schemaErrors: [], decisions, archiveIndex: deps.archiveIndex }, environment);
      if (subjectType !== "publication_record") {
        return evaluatePublicationReviewReadiness({ record, sourceFile: null, schemaErrors: [`unsupported_subject_type:${subjectType}`], decisions: [], archiveIndex: deps.archiveIndex }, environment);
      }
      return evaluatePublicationReviewReadiness({ record, sourceFile: null, schemaErrors: [], decisions, archiveIndex: deps.archiveIndex }, environment);
    },
  };
}

/** Prompt 03 preflight'ına verilecek tek bayrak: iki ayrı doğrulanmış insan kararı. */
export function hasVerifiedHumanApproval(readiness: SubjectReadiness): boolean {
  return readiness.flags.human_historian_review_verified && readiness.flags.human_editor_approval_verified && readiness.flags.current_revision_matched;
}

/** PR #29 bulgu kodlarının güven kodlarına eşlemesi (aynı sorunu iki raporda iki kez saymamak için). */
export const PR29_COMPATIBILITY: Readonly<Partial<Record<PublishingFindingCode, FindingCode>>> = Object.freeze({
  HUMAN_APPROVAL_UNVERIFIED: "missing_editor_approval",
  AUTH_PROVIDER_UNAVAILABLE: "credential_provider_unavailable",
  AUDIT_STORE_UNAVAILABLE: "audit_chain_invalid",
  APPROVAL_REVISION_STALE: "stale_record_snapshot",
  ARCHIVE_REFERENCE_MISSING: "schema_invalid",
  ARCHIVE_REFERENCE_DUPLICATE: "duplicate_record_id",
  PUBLICATION_INVALID: "schema_invalid",
});
