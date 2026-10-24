import { createHash } from "node:crypto";

import { canonicalJson, legacyRecordHash, snapshotHash } from "../../../web/lib/editorial-trust/canonical.ts";
import { classifyLegacyForm } from "../../../web/lib/editorial-trust/forms.ts";
import { archiveEvidenceChecks, archiveStructuralErrors, evaluateArchiveReviewReadiness, evaluatePublicationReviewReadiness, finding, PR12_COMPATIBILITY } from "../../../web/lib/editorial-trust/policy.ts";
import { loadRepository } from "./repo-reader.mjs";

export const REPORT_SCHEMA = "editorial-trust-report/1";

/**
 * Gerçek katalog ve formlar üzerinden salt-okunur güven raporu. Bu repoda kalıcı karar
 * deposu, güvenilir kimlik sağlayıcısı ve etkin politika olmadığından karar listesi boştur;
 * bu bir varsayım değil, ölçülen durumdur (`environment` alanı).
 */
export function buildTrustReport(root, options) {
  const { now, git = { branch: "unknown", commit: "unknown" }, technicalTestsPassed = null } = options;
  const repo = loadRepository(root);
  const environment = { policy: null, identityConfigured: false, technicalTestsPassed, auditIntegrity: null, now };

  const byId = new Map();
  const duplicates = [];
  for (const entry of repo.records) {
    const id = typeof entry.record?.id === "string" ? entry.record.id : null;
    if (!id) continue;
    if (byId.has(id)) duplicates.push({ recordId: id, files: [byId.get(id).file, entry.file] });
    else byId.set(id, entry);
  }
  const formsById = new Map();
  const duplicateForms = [];
  const orphanForms = [];
  for (const entry of repo.forms) {
    const id = typeof entry.form?.record_id === "string" ? entry.form.record_id : null;
    if (!id || !byId.has(id)) {
      orphanForms.push({ file: entry.file, recordId: id });
      continue;
    }
    if (formsById.has(id)) duplicateForms.push({ recordId: id, files: [formsById.get(id).file, entry.file] });
    else formsById.set(id, entry);
  }
  const duplicateIds = new Set([...duplicates.map((d) => d.recordId), ...duplicateForms.map((d) => d.recordId)]);

  const rows = [];
  const globalFindings = [
    finding("credential_provider_unavailable", "critical", { subjectType: "archive_record", gate: "identity", actorVerificationState: "identity_unavailable" }),
    finding("audit_chain_invalid", "critical", { subjectType: "archive_record", gate: "audit", reason: "Güvenilir editoryal audit deposu yok; doğrulanacak karar zinciri bulunmuyor." }),
  ];
  for (const d of duplicates) globalFindings.push(finding("duplicate_record_id", "critical", { subjectType: "archive_record", recordId: d.recordId, gate: "identity_of_record", sourceFile: d.files.join(", ") }));
  for (const d of duplicateForms) globalFindings.push(finding("duplicate_record_id", "critical", { subjectType: "archive_record", recordId: d.recordId, gate: "review_form", reason: "Aynı kayıt için birden fazla form; hiçbiri onay sayılmaz.", sourceFile: d.files.join(", ") }));
  for (const o of orphanForms) globalFindings.push(finding("orphan_review_form", "error", { subjectType: "archive_record", recordId: o.recordId, sourceFile: o.file, gate: "review_form" }));
  for (const u of repo.unreadable) globalFindings.push(finding(u.kind === "review_form" ? "review_form_invalid" : "schema_invalid", "critical", { subjectType: u.kind === "publication_record" ? "publication_record" : "archive_record", sourceFile: u.file, gate: "input", reason: `Dosya okunamadı: ${u.error}` }));

  for (const [recordId, entry] of [...byId.entries()].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    const formEntry = duplicateIds.has(recordId) ? null : formsById.get(recordId) ?? null;
    const classification = classifyLegacyForm(formEntry?.form ?? null, entry.record);
    const readiness = evaluateArchiveReviewReadiness(
      { record: entry.record, sourceFile: entry.file, schemaErrors: archiveStructuralErrors(entry.record), form: formEntry?.form ?? null, formErrors: classification.errors, decisions: [] },
      environment,
    );
    rows.push({
      subjectType: "archive_record",
      recordId,
      slug: entry.record.slug ?? null,
      file: entry.file,
      formFile: formEntry?.file ?? null,
      technicalLabel: entry.record.verification?.status ?? null,
      rightsStatus: entry.record.rights?.status ?? null,
      reviewState: classification.reviewState,
      trustClass: classification.trustClass,
      legacySnapshotHash: legacyRecordHash(entry.record),
      snapshotHashV2: snapshotHash("archive_record", entry.record),
      result: readiness.result,
      flags: readiness.flags,
      evidenceChecks: archiveEvidenceChecks(entry.record),
      findings: readiness.findings,
    });
  }
  const archiveIndex = { ids: new Set(byId.keys()), slugToId: new Map([...byId.values()].map((e) => [e.record.slug, e.record.id])) };
  for (const entry of repo.publications) {
    const readiness = evaluatePublicationReviewReadiness({ record: entry.record, sourceFile: entry.file, schemaErrors: [], decisions: [], archiveIndex }, environment);
    rows.push({ subjectType: "publication_record", recordId: readiness.recordId, slug: entry.record.slug ?? null, file: entry.file, formFile: null, technicalLabel: entry.record.status ?? null, rightsStatus: null, reviewState: "not_started", trustClass: null, legacySnapshotHash: null, snapshotHashV2: snapshotHash("publication_record", entry.record), result: readiness.result, flags: readiness.flags, findings: readiness.findings });
  }

  const archiveRows = rows.filter((row) => row.subjectType === "archive_record");
  const has = (row, code) => row.findings.some((item) => item.code === code);
  const count = (predicate) => archiveRows.filter(predicate).length;
  const counts = {
    catalog_record_files: repo.records.length + repo.unreadable.filter((u) => u.kind === "archive_record").length,
    catalog_records: byId.size,
    review_form_files: repo.forms.length + repo.unreadable.filter((u) => u.kind === "review_form").length,
    matched_forms: formsById.size,
    missing_forms: count((row) => row.reviewState === "not_started"),
    orphan_forms: orphanForms.length,
    duplicate_record_ids: duplicates.length,
    duplicate_forms: duplicateForms.length,
    invalid_forms: count((row) => row.reviewState === "invalid") + repo.unreadable.filter((u) => u.kind === "review_form").length,
    unreadable_files: repo.unreadable.length,
    pending: count((row) => row.reviewState === "pending"),
    stale: count((row) => row.reviewState === "stale"),
    submitted_claim_unverified: count((row) => row.trustClass === "submitted_claim_unverified"),
    identity_verified_real_reviews: count((row) => row.flags.human_historian_review_verified),
    editor_approved_real_decisions: count((row) => row.flags.human_editor_approval_verified),
    technical_label_published: count((row) => row.technicalLabel === "published"),
    rights_blocked: count((row) => !row.flags.rights_status_acceptable),
    missing_source_location: count((row) => has(row, "evidence_location_missing")),
    release_ready: count((row) => row.flags.release_ready),
    publication_records: rows.length - archiveRows.length,
  };
  const findingCounts = {};
  for (const item of [...globalFindings, ...rows.flatMap((row) => row.findings)]) findingCounts[item.code] = (findingCounts[item.code] ?? 0) + 1;

  const catalogDigest = createHash("sha256")
    .update(canonicalJson(archiveRows.map((row) => [row.recordId, row.legacySnapshotHash])), "utf8")
    .digest("hex");
  const report = {
    schema: REPORT_SCHEMA,
    meta: { generatedAt: new Date(now).toISOString(), branch: git.branch, commit: git.commit, catalogDigest, partial: repo.unreadable.length > 0 || repo.missingDirs.length > 0, missingDirs: repo.missingDirs },
    environment: {
      identityProvider: "not_configured",
      editorialPolicy: "not_configured",
      decisionStore: "not_configured",
      auditStore: "not_configured",
      technicalTestsPassed: technicalTestsPassed === true,
      note: "Kod testleri geçse bile insan editoryal yayın kapısı kapalı kalır; bu doğru davranıştır.",
    },
    counts,
    findingCounts: Object.fromEntries(Object.entries(findingCounts).sort(([a], [b]) => a.localeCompare(b, "en"))),
    countingScope: "Bulgular kayıt başına ve kod başına bir kez sayılır. Global bulgular (kimlik, audit, yinelenen, yetim, okunamayan) ayrı listelenir.",
    releaseReady: false,
    globalFindings,
    rows,
    pr12Compatibility: PR12_COMPATIBILITY,
  };
  report.releaseReady = gateDecision(report).release_ready;
  return report;
}

/** gate-check'in yayın kararı: tek bir kayıt bile release_ready değilse veya global kritik bulgu varsa false. */
export function gateDecision(report) {
  const archiveRows = report.rows.filter((row) => row.subjectType === "archive_record");
  const blockedRecords = archiveRows.filter((row) => !row.flags.release_ready).length;
  const globalCritical = report.globalFindings.filter((item) => item.severity === "critical").length;
  return {
    release_ready: archiveRows.length > 0 && blockedRecords === 0 && globalCritical === 0 && !report.meta.partial,
    technical_tests_passed: report.environment.technicalTestsPassed,
    blocked_records: blockedRecords,
    global_critical_findings: globalCritical,
  };
}
