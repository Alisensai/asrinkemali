/**
 * Araştırma anlık görüntü raporu (Görev 07).
 *
 * Rapor yalnız okur: arşiv, aday havuzu ve iddia dosyası işlemden önce ve sonra
 * SHA-256 ile karşılaştırılır. Aynı girdi + aynı `generatedAt` → bayt düzeyinde aynı
 * JSON. Sayılar dinamik hesaplanır; hiçbiri koda sabitlenmez.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { convertCandidateToDraft } from "../convert-dryrun.mjs";
import { analyzeGaps } from "../gap-analysis.mjs";
import { candidateIssues } from "./candidate-contract.mjs";
import { diffIntegrity, integritySnapshot, loadArchiveContext } from "./archive-context.mjs";
import { assessClaimEvidence, buildEvidenceGraph } from "./evidence-assessment.mjs";
import { parseUntrustedJson } from "./candidate-contract.mjs";
import { classifyDuplicates } from "./source-identity.mjs";

export const REPORT_SCHEMA_VERSION = "evidence-integration-report/1.0.0";
export const ENGINE_VERSION = "mka-evidence-engine/0.7.0+claude-integration.1";

const POOL_PATH = "data/research/candidates/pool.json";
const CLAIMS_PATH = "data/research/candidates/claims.json";

function readJsonSnapshot(root, relative, field) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return { exists: false, sha256: null, items: [], error: null };
  const buffer = fs.readFileSync(absolute);
  const parsed = parseUntrustedJson(buffer.toString("utf8"));
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (!parsed.ok) return { exists: true, sha256, items: [], error: parsed.code };
  const items = Array.isArray(parsed.value?.[field]) ? parsed.value[field] : [];
  return { exists: true, sha256, items, error: null };
}

export function stableStringify(value) {
  const sort = (input) => {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === "object") return Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])]));
    return input;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

function yearOf(value) {
  const match = /^(\d{4})/.exec(String(value ?? ""));
  return match ? Number(match[1]) : null;
}

/** Hedef dönem kapsamını ayrı nüfuslarla raporlar (mekân kuruluş tarihi ≠ bulunma tarihi). */
export function periodCoverage(records, candidates, { from, to }) {
  const overlapping = records.filter((record) => {
    const start = yearOf(record?.date?.start);
    if (start === null) return false;
    const end = yearOf(record?.date?.end) ?? start;
    return start <= to && end >= from;
  });
  const byType = {};
  for (const record of overlapping) byType[record.type ?? "unknown"] = (byType[record.type ?? "unknown"] ?? 0) + 1;
  const recordYearIncidences = overlapping.reduce((sum, record) => {
    const start = Math.max(yearOf(record.date.start), from);
    const end = Math.min(yearOf(record.date.end) ?? yearOf(record.date.start), to);
    return sum + (end - start + 1);
  }, 0);
  const unknownDate = records.filter((record) => yearOf(record?.date?.start) === null).length;
  const candidateOverlap = candidates.filter((candidate) => {
    const start = candidate.periodStart ?? candidate.eventYear;
    const end = candidate.periodEnd ?? candidate.eventYear ?? start;
    return Number.isInteger(start) && start <= to && end >= from;
  }).length;
  return {
    from,
    to,
    inclusive: true,
    distinctRecords: overlapping.length,
    recordYearIncidences,
    byRecordType: Object.fromEntries(Object.entries(byType).sort(([a], [b]) => a.localeCompare(b, "en"))),
    placeRecordsNote: "Mekân (place) kayıtlarının tarihi kuruluş/inşa tarihidir; Atatürk'ün orada bulunduğu tarih değildir.",
    unknownDateRecords: unknownDate,
    candidateSourcesOverlapping: candidateOverlap,
    absenceNote: "Kayıt yokluğu yalnız 'katalogda kayıt eksik' demektir; olayın yaşanmadığı anlamına gelmez.",
  };
}

/**
 * @param {string} root
 * @param {{generatedAt: string, from?: number, to?: number}} options
 */
