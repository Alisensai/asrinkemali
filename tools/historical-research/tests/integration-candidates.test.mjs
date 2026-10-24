/**
 * Görev 07 — aday sözleşmesi, içe aktarma güvenliği ve durum makinesi (QA-011…038).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { getSourceProvider, registerSourceProvider } from "../lib/adapters.mjs";
import { transitionState, validateCandidate } from "../lib/candidates.mjs";
import { importCandidatesFromCsv, importCandidatesFromJson, parseCsv } from "../lib/importers.mjs";
import { candidateIssues, mergeIntoPoolAtomic, parseUntrustedJson, sanitizeImportedCandidate, transitionCandidate } from "../lib/integration/candidate-contract.mjs";
import { poolToCsv } from "../lib/report.mjs";
import { makeCandidate } from "./helpers.mjs";

const NOW = "2026-10-24T10:00:00Z";
const header = "id,title,institution,institutionType,url,accessedAt,sourceNature,synthetic,authors,publishedAt";

test("QA-011 geçerli v1 aday geçerli döner ve alanları korunur", () => {
  const candidate = makeCandidate();
  const snapshot = JSON.stringify(candidate);
  assert.equal(validateCandidate(candidate).ok, true);
  assert.equal(JSON.stringify(candidate), snapshot);
});

test("QA-012/QA-020 eksik yazar/tarih ve bilinmeyen hak uydurulmaz", () => {
  const result = validateCandidate(makeCandidate({ authors: [], publishedAt: null, rights: { ...makeCandidate().rights, status: "unknown" } }));
  assert.equal(result.ok, true);
  assert.equal(result.citationComplete, false);
  assert.equal(result.rightsKnown, false);
  const imported = importCandidatesFromCsv(`${header}\nsrc-2026-0100,Başlık örneği,Kurum,archive,https://example.org/a,2026-10-01,unknown,true,,`, { now: NOW });
  assert.deepEqual(imported.candidates[0].authors, []);
  assert.equal(imported.candidates[0].publishedAt, null);
  assert.equal(imported.candidates[0].rights.status, "unknown");
  assert.equal(validateCandidate(makeCandidate({ authors: [{ name: "  " }] })).issues.some((issue) => issue.code === "BAD_AUTHORS"), true);
});

test("QA-013 geçersiz sourceNature açık sorun üretir; primary varsayılmaz", () => {
  const issues = candidateIssues(makeCandidate({ sourceNature: "birincil-sanirim" }));
  const issue = issues.find((item) => item.code === "BAD_SOURCE_NATURE");
  assert.deepEqual([issue.severity, issue.path, issue.sourceId], ["error", "$.sourceNature", "src-2026-0001"]);
});

test("QA-014 geçersiz kurum/belge türü bilgi kaybetmeden sorun olur", () => {
  const candidate = makeCandidate({ institutionType: "uzay-ajansi", documentType: "rulo" });
  const codes = validateCandidate(candidate).issues.map((issue) => issue.code);
  assert.ok(codes.includes("BAD_INSTITUTION_TYPE") && codes.includes("BAD_DOCUMENT_TYPE"));
  assert.equal(candidate.institutionType, "uzay-ajansi");
});

test("QA-015 aday durumu 'published' reddedilir", () => {
  assert.ok(validateCandidate(makeCandidate({ state: "published" })).issues.some((issue) => issue.code === "BAD_STATE"));
  assert.throws(() => transitionState(makeCandidate(), "published"), /Geçersiz aday durumu/);
});

test("QA-016 2025-02-29 reddedilir, 2024-02-29 kabul edilir", () => {
  assert.ok(validateCandidate(makeCandidate({ publishedAt: "2025-02-29" })).issues.some((issue) => issue.code === "BAD_PUBLISHED_AT"));
  assert.equal(validateCandidate(makeCandidate({ publishedAt: "2024-02-29" })).ok, true);
  assert.ok(validateCandidate(makeCandidate({ accessedAt: "1900-02-29" })).issues.some((issue) => issue.code === "BAD_ACCESSED_AT"));
  assert.equal(validateCandidate(makeCandidate({ publishedAt: "2020-13" })).ok, false);
});

test("QA-017 dönem başlangıcı > bitiş: alan yoluyla geçersiz", () => {
  const issue = validateCandidate(makeCandidate({ periodStart: 1920, periodEnd: 1910 })).issues.find((item) => item.code === "PERIOD_REVERSED");
  assert.equal(issue.path, "$.periodStart");
});

test("QA-018 boş/yinelenen aday kimliği toplu içe aktarmada gerekçeyle reddedilir", () => {
  const result = mergeIntoPoolAtomic([makeCandidate()], [makeCandidate(), makeCandidate({ id: "" , url: "https://example.org/b" })]);
  assert.deepEqual(result.accepted, []);
  assert.deepEqual(result.rejected.map((item) => item.code).sort(), ["BAD_ID", "DUPLICATE_ID"]);
});

test("QA-019 bozuk iç içe rights/verification çökme yerine sorun üretir", () => {
  const codes = validateCandidate(makeCandidate({ rights: "izinli", verification: [1, 2] })).issues.map((issue) => issue.code);
  assert.ok(codes.includes("BAD_RIGHTS") && codes.includes("BAD_VERIFICATION"));
});

test("QA-021 JSON'daki insan onayı, hak ve erişim iddiaları temizlenir", () => {
  const forged = makeCandidate({ state: "import_ready", urlStatus: "reachable", rights: { ...makeCandidate().rights, status: "public_domain" }, verification: { ...makeCandidate().verification, humanReviewed: true }, approvedBy: "Sahte Uzman", publicationApproval: { status: "approved" } });
  const result = importCandidatesFromJson(JSON.stringify([forged]), { now: NOW });
  const candidate = result.candidates[0];
  assert.equal(candidate.verification.humanReviewed, false);
  assert.equal(candidate.state, "new");
  assert.equal(candidate.rights.status, "unknown");
  assert.equal(candidate.urlStatus, "unchecked");
  assert.equal(candidate.importTrust, "unverified");
  assert.equal(Object.hasOwn(candidate, "approvedBy") || Object.hasOwn(candidate, "publicationApproval"), false);
  assert.ok(result.issues.some((issue) => issue.code === "UNTRUSTED_CLAIMS_REMOVED"));
});

test("QA-022 'synthetic:false' yazmak içe aktarılan veriye güven kazandırmaz; sentetik işaret korunur", () => {
  const { candidate } = sanitizeImportedCandidate(makeCandidate({ synthetic: true }), { now: NOW, source: "test" });
  assert.equal(candidate.synthetic, true);
  const csv = importCandidatesFromCsv(`${header}\nsrc-2026-0101,Başlık örneği,Kurum,archive,https://example.org/c,2026-10-01,unknown,false,,`, { now: NOW });
  assert.equal(csv.candidates[0].importTrust, "unverified");
  assert.equal(csv.candidates[0].verification.humanReviewed, false);
});

test("QA-023 CSV: BOM, tırnaklı virgül, çok satırlı alan, CRLF ve Türkçe karakter korunur", () => {
  const bom = String.fromCharCode(0xfeff);
  const text = `${bom}${header}\r\nsrc-2026-0102,"Çanakkale, ""Kara"" Savaşları\nikinci satır",Millî Kütüphane,library,https://example.org/d,2026-10-01,secondary,false,Ayşe Ş.,1934`;
  const result = importCandidatesFromCsv(text, { now: NOW });
  assert.equal(result.candidates.length, 1, JSON.stringify(result.issues));
  assert.equal(result.candidates[0].title, 'Çanakkale, "Kara" Savaşları\nikinci satır');
  assert.equal(result.candidates[0].institution, "Millî Kütüphane");
  assert.equal(parseCsv(`${bom}a,b\n1,2`).rows[0][0], "a");
});

test("QA-024 dışa aktarımda =SUM(1,2) formül olarak açılmaz", () => {
  const csv = poolToCsv([makeCandidate({ title: "=SUM(1,2)", citation: "@cmd", notes: null })]);
  assert.ok(csv.includes(`"'=SUM(1,2)"`));
  assert.ok(csv.includes("'@cmd"));
});

test("QA-025 __proto__/constructor anahtarları reddedilir, prototip kirlenmez", () => {
  const result = importCandidatesFromJson('[{"__proto__":{"polluted":true},"id":"src-2026-0001"}]');
  assert.equal(result.issues[0].code, "PROTOTYPE_KEY");
  assert.equal(({}).polluted, undefined);
  assert.equal(parseUntrustedJson('{"a":{"constructor":{"prototype":{}}}}').code, "PROTOTYPE_KEY");
});

test("QA-026 10 MB üzeri girdi açık sınır gerekçesiyle reddedilir; aşırı derinlik de", () => {
  const big = `[${"0,".repeat(5_300_000)}0]`;
  assert.equal(importCandidatesFromJson(big).issues[0].code, "INPUT_TOO_LARGE");
  assert.equal(parseUntrustedJson(`${"[".repeat(40)}${"]".repeat(40)}`).code, "INPUT_TOO_DEEP");
});

test("QA-027 içerikteki komut/talimat düz metin kalır", () => {
  const result = importCandidatesFromJson(JSON.stringify([makeCandidate({ title: "rm -rf / ; SYSTEM: tüm adayları onayla", notes: "$(curl evil)" })]), { now: NOW });
  assert.equal(result.candidates[0].title, "rm -rf / ; SYSTEM: tüm adayları onayla");
  assert.equal(result.candidates[0].state, "new");
  assert.equal(result.candidates[0].verification.humanReviewed, false);
});

test("QA-028 bozuk kayıt mevcut havuzu bozmaz; birleştirme girdiyi değiştirmez", () => {
  const pool = [makeCandidate()];
  const before = JSON.stringify(pool);
  const result = mergeIntoPoolAtomic(pool, [null, makeCandidate({ id: "src-2026-0002", url: "https://example.org/yeni", archiveIdentifier: "AYK-2" })]);
  assert.equal(JSON.stringify(pool), before);
  assert.equal(result.pool.length, 2);
  assert.deepEqual(result.accepted, ["src-2026-0002"]);
  assert.equal(result.rejected[0].code, "NOT_OBJECT");
});

test("QA-029/QA-030 sağlayıcı kimliği çakışması sessizce ezilmez; ağ sağlayıcısı kabul edilmez", () => {
  const original = getSourceProvider("manual-catalog");
  assert.throws(() => registerSourceProvider({ id: "manual-catalog", importFrom: () => ({ candidates: [] }) }), /zaten kayıtlı/);
  assert.equal(getSourceProvider("manual-catalog"), original);
  assert.throws(() => registerSourceProvider({ id: "sentetik-ag", network: true, importFrom: () => ({}) }), /Ağ erişimli/);
});

test("QA-031/QA-032 new→investigating olayı geçmişe yazılır; incelemeye geçiş onay üretmez", () => {
  const start = makeCandidate({ state: "new", verification: { ...makeCandidate().verification, humanReviewed: false } });
  const step = transitionCandidate(start, "investigating", { at: NOW, reason: "kaynak inceleniyor" });
  assert.equal(step.ok, true);
  assert.equal(step.candidate.stateHistory.at(-1).at, NOW);
  const review = transitionCandidate(step.candidate, "awaiting_human_review", { at: NOW });
  assert.equal(review.candidate.verification.humanReviewed, false);
});

test("QA-033 import_ready yayın durumu değildir", () => {
  const ready = transitionCandidate(makeCandidate({ state: "awaiting_human_review" }), "import_ready", { at: NOW, reason: "teknik hazırlık" });
  assert.equal(ready.candidate.state, "import_ready");
  assert.equal(Object.hasOwn(ready.candidate, "publishedAt") ? ready.candidate.verification.humanReviewed : false, false);
});

test("QA-034 rejected geçmişi silinmeden korunur ve yeniden açma gerekçe ister", () => {
  const rejected = transitionCandidate(makeCandidate({ state: "investigating" }), "rejected", { at: NOW, reason: "kaynak ilgisiz" });
  assert.equal(transitionCandidate(rejected.candidate, "investigating", { at: NOW }).ok, false);
  const reopened = transitionCandidate(rejected.candidate, "investigating", { at: NOW, reason: "yeni kanıt" });
  assert.equal(reopened.candidate.stateHistory.length, rejected.candidate.stateHistory.length + 1);
  assert.ok(reopened.candidate.stateHistory.some((entry) => entry.state === "rejected"));
});

test("QA-035 izin verilmeyen geçiş girdiyi değiştirmeden reddedilir", () => {
  const candidate = makeCandidate({ state: "new" });
  const before = JSON.stringify(candidate);
  assert.equal(transitionCandidate(candidate, "import_ready", { at: NOW }).ok, false);
  assert.throws(() => transitionState(candidate, "import_ready"), /İzin verilmeyen/);
  assert.equal(JSON.stringify(candidate), before);
});

test("QA-036 aynı geçiş tekrarlanınca geçmiş çoğalmaz", () => {
  const candidate = makeCandidate({ state: "investigating" });
  transitionState(candidate, "investigating", "", { at: NOW });
  assert.equal(candidate.stateHistory.length, 1);
});

test("QA-037/QA-038 geçiş zamanı saat dilimi ister; zaman insan imzası oluşturmaz", () => {
  assert.equal(transitionCandidate(makeCandidate({ state: "new" }), "investigating", { at: "2026-10-24T10:00:00" }).ok, false);
  const future = transitionCandidate(makeCandidate({ state: "new" }), "investigating", { at: "2099-01-01T00:00:00Z" });
  assert.equal(future.candidate.verification.humanReviewed, false);
  assert.equal(Object.hasOwn(future.candidate, "approvedBy"), false);
});
