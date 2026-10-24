import test from "node:test";
import assert from "node:assert/strict";
import { createClaimRecord, reviseClaimText, validateClaimRecord, currentRevision } from "./claims.mjs";
import { createEvidenceRecord, assessSupport, validateEvidenceRecord } from "./evidence.mjs";
import { bindEvidence, assessClaim, staleEvidenceReport } from "./workflow.mjs";

/** Künye içeren yardımcı. */
function makeLocator(overrides = {}) {
  return {
    url: "https://www.ataturkansiklopedisi.gov.tr/detay/179/test/",
    title: "Test maddesi",
    author: "Test Yazar",
    institution: "Atatürk Ansiklopedisi",
    page: null,
    section: null,
    locator: null,
    ...overrides,
  };
}

test("uçtan uca iş akışı: iddia → kanıt → pasaj değerlendirmesi → beklemede", () => {
  let claim = createClaimRecord({ id: "claim-w-001", text: "Test iddiası: X olayı 1912'de oldu." });
  const evidence = createEvidenceRecord({
    id: "ev-w-001",
    claimId: claim.id,
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    shortQuote: "İlgili pasaj: X olayı 1912'de gerçekleşti.",
    accessDate: "2026-10-23",
  });
  const assessed = assessSupport(evidence, {
    actuallySupports: true,
    method: "direct_passage",
    note: "Pasaj doğrudan okundu.",
  });
  const bound = bindEvidence(claim, assessed);
  claim = bound.claim;
  const result = assessClaim(claim, [bound.evidence]);
  assert.equal(result.status, "awaiting_human_review");
  assert.equal(result.passageBackedSupportCount, 1);
  assert.equal(result.independentSupportCount, 1);
  assert.deepEqual(currentRevision(claim).evidenceIds, ["ev-w-001"]);
});

test("iddia metni değişince eski kanıt otomatik geçerli sayılmaz", () => {
  let claim = createClaimRecord({ id: "claim-w-002", text: "İlk metin." });
  const evidence = createEvidenceRecord({
    id: "ev-w-002",
    claimId: claim.id,
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    accessDate: "2026-10-23",
  });
  claim = bindEvidence(claim, evidence).claim;
  // Metni revize et
  claim = reviseClaimText(claim, "Revize metin: kapsam daraltıldı.", "Kaynak incelemesinde ifade düzeltildi.");
  // Eski kanıt yeni sürüme bağlanamaz
  assert.throws(() => bindEvidence(claim, { ...evidence, claimVersion: 1 }), /sürüm/);
  // Yeni sürümün kanıt listesi boş
  assert.deepEqual(currentRevision(claim).evidenceIds, []);
  // Eski kanıt "stale" raporlanır
  const report = staleEvidenceReport(claim, [evidence]);
  assert.equal(report.requiresReassessment, true);
  assert.ok(report.staleEvidenceIds.includes("ev-w-002"));
  // Değerlendirme: yetersiz kanıt
  const result = assessClaim(claim, []);
  assert.equal(result.status, "insufficient_evidence");
});

test("başlık incelemesiyle destek kararı verilemez", () => {
  const evidence = createEvidenceRecord({
    id: "ev-w-003",
    claimId: "claim-w-003",
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    accessDate: "2026-10-23",
  });
  // title_only ile actuallySupports=true YAZILAMAZ
  assert.throws(
    () => assessSupport(evidence, { actuallySupports: true, method: "title_only" }),
    /başlık/i
  );
  // title_only ile "desteklenmiyor/belirsiz" kaydı serbest
  const assessed = assessSupport(evidence, { actuallySupports: null, method: "title_only", note: "Yalnızca başlık incelendi; pasaj okunmadı." });
  assert.equal(assessed.supportAssessment.actuallySupports, null);
  assert.equal(assessed.verificationLevel, "unverified");
  // validate: title_only + actuallySupports=true reddedilir
  const fake = { ...assessed, supportAssessment: { ...assessed.supportAssessment, actuallySupports: true } };
  const validation = validateEvidenceRecord(fake);
  assert.ok(validation.issues.some((issue) => issue.code === "TITLE_ONLY_SUPPORT"));
});

