import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Araştırma adayları havuzu için sunucu taraflı okuyucu.
 *
 * Güvenlik notları:
 *  - Bu modül yalnızca sunucuda çalışır (server-only) ve aday verisini
 *    istemci paketine önceden göndermez.
 *  - Aday havuzu YAYIMLANMIŞ arşiv değildir; sayfa, kapı (gate) arkasında
 *    sunulur (bkz. app/arastirma-laboratuvari/page.tsx).
 *  - Dış URL'ler yalnızca bağlantı olarak işaretlenir; doğrulanmamış
 *    dış içerik işlenmez.
 */

export type ResearchCandidate = {
  id: string;
  title: string;
  institution: string;
  url: string;
  state: string;
  periodStart: number | null;
  periodEnd: number | null;
  eventYear: number | null;
  documentType: string;
  sourceNature: "primary" | "secondary" | "unknown";
  researchThemes: string[];
  publishedAt: string | null;
  authors: Array<{ name: string }>;
  citation: string | null;
  synthetic: boolean;
  verification: {
    urlReachable: boolean;
    citationComplete: boolean;
    rightsKnown: boolean;
    humanReviewed: boolean;
  };
};

export type ResearchClaim = {
  id: string;
  text: string;
  date: { start: string | null; end: string | null; display: string; precision: string; certainty: string };
  evidence: Array<{ candidateId: string; relation: string }>;
};

function repositoryRoot() {
  const cwd = process.cwd();
  return existsSync(path.join(cwd, "data", "research", "candidates")) ? cwd : path.resolve(cwd, "..");
}

export function researchLabEnabled(): boolean {
  // Yalnızca geliştirme/test ortamı + açık bayrak. Production ortamında
  // (NODE_ENV=production) bayrak set edilse bile panel açılmaz; kimlik
  // doğrulama kurulana kadar ortam bayrağı tek başına yetki DEĞİLDİR.
  if (process.env.NODE_ENV === "production") return false;
  return process.env.MKA_RESEARCH_LAB === "1";
}

let cachedPool: { candidates: ResearchCandidate[]; claims: ResearchClaim[] } | undefined;

export function loadResearchPool(): { candidates: ResearchCandidate[]; claims: ResearchClaim[] } {
  if (cachedPool) return cachedPool;
  const root = repositoryRoot();
  const poolPath = path.join(root, "data", "research", "candidates", "pool.json");
  const claimsPath = path.join(root, "data", "research", "candidates", "claims.json");
  let candidates: ResearchCandidate[] = [];
  let claims: ResearchClaim[] = [];
  if (existsSync(poolPath)) {
    const parsed = JSON.parse(readFileSync(poolPath, "utf8"));
    candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  }
  if (existsSync(claimsPath)) {
    const parsed = JSON.parse(readFileSync(claimsPath, "utf8"));
    claims = Array.isArray(parsed.claims) ? parsed.claims : [];
  }
  cachedPool = { candidates, claims };
  return cachedPool;
}

/** Aday durum etiketleri (görünüm için). */
export const CANDIDATE_STATE_LABELS: Record<string, string> = {
  new: "Yeni aday",
  investigating: "Kaynak inceleniyor",
  insufficient_info: "Bilgi yetersiz",
  duplicate: "Tekrar kayıt",
  awaiting_human_review: "İnsan incelemesi bekliyor",
  import_ready: "İçe aktarım hazırlığı (onay ister)",
  rejected: "Reddedildi",
};

export function candidateStateLabel(state: string) {
  return CANDIDATE_STATE_LABELS[state] ?? state;
}
