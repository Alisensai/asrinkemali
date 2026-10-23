/**
 * İnsan uzman onayı denetimi.
 *
 * `verification.reviewedBy` alanında makine/otomatik denetim adı geçiyorsa bu,
 * insan uzman onayı sayılmaz. Araç yalnızca rapor üretir; Copilot'un insan
 * inceleme sistemine veya arşiv kayıtlarına yazmaz.
 */

import { classifyReviewer, countBy, normalizeWhitespace, sortBy, toSortedEntries } from "./util.mjs";

const STATUS_RANK = { published: 0, reviewed: 1, draft: 2 };

function explicitHumanFields(verification) {
  const candidates = [
    ["humanReviewedBy", verification?.humanReviewedBy],
    ["expertReviewedBy", verification?.expertReviewedBy],
    ["approvedBy", verification?.approvedBy],
  ];
  const found = [];
  for (const [field, value] of candidates) {
    if (typeof value === "string" && value.trim().length > 0) found.push({ field, value: value.trim() });
  }
  if (verification?.expertApproved === true) found.push({ field: "expertApproved", value: "true" });
  if (verification?.humanApproved === true) found.push({ field: "humanApproved", value: "true" });
  return found;
}

export function auditRecordHumanReview(record) {
  const verification = record.verification ?? {};
  const reviewer = classifyReviewer(verification.reviewedBy);
  const explicit = explicitHumanFields(verification);
  const hasHumanApproval = reviewer.human || explicit.length > 0;
  const approvalSource = explicit.length > 0 ? "explicit_field" : reviewer.human ? "reviewedBy" : null;
  return {
    recordId: record.id ?? null,
    title: record.title ?? null,
    type: record.type ?? null,
    status: verification.status ?? null,
    institution: record.source?.institution ?? null,
    sourceUrl: record.source?.url ?? null,
    reviewedBy: verification.reviewedBy ?? null,
    reviewedAt: verification.reviewedAt ?? null,
    reviewerKind: reviewer.kind,
    reviewerReason: reviewer.reason,
    explicitHumanFields: explicit,
    hasHumanApproval,
    approvalSource,
    missingHumanReview: !hasHumanApproval,
    notes: normalizeWhitespace(verification.notes) || null,
    checks: verification.checks ?? null,
  };
}

export function auditHumanReview(records) {
  const rows = sortBy(
    records.map((record) => auditRecordHumanReview(record)),
    (a, b) =>
      (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99) ||
      Number(b.missingHumanReview) - Number(a.missingHumanReview) ||
      String(a.recordId).localeCompare(String(b.recordId), "tr")
  );
  const missing = rows.filter((row) => row.missingHumanReview);
  const approved = rows.filter((row) => row.hasHumanApproval);
  const byStatus = [...countBy(rows, (row) => row.status ?? "(bilinmiyor)").entries()]
    .sort((a, b) => (STATUS_RANK[a[0]] ?? 99) - (STATUS_RANK[b[0]] ?? 99))
    .map(([status, count]) => {
      const statusRows = rows.filter((row) => (row.status ?? "(bilinmiyor)") === status);
      return {
        status,
        count,
        humanApproved: statusRows.filter((row) => row.hasHumanApproval).length,
        missingHumanReview: statusRows.filter((row) => row.missingHumanReview).length,
      };
    });
  const byInstitution = [...countBy(rows, (row) => row.institution ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([institution, count]) => {
      const institutionRows = rows.filter((row) => (row.institution ?? "(bilinmiyor)") === institution);
      return {
        institution,
        count,
        humanApproved: institutionRows.filter((row) => row.hasHumanApproval).length,
        missingHumanReview: institutionRows.filter((row) => row.missingHumanReview).length,
      };
    });
  const byType = [...countBy(rows, (row) => row.type ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([type, count]) => {
      const typeRows = rows.filter((row) => (row.type ?? "(bilinmiyor)") === type);
      return {
        type,
        count,
        humanApproved: typeRows.filter((row) => row.hasHumanApproval).length,
        missingHumanReview: typeRows.filter((row) => row.missingHumanReview).length,
      };
    });

  return {
    schemaVersion: "1.0.0",
    policy: {
      question: "Kayıtta açık bir insan uzman onayı var mı?",
      aiIsNotHuman: "Makine/otomatik denetim adı (`OpenCode`, `yapay zekâ` vb.) insan onayı sayılmaz.",
      unknownIsNotApproved: "İnceleyenin niteliği belirsizse temkinli olarak onaysız sayılır.",
      writePolicy: "Bu rapor hiçbir inceleme sistemine veya arşiv kaydına yazmaz; yalnızca iş listesi üretir.",
    },
    summary: {
      totalRecords: rows.length,
      humanApproved: approved.length,
      missingHumanReview: missing.length,
      humanApprovalCoverage: rows.length > 0 ? approved.length / rows.length : null,
      aiReviewed: rows.filter((row) => row.reviewerKind === "ai").length,
      unreviewed: rows.filter((row) => row.reviewerKind === "none").length,
      unknownReviewer: rows.filter((row) => row.reviewerKind === "unknown").length,
      byStatus,
      byInstitution,
      byType,
      byReviewerKind: toSortedEntries(countBy(rows, (row) => row.reviewerKind)),
    },
    records: rows,
    worklist: missing,
  };
}
