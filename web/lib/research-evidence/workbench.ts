import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { researchLabEnabled } from "./candidates";

/**
 * MKA Evidence Workbench — staging veri yükleyici (sunucu tarafı).
 *
 * Güvenlik:
 *  - researchLabEnabled() kapısıyla aynı kural: production ortamında bayrak
 *    set edilse bile panel verisi sunulmaz.
 *  - Staging verisi YAYINLANMIŞ arşiv değildir; yalnız geliştirme panelinde
 *    görünür. Dışa aktarım dosyaları gerçek arşive otomatik yazılmaz.
 *  - Kaynak metinleri yalnız kısa alıntı olarak taşınır (telif güvenliği).
 */

export type WorkbenchClaimRevision = {
  version: number;
  text: string;
  dateRange: { start: string; end: string | null; display: string } | null;
  evidenceIds: string[];
  revisionNote: string;
  supersededAt: string | null;
  createdAt: string;
};

export type WorkbenchClaim = {
  id: string;
  currentVersion: number;
  status: string;
  category: string;
  revisions: WorkbenchClaimRevision[];
  relatedPeople: string[];
  relatedPlaces: string[];
  relatedEvents: string[];
  uncertaintyNote: string | null;
};

export type WorkbenchEvidence = {
  id: string;
  claimId: string;
  claimVersion: number;
  candidateId: string | null;
  relation: string;
  locator: {
    url: string;
    title: string;
    author: string | null;
    institution: string;
    page: string | null;
    section: string | null;
    locator: string | null;
  };
  shortQuote: string | null;
  accessDate: string;
  supportAssessment: { assessed: boolean; actuallySupports: boolean | null; method: string | null; note: string | null };
  verificationLevel: string;
  humanReview: { reviewed: boolean; reviewer: string | null; reviewedAt: string | null };
  dateRange: { start: string; end: string | null; display: string } | null;
};

export type WorkbenchAudit = {
  candidateId: string;
  auditedAt: string;
  scores: Record<string, number>;
  findings: string[];
  reviewQuestions: string[];
  readyForImport: boolean;
};

export type WorkbenchNote = {
  id: string;
  kind: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  target: { claimId: string | null; candidateId: string | null; evidenceId: string | null };
  text: string;
  linkedRecordIds: string[];
};

export type WorkbenchContradiction = {
  id: string;
  field: string;
  evidenceIds: string[];
  claimId: string;
  description: string;
  status: string;
};

export type WorkbenchData = {
  claims: WorkbenchClaim[];
  evidence: WorkbenchEvidence[];
  audits: WorkbenchAudit[];
  notes: WorkbenchNote[];
  contradictions: WorkbenchContradiction[];
};

function repositoryRoot() {
  const cwd = process.cwd();
  return existsSync(path.join(cwd, "data", "research", "evidence-staging")) ? cwd : path.resolve(cwd, "..");
}

function readJson<T>(root: string, file: string, pick: (parsed: Record<string, unknown>) => T[]): T[] {
  const filePath = path.join(root, "data", "research", "evidence-staging", file);
  if (!existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return pick(parsed as Record<string, unknown>);
  } catch {
    return [];
  }
}

let cached: WorkbenchData | undefined;

export function loadWorkbench(): WorkbenchData {
  if (cached) return cached;
  const root = repositoryRoot();
  const data: WorkbenchData = {
    claims: readJson<WorkbenchClaim>(root, "claims-v2.json", (parsed) => parsed.claims as WorkbenchClaim[]),
    evidence: readJson<WorkbenchEvidence>(root, "evidence.json", (parsed) => parsed.evidence as WorkbenchEvidence[]),
    audits: readJson<WorkbenchAudit>(root, "candidate-audits.json", (parsed) => parsed.audits as WorkbenchAudit[]),
    notes: readJson<WorkbenchNote>(root, "notes.json", (parsed) => parsed.notes as WorkbenchNote[]),
    contradictions: readJson<WorkbenchContradiction>(root, "contradictions.json", (parsed) => parsed.candidates as WorkbenchContradiction[]),
  };
  cached = data;
  return data;
}

export function clearWorkbenchCache() {
  cached = undefined;
}

/** Panel açık mı? Aynı kapı kuralı (production → her zaman kapalı). */
export function workbenchEnabled(): boolean {
  return researchLabEnabled();
}

/** İddia durum etiketleri. */
export const CLAIM_STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  under_research: "Araştırma sürüyor",
  awaiting_human_review: "İnsan incelemesi bekliyor",
  insufficient_info: "Bilgi yetersiz",
  rejected: "Reddedildi",
};

export const VERIFICATION_LEVEL_LABELS: Record<string, string> = {
  unverified: "Doğrulanmamış",
  located: "Konum kayıtlı",
  passage_reviewed: "Pasaj incelendi",
  human_verified: "İnsan onaylı",
};
