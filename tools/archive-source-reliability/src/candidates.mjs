/**
 * Erken dönem kaynak adayları.
 *
 * Adaylar gerçek arşive otomatik eklenmez. Her aday `status: unverified` ve
 * `ingest: false` olarak raporlanır; arşivde aynı kaynak kimliği veya URL varsa
 * aday listesinden çıkarılır. İnsan uzman doğrulaması zorunludur.
 */

import {
  canonicalizeUrl,
  countBy,
  foldTr,
  normalizeSourceIdentifier,
  normalizeWhitespace,
  sortBy,
  toSortedEntries,
} from "./util.mjs";

const AYK_API = "https://apiko.ayk.gov.tr/v1/1/itemPublic/byId";

function existingSourceIndex(records) {
  const identifiers = new Set();
  const urls = new Set();
  const canonicalUrls = new Set();
  const titles = new Map();
  for (const record of records) {
    const identifier = normalizeSourceIdentifier(record.source?.archiveIdentifier);
    if (identifier) identifiers.add(identifier);
    const url = record.source?.url;
    if (url) {
      urls.add(url);
      canonicalUrls.add(canonicalizeUrl(url));
    }
    const title = foldTr(record.title ?? "");
    if (title) {
      if (!titles.has(title)) titles.set(title, []);
      titles.get(title).push(record.id);
    }
  }
  return { identifiers, urls, canonicalUrls, titles };
}

function filterCandidate(candidate, index) {
  const identifier = normalizeSourceIdentifier(String(candidate.sourceId ?? candidate.archiveIdentifier ?? ""));
  if (identifier && index.identifiers.has(identifier)) {
    return { eligible: false, reason: "source_identifier_already_in_archive" };
  }
  if (candidate.url && index.urls.has(candidate.url)) {
    return { eligible: false, reason: "source_url_already_in_archive" };
  }
  if (candidate.url && index.canonicalUrls.has(canonicalizeUrl(candidate.url))) {
    return { eligible: false, reason: "canonical_source_url_already_in_archive" };
  }
  return { eligible: true, reason: null };
}

function addHoursToDate(value, hours = 3) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString().slice(0, 10);
}

function normalizeCandidate(candidate, coverage) {
  const phaseById = new Map((coverage?.phaseMatrix ?? []).map((phase) => [phase.id, phase]));
  const gapPhases = Array.isArray(candidate.gapPhases) ? candidate.gapPhases : [];
  const titleCollisionIds = [];
  return {
    id: candidate.id,
    sourceId: candidate.sourceId ?? null,
    archiveIdentifier: candidate.archiveIdentifier ?? candidate.sourceId ?? null,
    institution: candidate.institution ?? null,
    institutionType: candidate.institutionType ?? null,
    institutionUrl: candidate.institutionUrl ?? null,
    title: candidate.title ?? null,
    author: candidate.author ?? null,
    publishedAt: candidate.publishedAt ?? null,
    url: candidate.url ?? null,
    definition: normalizeWhitespace(candidate.definition),
    keywords: Array.isArray(candidate.keywords) ? candidate.keywords : [],
    period: candidate.period ?? null,
    gapPhases,
    phaseLabels: gapPhases.map((phaseId) => phaseById.get(phaseId)?.label ?? phaseId),
    matchedGaps: gapPhases.map((phaseId) => {
      const phase = phaseById.get(phaseId);
      return {
        phaseId,
        label: phase?.label ?? phaseId,
        directCount: phase?.directCount ?? null,
        status: phase?.status ?? null,
      };
    }),
    coverageType: candidate.coverageType ?? "unknown",
    priority: candidate.priority ?? "medium",
    whyCandidate: candidate.whyCandidate ?? null,
    status: "unverified",
    ingest: false,
    verificationRequired: true,
    humanApproved: false,
    verificationNotes: candidate.verificationNotes ?? null,
    rightsNotes: candidate.rightsNotes ?? null,
    discovery: candidate.discovery ?? null,
    titleCollisionIds,
    policyViolation:
      candidate.status !== "unverified" || candidate.ingest !== false
        ? `Aday dosyasında status=${candidate.status}, ingest=${candidate.ingest}; araç çıktısı güvenli biçimde unverified/false olarak normalize edildi.`
        : null,
  };
}

