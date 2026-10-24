/**
 * Evidence Engine kararlı backend sözleşmesi (Görev 07 → Prompt 08 / PR #24).
 *
 * Adlar #19 upstream adlarıyla uyumludur; yeni olanlar yalnız eksik sözleşmeleri
 * doldurur. Ağ, ücretli API veya yapay zekâ sağlayıcısı bağımlılığı yoktur.
 */

export { loadArchiveContext, archiveRecordReference, integritySnapshot, diffIntegrity } from "./archive-context.mjs";
export { candidateIssues, mergeIntoPoolAtomic, parseUntrustedJson, sanitizeImportedCandidate, transitionCandidate } from "./candidate-contract.mjs";
export { classifyDuplicates, normalizeUrlWithEvidence } from "./source-identity.mjs";
export { assessClaimEvidence, buildEvidenceGraph, independenceRoots } from "./evidence-assessment.mjs";
export { checkUrlReachability, classifyHttpOutcome } from "./url-status.mjs";
export { createAuthorityResolver, loadSourceReliabilityAdapter, mapReliabilityClass } from "./optional-adapters.mjs";
export { buildResearchSnapshot, periodCoverage, snapshotToMarkdown, stableStringify, workListToCsv } from "./research-report.mjs";
export { assertSafeOutputPath, writeFileAtomic } from "./safe-output.mjs";
export { analyzeGaps } from "../gap-analysis.mjs";
export { convertCandidateToDraft as dryRunCandidate, convertAndValidate } from "../convert-dryrun.mjs";
export { loadPool as readCandidatePool, validateCandidate } from "../candidates.mjs";
