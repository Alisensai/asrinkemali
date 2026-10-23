import type { ArchiveRecord, ArchiveRecordType, VerificationStatus } from "../../../schemas/archive-record.types";

export interface ArchiveQuery {
  q: string;
  institution: string;
  type: ArchiveRecordType | "";
  status: VerificationStatus | "";
  rightsRisk: boolean;
  yearFrom?: number;
  yearTo?: number;
  page: number;
}

export interface ArchiveQualityFlags {
  missingSource: boolean;
  rightsUnclear: boolean;
  dateUncertain: boolean;
  quoteNeedsReview: boolean;
  aiRepresentative: boolean;
}

export function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getArchiveQualityFlags(record: ArchiveRecord): ArchiveQualityFlags {
  return {
    missingSource: !record.source.institution.trim() || !record.source.title.trim() || !record.source.url.trim(),
    rightsUnclear: ["unknown", "permission_required"].includes(record.rights.status),
    dateUncertain: record.date.certainty !== "exact" || record.date.precision === "unknown",
    quoteNeedsReview: Boolean(record.quotation),
    aiRepresentative: record.image?.kind === "ai_representative" || record.rights.status === "ai_representative",
  };
}

export function filterArchiveRecords(
  records: readonly ArchiveRecord[],
  query: ArchiveQuery,
  pageSize = 25,
) {
  const term = query.q.trim().toLocaleLowerCase("tr-TR");
  const institution = query.institution.trim().toLocaleLowerCase("tr-TR");
  const filtered = records.filter((record) => {
    if (query.type && record.type !== query.type) return false;
    if (query.status && record.verification.status !== query.status) return false;
    if (institution && !record.source.institution.toLocaleLowerCase("tr-TR").includes(institution)) return false;
    if (term && !`${record.title} ${record.summary} ${record.slug}`.toLocaleLowerCase("tr-TR").includes(term)) return false;
    if (query.yearFrom || query.yearTo) {
      const recordYear = Number(record.date.start?.slice(0, 4));
      if (!Number.isFinite(recordYear)) return false;
      if (query.yearFrom && recordYear < query.yearFrom) return false;
      if (query.yearTo && recordYear > query.yearTo) return false;
    }
    if (query.rightsRisk && !getArchiveQualityFlags(record).rightsUnclear) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  return {
    total: filtered.length,
    page,
    pageCount,
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
  };
}

export function summarizeArchive(records: readonly ArchiveRecord[]) {
  const byType: Partial<Record<ArchiveRecordType, number>> = {};
  const byStatus: Partial<Record<VerificationStatus, number>> = {};
  const byInstitution: Record<string, number> = {};
  let missingSource = 0;
  let rightsUnclear = 0;
  let dateUncertain = 0;
  let humanReviewUnverified = 0;

  for (const record of records) {
    byType[record.type] = (byType[record.type] ?? 0) + 1;
    byStatus[record.verification.status] = (byStatus[record.verification.status] ?? 0) + 1;
    byInstitution[record.source.institution || "Belirtilmemiş"] =
      (byInstitution[record.source.institution || "Belirtilmemiş"] ?? 0) + 1;
    const flags = getArchiveQualityFlags(record);
    if (flags.missingSource) missingSource += 1;
    if (flags.rightsUnclear) rightsUnclear += 1;
    if (flags.dateUncertain) dateUncertain += 1;
    humanReviewUnverified += 1;
  }

  return {
    total: records.length,
    byType,
    byStatus,
    byInstitution: Object.entries(byInstitution).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr")),
    missingSource,
    rightsUnclear,
    dateUncertain,
    humanReviewUnverified,
  };
}