export function buildCandidateReport(candidateFile, records, coverage, { linkCheck = null } = {}) {
  const index = existingSourceIndex(records);
  const eligible = [];
  const filtered = [];
  for (const raw of candidateFile?.candidates ?? []) {
    const decision = filterCandidate(raw, index);
    if (!decision.eligible) {
      filtered.push({
        id: raw.id,
        sourceId: raw.sourceId ?? null,
        title: raw.title ?? null,
        url: raw.url ?? null,
        reason: decision.reason,
      });
      continue;
    }
    const candidate = normalizeCandidate(raw, coverage);
    const titleKey = foldTr(candidate.title ?? "");
    if (titleKey && index.titles.has(titleKey)) {
      candidate.titleCollisionIds = index.titles.get(titleKey);
    }
    const linkResult = linkCheck?.results?.find((result) => result.url === candidate.url) ?? null;
    candidate.urlCheck = linkResult
      ? { status: linkResult.ok ? (linkResult.finalUrl && linkResult.finalUrl !== linkResult.url ? "redirected" : "ok") : "broken", httpStatus: linkResult.status ?? null, finalUrl: linkResult.finalUrl ?? null, error: linkResult.error ?? null }
      : { status: "not_checked", httpStatus: null, finalUrl: null, error: null };
    eligible.push(candidate);
  }

  const sorted = sortBy(
    eligible,
    (a, b) =>
      ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 9) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 9) ||
      String(a.sourceId).localeCompare(String(b.sourceId), "tr")
  );
  const phaseCoverage = (coverage?.phaseMatrix ?? []).map((phase) => {
    const phaseCandidates = sorted.filter((candidate) => candidate.gapPhases.includes(phase.id));
    return {
      phaseId: phase.id,
      label: phase.label,
      directCount: phase.directCount,
      inPeriodRecordCount: phase.inPeriodRecordCount,
      candidateIds: phaseCandidates.map((candidate) => candidate.sourceId),
      candidateTitles: phaseCandidates.map((candidate) => candidate.title),
      dedicatedCount: phaseCandidates.filter((candidate) => candidate.coverageType === "dedicated").length,
      broadCount: phaseCandidates.filter((candidate) => candidate.coverageType === "broad").length,
      contextCount: phaseCandidates.filter((candidate) => candidate.coverageType === "context").length,
      candidateCoverage:
        phaseCandidates.length === 0
          ? "none"
          : phaseCandidates.every((candidate) => candidate.coverageType === "context")
            ? "context-only"
            : phaseCandidates.every((candidate) => candidate.coverageType === "broad")
              ? "broad-only"
              : "dedicated",
    };
  });
  const policyViolations = sorted.filter((candidate) => candidate.policyViolation).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    violation: candidate.policyViolation,
  }));

  return {
    schemaVersion: "1.0.0",
    discoveredAt: candidateFile?.discoveredAt ?? null,
    generatedAt: null,
    policy: {
      neverIngestAutomatically: true,
      status: "Adaylar doğrulanmamıştır; arşiv kaydı değildir.",
      ingest: false,
      manualVerification: "Her aday için insan uzman; kaynak sayfası, tarih, künye, telif ve arşiv uygunluğunu doğrulamalıdır.",
      archiveWritePaths: ["data/archive/catalog", "content/archive/records"],
      filtering: "Arşivde aynı kurum kimliği, URL veya normalize URL bulunan adaylar listeye alınmaz.",
    },
    summary: {
      seedCandidates: candidateFile?.candidates?.length ?? 0,
      eligibleCandidates: sorted.length,
      filteredAlreadyInArchive: filtered.length,
      highPriority: sorted.filter((candidate) => candidate.priority === "high").length,
      mediumPriority: sorted.filter((candidate) => candidate.priority === "medium").length,
      lowPriority: sorted.filter((candidate) => candidate.priority === "low").length,
      unverified: sorted.filter((candidate) => candidate.status === "unverified" && candidate.ingest === false).length,
      humanApproved: sorted.filter((candidate) => candidate.humanApproved === true).length,
      dedicatedCandidates: sorted.filter((candidate) => candidate.coverageType === "dedicated").length,
      broadCandidates: sorted.filter((candidate) => candidate.coverageType === "broad").length,
      contextCandidates: sorted.filter((candidate) => candidate.coverageType === "context").length,
      phasesWithCandidates: phaseCoverage.filter((phase) => phase.candidateIds.length > 0).length,
      phasesWithoutCandidates: phaseCoverage.filter((phase) => phase.candidateIds.length === 0).length,
      broadOnlyPhases: phaseCoverage.filter((phase) => phase.candidateCoverage === "broad-only").length,
      policyViolations: policyViolations.length,
      byCoverageType: toSortedEntries(countBy(sorted, (candidate) => candidate.coverageType)),
      byPriority: toSortedEntries(countBy(sorted, (candidate) => candidate.priority)),
    },
    phaseCoverage,
    candidates: sorted,
    filtered,
    policyViolations,
  };
}

export async function refreshCandidateMetadata(candidates, { fetchImpl = globalThis.fetch, checkedAt = new Date().toISOString().slice(0, 10) } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("refreshCandidateMetadata: fetchImpl gerekli.");
  const refreshed = [];
  const failed = [];
  for (const candidate of candidates ?? []) {
    const numericId = String(candidate.sourceId ?? "").match(/\d+/)?.[0];
    if (!numericId) {
      failed.push({ id: candidate.id, title: candidate.title, error: "Sayısal AYK kimliği yok." });
      refreshed.push({ ...candidate });
      continue;
    }
    try {
      const response = await fetchImpl(`${AYK_API}/${numericId}`, {
        headers: { "user-agent": "AsrinKemaliSourceReliability/1.0 (+https://github.com/Alisensai/asrinkemali)" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.status || !payload?.data) throw new Error("Beklenmeyen AYK yanıtı.");
      const data = payload.data;
      const keywords = normalizeWhitespace(data.keyword)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      refreshed.push({
        ...candidate,
        title: normalizeWhitespace(data.title) || candidate.title,
        author: normalizeWhitespace(data.writerName) || candidate.author,
        publishedAt: addHoursToDate(data.releaseDate) || candidate.publishedAt,
        definition: normalizeWhitespace(data.definition) || candidate.definition,
        keywords: keywords.length > 0 ? keywords : candidate.keywords,
        metadataCheckedAt: checkedAt,
        metadataSource: `${AYK_API}/${numericId}`,
        refreshError: null,
      });
    } catch (error) {
      failed.push({ id: candidate.id, title: candidate.title, error: String(error.message ?? error) });
      refreshed.push({ ...candidate, refreshError: String(error.message ?? error) });
    }
  }
  return { candidates: refreshed, refreshed: refreshed.length - failed.length, failed, checkedAt };
}
