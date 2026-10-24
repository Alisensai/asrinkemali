import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import {
  getCatalogSourceHealth,
  getSourceFindingsForRecord,
  getEarlyPeriodCoverage,
  get13EarlyPeriodCandidates,
  getHumanReviewWorklist,
} from "../lib/source-reliability/index.ts";

const repoRoot = path.resolve(process.cwd(), "..");
const catalogPath = path.join(repoRoot, "data", "archive", "catalog", "index.json");

function getCatalogHash() {
  if (!fs.existsSync(catalogPath)) return "none";
  return crypto.createHash("sha256").update(fs.readFileSync(catalogPath)).digest("hex");
}

test("Task 05 Bridge: getCatalogSourceHealth salt okunur katalog özeti döndürür", () => {
  const hashBefore = getCatalogHash();
  const health = getCatalogSourceHealth();
  const hashAfter = getCatalogHash();

  assert.equal(hashBefore, hashAfter, "Katalog hash değeri değişmemelidir");
  assert.equal(health.isArchiveModified, false);
  assert.equal(health.totalRecords, 168);
  assert.ok(health.primarySourcesCount > 0);
  assert.ok(health.secondarySourcesCount > 0);
  assert.ok(health.referenceSourcesCount > 0);
  assert.ok(health.imageRightsUnverifiedCount > 0);
  assert.ok(health.humanReviewRequiredCount > 0);
});

test("Task 05 Bridge: 13 erken dönem adayı strictly unverified ve ingest=false kalmalıdır", () => {
  const candidates = get13EarlyPeriodCandidates();
  assert.equal(candidates.length, 13, "Tam olarak 13 erken dönem adayı bulunmalıdır");

  for (const c of candidates) {
    assert.equal(c.status, "unverified", `Aday ${c.id} unverified olmalıdır`);
    assert.equal(c.ingest, false, `Aday ${c.id} ingest=false kalmalıdır`);
    assert.equal(c.humanApproved, false, `Aday ${c.id} humanApproved=false olmalıdır`);
    assert.equal(c.verificationRequired, true, `Aday ${c.id} verificationRequired=true olmalıdır`);
    assert.ok(c.sourceUrl.startsWith("http"), `Aday ${c.id} geçerli HTTP URL taşımalıdır`);
    assert.ok(c.whyCandidate.length > 0, `Aday ${c.id} adaylık gerekçesi taşımalıdır`);
  }
});

test("Task 05 Bridge: getEarlyPeriodCoverage evreleri ve akademik araştırma açıklarını sunar", () => {
  const coverage = getEarlyPeriodCoverage();
  assert.ok(coverage.totalEarlyPeriodRecords >= 0);
  assert.ok(Array.isArray(coverage.coveragePhases));
  assert.ok(coverage.coveragePhases.length > 0);
  assert.ok(Array.isArray(coverage.identifiedGaps));
  assert.ok(coverage.identifiedGaps.length > 0);
});

test("Task 05 Bridge: getHumanReviewWorklist asla otomatik yayın izni vermez (canPublishAutomatically=false)", () => {
  const worklist = getHumanReviewWorklist();
  assert.equal(worklist.canPublishAutomatically, false);
  assert.ok(worklist.totalPendingReview > 0);
  assert.ok(worklist.recordsRequiringAction.length > 0);

  for (const item of worklist.recordsRequiringAction) {
    assert.ok(item.recordId.length > 0);
    assert.ok(item.missingEvidence.length > 0);
    assert.ok(item.suggestedChecklist.length > 0);
  }
});

test("Task 05 Bridge: getSourceFindingsForRecord bilinen kayıt bulgularını filtreler", () => {
  const findings = getSourceFindingsForRecord("selanikteki-ataturk-evi");
  assert.ok(Array.isArray(findings));
});
