/**
 * Kaynak kimliği ve tekrar sınıflandırması (Görev 07).
 *
 * #19 `findDuplicates` tüm çiftleri karşılaştırır (O(n²)) ve "aynı kurum arşiv
 * kimliği"ni kesin tekrar sayar. Bu modül indeksli ve muhafazakârdır:
 *  - exact_duplicate:   aynı normalleştirilmiş URL (http/https ayrı tutulur).
 *  - possible_duplicate: aynı kurum + aynı arşiv kimliği (farklı URL), veya aynı
 *                        kurum + aynı olay yılı + çok benzer başlık. İnsan kararı bekler.
 *  - independent_or_unknown: diğer her şey (bağımsızlık kanıtlanmış değildir).
 * Hiçbir sonuç otomatik silme/birleştirme yapmaz. Farklı kurumdaki aynı kimlik ve
 * aynı başlıklı farklı baskılar kesin tekrar sayılmaz.
 */

import { foldTr, normalizeUrl, titleSimilarity } from "../dedupe.mjs";

const TRACKING_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "ref", "referrer", "mc_cid", "mc_eid"]);
const TITLE_THRESHOLD = 0.75;

/** Normalleştirme sırasında atılan izleme parametrelerini kanıt olarak döndürür. */
export function normalizeUrlWithEvidence(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return { normalized: null, removedParams: [] };
  let removedParams = [];
  try {
    const url = new URL(String(rawUrl).trim());
    removedParams = [...url.searchParams.keys()].filter((key) => TRACKING_PARAMS.has(key.toLowerCase())).sort();
  } catch {
    removedParams = [];
  }
  return { normalized, removedParams };
}

function identifierKey(institution, identifier) {
  const id = String(identifier ?? "").trim().toUpperCase();
  if (!id || !institution) return null;
  return `${foldTr(institution)}::${id}`;
}

function titleTokens(title) {
  return foldTr(title).split(" ").filter((word) => word.length > 2);
}

/**
 * @param {Array} candidates
 * @param {Array} archiveRecords
 * @returns {{findings: Array, metrics: object}}
 */
export function classifyDuplicates(candidates, archiveRecords = []) {
  const findings = [];
  const byUrl = new Map();
  const byIdentifier = new Map();
  const byBucket = new Map();
  let comparisons = 0;

  const linked = new Set();
  const push = (tier, a, b, reason, score = null, evidence = {}) => {
    linked.add(`${a.kind}:${a.id}|${b.kind}:${b.id}`);
    findings.push({ tier, a, b, reason, score, evidence });
  };

  // Arşiv indeksleri (aday ↔ arşiv ad alanları ayrı: "archive:" öneki).
  const archiveByUrl = new Map();
  const archiveByIdentifier = new Map();
  for (const record of archiveRecords) {
    const url = normalizeUrl(record?.source?.url);
    if (url && !archiveByUrl.has(url)) archiveByUrl.set(url, record.id);
    const key = identifierKey(record?.source?.institution, record?.source?.archiveIdentifier);
    if (key && !archiveByIdentifier.has(key)) archiveByIdentifier.set(key, record.id);
  }

  for (const candidate of candidates) {
    const ref = { kind: "candidate", id: candidate.id };
    const { normalized, removedParams } = normalizeUrlWithEvidence(candidate.url);
    if (normalized) {
      if (byUrl.has(normalized)) push("exact_duplicate", byUrl.get(normalized), ref, "aynı normalleştirilmiş URL", 1, { removedParams });
      else byUrl.set(normalized, ref);
      if (archiveByUrl.has(normalized)) push("exact_duplicate", { kind: "archive_record", id: archiveByUrl.get(normalized) }, ref, "aynı URL mevcut arşivde", 1, { removedParams });
    }
    const key = identifierKey(candidate.institution, candidate.archiveIdentifier);
    if (key) {
      const prior = byIdentifier.get(key);
      if (prior && !(normalized && prior.url === normalized)) push("possible_duplicate", prior.ref, ref, "aynı kurum ve arşiv kimliği, farklı URL", 0.9);
      if (!prior) byIdentifier.set(key, { ref, url: normalized });
      if (archiveByIdentifier.has(key) && !(normalized && archiveByUrl.get(normalized) === archiveByIdentifier.get(key))) {
        push("possible_duplicate", { kind: "archive_record", id: archiveByIdentifier.get(key) }, ref, "aynı kurum ve arşiv kimliği mevcut arşivde", 0.9);
      }
    }
    // Başlık benzerliği yalnız aynı kurum + aynı olay yılı kovasında (indeksli; O(n²) yok).
    if (candidate.institution && Number.isInteger(candidate.eventYear)) {
      const bucketKey = `${foldTr(candidate.institution)}::${candidate.eventYear}`;
      const bucket = byBucket.get(bucketKey) ?? [];
      const tokens = new Set(titleTokens(candidate.title));
      for (const other of bucket) {
        let shared = 0;
        for (const token of tokens) if (other.tokens.has(token)) shared += 1;
        if (shared === 0) continue;
        comparisons += 1;
        const score = titleSimilarity(candidate.title, other.title);
        const alreadyLinked = linked.has(`${other.ref.kind}:${other.ref.id}|candidate:${candidate.id}`);
        if (score >= TITLE_THRESHOLD && !alreadyLinked) push("possible_duplicate", other.ref, ref, "aynı kurum, aynı olay yılı, benzer başlık (farklı baskı olabilir)", Number(score.toFixed(2)));
      }
      bucket.push({ ref, tokens, title: candidate.title });
      byBucket.set(bucketKey, bucket);
    }
  }
  const order = { exact_duplicate: 0, possible_duplicate: 1 };
  findings.sort((x, y) => order[x.tier] - order[y.tier] || `${x.a.id}|${x.b.id}`.localeCompare(`${y.a.id}|${y.b.id}`, "en"));
  const involved = new Set(findings.flatMap((finding) => [finding.a, finding.b]).filter((ref) => ref.kind === "candidate").map((ref) => ref.id));
  return {
    findings,
    metrics: {
      candidates: candidates.length,
      exactDuplicate: findings.filter((finding) => finding.tier === "exact_duplicate").length,
      possibleDuplicate: findings.filter((finding) => finding.tier === "possible_duplicate").length,
      independentOrUnknown: candidates.filter((candidate) => !involved.has(candidate.id)).length,
      titleComparisons: comparisons,
      canonicalUrlRoots: byUrl.size,
    },
    note: "Algoritmik sınıflandırmadır; hiçbir kayıt silinmez veya birleştirilmez. Kesin tekrar kararı insan incelemesine aittir.",
  };
}
