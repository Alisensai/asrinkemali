/**
 * ASRIN KEMALİ — MKA Immersive Museum V0.7
 * Sergi Veri Modelleri, Bölüm Sözleşmeleri ve DTO Tanımları
 */

export type ExhibitionTheme =
  | "milli_mucadele"
  | "cumhuriyetin_ilani"
  | "tbmm_kurulusu"
  | "egitim_ve_kultur"
  | "hukuk_ve_anaduzen"
  | "baris_ve_diplomasi";

export type ExhibitionReviewStatus = "draft" | "in_review" | "approved" | "published";

export interface ChronologicalScope {
  startYear: number;
  endYear: number;
  displayRange: string;
}

export interface CuratorInfo {
  name: string;
  role: string;
  note?: string;
}

export interface ExhibitionCoverImage {
  src: string;
  alt: string;
  credit: string;
  isRepresentative: boolean;
  aspectRatio?: string;
}

/* --------------------------------------------------------------------------
   Bölüm Türleri (Section Types)
   -------------------------------------------------------------------------- */

export interface BaseSection {
  id: string;
  order: number;
  kicker?: string;
  title: string;
}

export interface HeroSection extends BaseSection {
  type: "hero";
  subtitle: string;
  leadParagraph: string;
  curatorNote?: string;
  actions: {
    primaryLabel: string;
    secondaryLabel?: string;
  };
}

export interface NarrativeSection extends BaseSection {
  type: "narrative";
  content: string[];
  historicalContext?: string;
  highlightQuote?: {
    text: string;
    speaker?: string;
    context?: string;
    verifiedSourceNote?: string;
  };
}

export interface DocumentItem {
  archiveSlug: string;
  title: string;
  institution: string;
  dateDisplay: string;
  documentType: "document" | "photograph" | "speech" | "event" | "publication" | "place";
  rightsStatus: string;
  citation?: string;
  sourceUrl?: string;
  description: string;
  isRepresentativeVisual?: boolean;
}

export interface ArchiveShowcaseSection extends BaseSection {
  type: "archive_showcase";
  summary: string;
  primaryDocument: DocumentItem;
  contextualNotes?: string[];
  relatedArchiveSlugs?: string[];
}

export interface TimelineEventItem {
  id: string;
  year: number;
  exactDate?: string;
  dateCertainty: "exact" | "estimated" | "approximate";
  title: string;
  description: string;
  eventDate: string;
  documentDate?: string;
  archiveSlug?: string;
  institution: string;
}

export interface TimelineSection extends BaseSection {
  type: "timeline";
  introText?: string;
  events: TimelineEventItem[];
}

export interface DocumentGallerySection extends BaseSection {
  type: "document_gallery";
  lead?: string;
  items: DocumentItem[];
}

export interface SourceValidationItem {
  id: string;
  title: string;
  institution: string;
  catalogId?: string;
  sourceUrl?: string;
  rightsNote: string;
  verificationBadge: string;
  humanReviewed: boolean;
}

export interface SourcePanelSection extends BaseSection {
  type: "source_panel";
  statement: string;
  sources: SourceValidationItem[];
}

export interface ComparisonSection extends BaseSection {
  type: "comparison";
  aspectTitle: string;
  leftColumn: {
    title: string;
    period: string;
    description: string;
    points: string[];
  };
  rightColumn: {
    title: string;
    period: string;
    description: string;
    points: string[];
  };
}

export interface ClosingSection extends BaseSection {
  type: "closing";
  epilogue: string;
  curatorSignoff: string;
  sourcesSummary: string;
  suggestedExhibitions?: Array<{
    slug: string;
    title: string;
    theme: string;
  }>;
}

export type ExhibitionSection =
  | HeroSection
  | NarrativeSection
  | ArchiveShowcaseSection
  | TimelineSection
  | DocumentGallerySection
  | SourcePanelSection
  | ComparisonSection
  | ClosingSection;

/* --------------------------------------------------------------------------
   Ana Sergi Kaydı (ExhibitionRecord)
   -------------------------------------------------------------------------- */

export interface EditorialReviewMetadata {
  status: ExhibitionReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  version: string;
  notes?: string;
  isSyntheticPreview?: boolean;
}

export interface ExhibitionRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  theme: ExhibitionTheme;
  themeLabel: string;
  chronologicalScope: ChronologicalScope;
  coverImage: ExhibitionCoverImage;
  curator: CuratorInfo;
  sections: ExhibitionSection[];
  relatedArchiveRecordSlugs: string[];
  editorialReview: EditorialReviewMetadata;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------------------------------------------------
   İstemci Tarafı DTO (Client Safe)
   -------------------------------------------------------------------------- */

export interface ExhibitionDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  theme: ExhibitionTheme;
  themeLabel: string;
  chronologicalScope: ChronologicalScope;
  coverImage: ExhibitionCoverImage;
  curator: CuratorInfo;
  sections: ExhibitionSection[];
  relatedArchiveRecordSlugs: string[];
  isSyntheticPreview: boolean;
  editorialReview: {
    status: ExhibitionReviewStatus;
    reviewedBy?: string;
    version: string;
  };
}

/* --------------------------------------------------------------------------
   Depo ve İş Akışı Sözleşmeleri (Repository & Workflow Contracts)
   -------------------------------------------------------------------------- */

export interface ExhibitionFilters {
  q?: string;
  theme?: ExhibitionTheme;
  yearFrom?: number;
  yearTo?: number;
  includeStaging?: boolean;
}

export interface ExhibitionWorkflowTransition {
  fromStatus: ExhibitionReviewStatus;
  toStatus: ExhibitionReviewStatus;
  authorizedRole: "curator" | "editor" | "historian" | "admin";
  reason: string;
  timestamp: string;
}
