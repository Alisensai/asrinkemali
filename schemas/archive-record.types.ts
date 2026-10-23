/**
 * Asrın Kemali arşiv veri sözleşmesi.
 *
 * Bu dosya yalnızca TypeScript tip sözleşmesidir. Çalışma zamanı doğrulaması
 * `schemas/archive-record.schema.json` ve `scripts/archive/lib/validate.mjs`
 * tarafından yapılır. Alan adları JSON Schema ile birebir aynı tutulmalıdır.
 */

export type ArchiveRecordType =
  | "photograph"
  | "document"
  | "speech"
  | "event"
  | "publication"
  | "place";

export type DatePrecision = "day" | "month" | "year" | "range" | "unknown";
export type DateCertainty = "exact" | "estimated" | "unknown";
export type PersonRole = "subject" | "speaker" | "author" | "official" | "other";
export type InstitutionType =
  | "official"
  | "institutional"
  | "archive"
  | "library"
  | "academic"
  | "other";
export type RightsStatus =
  | "public_domain"
  | "open_license"
  | "official_link_only"
  | "institutional_terms"
  | "unknown"
  | "permission_required"
  | "ai_representative";
export type ImageReuse =
  | "not_downloaded"
  | "link_only"
  | "permitted"
  | "ai_representative";
export type VerificationStatus = "draft" | "reviewed" | "published";
export type ImageKind = "digitized_original" | "ai_representative" | "none";
export type ImageDisplayPolicy =
  | "source_link_only"
  | "embedded_allowed"
  | "not_displayed";
export type QuoteEvidenceMethod =
  | "institutional_transcription"
  | "facsimile"
  | "published_transcription";

export interface ArchiveDate {
  start: string | null;
  end: string | null;
  precision: DatePrecision;
  certainty: DateCertainty;
  display: string;
  note?: string;
}

export interface ArchivePerson {
  name: string;
  role: PersonRole;
  note?: string;
}

export interface ArchiveLocation {
  name: string;
  country?: string;
  city?: string;
  note?: string;
}

export interface ArchiveSource {
  institution: string;
  institutionType: InstitutionType;
  institutionUrl: string;
  title: string;
  url: string;
  accessedAt: string;
  publishedAt?: string | null;
  archiveIdentifier?: string | null;
  note?: string;
}

export interface ArchiveProvenance {
  institution: string;
  collection?: string | null;
  identifier?: string | null;
  url?: string | null;
  accessedAt: string;
  note?: string;
}

export interface ArchiveRights {
  status: RightsStatus;
  license?: string | null;
  licenseUrl?: string | null;
  termsUrl?: string | null;
  credit?: string;
  imageReuse: ImageReuse;
  note: string;
}

export interface ArchiveImage {
  kind: ImageKind;
  url?: string | null;
  sourcePageUrl?: string | null;
  alt: string;
  credit: string;
  width?: number | null;
  height?: number | null;
  mimeType?: "image/jpeg" | "image/png" | "image/webp" | null;
  localPath?: string | null;
  displayPolicy: ImageDisplayPolicy;
}

export interface QuoteEvidence {
  sourceExcerpt: string;
  retrievedAt: string;
  verifiedBy: string;
  method: QuoteEvidenceMethod;
  note?: string;
}

export interface ArchiveQuotation {
  text: string;
  speaker: "Mustafa Kemal Atatürk";
  work: string;
  date: string;
  context: string;
  sourceUrl: string;
  sourceTitle: string;
  evidence: QuoteEvidence;
  verified: true;
}

export interface VerificationChecks {
  sourceReachable: boolean;
  dateVerified: boolean;
  rightsVerified: boolean;
  quoteVerified: boolean;
  duplicateChecked: boolean;
}

export interface ArchiveVerification {
  status: VerificationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  checks: VerificationChecks;
  notes: string;
}

export interface ArchiveRecord {
  schemaVersion: "1.0.0";
  id: string;
  slug: string;
  title: string;
  type: ArchiveRecordType;
  date: ArchiveDate;
  people: ArchivePerson[];
  locations: ArchiveLocation[];
  categories: string[];
  summary: string;
  description?: string;
  source: ArchiveSource;
  provenance: ArchiveProvenance[];
  rights: ArchiveRights;
  image: ArchiveImage | null;
  quotation?: ArchiveQuotation | null;
  verification: ArchiveVerification;
  tags: string[];
  relatedIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type SearchMode = "folded" | "exact";

export interface ArchiveSearchQuery {
  /** Serbest metin. `yil:1923 kategori:egitim tur:event etiket:TBMM` süzgeçleri de desteklenir. */
  q?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  category?: string;
  type?: ArchiveRecordType;
  tags?: string[];
  mode?: SearchMode;
  /** Yalnızca yönetici/denetim ekranları için; varsayılan false. */
  includeNonPublished?: boolean;
  limit?: number;
}

export interface ArchiveSearchHit {
  record: ArchiveRecord;
  score: number;
  matchedFields: string[];
  snippet: string;
}

export interface TodayInHistoryResult {
  date: string;
  records: ArchiveRecord[];
  message: string | null;
}

export interface ArchiveValidationIssue {
  code: string;
  recordId: string | null;
  path: string;
  message: string;
}

export interface ArchiveValidationResult {
  ok: boolean;
  errors: ArchiveValidationIssue[];
  warnings: ArchiveValidationIssue[];
  stats: {
    total: number;
    byStatus: Record<VerificationStatus, number>;
    byType: Record<ArchiveRecordType, number>;
    withQuotation: number;
    withImage: number;
    unknownDates: number;
  };
}