export async function buildResearchSnapshot(root, options) {
  const generatedAt = options.generatedAt;
  const from = options.from ?? 1881;
  const to = options.to ?? 1918;
  const before = integritySnapshot(root);
  const archive = await loadArchiveContext(root);
  const pool = readJsonSnapshot(root, POOL_PATH, "candidates");
  const claimsFile = readJsonSnapshot(root, CLAIMS_PATH, "claims");
  const candidates = pool.items;
  const claims = claimsFile.items;

  const blockers = [];
  const warnings = [];
  if (archive.errors.length) blockers.push({ code: "ARCHIVE_LOAD_ERRORS", count: archive.errors.length });
  if (!archive.limit.complete) blockers.push({ code: "ARCHIVE_INCOMPLETE", limitExceeded: archive.limit.limitExceeded, maxRecords: archive.limit.maxRecords });
  for (const collision of [...archive.collisions.ids, ...archive.collisions.slugs]) blockers.push(collision);
  if (pool.error) blockers.push({ code: `POOL_${pool.error}` });
  if (claimsFile.error) blockers.push({ code: `CLAIMS_${claimsFile.error}` });

  const findings = [];
  let unknownFieldsCount = 0;
  const workList = [];
  const duplicates = classifyDuplicates(candidates, archive.records);
  const claimsByCandidate = new Map();
  for (const claim of claims) for (const link of claim.evidence ?? []) claimsByCandidate.set(link.candidateId, [...(claimsByCandidate.get(link.candidateId) ?? []), claim.id]);
  const dryRuns = [];
  for (const candidate of [...candidates].sort((a, b) => String(a.id).localeCompare(String(b.id), "en"))) {
    const issues = candidateIssues(candidate);
    for (const issue of issues) findings.push({ severity: issue.severity, code: issue.code, path: `${POOL_PATH}#${candidate.id}${issue.path.slice(1)}`, reproduction: "node tools/historical-research/cli.mjs validate" });
    const missing = [];
    if (!Array.isArray(candidate.authors) || candidate.authors.length === 0) missing.push("authors");
    if (!candidate.publishedAt) missing.push("publishedAt");
    if (!candidate.archiveIdentifier) missing.push("archiveIdentifier");
    if (!candidate.citation) missing.push("citation");
    if (!candidate.rights?.status || candidate.rights.status === "unknown") missing.push("rights.status");
    if (candidate.sourceNature === "unknown") missing.push("sourceNature");
    unknownFieldsCount += missing.length;
    const dry = convertCandidateToDraft(candidate, archive.records, { now: generatedAt });
    dryRuns.push({ candidateId: candidate.id, outcome: dry.outcome, blockers: dry.blockers.map((blocker) => blocker.code).sort() });
    workList.push({
      candidateId: candidate.id,
      title: candidate.title,
      url: candidate.url,
      state: candidate.state,
      waitingBecause: ["HUMAN_REVIEW_NOT_RECORDED", ...dry.blockers.map((blocker) => blocker.code)].filter((code, index, all) => all.indexOf(code) === index).sort(),
      missingFields: missing,
      possibleDuplicates: duplicates.findings.filter((finding) => finding.b.id === candidate.id || finding.a.id === candidate.id).map((finding) => ({ tier: finding.tier, with: finding.a.id === candidate.id ? finding.b : finding.a })),
      relatedClaims: (claimsByCandidate.get(candidate.id) ?? []).sort(),
      period: { start: candidate.periodStart ?? candidate.eventYear ?? null, end: candidate.periodEnd ?? candidate.eventYear ?? null },
      linkStatusObserved: candidate.urlStatus ?? "unchecked",
      linkCheckedAt: candidate.urlCheckedAt ?? null,
      humanApprovalState: "absent",
    });
  }
  const assessments = claims.map((claim) => assessClaimEvidence(claim, candidates)).sort((a, b) => a.claimId.localeCompare(b.claimId, "en"));
  const graph = buildEvidenceGraph(claims, candidates, archive.records);
  const gaps = analyzeGaps(archive.records, { targetStart: from, targetEnd: to });
  const linkStatus = {};
  for (const candidate of candidates) linkStatus[candidate.urlStatus ?? "unchecked"] = (linkStatus[candidate.urlStatus ?? "unchecked"] ?? 0) + 1;

  const after = integritySnapshot(root);
  const changed = diffIntegrity(before, after);
  if (changed.length) blockers.push({ code: "READ_ONLY_VIOLATION", paths: changed });
  if (archive.counts.technicalStatus.published > 0) warnings.push({ code: "TECHNICAL_PUBLISHED_IS_NOT_HUMAN_APPROVAL", count: archive.counts.technicalStatus.published });

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    generatedAt,
    archiveSnapshotSha: archive.archiveSnapshotSha,
    candidateSnapshotSha: pool.sha256,
    claimsSnapshotSha: claimsFile.sha256,
    metrics: {
      archiveRecordFiles: archive.counts.files,
      archiveUniqueIds: archive.counts.uniqueIds,
      archiveTechnicalStatus: archive.counts.technicalStatus,
      archiveHumanApproved: 0,
      sourceCandidates: candidates.length,
      syntheticCandidates: candidates.filter((candidate) => candidate.synthetic === true).length,
      candidateStates: Object.fromEntries(Object.entries(candidates.reduce((acc, candidate) => ({ ...acc, [candidate.state]: (acc[candidate.state] ?? 0) + 1 }), {})).sort(([a], [b]) => a.localeCompare(b, "en"))),
      canonicalUrlRoots: duplicates.metrics.canonicalUrlRoots,
      exactDuplicateFindings: duplicates.metrics.exactDuplicate,
      possibleDuplicateFindings: duplicates.metrics.possibleDuplicate,
      historicalClaims: claims.length,
      claimStatus: Object.fromEntries(["unverified", "provisional_support", "contested_needs_review"].map((state) => [state, assessments.filter((item) => item.status === state).length])),
      humanVerifiedClaims: 0,
      evidenceEdges: graph.counts.edges,
      unresolvedEdges: graph.counts.unresolvedEdges,
      dryRunOutcomes: Object.fromEntries(["ok", "blocked", "invalid"].map((outcome) => [outcome, dryRuns.filter((item) => item.outcome === outcome).length])),
    },
    humanApprovalState: { archive: "no_verified_human_approval", candidates: "no_verified_human_review", claims: "no_human_verification" },
    importEligibleCount: 0,
    importEligibleNote: "Güvenilir insan incelemesi kaynağı yok; dry-run 'ok' yalnız teknik taslaktır ve kataloğa yazılmaz.",
    unknownFieldsCount,
    sourceLinkStatus: { observed: linkStatus, note: "Havuzdaki gözlemlenmiş alan; bu rapor ağa çıkmadı. Erişilebilirlik tarihî doğruluk değildir." },
    periodCoverage: periodCoverage(archive.records, candidates, { from, to }),
    gapAnalysis: { missingRanges: gaps.missingRanges, themeCoverage: gaps.themeCoverage, method: "heuristic_keyword" },
    duplicates: duplicates.findings,
    claimAssessments: assessments,
    dryRuns,
    workList,
    findings: findings.sort((a, b) => a.path.localeCompare(b.path, "en") || a.code.localeCompare(b.code, "en")),
    warnings,
    blockers,
    readOnlyIntegrity: { verified: changed.length === 0, paths: before.map((entry) => ({ path: entry.path, files: entry.files, sha256: entry.sha256 })) },
    limitations: [
      "Ağ erişimi yok; bağlantı durumu havuzdaki gözlemdir.",
      "Pasaj doğrulaması yapılmadı (Prompt 08 / insan).",
      "Bağımsızlık ve tekrar sınıflandırması sezgiseldir.",
      "Source Reliability (PR #20) ve Authority Registry (Prompt 06) bu tabanda yok; eşleme yapılmadı.",
      "Tema kapsamı anahtar kelime temellidir.",
    ],
  };
}

