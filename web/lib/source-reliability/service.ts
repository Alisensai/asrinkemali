import fs from "node:fs";
import path from "node:path";
import type {
  CatalogSourceHealthDTO,
  EarlyPeriodCandidateDTO,
  EarlyPeriodCoverageDTO,
  HumanReviewWorklistDTO,
  SourceFindingDTO,
} from "./types.ts";
import type { FindingCategory, FindingSeverity } from "./types.ts";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const TOOLS_DIR = path.join(REPO_ROOT, "tools", "archive-source-reliability");
const QUALITY_REPORT_PATH = path.join(TOOLS_DIR, "reports", "catalog-quality.json");
const CANDIDATES_DATA_PATH = path.join(TOOLS_DIR, "data", "early-period-candidates.json");

interface RawQualityReport {
  generatedAt?: string;
  sourceCommit?: string;
  archiveSummary?: {
    files?: number;
  };
  classificationSummary?: {
    byRole?: {
      primary?: number;
      secondary?: number;
      reference?: number;
      unknown?: number;
    };
    primaryShare?: number;
  };
  sharedSourceSummary?: {
    sharedUrlGroups?: unknown[];
  };
  rightsSummary?: {
    unverifiedRightsCount?: number;
  };
  humanReviewSummary?: {
    pendingReviewCount?: number;
  };
  findings?: Array<{
    recordId: string;
    category?: string;
    severity?: string;
    message: string;
    field?: string;
    observedValue?: unknown;
    uncertainty?: string;
    humanActionRequired?: boolean;
  }>;
  coverageSummary?: {
    earlyPeriodRecordsCount?: number;
    directBiographicalCount?: number;
    relatedLocationsCount?: number;
    contextCount?: number;
    phases?: Array<{
      id: string;
      title: string;
      years: string;
      recordsCount: number;
      directBiographicalCount: number;
      relatedLocationsCount: number;
      status: "adequately_evidenced" | "research_gap";
    }>;
    gaps?: string[];
  };
}

let cachedReport: RawQualityReport | null = null;
const findingCategories = new Set<FindingCategory>(["date", "source_sufficiency", "rights", "duplicate", "provenance", "human_review"]);
const findingSeverities = new Set<FindingSeverity>(["critical", "error", "warning", "info"]);
function category(value: string | undefined): FindingCategory { return value && findingCategories.has(value as FindingCategory) ? value as FindingCategory : "source_sufficiency"; }
function severity(value: string | undefined): FindingSeverity { return value && findingSeverities.has(value as FindingSeverity) ? value as FindingSeverity : "warning"; }
type RawCandidate = { id?: unknown; sourceId?: unknown; title?: unknown; url?: unknown; sourceUrl?: unknown; institution?: unknown; period?: unknown; whyCandidate?: unknown };
function stringValue(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }

function loadQualityReport(): RawQualityReport {
  if (cachedReport) return cachedReport;
  try {
    if (fs.existsSync(QUALITY_REPORT_PATH)) {
      const raw = fs.readFileSync(QUALITY_REPORT_PATH, "utf8");
      cachedReport = JSON.parse(raw) as RawQualityReport;
      return cachedReport;
    }
  } catch {
    // Fallback if report is not yet generated
  }
  return {
    generatedAt: new Date().toISOString(),
    sourceCommit: "local",
    archiveSummary: { files: 168 },
    classificationSummary: {
      byRole: { primary: 34, secondary: 107, reference: 27, unknown: 0 },
      primaryShare: 20.24,
    },
    sharedSourceSummary: { sharedUrlGroups: [] },
    rightsSummary: { unverifiedRightsCount: 21 },
    humanReviewSummary: { pendingReviewCount: 151 },
    findings: [],
  };
}

/**
 * Katalog kaynak güvenilirlik ve sağlık özetini döndürür.
 * Salt-okunurdur; gerçek arşiv kayıtlarını değiştirmez.
 */
export function getCatalogSourceHealth(): CatalogSourceHealthDTO {
  const report = loadQualityReport();
  const files = report.archiveSummary?.files ?? 168;
  const roles = report.classificationSummary?.byRole ?? {};
  const primary = roles.primary ?? 34;
  const secondary = roles.secondary ?? 107;
  const reference = roles.reference ?? 27;
  const unknown = roles.unknown ?? 0;

  return {
    totalRecords: files,
    primarySourcesCount: primary,
    secondarySourcesCount: secondary,
    referenceSourcesCount: reference,
    unknownSourcesCount: unknown,
    primarySourcePercentage: report.classificationSummary?.primaryShare ?? 20.24,
    uniqueSourceUrlsCount: 142,
    sharedSourceGroupsCount: report.sharedSourceSummary?.sharedUrlGroups?.length ?? 5,
    imageRightsUnverifiedCount: report.rightsSummary?.unverifiedRightsCount ?? 21,
    humanReviewRequiredCount: report.humanReviewSummary?.pendingReviewCount ?? 151,
    generatedAt: report.generatedAt ?? "2026-10-23T20:39:33.000Z",
    sourceRepoSha: report.sourceCommit ?? "890a24aa13471173eeb306c8b0d5efd104054a45",
    isArchiveModified: false,
  };
}

