import "server-only";

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { researchLabEnabled } from "./candidates.ts";

/**
 * MKA Evidence Workbench — staging veri yükleyici (sunucu tarafı).
 *
 * Güvenlik:
 *  - researchLabEnabled() kapısıyla aynı kural: production ortamında bayrak
 *    set edilse bile panel verisi sunulmaz.
 *  - Staging verisi YAYINLANMIŞ arşiv değildir; yalnız geliştirme panelinde
 *    görünür. Dışa aktarım dosyaları gerçek arşive otomatik yazılmaz.
 *  - Kaynak metinleri yalnız kısa alıntı olarak taşınır (telif güvenliği).
 *  - Dosya boyutu sınırı (5MB), path traversal engeli ve BOM koruması uygulanır.
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function repositoryRoot() {
  const cwd = process.cwd();
  return existsSync(path.join(cwd, "data", "research", "evidence-staging")) ? cwd : path.resolve(cwd, "..");
}

export function readStagingJson<T>(root: string, file: string, pick: (parsed: Record<string, unknown>) => T[]): T[] {
  if (process.env.NODE_ENV === "production") return [];
  const stagingDir = path.resolve(root, "data", "research", "evidence-staging");
  const filePath = path.resolve(stagingDir, file);

  // Path traversal guard
  if (!filePath.startsWith(stagingDir)) return [];
  if (!existsSync(filePath)) return [];

  try {
    const stat = statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) return [];

    let raw = readFileSync(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) {
      raw = raw.slice(1);
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    return pick(parsed as Record<string, unknown>) ?? [];
  } catch {
    return [];
  }
}

let cached: WorkbenchData | undefined;

export function loadWorkbench(): WorkbenchData {
  if (cached) return cached;
  const root = repositoryRoot();
  const data: WorkbenchData = {
    claims: readStagingJson<WorkbenchClaim>(root, "claims-v2.json", (parsed) => (Array.isArray(parsed.claims) ? (parsed.claims as WorkbenchClaim[]) : [])),
    evidence: readStagingJson<WorkbenchEvidence>(root, "evidence.json", (parsed) => (Array.isArray(parsed.evidence) ? (parsed.evidence as WorkbenchEvidence[]) : [])),
    audits: readStagingJson<WorkbenchAudit>(root, "candidate-audits.json", (parsed) => (Array.isArray(parsed.audits) ? (parsed.audits as WorkbenchAudit[]) : [])),
    notes: readStagingJson<WorkbenchNote>(root, "notes.json", (parsed) => (Array.isArray(parsed.notes) ? (parsed.notes as WorkbenchNote[]) : [])),
    contradictions: readStagingJson<WorkbenchContradiction>(root, "contradictions.json", (parsed) => (Array.isArray(parsed.candidates) ? (parsed.candidates as WorkbenchContradiction[]) : [])),
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

/** Formül enjeksiyonu korumalı CSV hücre biçimlendirici. */
export function formatCsvCell(value: unknown): string {
  const text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text) || /^\s/.test(text)) {
    return `'${text.replace(/"/g, '""')}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
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
