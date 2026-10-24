import test from "node:test";
import assert from "node:assert/strict";

import { auditHumanReview, auditRecordHumanReview } from "../src/human-review.mjs";
import { makeRecord } from "./fixtures.mjs";

test("yapay zekâ denetimi insan uzman onayı sayılmaz", () => {
  const result = auditRecordHumanReview(
    makeRecord({ id: "ai", verification: { reviewedBy: "OpenCode arşiv denetimi (yapay zekâ)" } })
  );
  assert.equal(result.reviewerKind, "ai");
  assert.equal(result.hasHumanApproval, false);
  assert.equal(result.missingHumanReview, true);
  assert.equal(result.approvalSource, null);
});

test("insan uzman inceleyicisi onay sayılır", () => {
  const result = auditRecordHumanReview(
    makeRecord({ id: "human", verification: { reviewedBy: "Prof. Dr. Ayşe Yılmaz" } })
  );
  assert.equal(result.reviewerKind, "human");
  assert.equal(result.hasHumanApproval, true);
  assert.equal(result.missingHumanReview, false);
  assert.equal(result.approvalSource, "reviewedBy");
});

test("açık insan onay alanı reviewedBy yapay zekâ olsa da onay sayılır", () => {
  const result = auditRecordHumanReview(
    makeRecord({
      id: "explicit",
      verification: {
        reviewedBy: "OpenCode arşiv denetimi (yapay zekâ)",
        approvedBy: "Doç. Dr. Mehmet Örnek",
      },
    })
  );
  assert.equal(result.hasHumanApproval, true);
  assert.equal(result.approvalSource, "explicit_field");
  assert.equal(result.explicitHumanFields[0].field, "approvedBy");
});

test("inceleyen yoksa ve niteliği belirsizse onaysız sayılır", () => {
  const none = auditRecordHumanReview(makeRecord({ id: "none", verification: { reviewedBy: null } }));
  assert.equal(none.reviewerKind, "none");
  assert.equal(none.missingHumanReview, true);
  const unknown = auditRecordHumanReview(makeRecord({ id: "unknown", verification: { reviewedBy: "Arşiv ekibi" } }));
  assert.equal(unknown.reviewerKind, "unknown");
  assert.equal(unknown.missingHumanReview, true);
});

test("insan onayı özeti durum ve kurum kırılımını hesaplar", () => {
  const records = [
    makeRecord({ id: "published-ai", verification: { status: "published", reviewedBy: "OpenCode arşiv denetimi (yapay zekâ)" } }),
    makeRecord({ id: "reviewed-human", verification: { status: "reviewed", reviewedBy: "Prof. Dr. Ayşe Yılmaz" } }),
    makeRecord({ id: "draft-none", verification: { status: "draft", reviewedBy: null } }),
  ];
  const result = auditHumanReview(records);
  assert.equal(result.summary.totalRecords, 3);
  assert.equal(result.summary.humanApproved, 1);
  assert.equal(result.summary.missingHumanReview, 2);
  assert.equal(result.summary.aiReviewed, 1);
  assert.equal(result.summary.unreviewed, 1);
  assert.equal(result.summary.humanApprovalCoverage, 1 / 3);
  assert.equal(result.worklist.length, 2);
  assert.equal(result.summary.byStatus.length, 3);
  assert.ok(result.summary.byInstitution.length >= 1);
});
