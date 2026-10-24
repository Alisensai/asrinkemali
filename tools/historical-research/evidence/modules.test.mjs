import test from "node:test";
import assert from "node:assert/strict";
import { classifyEvidenceRelation, independentGroups } from "./independence.mjs";
import { findDateContradictions, validateContradictionCandidate, resolveContradictionCandidate } from "./contradictions.mjs";
import { toChicago, toApa, toBibtex, toCslJson, toMarkdownEntry, missingFields, csvSafeCell, metadataFromCandidate } from "./bibliography.mjs";
import { createNote, updateNote, validateNote, exportNotesJson, exportNotesMarkdown } from "./notebook.mjs";
import { buildGraph, neighbors, validateGraph, graphStats } from "./graph.mjs";
import { classifyRecord, coverageAnalysis } from "./coverage.mjs";
import { auditCandidate, validateAudit } from "./quality.mjs";
import { createAuthorityRegistryAdapter, createResearchReviewService, createSearchAdapter } from "./adapters.mjs";

/** Test kanıtı üreticisi. */
function evidence(id, claimId, overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id,
    claimId,
    claimVersion: 1,
    candidateId: null,
    relation: "supports",
    locator: {
      url: `https://k.gov.tr/${id}`,
      title: `Kaynak ${id}`,
      author: null,
      institution: "Kurum A",
      page: null,
      section: null,
      locator: null,
    },
    shortQuote: null,
    accessDate: "2026-10-23",
    supportAssessment: { assessed: false, actuallySupports: null, method: null, note: null },
    verificationLevel: "unverified",
    humanReview: { reviewed: false, reviewer: null, reviewedAt: null },
    synthetic: true,
    ...overrides,
  };
}

test("bağımsızlık: aynı kurum iki bağımsız kanıt sayılmaz", () => {
  const a = evidence("ev-i1", "claim-i");
  const b = evidence("ev-i2", "claim-i");
  const relation = classifyEvidenceRelation(a, b);
  assert.equal(relation.type, "same_original_work");
  const groups = independentGroups([a, b]);
  assert.equal(groups.groups.length, 1, "aynı kurum → tek grup");
});

test("bağımsızlık: farklı kurum + çok benzer başlık kopya şüphesi (belirsiz)", () => {
  const a = evidence("ev-i3", "claim-i", { locator: { url: "https://a.gov.tr/x", title: "Trablusgarp Savaşı Madde", author: null, institution: "Kurum A", page: null, section: null, locator: null } });
  const b = evidence("ev-i4", "claim-i", { locator: { url: "https://b.gov.tr/y", title: "Trablusgarp Savaşı Madde", author: null, institution: "Kurum B", page: null, section: null, locator: null } });
  const relation = classifyEvidenceRelation(a, b);
  assert.equal(relation.type, "copy_republication");
  assert.equal(relation.uncertain, true);
  const groups = independentGroups([a, b]);
  assert.equal(groups.groups.length, 2, "belirsiz ilişki birleştirmez");
});

test("bağımsızlık: farklı kurum + farklı başlık → bağımsızlık KANITLANMADI", () => {
  const a = evidence("ev-i5", "claim-i", { locator: { url: "https://a.gov.tr/x", title: "Başlık A", author: null, institution: "Kurum A", page: null, section: null, locator: null } });
  const b = evidence("ev-i6", "claim-i", { locator: { url: "https://b.gov.tr/y", title: "Başlık B", author: null, institution: "Kurum B", page: null, section: null, locator: null } });
  const relation = classifyEvidenceRelation(a, b);
  assert.equal(relation.type, "unknown");
  assert.equal(relation.uncertain, true, "bağımsızlık belirsizliği açıkça gösterilir");
});

test("çelişki: farklı kesin tarih aralıkları aday üretir (kesin kararsız)", () => {
  const claim = {
    schemaVersion: "2.0.0", id: "claim-c", currentVersion: 1,
    revisions: [{ version: 1, text: "Test", dateRange: null, evidenceIds: ["ev-c1", "ev-c2"], revisionNote: "ilk", supersededAt: null, createdAt: "2026-10-23T00:00:00.000Z" }],
    status: "new", category: "genel", relatedPeople: [], relatedPlaces: [], relatedEvents: [], uncertaintyNote: null, createdAt: "2026-10-23T00:00:00.000Z", updatedAt: "2026-10-23T00:00:00.000Z",
  };
  const a = evidence("ev-c1", "claim-c", { dateRange: { start: "1918-06-30", end: "1918-07-28", certainty: "exact", display: "30 Haziran – 28 Temmuz 1918" } });
  const b = evidence("ev-c2", "claim-c", { dateRange: { start: "1918-06-30", end: "1918-07-27", certainty: "exact", display: "30 Haziran – 27 Temmuz 1918" } });
  const candidates = findDateContradictions(claim, [a, b]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].status, "needs_review");
  assert.deepEqual(candidates[0].evidenceIds, ["ev-c1", "ev-c2"]);
  // otomatik 'kesin çelişki' reddi
  const bad = { ...candidates[0], status: "confirmed" };
  const validation = validateContradictionCandidate(bad);
  assert.ok(validation.issues.some((issue) => issue.code === "AUTO_CONFIRMED"));
  // yalnızca insan kararıyla kapanır
  const resolved = resolveContradictionCandidate(candidates[0], "dismissed");
  assert.equal(resolved.status, "dismissed");
  assert.throws(() => resolveContradictionCandidate(candidates[0], "confirmed"), /kararı verilemez/);
});

