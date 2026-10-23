import test from "node:test";
import assert from "node:assert/strict";
import { validateCandidate, transitionState, addCandidate, poolSummary } from "../lib/candidates.mjs";
import { CANDIDATE_STATES } from "../lib/types.mjs";
import { makeCandidate } from "./helpers.mjs";

test("aday doğrulama: geçerli aday kabul edilir", () => {
  const result = validateCandidate(makeCandidate());
  assert.equal(result.ok, true);
  assert.equal(result.citationComplete, true);
  assert.equal(result.rightsKnown, true);
});

test("kaynak kalitesi sınıflandırması: birincil/ikincil ayrımı korunur", () => {
  const primary = validateCandidate(makeCandidate({ sourceNature: "primary", documentType: "archive_document" }));
  const secondary = validateCandidate(makeCandidate({ sourceNature: "secondary", documentType: "article" }));
  assert.equal(primary.ok, true);
  assert.equal(secondary.ok, true);
  // nitelik bilinmiyorsa "unknown" kalır; uydurulmaz
  const unknown = makeCandidate({ sourceNature: "unknown" });
  assert.equal(unknown.sourceNature, "unknown");
});

test("eksik künye: yazar/yayın tarihi eksikse 'citationComplete' false olur ve UYDURULMAZ", () => {
  const noAuthor = makeCandidate({ authors: [] });
  const result = validateCandidate(noAuthor);
  assert.equal(result.citationComplete, false);
  // yazar listesi boş bırakılır; sahte yazar eklenmez
  assert.deepEqual(noAuthor.authors, []);

  const noDate = makeCandidate({ publishedAt: null });
  assert.equal(validateCandidate(noDate).citationComplete, false);
});

test("geçersiz aday: hatalı durum ve kimlik reddedilir", () => {
  const bad = makeCandidate({ id: "yanlış-kimlik", state: "yok-olan-durum" });
  const result = validateCandidate(bad);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "BAD_ID"));
  assert.ok(result.issues.some((issue) => issue.code === "BAD_STATE"));
});

test("durum makinesi: 'published' durumu tanımsızdır (yayın kararı üretilemez)", () => {
  assert.equal(CANDIDATE_STATES.includes("published"), false);
  assert.throws(() => transitionState(makeCandidate(), "published"), /Geçersiz aday durumu/);
});

test("durum geçişi: geçmiş kaydı tutulur", () => {
  const candidate = makeCandidate();
  candidate.state = "new";
  transitionState(candidate, "investigating", "kaynak inceleniyor");
  transitionState(candidate, "awaiting_human_review");
  assert.equal(candidate.state, "awaiting_human_review");
  assert.equal(candidate.stateHistory.length, 3); // new + 2 geçiş
  assert.match(candidate.stateHistory[1].note, /new → investigating/);
});

test("havuza ekleme: aynı URL tekrarı reddedilir", () => {
  const pool = [makeCandidate()];
  const duplicateUrl = makeCandidate({ id: "src-2026-0002", archiveIdentifier: "AYK-2" });
  const result = addCandidate(pool, duplicateUrl);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "DUPLICATE_URL"));
});

test("havuza ekleme: aynı kimlik reddedilir", () => {
  const pool = [makeCandidate()];
  const sameId = makeCandidate({ url: "https://example.org/baska" });
  const result = addCandidate(pool, sameId);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "DUPLICATE_ID"));
});

test("havuz özeti: durum ve kurum dağılımı", () => {
  const pool = [
    makeCandidate(),
    makeCandidate({ id: "src-2026-0002", state: "new", institution: "Millî Kütüphane" }),
    makeCandidate({ id: "src-2026-0003", state: "new", synthetic: true }),
  ];
  const summary = poolSummary(pool);
  assert.equal(summary.total, 3);
  assert.equal(summary.synthetic, 1);
  assert.equal(summary.byState.new, 2);
  assert.equal(summary.byInstitution["Millî Kütüphane"], 1);
});

test("sentetik izolasyon: sentetik aday havuzda ayrı işaretlenir", () => {
  const synthetic = makeCandidate({ id: "src-2026-0009", synthetic: true });
  assert.equal(synthetic.synthetic, true);
  const summary = poolSummary([synthetic]);
  assert.equal(summary.synthetic, 1);
  assert.equal(summary.total, 1);
});
