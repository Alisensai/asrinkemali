/**
 * ASRIN KEMALİ — Authority Registry Veri Tipleri Sözleşmesi (1.0.0)
 */

export type AuthorityKind =
  | "person"
  | "place"
  | "institution"
  | "event"
  | "source_work"
  | "source_manifestation"
  | "source_item";

export type AuthorityStatus =
  | "provisional"
  | "review_required"
  | "rejected"
  | "approved_from_verified_human_workflow";

export interface AuthorityObservation {
  observationId: string;
  recordId: string;
  sourcePath: string;
  observedText: string;
  normalizedText: string;
  role: string | null;
  recordHash: string | null;
  extractedAt: string;
}

export interface RecordReference {
  recordId: string;
  recordTitle?: string;
  role?: string | null;
  sourceField?: string;
}

export interface HumanApprovalRecord {
  verifiedBy: string;
  role: "expert_historian" | "chief_editor";
  decisionDate: string;
  evidenceRef: string;
}

export interface AuthorityEntity {
  schemaVersion: "1.0.0";
  authorityId: string;
  id: string;
  kind: AuthorityKind;
  type: AuthorityKind;
  preferredLabel: string;
  preferredName: string;
  aliases: string[];
  sourceRecordReferences: RecordReference[];
  recordRefs: RecordReference[];
  humanApproval: HumanApprovalRecord | null;
  status: AuthorityStatus;
  roles?: string[];
  country?: string;
  city?: string;
  institutionType?: string;
  url?: string | null;
  date?: string | null;
  sourceType?: string;
  archiveIdentifier?: string | null;
}

export interface AuthorityEdge {
  fromId: string;
  toId: string;
  relation: string;
  evidenceReferences: string[];
  certainty: "provisional" | "verified";
  reviewRequired: boolean;
  createdAt: string;
}

export interface MatchCandidateResult {
  targetId: string;
  score: number;
  reasonCodes: string[];
  requiresHumanReview: boolean;
  isHardNegative: boolean;
  explanation: string;
}

export interface AuthorityRegistrySummary {
  totalEntities: number;
  persons: number;
  places: number;
  institutions: number;
  events: number;
  sourceWorks: number;
  totalRecordReferences: number;
  totalObservations: number;
  graphNodes: number;
  graphEdges: number;
}