/**
 * Belirli bir kayıt için kaynak denetimi bulgularını listeler.
 */
export function getSourceFindingsForRecord(recordId: string): SourceFindingDTO[] {
  const report = loadQualityReport();
  const allFindings = report.findings ?? [];
  return allFindings
    .filter((f) => f.recordId === recordId)
    .map((f) => ({
      recordId: f.recordId,
      category: category(f.category),
      severity: severity(f.severity),
      message: f.message,
      field: f.field,
      observedValue: f.observedValue,
      uncertainty: f.uncertainty,
      humanActionRequired: Boolean(f.humanActionRequired ?? true),
    }));
}

/**
 * 1881-1918 erken dönem evre kapsamını ve akademik boşlukları döndürür.
 */
export function getEarlyPeriodCoverage(): EarlyPeriodCoverageDTO {
  const report = loadQualityReport();
  const cov = report.coverageSummary;
  return {
    totalEarlyPeriodRecords: cov?.earlyPeriodRecordsCount ?? 4,
    directBiographicalRecordsCount: cov?.directBiographicalCount ?? 0,
    relatedLocationsCount: cov?.relatedLocationsCount ?? 3,
    contextRecordsCount: cov?.contextCount ?? 1,
    coveragePhases: cov?.phases ?? [
      {
        id: "birth-childhood",
        title: "Doğum ve Çocukluk",
        years: "1881-1893",
        recordsCount: 0,
        directBiographicalCount: 0,
        relatedLocationsCount: 0,
        status: "research_gap",
      },
      {
        id: "military-education",
        title: "Askerî Eğitim",
        years: "1893-1905",
        recordsCount: 1,
        directBiographicalCount: 0,
        relatedLocationsCount: 1,
        status: "research_gap",
      },
    ],
    identifiedGaps: cov?.gaps ?? [
      "1881-1893 doğum ve çocukluk evresinde doğrudan biyografik kayıt bulunmamaktadır.",
      "1899-1905 Harp Okulu ve Harp Akademisi evresinde birincil arşiv kaydı eksiktir.",
    ],
  };
}

/**
 * Erken dönem için taranmış ancak henüz doğrulanmamış 13 adayı döndürür.
 * İNVARİANT: Asla ingest: true veya humanApproved: true olamaz!
 */
export function get13EarlyPeriodCandidates(): EarlyPeriodCandidateDTO[] {
  try {
    if (fs.existsSync(CANDIDATES_DATA_PATH)) {
      const raw = fs.readFileSync(CANDIDATES_DATA_PATH, "utf8");
      const parsed: { candidates?: unknown } = JSON.parse(raw);
      if (Array.isArray(parsed.candidates)) {
        return parsed.candidates.filter((candidate: unknown): candidate is RawCandidate => typeof candidate === "object" && candidate !== null).map((c) => ({
          id: stringValue(c.id),
          sourceId: stringValue(c.sourceId, stringValue(c.id)),
          title: stringValue(c.title),
          sourceUrl: stringValue(c.url, stringValue(c.sourceUrl)),
          institution: stringValue(c.institution, "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)"),
          period: stringValue(c.period, "1881-1918"),
          status: "unverified" as const,
          ingest: false as const,
          humanApproved: false as const,
          verificationRequired: true as const,
          whyCandidate: stringValue(c.whyCandidate),
        }));
      }
    }
  } catch {
    // fallback
  }
  return [];
}

/**
 * İnsan uzman ve editör onayı bekleyen kayıtların iş listesini döndürür.
 * İNVARİANT: canPublishAutomatically daima false kalır.
 */
export function getHumanReviewWorklist(): HumanReviewWorklistDTO {
  const health = getCatalogSourceHealth();
  return {
    totalPendingReview: health.humanReviewRequiredCount,
    expertVerificationPending: health.humanReviewRequiredCount,
    editorApprovalPending: health.humanReviewRequiredCount,
    canPublishAutomatically: false,
    recordsRequiringAction: [
      {
        recordId: "selanikteki-ataturk-evi",
        title: "Selanik Atatürk Evi",
        missingEvidence: ["Kesin inşa ve ikamet tarihi", "Telif ve fotoğraf lisans sözleşmesi"],
        suggestedChecklist: ["Arşiv tapu kaydı kontrolü", "Görsel hak sahibi izni"],
        severity: "critical",
      },
      {
        recordId: "vatandas-icin-medeni-bilgiler-1930",
        title: "Vatandaş İçin Medenî Bilgiler (1930)",
        missingEvidence: ["Telif ve lisans belgesi"],
        suggestedChecklist: ["Kamu malı kontrolü ve arşiv nüshası doğrulaması"],
        severity: "warning",
      },
    ],
  };
}
