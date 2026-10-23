import type { ArchiveRecord } from "./archive-record.types";

/**
 * V0.7 aday modüllerinin V0.6 arşivini değiştirmeden tüketmesi için sınır.
 * Bu sözleşme bir özellik etkinleştirme veya yayın onayı değildir.
 */
export interface ArchiveModuleContext {
  schemaVersion: "1.0.0";
  records: readonly ArchiveRecord[];
  generatedAt: string;
  humanExpertReviewComplete: false;
}

export type V07ModuleId =
  | "history_atlas"
  | "reading_lists"
  | "search_v2"
  | "historical_periods"
  | "document_comparison"
  | "archive_ingest"
  | "search_evaluation"
  | "evidence_engine"
  | "source_reliability";

export type V07Readiness = "proposal" | "external_package" | "draft_pr";

export interface V07ModuleManifest {
  schemaVersion: "1.0.0";
  id: V07ModuleId;
  readiness: V07Readiness;
  ownsRoutes: readonly string[];
  readsArchive: true;
  writesArchive: false;
  requiresHumanReview: true;
  sourceReference: string;
}

export interface ArchiveRecordReference {
  id: string;
  slug: string;
  title: string;
  detailPath: `/arsiv/${string}`;
  verificationStatus: ArchiveRecord["verification"]["status"];
  humanExpertApproved: false;
}

export interface V07ModuleResult<T> {
  moduleId: V07ModuleId;
  generatedAt: string;
  records: readonly T[];
  warnings: readonly string[];
  publicationEligible: false;
}
