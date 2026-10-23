import test from "node:test";
import assert from "node:assert/strict";
import { evaluateClaim, findDateConflicts, provenanceChain } from "../lib/provenance.mjs";
import { makeCandidate } from "./helpers.mjs";

test("aynı bilginin farklı kaynaklarda bulunması: iki bağımsız kurum 'corroborated' verir", () => {
  const candidates = [
    makeCandidate({ id: "src-2026-0001", institution: "Kurum A", archiveIdentifier: "A-1" }),
    makeCandidate({ id: "src-2026-0002", institution: "Kurum B", archiveIdentifier: "B-1" }),
  ];
  const claim = {
    id: "claim-001",
    text: "Mustafa Kemal 1896'da Manastır Askerî İdadisi'ne kaydoldu",
    date: { start: "1896", end: null, precision: "year", certainty: "estimated", display: "1896" },
    evidence: [
      { candidateId: "src-2026-0001", relation: "supports" },
      { candidateId: "src-2026-0002", relation: "supports" },
    ],
  };
  const evaluation = evaluateClaim(claim, candidates);
  assert.equal(evaluation.status, "corroborated");
  assert.equal(evaluation.independentInstitutions, 2);
});

test("aynı kurumdan iki kaynak bağımsız sayılmaz", () => {
  const candidates = [
    makeCandidate({ id: "src-2026-0001", institution: "Kurum A", archiveIdentifier: "A-1" }),
    makeCandidate({ id: "src-2026-0002", institution: "Kurum A", archiveIdentifier: "A-1" }),
  ];
  const claim = {
    id: "claim-002",
    text: "Test iddiası",
    date: { start: "1896", end: null, precision: "year", certainty: "estimated", display: "1896" },
    evidence: [
      { candidateId: "src-2026-0001", relation: "supports" },
      { candidateId: "src-2026-0002", relation: "supports" },
    ],
  };
  const evaluation = evaluateClaim(claim, candidates);
  assert.equal(evaluation.independentInstitutions, 1);
  assert.ok(evaluation.notes.some((note) => note.code === "DEPENDENT_EVIDENCE"));
});

test("kanıt yoksa iddia 'unverified' kalır", () => {
  const claim = {
    id: "claim-003",
    text: "Kanitsiz iddia",
    date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "?" },
    evidence: [],
  };
  const evaluation = evaluateClaim(claim, []);
  assert.equal(evaluation.status, "unverified");
});

test("çelişkili bilgi: karşıt kanıt 'contested' üretir ve otomatik çözülmez", () => {
  const candidates = [
    makeCandidate({ id: "src-2026-0001", institution: "Kurum A", archiveIdentifier: "A-1" }),
    makeCandidate({ id: "src-2026-0002", institution: "Kurum B", archiveIdentifier: "B-1" }),
  ];
  const claim = {
    id: "claim-004",
    text: "Mustafa Kemal 1896'da Manastır Askerî İdadisi'ne kaydoldu",
    date: { start: "1896", end: null, precision: "year", certainty: "estimated", display: "1896" },
    evidence: [
      { candidateId: "src-2026-0001", relation: "supports" },
      { candidateId: "src-2026-0002", relation: "contradicts" },
    ],
  };
  const evaluation = evaluateClaim(claim, candidates);
  assert.equal(evaluation.status, "contested");
  assert.equal(evaluation.conflicts.length, 1);
  assert.match(evaluation.conflicts[0].message, /otomatik olarak çözülmez|insan incelemesi gerekir/);
});

test("çelişkili tarih bilgisi: benzer iddialarda farklı tarihler işaretlenir", () => {
  const claims = [
    {
      id: "claim-001",
      text: "Mustafa Kemal 1896'da Manastır Askerî İdadisi'ne kaydoldu",
      date: { start: "1896", end: null, precision: "year", certainty: "estimated", display: "1896" },
      evidence: [],
    },
    {
      id: "claim-002",
      text: "Mustafa Kemal 1897'de Manastır Askerî İdadisi'ne kaydoldu",
      date: { start: "1897", end: null, precision: "year", certainty: "estimated", display: "1897" },
      evidence: [],
    },
  ];
  const conflicts = findDateConflicts(claims);
  assert.equal(conflicts.length, 1);
  assert.match(conflicts[0].note, /farklı tarihler/);
});

test("provenans zinciri: kayıt → iddia → kaynak → kurum → özgün belge", () => {
  const candidates = [makeCandidate({ id: "src-2026-0001" })];
  const claim = {
    id: "claim-001",
    text: "Test",
    date: { start: "1896", end: null, precision: "year", certainty: "estimated", display: "1896" },
    evidence: [{ candidateId: "src-2026-0001", relation: "supports" }],
  };
  const chain = provenanceChain("arşiv-kayıt-1", claim, candidates);
  assert.equal(chain.record, "arşiv-kayıt-1");
  assert.equal(chain.claim.id, "claim-001");
  assert.equal(chain.sources[0].institution, candidates[0].institution);
  assert.ok(chain.sources[0].originalDocument.url);
  assert.match(chain.note, /otomatik doğruluk kararı içermez/);
});
