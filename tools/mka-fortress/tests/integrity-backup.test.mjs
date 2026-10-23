import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createBackup, restoreBackup, verifyBackup } from "../backup.mjs";
import { buildManifest, checkIntegrity, diffManifests } from "../integrity.mjs";
import { approvedRecordIds, canonicalJson, isSafeHttpsUrl, loadArchive, recordHash } from "../lib/common.mjs";

// Tüm testler geçici dizinlerde sentetik kayıtlarla çalışır; gerçek arşive yazılmaz.
function record(id, overrides = {}) {
  return { schemaVersion: "1.1.0", id, slug: id, title: id, type: "event", date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" }, source: { url: `https://kurum.example.gov.tr/kayit/${id}`, institution: "Kurum" }, provenance: [{ url: `https://kurum.example.gov.tr/kayit/${id}` }], rights: { status: "official_link_only", imageReuse: "link_only" }, verification: { status: "published" }, relatedIds: [], ...overrides };
}
function fixture(records) {
  const root = mkdtempSync(path.join(tmpdir(), "mka-fortress-"));
  mkdirSync(path.join(root, "data/archive/catalog"), { recursive: true });
  for (const item of records) writeFileSync(path.join(root, "data/archive/catalog", `${item.slug}.json`), JSON.stringify(item, null, 2));
  return root;
}
const cleanup = (...dirs) => { for (const dir of dirs) rmSync(dir, { recursive: true, force: true }); };

test("kanonik özet anahtar sırasından ve biçimden bağımsızdır, içerik değişince değişir", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: [1, "x"] } }), canonicalJson({ a: { c: [1, "x"], d: 2 }, b: 1 }));
  assert.equal(recordHash(record("a")), recordHash(JSON.parse(JSON.stringify(record("a"), null, 4))));
  assert.notEqual(recordHash(record("a")), recordHash(record("a", { title: "değişti" })));
});

test("güvenli URL: https, host zorunlu; kimlik bilgisi, boşluk ve başka protokol reddedilir", () => {
  assert.equal(isSafeHttpsUrl("https://kurum.gov.tr/x"), true);
  for (const url of ["http://kurum.gov.tr", "javascript:alert(1)", "https://u:p@kurum.gov.tr", "https://kurum .gov.tr", "https://", null, 42]) assert.equal(isSafeHttpsUrl(url), false, String(url));
});

test("bütünlük denetimi: yinelenen kimlik, kopuk ilişki, güvensiz URL ve yayın sınırı ihlalini yakalar", () => {
  const root = fixture([record("a", { relatedIds: ["yok"] }), record("b", { source: { url: "http://guvensiz.example" }, provenance: [] }), record("c", { verification: { status: "reviewed" } }), record("d", { relatedIds: ["c"] })]);
  try {
    const result = checkIntegrity(loadArchive({ root }));
    const codes = result.errors.map((error) => error.code);
    for (const code of ["DANGLING_RELATION", "UNSAFE_SOURCE_URL", "PROVENANCE_MISSING_SOURCE", "PUBLISHED_RELATES_TO_UNPUBLISHED"]) assert.ok(codes.includes(code), code);
    assert.equal(result.ok, false);
    assert.equal(result.info.publishedWithoutHumanApproval, 3, "teknik published insan onayı sayılmaz");
  } finally { cleanup(root); }
});

test("bozuk JSON ve dosya adı–slug uyumsuzluğu hata verir", () => {
  const root = fixture([record("a")]);
  try {
    writeFileSync(path.join(root, "data/archive/catalog/bozuk.json"), "{ eksik");
    writeFileSync(path.join(root, "data/archive/catalog/yanlis-ad.json"), JSON.stringify(record("dogru-ad")));
    const codes = checkIntegrity(loadArchive({ root })).errors.map((error) => error.code);
    assert.ok(codes.includes("JSON_PARSE")); assert.ok(codes.includes("FILE_SLUG_MISMATCH"));
  } finally { cleanup(root); }
});

test("link-only görselin kaynağı ham medya dosyasıysa uyarı verir ve kurumsal sayfayı önerir", () => {
  const root = fixture([record("foto", { type: "photograph", source: { url: "https://cdn.kurum.gov.tr/foto/2.jpg" }, provenance: [{ url: "https://cdn.kurum.gov.tr/foto/2.jpg" }], image: { sourcePageUrl: "https://kurum.gov.tr/fotograf" } })]);
  try {
    const warning = checkIntegrity(loadArchive({ root })).warnings.find((item) => item.code === "LINK_ONLY_SOURCE_IS_MEDIA_FILE");
    assert.equal(warning?.suggestion, "https://kurum.gov.tr/fotograf");
  } finally { cleanup(root); }
});

