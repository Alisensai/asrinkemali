export type PublicationKind = "research_article" | "biography" | "historical_analysis" | "sourced_article";
export type PublicationStatus = "draft" | "in_review" | "approved" | "scheduled" | "published";

export interface PublicationBlock {
  type: "heading" | "paragraph";
  text: string;
}

export interface PublicationBibliographyItem {
  id: string;
  title: string;
  institution: string;
  url: string;
  accessedAt: string;
}

export interface HumanApproval {
  kind: "human";
  approvedBy: string;
  approvedAt: string;
}

export interface DraftAutomation {
  mode: "deterministic" | "ai_assisted";
  sourceArchiveIds: string[];
  sourceSnapshotAt: string;
  runId: string;
  provider?: string;
  model?: string;
  maxCostCents: number;
  actualCostCents: number;
}

export interface PublicationRecord {
  schemaVersion: "1.0.0";
  id: string;
  slug: string;
  kind: PublicationKind;
  title: string;
  summary: string;
  body: PublicationBlock[];
  category: string;
  tags: string[];
  authors: string[];
  bibliography: PublicationBibliographyItem[];
  relatedArchiveIds: string[];
  rights: { license: string; holder: string; note: string };
  status: PublicationStatus;
  approval: HumanApproval | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  automation: DraftAutomation | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationLedgerEntry {
  idempotencyKey: string;
  publicationId: string;
  publishedAt: string;
}
