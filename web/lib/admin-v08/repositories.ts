import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import type { PublicationRecord } from "../../../schemas/publication-record.types";
import type { ReviewForm } from "./reviews";

export interface StagingRevision {
  revisionId: string;
  recordId: string;
  expectedRecordVersion: string;
  proposedChanges: Readonly<Record<string, unknown>>;
  createdBy: string;
  createdAt: string;
  reason: string;
  status: "staged" | "review_required" | "rejected";
}

export interface ReviewRepository {
  listForms(): Promise<readonly ReviewForm[]>;
  getForm(recordId: string): Promise<ReviewForm | undefined>;
}

export interface PublicationRepository {
  listPublications(): Promise<readonly PublicationRecord[]>;
}

export interface AdminRepository extends ReviewRepository, PublicationRepository {
  listArchiveRecords(): Promise<readonly ArchiveRecord[]>;
  createStagingRevision(revision: StagingRevision): Promise<void>;
  getAuditEvents(limit: number): Promise<readonly unknown[]>;
}

export function createPublicationReadOnlyAdapter(
  list: () => readonly PublicationRecord[],
): PublicationRepository {
  return Object.freeze({
    async listPublications() {
      return Object.freeze([...list()]);
    },
  });
}