test("çelişki: belirsiz aralıklar aday ÜRETMEZ", () => {
  const claim = {
    schemaVersion: "2.0.0", id: "claim-c2", currentVersion: 1,
    revisions: [{ version: 1, text: "Test", dateRange: null, evidenceIds: ["ev-d1", "ev-d2"], revisionNote: "ilk", supersededAt: null, createdAt: "2026-10-23T00:00:00.000Z" }],
    status: "new", category: "genel", relatedPeople: [], relatedPlaces: [], relatedEvents: [], uncertaintyNote: null, createdAt: "2026-10-23T00:00:00.000Z", updatedAt: "2026-10-23T00:00:00.000Z",
  };
  const a = evidence("ev-d1", "claim-c2", { dateRange: { start: "1918", end: "1918", certainty: "estimated", display: "1918 (yaklaşık)" } });
  const b = evidence("ev-d2", "claim-c2", { dateRange: { start: "1917", end: "1919", certainty: "estimated", display: "1917–1919" } });
  const candidates = findDateContradictions(claim, [a, b]);
  assert.equal(candidates.length, 0, "belirsiz/kesin olmayan aralıklar çelişki adayı üretmez");
});

test("kaynakça: eksik alan uydurulmaz ve işaretlenir", () => {
  const meta = metadataFromCandidate(
    { candidateId: "x", title: "Test Maddesi", institution: "Atatürk Ansiklopedisi", url: "https://k.gov.tr/x", sourceNature: "secondary" },
    { authors: [], publishedAt: null }
  );
  assert.equal(meta.author, null);
  assert.equal(meta.year, null);
  const missing = missingFields(meta);
  assert.ok(missing.includes("author"));
  assert.ok(missing.includes("year"));
  const chicago = toChicago(meta);
  assert.ok(chicago.includes("[eksik: yazar]"), "eksik yazar açıkça görünmeli");
  assert.ok(chicago.includes("[eksik: yıl]"));
  const apa = toApa(meta);
  assert.ok(apa.includes("[eksik: yıl]"));
});

test("kaynakça: BibTeX kaçışlama ve Türkçe karakter", () => {
  const meta = {
    author: "Şerafettin {Turan} ve @Ali", title: "Atatürk maddesi", year: "2020", publisher: null, platform: "Atatürk Ansiklopedisi", url: "https://k.gov.tr/x", accessDate: null, sourceNature: "secondary",
  };
  const bibtex = toBibtex(meta, "turan2020");
  assert.ok(bibtex.includes("\\{"));
  assert.ok(bibtex.includes("Şerafettin"), "Türkçe karakter korunur");
  const csl = toCslJson(meta);
  assert.equal(csl.title, "Atatürk maddesi");
});

test("kaynakça: CSV formül enjeksiyonu koruması", () => {
  assert.equal(csvSafeCell("=HYPERLINK(...)"), "'=HYPERLINK(...)");
  assert.equal(csvSafeCell("+1-1"), "'+1-1");
  assert.equal(csvSafeCell("@cmd"), "'@cmd");
  assert.equal(csvSafeCell("normal metin"), "normal metin");
});

test("not defteri: yorum ve kaynak alıntısı ayrımı + dışa aktarma", () => {
  const note = createNote({ id: "note-1", kind: "commentary", author: "Araştırmacı", text: "Bu kaynak iddiayı tam olarak desteklemiyor gibi görünüyor; pasaj yeniden okunmalı." });
  const updated = updateNote(note, "Güncellenmiş yorum.", "pasaj yeniden okundu");
  assert.equal(updated.history.length, 2);
  const quotation = createNote({ id: "note-2", kind: "source_quotation", author: "Araştırmacı", text: "Sayfada geçen ifade: \"Mustafa Kemal 1912'de Derne'de görevlendirildi.\"" });
  const md = exportNotesMarkdown([updated, quotation]);
  assert.ok(md.includes("Kaynak alıntısı"));
  assert.ok(md.includes("Yorum"));
  assert.ok(md.includes("güvenilir tarihî bilgi DEĞİLDİR"));
  const json = exportNotesJson([updated]);
  const parsed = JSON.parse(json);
  assert.equal(parsed.count, 1);
  // approval türü yok
  const bad = { ...note, kind: "approval" };
  const validation = validateNote(bad);
  assert.ok(validation.issues.some((issue) => issue.code === "INVALID_KIND"));
});

