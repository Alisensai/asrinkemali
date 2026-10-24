/**
 * ASRIN KEMALİ — Kaynak Güvenilirliği, Provenans ve Kalite Sözleşmesi Tipleri
 * Salt okunur, mutasyonsuz ve güvenlik kapılarını koruyan veri modelleri.
 */

export type SourceClassificationRole = "primary" | "secondary" | "reference" | "unknown";

export type FindingSeverity = "critical" | "error" | "warning" | "info";

export type FindingCategory =
  | "date"
  | "source_sufficiency"
  | "rights"
  | "duplicate"
  | "provenance"
  | "human_review";

export interface CatalogSourceHealthDTO {
  totalRecords: number;
  primarySourcesCount: number;
  secondarySourcesCount: number;
  referenceSourcesCount: number;
  unknownSourcesCount: number;
  primarySourcePercentage: number;
  uniqueSourceUrlsCount: number;
  sharedSourceGroupsCount: number;
  imageRightsUnverifiedCount: number;
  humanReviewRequiredCount: number;
  generatedAt: string;
  sourceRepoSha: string;
  isArchiveModified: false;
}

export interface SourceFindingDTO {
  recordId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  field?: string;
  observedValue?: unknown;
  uncertainty?: string;
  humanActionRequired: boolean;
}

export interface EarlyPeriodCoveragePhaseDTO {
  id: string;
  title: string;
  years: string;
  recordsCount: number;
  directBiographicalCount: number;
  relatedLocationsCount: number;
  status: "adequately_evidenced" | "research_gap";
}

export interface EarlyPeriodCoverageDTO {
  totalEarlyPeriodRecords: number;
  directBiographicalRecordsCount: number;
  relatedLocationsCount: number;
  contextRecordsCount: number;
  coveragePhases: EarlyPeriodCoveragePhaseDTO[];
  identifiedGaps: string[];
}

export interface EarlyPeriodCandidateDTO {
  id: string;
  sourceId: string;
  title: string;
  sourceUrl: string;
  institution: string;
  period: string;
  status: "unverified";
  ingest: false;
  humanApproved: false;
  verificationRequired: true;
  whyCandidate: string;
}

export interface HumanReviewRecordRequirementDTO {
  recordId: string;
  title: string;
  missingEvidence: string[];
  suggestedChecklist: string[];
  severity: FindingSeverity;
}

export interface HumanReviewWorklistDTO {
  totalPendingReview: number;
  expertVerificationPending: number;
  editorApprovalPending: number;
  canPublishAutomatically: false;
  recordsRequiringAction: HumanReviewRecordRequirementDTO[];
}