export function snapshotToMarkdown(report) {
  const m = report.metrics;
  const lines = [
    "# Evidence Engine entegrasyon raporu",
    "",
    `- Üretim: ${report.generatedAt} · Motor: ${report.engineVersion}`,
    `- Arşiv SHA: \`${report.archiveSnapshotSha}\` · Aday SHA: \`${report.candidateSnapshotSha}\` · İddia SHA: \`${report.claimsSnapshotSha}\``,
    `- Salt-okunur bütünlük: ${report.readOnlyIntegrity.verified ? "değişiklik yok" : "**İHLAL**"}`,
    "",
    "| Ölçüm | Değer |",
    "|---|---|",
    `| Arşiv kaydı (dosya / tekil kimlik) | ${m.archiveRecordFiles} / ${m.archiveUniqueIds} |`,
    `| Teknik etiket (published/reviewed/draft) | ${m.archiveTechnicalStatus.published}/${m.archiveTechnicalStatus.reviewed}/${m.archiveTechnicalStatus.draft} |`,
    `| İnsan onaylı arşiv kaydı | ${m.archiveHumanApproved} |`,
    `| Kaynak adayı (sentetik) | ${m.sourceCandidates} (${m.syntheticCandidates}) |`,
    `| Kanonik URL kökü | ${m.canonicalUrlRoots} |`,
    `| Kesin / olası tekrar bulgusu | ${m.exactDuplicateFindings} / ${m.possibleDuplicateFindings} |`,
    `| Tarihî iddia | ${m.historicalClaims} |`,
    `| İddia durumu (unverified / provisional / contested) | ${m.claimStatus.unverified} / ${m.claimStatus.provisional_support} / ${m.claimStatus.contested_needs_review} |`,
    `| İnsan doğrulamalı iddia | ${m.humanVerifiedClaims} |`,
    `| Kanıt kenarı / çözümsüz | ${m.evidenceEdges} / ${m.unresolvedEdges} |`,
    `| Dry-run (ok / blocked / invalid) | ${m.dryRunOutcomes.ok} / ${m.dryRunOutcomes.blocked} / ${m.dryRunOutcomes.invalid} |`,
    `| İçe aktarmaya uygun | ${report.importEligibleCount} |`,
    `| Bilinmeyen/eksik alan | ${report.unknownFieldsCount} |`,
    "",
    `**Dönem ${report.periodCoverage.from}–${report.periodCoverage.to}:** ${report.periodCoverage.distinctRecords} ayrı kayıt, ${report.periodCoverage.recordYearIncidences} kayıt-yıl, ${report.periodCoverage.candidateSourcesOverlapping} aday kaynak. ${report.periodCoverage.placeRecordsNote} ${report.periodCoverage.absenceNote}`,
    "",
    "## Engeller",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- \`${blocker.code}\``) : ["- yok"]),
    "",
    "## Sınırlar",
    "",
    ...report.limitations.map((item) => `- ${item}`),
  ];
  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** İş listesi CSV'si (UTF-8, BOM YOK; formül enjeksiyonu nötr). */
export function workListToCsv(report) {
  const header = ["candidateId", "title", "state", "waitingBecause", "missingFields", "possibleDuplicates", "relatedClaims", "periodStart", "periodEnd", "linkStatusObserved", "humanApprovalState"];
  const rows = report.workList.map((item) => [item.candidateId, item.title, item.state, item.waitingBecause.join(" "), item.missingFields.join(" "), item.possibleDuplicates.map((dup) => `${dup.tier}:${dup.with.kind}:${dup.with.id}`).join(" "), item.relatedClaims.join(" "), item.period.start, item.period.end, item.linkStatusObserved, item.humanApprovalState].map(csvCell).join(","));
  return `${[header.join(","), ...rows].join("\n")}\n`;
}