test("graf: mentions supports'a dönüştürülmez; sürüm dışı kenar needs_review", () => {
  const claims = [
    {
      schemaVersion: "2.0.0", id: "claim-g", currentVersion: 2,
      revisions: [
        { version: 1, text: "Eski", dateRange: null, evidenceIds: ["ev-g1"], revisionNote: "ilk", supersededAt: "2026-10-23T00:00:00.000Z", createdAt: "2026-10-23T00:00:00.000Z" },
        { version: 2, text: "Yeni", dateRange: null, evidenceIds: ["ev-g2"], revisionNote: "düzeltme", supersededAt: null, createdAt: "2026-10-23T00:00:00.000Z" },
      ],
      status: "new", category: "genel", relatedPeople: [], relatedPlaces: [], relatedEvents: [], uncertaintyNote: null, createdAt: "2026-10-23T00:00:00.000Z", updatedAt: "2026-10-23T00:00:00.000Z",
    },
  ];
  const evidenceRecords = [
    evidence("ev-g1", "claim-g", { claimVersion: 1, relation: "mentions" }),
    evidence("ev-g2", "claim-g", { claimVersion: 2, relation: "mentions" }),
  ];
  const graph = buildGraph(claims, evidenceRecords);
  const stats = graphStats(graph);
  assert.equal(stats.byType.needs_review, 1, "eski sürüm kenarı needs_review olur");
  assert.equal(stats.byType.mentions, 1, "mentions mentions kalır (supports'a dönmez)");
  const validation = validateGraph(graph);
  assert.equal(validation.ok, true);
  // asılı kenar reddi
  const badGraph = { nodes: [], edges: [{ from: "claim:x", to: "evidence:y", type: "supports", evidenceId: null, claimVersion: 1 }] };
  const badValidation = validateGraph(badGraph);
  assert.ok(badValidation.issues.some((issue) => issue.code === "DANGLING_EDGE"));
});

test("kapsam: mekân kuruluşu biyografik SAYILMAZ", () => {
  const place = classifyRecord({ id: "r1", title: "Selanik Şehir Tarihçesi", categories: ["mekan"], people: [], year: 1881 });
  assert.equal(place, "place_history");
  const biography = classifyRecord({ id: "r2", title: "Mustafa Kemal ve Harp Okulu", categories: [], people: ["Mustafa Kemal Atatürk"] });
  assert.equal(biography, "biographic");
  const report = coverageAnalysis([
    { id: "r1", title: "Selanik Şehir Tarihçesi", categories: ["mekan"], people: [], eventYear: 1881 },
    { id: "r2", title: "Mustafa Kemal ve Harp Okulu", categories: [], people: ["Mustafa Kemal Atatürk"], eventYear: 1899 },
  ]);
  assert.equal(report.populations.place_history, 1);
  assert.equal(report.populations.biographic, 1);
  assert.equal(report.byYear.find((row) => row.year === 1881)?.place_history, 1);
});

test("denetim: otomatik hazır/telif bayrağı üretilemez", () => {
  const audit = auditCandidate({
    id: "src-test", title: "Test", institution: "Kurum", url: "https://k.gov.tr/x",
    authors: [], publishedAt: null, verification: { urlReachable: true }, state: "awaiting_human_review", sourceNature: "primary",
  });
  assert.equal(audit.readyForImport, false);
  assert.equal(audit.scores.copyrightClarity, 0, "telif izni asla otomatik doğrulanmaz");
  const bad = { ...audit, readyForImport: true };
  const validation = validateAudit(bad);
  assert.ok(validation.issues.some((issue) => issue.code === "AUTO_READY"));
});

test("adaptörler: registry yoksa kimlik uydurulmaz; mock karar reddedilir", async () => {
  const registry = createAuthorityRegistryAdapter();
  const id = await registry.resolve("person", "Mustafa Kemal Atatürk");
  assert.equal(id, null, "kimlik uydurulmaz");
  assert.equal(registry.available(), false);

  const review = createResearchReviewService({ realAuthorizationConfigured: false });
  assert.equal(review.isRealAuthorizationConfigured(), false);
  await assert.rejects(
    review.createDecision({ claimId: "claim-1", claimVersion: 1, decision: "approve", rationale: "test" }),
    /gerçek kimlik/
  );

  const search = createSearchAdapter();
  const results = await search.search({ query: "deneme", maxResults: 5 });
  assert.deepEqual(results, [], "uydurma sonuç üretmez");
  assert.equal(search.available(), false);
});