test("değişiklik raporu: eklenen, silinen, kaynak alan adı değişen ve onaylı kayıt değişikliği", () => {
  const before = buildManifest({ records: [record("a"), record("b"), record("c")].map((item) => ({ file: `x/${item.slug}.json`, record: item })) }, { ledgerIds: new Set(["b"]) });
  const after = buildManifest({ records: [record("a", { source: { url: "https://baska-alan.example/a" } }), record("b", { title: "onaydan sonra değişti" }), record("e")].map((item) => ({ file: `x/${item.slug}.json`, record: item })) }, { ledgerIds: new Set(["b"]) });
  const report = diffManifests(before, after, { massThreshold: 0.5 });
  const byId = Object.fromEntries(report.changes.map((change) => [change.id, change]));
  assert.equal(byId.a.sourceHostChanged, true);
  assert.equal(byId.b.reReviewRequired, true, "insan onaylı kayıt değişince yeniden inceleme gerekir");
  assert.equal(byId.c.kind, "removed"); assert.equal(byId.e.kind, "added");
  assert.equal(report.massChange, true, "4 değişiklik / 3 kayıt > %50 eşik");
});

test("izin dosyası beklenen değişikliği ayırır; gerekçesiz izin sayılmaz", () => {
  const base = buildManifest({ records: [record("a"), record("b")].map((item) => ({ file: item.slug, record: item })) });
  const now = buildManifest({ records: [record("a", { title: "x" }), record("b", { title: "y" })].map((item) => ({ file: item.slug, record: item })) });
  const report = diffManifests(base, now, { allow: { a: "PR #99 kaynak düzeltmesi (editör onaylı)", b: "ok" } });
  assert.equal(report.changes.find((change) => change.id === "a").authorized, true);
  assert.equal(report.changes.find((change) => change.id === "b").authorized, false);
  assert.equal(report.unexpected, 1);
});

test("onay defteri yalnız insan rollerini onay sayar", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mka-ledger-"));
  try {
    const file = path.join(dir, "ledger.jsonl");
    writeFileSync(file, [{ record_id: "a", event_type: "editor_approval_recorded", actor_role: "human_editor" }, { record_id: "b", event_type: "editor_approval_recorded", actor_role: "ai_agent" }, { record_id: "c", event_type: "review_submitted", actor_role: "human_expert" }].map((event) => JSON.stringify(event)).join("\n"));
    assert.deepEqual([...approvedRecordIds(file)].sort(), ["a", "c"]);
  } finally { cleanup(dir); }
});

test("yedek: oluştur → doğrula → bozulmayı yakala → yalıtılmış geri yükle", () => {
  const root = fixture([record("a"), record("b")]);
  const work = mkdtempSync(path.join(tmpdir(), "mka-backup-"));
  try {
    const backup = path.join(work, "yedek");
    const manifest = createBackup(backup, { root, scope: ["data/archive/catalog"] });
    assert.equal(manifest.fileCount, 2);
    assert.equal(verifyBackup(backup).ok, true);

    const dry = restoreBackup(backup, path.join(work, "hedef-dry"), { root });
    assert.equal(dry.dryRun, true); assert.equal(dry.fileCount, 2);
    const applied = restoreBackup(backup, path.join(work, "hedef"), { root, apply: true });
    assert.equal(applied.restoredVerified, 2);
    assert.equal(readFileSync(path.join(work, "hedef/data/archive/catalog/a.json"), "utf8"), readFileSync(path.join(root, "data/archive/catalog/a.json"), "utf8"));

    writeFileSync(path.join(backup, "data/archive/catalog/a.json"), "{ bozuk");
    const broken = verifyBackup(backup);
    assert.equal(broken.ok, false); assert.equal(broken.problems[0].code, "HASH_MISMATCH");
    assert.equal(restoreBackup(backup, path.join(work, "hedef-2"), { root, apply: true }).applied, false, "bozuk yedek geri yüklenmez");
  } finally { cleanup(root, work); }
});

test("yedek araçları depo içine veya dolu dizine yazmayı reddeder; manifest kurcalanması yakalanır", () => {
  const root = fixture([record("a")]);
  const work = mkdtempSync(path.join(tmpdir(), "mka-backup-"));
  try {
    assert.throws(() => createBackup(path.join(root, "yedek"), { root, scope: ["data/archive/catalog"] }), /depo içinde/);
    writeFileSync(path.join(work, "dolu.txt"), "x");
    assert.throws(() => createBackup(work, { root, scope: ["data/archive/catalog"] }), /boş olmalı/);
    const backup = path.join(work, "y");
    createBackup(backup, { root, scope: ["data/archive/catalog"] });
    const manifestPath = path.join(backup, "backup-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")); manifest.fileCount = 99; writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.ok(verifyBackup(backup).problems.some((problem) => problem.code === "MANIFEST_TAMPERED"));
  } finally { cleanup(root, work); }
});
