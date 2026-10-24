/**
 * Görev 07 — tekrar/kaynak kimliği ve provenans (QA-039…057).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { evaluateClaim } from "../lib/provenance.mjs";
import { assessClaimEvidence, buildEvidenceGraph, independenceRoots } from "../lib/integration/evidence-assessment.mjs";
import { classifyDuplicates, normalizeUrlWithEvidence } from "../lib/integration/source-identity.mjs";
import { makeCandidate } from "./helpers.mjs";

const c = (id, overrides = {}) => makeCandidate({ id, url: `https://example.org/${id}`, archiveIdentifier: null, ...overrides });

test("QA-039 aynı kanonik URL iki aday için exact_duplicate", () => {
  const { findings } = classifyDuplicates([c("src-2026-0001", { url: "https://Example.org/doc/1/?utm_source=x#bolum" }), c("src-2026-0002", { url: "https://example.org/doc/1" })]);
  assert.equal(findings[0].tier, "exact_duplicate");
});

test("QA-040 farklı URL ama aynı kurum + arşiv kimliği yalnız olası tekrar", () => {
  const { findings } = classifyDuplicates([c("src-2026-0001", { archiveIdentifier: "BCA-1" }), c("src-2026-0002", { archiveIdentifier: "bca-1 " })]);
  assert.deepEqual(findings.map((finding) => finding.tier), ["possible_duplicate"]);
});

test("QA-041 aynı başlıklı farklı baskılar kesin tekrar seçilmez", () => {
  const { findings } = classifyDuplicates([c("src-2026-0001", { title: "Nutuk Birinci Cilt", eventYear: 1927 }), c("src-2026-0002", { title: "Nutuk Birinci Cilt", eventYear: 1927 })]);
  assert.equal(findings.some((finding) => finding.tier === "exact_duplicate"), false);
  assert.equal(findings[0].tier, "possible_duplicate");
});

test("QA-042 farklı kurumda aynı kimlik aynı belge sayılmaz", () => {
  const { findings, metrics } = classifyDuplicates([c("src-2026-0001", { archiveIdentifier: "A-1", institution: "Kurum A", eventYear: null }), c("src-2026-0002", { archiveIdentifier: "A-1", institution: "Kurum B", eventYear: null })]);
  assert.equal(findings.length, 0);
  assert.equal(metrics.independentOrUnknown, 2);
});

test("QA-043 yüzde kodlama farkı yanlış birleşmeye yol açmaz; http/https ayrı tutulur", () => {
  const { findings } = classifyDuplicates([c("src-2026-0001", { url: "https://example.org/a%2Fb" }), c("src-2026-0002", { url: "https://example.org/a/b" }), c("src-2026-0003", { url: "http://example.org/a/b" })]);
  assert.equal(findings.filter((finding) => finding.tier === "exact_duplicate").length, 0);
});

test("QA-044 izleme parametresi normalizasyonu atılan parametreleri kanıt olarak saklar", () => {
  const result = normalizeUrlWithEvidence("https://example.org/x?id=5&utm_campaign=y&fbclid=z");
  assert.equal(result.normalized, "https://example.org/x?id=5");
  assert.deepEqual(result.removedParams, ["fbclid", "utm_campaign"]);
});

test("QA-045/QA-051 aynı belgenin ayna/iki URL'si bağımsız ikinci kaynak sayılmaz", () => {
  const sameId = [c("src-2026-0001", { institution: "Kurum", archiveIdentifier: "K-9" }), c("src-2026-0002", { institution: "Kurum", archiveIdentifier: "K-9" })];
  assert.equal(independenceRoots(sameId).length, 1);
  const mirror = [c("src-2026-0003", { institution: "Kurum A", title: "Selanik Askerî Rüştiyesi kayıt defteri", eventYear: 1893 }), c("src-2026-0004", { institution: "Kurum B", title: "Selanik Askerî Rüştiyesi kayıt defteri", eventYear: 1893 })];
  assert.equal(independenceRoots(mirror).length, 1);
  const claim = { id: "claim-x", evidence: mirror.map((item) => ({ candidateId: item.id, relation: "supports", quote: "sentetik pasaj" })) };
  assert.equal(assessClaimEvidence(claim, mirror).status, "unverified", "iki bağlantı tek kök: destek sayılmaz");
});

test("QA-046 kaynak geçmişi: orijinal URL bilgi kaybı olmadan tutulur", () => {
  const candidate = c("src-2026-0001", { url: "https://example.org/x?utm_source=a" });
  classifyDuplicates([candidate]);
  assert.equal(candidate.url, "https://example.org/x?utm_source=a");
});

test("QA-047 boş archiveIdentifier uydurulmaz; özgün belge düğümü çözümsüz kalır", () => {
  const graph = buildEvidenceGraph([], [c("src-2026-0001", { archiveIdentifier: null })]);
  const doc = graph.nodes.find((node) => node.type === "original_document");
  assert.deepEqual([doc.resolved, doc.identifier], [false, null]);
  assert.ok(graph.edges.some((edge) => edge.type === "derived_from" && edge.degree === "unresolved"));
});

test("QA-049 kanıtsız iddia unverified kalır", () => {
  assert.equal(assessClaimEvidence({ id: "claim-0", evidence: [] }, []).status, "unverified");
});

test("QA-050 yalnız kısmi destek otomatik doğrulanmaz", () => {
  const cands = [c("src-2026-0001", { institution: "A" }), c("src-2026-0002", { institution: "B" })];
  const claim = { id: "claim-1", evidence: cands.map((item) => ({ candidateId: item.id, relation: "partial", quote: "x" })) };
  assert.equal(assessClaimEvidence(claim, cands).status, "unverified");
});

test("QA-052 eksik aday kenarı unresolved kalır, ad uydurulmaz", () => {
  const result = assessClaimEvidence({ id: "claim-2", evidence: [{ candidateId: "src-2099-9999", relation: "supports" }] }, []);
  assert.equal(result.unresolvedEdges[0].state, "unresolved");
  assert.equal(result.edges.length, 0);
  assert.ok(result.reviewQueue.some((item) => item.code === "UNRESOLVED_SOURCE"));
});

test("QA-053 çelişki inceleme kuyruğuna gider; otomatik hüküm yok", () => {
  const cands = [c("src-2026-0001", { institution: "A" }), c("src-2026-0002", { institution: "B" })];
  const claim = { id: "claim-3", evidence: [{ candidateId: cands[0].id, relation: "supports", quote: "x" }, { candidateId: cands[1].id, relation: "contradicts", quote: "y" }] };
  const result = assessClaimEvidence(claim, cands);
  assert.equal(result.status, "contested_needs_review");
  assert.equal(result.humanVerified, false);
  assert.ok(result.reviewQueue.some((item) => item.code === "CONTRADICTION_REVIEW"));
});

test("QA-055 belgedeki tarih ile yayın tarihi ayrı alanlardır", () => {
  const candidate = c("src-2026-0001", { eventYear: 1915, publishedAt: "2020-01-01" });
  const graph = buildEvidenceGraph([], [candidate]);
  assert.equal(graph.nodes.find((node) => node.type === "candidate_source").publishedAt, undefined);
  assert.notEqual(String(candidate.eventYear), candidate.publishedAt.slice(0, 4));
});

test("QA-056 künye/metadata desteği pasaj yokken tam destek üretmez (#19 hatası kanıtı)", () => {
  const cands = [c("src-2026-0001", { institution: "Kurum A", title: "Birinci farklı başlık" }), c("src-2026-0002", { institution: "Kurum B", title: "Tamamen başka eser" })];
  const claim = { id: "claim-4", evidence: cands.map((item) => ({ candidateId: item.id, relation: "supports" })) };
  // #19 değerlendirmesi pasajsız iki desteği "corroborated" sayar:
  assert.equal(evaluateClaim(claim, cands).status, "corroborated");
  const assessed = assessClaimEvidence(claim, cands);
  assert.equal(assessed.status, "unverified");
  assert.equal(assessed.counts.supportsMetadataOnly, 2);
  // Pasaj alıntısıyla bile en fazla "provisional_support" (insan doğrulaması değil):
  const withPassage = assessClaimEvidence({ ...claim, evidence: claim.evidence.map((link) => ({ ...link, quote: "sentetik pasaj" })) }, cands);
  assert.equal(withPassage.status, "provisional_support");
  assert.equal(withPassage.humanVerified, false);
});

test("QA-057 aynı kurumun iki ayrı fonu aynı ayna grubuna zorlanmaz", () => {
  const roots = independenceRoots([c("src-2026-0001", { institution: "BCA", archiveIdentifier: "FON-1/1", title: "Birinci fon belgesi" }), c("src-2026-0002", { institution: "BCA", archiveIdentifier: "FON-2/7", title: "İkinci fon belgesi" })]);
  assert.equal(roots.length, 2);
});