test("bağımsızlık belirsizse bağımsız kanıt sayılmaz", () => {
  let claim = createClaimRecord({ id: "claim-w-004", text: "Bağımsızlık testi." });
  const a = createEvidenceRecord({
    id: "ev-w-004a",
    claimId: claim.id,
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    shortQuote: "Pasaj A.",
    accessDate: "2026-10-23",
  });
  const b = createEvidenceRecord({
    id: "ev-w-004b",
    claimId: claim.id,
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator({ url: "https://atam.gov.tr/test/", institution: "ATAM", title: "Aynı konuda makale" }),
    shortQuote: "Pasaj B.",
    accessDate: "2026-10-23",
  });
  const assessedA = assessSupport(a, { actuallySupports: true, method: "direct_passage" });
  const assessedB = assessSupport(b, { actuallySupports: true, method: "direct_passage" });
  claim = bindEvidence(claim, assessedA).claim;
  claim = bindEvidence(claim, assessedB).claim;
  // İlişki: belirsiz (uncertain) → bağımsız sayılmaz
  const result = assessClaim(claim, [assessedA, assessedB], () => ({ type: "unknown", uncertain: true, basis: "test" }));
  assert.equal(result.independentSupportCount, 0);
  assert.ok(result.issues.some((issue) => issue.includes("bağımsızlık belirsiz")));
  // İlişki: aynı özgün eser → bağımsız sayılmaz
  const result2 = assessClaim(claim, [assessedA, assessedB], () => ({ type: "same_original_work", uncertain: false, basis: "test" }));
  assert.equal(result2.independentSupportCount, 0);
  // İlişki: gerçekten ayrı birincil belge → bağımsız sayılır
  const result3 = assessClaim(claim, [assessedA, assessedB], () => ({ type: "separate_primary_document", uncertain: false, basis: "test" }));
  assert.equal(result3.independentSupportCount, 2);
});

test("çelişen kanıt değerlendirmeyi contested yapar", () => {
  let claim = createClaimRecord({ id: "claim-w-005", text: "Çelişki testi." });
  const support = createEvidenceRecord({
    id: "ev-w-005a",
    claimId: claim.id,
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    accessDate: "2026-10-23",
  });
  const against = createEvidenceRecord({
    id: "ev-w-005b",
    claimId: claim.id,
    claimVersion: 1,
    relation: "contradicts",
    locator: makeLocator(),
    accessDate: "2026-10-23",
  });
  const assessedSupport = assessSupport(support, { actuallySupports: true, method: "direct_passage" });
  const assessedAgainst = assessSupport(against, { actuallySupports: true, method: "direct_passage" });
  claim = bindEvidence(claim, assessedSupport).claim;
  claim = bindEvidence(claim, assessedAgainst).claim;
  const result = assessClaim(claim, [assessedSupport, assessedAgainst]);
  assert.equal(result.status, "contested");
  assert.equal(result.contradictionCount, 1);
});

test("sahte insan onayı reddedilir (validate)", () => {
  const evidence = createEvidenceRecord({
    id: "ev-w-006",
    claimId: "claim-w-006",
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    accessDate: "2026-10-23",
  });
  const fakeApproved = {
    ...evidence,
    verificationLevel: "human_verified",
    humanReview: { reviewed: true, reviewer: "mock-user", reviewedAt: "2026-10-23" },
  };
  const validation = validateEvidenceRecord(fakeApproved);
  assert.ok(validation.issues.some((issue) => issue.code === "FAKE_HUMAN_REVIEW"));
  // UNBACKED_VERIFIED: inceleme kaydı YOKKEN human_verified → tutarsızlık
  const unbacked = { ...evidence, verificationLevel: "human_verified" };
  const v2 = validateEvidenceRecord(unbacked);
  assert.ok(v2.issues.some((issue) => issue.code === "UNBACKED_VERIFIED"));
  // approved iddia durumu da reddedilir
  const claimFake = createClaimRecord({ id: "claim-w-006", text: "Test." });
  const badClaim = { ...claimFake, status: "approved" };
  const claimValidation = validateClaimRecord(badClaim);
  assert.ok(claimValidation.issues.some((issue) => issue.code === "FAKE_APPROVAL"));
});

test("alıntı uzunluk sınırı (telif güvenliği)", () => {
  assert.throws(
    () =>
      createEvidenceRecord({
        id: "ev-w-007",
        claimId: "claim-w-007",
        claimVersion: 1,
        relation: "supports",
        locator: makeLocator(),
        shortQuote: "x".repeat(301),
        accessDate: "2026-10-23",
      }),
    /300/
  );
});

test("kanıt çift bağlama engeli", () => {
  let claim = createClaimRecord({ id: "claim-w-008", text: "Test." });
  const evidence = createEvidenceRecord({
    id: "ev-w-008",
    claimId: claim.id,
    claimVersion: 1,
    relation: "supports",
    locator: makeLocator(),
    accessDate: "2026-10-23",
  });
  claim = bindEvidence(claim, evidence).claim;
  assert.throws(() => bindEvidence(claim, evidence), /çift sayım/);
});
