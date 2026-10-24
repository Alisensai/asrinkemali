import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, validatePublication } from "../lib/publishing/model.ts";
import { planScheduledPublications, recordPublication, withArchiveReferenceGate } from "../lib/publishing/scheduler.ts";
import { classifyError, logEvent, redact } from "../lib/server/log.ts";

// MKA FORTRESS yayın motoru saldırı senaryoları (dry-run; hiçbir şey yayımlanmaz).
const now = "2026-10-23T12:00:00Z";
const approval = { kind: "human", approvedBy: "Sorumlu editör", approvedAt: "2026-10-22T10:00:00Z" };
const pub = (overrides = {}) => ({ schemaVersion: "1.0.0", id: "yazi-001", slug: "yazi-001", kind: "sourced_article", title: "Başlık", summary: "Özet", body: [{ type: "paragraph", text: "Metin" }], category: "Tarih", tags: [], authors: ["Yazar"], bibliography: [{ id: "arsiv-001", title: "Kaynak", institution: "Kurum", url: "https://kurum.gov.tr/x", accessedAt: "2026-10-23" }], relatedArchiveIds: ["arsiv-001"], rights: { license: "CC BY 4.0", holder: "Yazar", note: "Atıf" }, status: "scheduled", approval, scheduledAt: "2026-10-23T10:00:00Z", publishedAt: null, automation: null, createdAt: "2026-10-21T09:00:00Z", updatedAt: "2026-10-22T09:00:00Z", ...overrides });

test("onaysız, zamanlanmamış, kaynaksız ve geçersiz tarihli yayın planlanmaz", () => {
  const cases = [pub({ approval: null }), pub({ status: "approved", scheduledAt: null }), pub({ bibliography: [] }), pub({ scheduledAt: "2026-13-45T99:00:00Z" }), pub({ approval: { ...approval, kind: "ai" } })];
  const plan = planScheduledPublications(cases, [], now);
  assert.equal(plan.ready.length, 0); assert.equal(plan.skipped.length, cases.length);
});

test("geçersiz durum geçişleri reddedilir (taslaktan doğrudan yayına geçilemez)", () => {
  for (const [from, to] of [["draft", "published"], ["draft", "scheduled"], ["in_review", "published"], ["published", "draft"], ["published", "scheduled"]]) assert.equal(canTransition(from, to), false, `${from}→${to}`);
});

test("eşzamanlı iki çalışma aynı yazıyı planlasa da defter ikinci yayını reddeder", () => {
  const ledger = [];
  const runA = planScheduledPublications([pub()], ledger, now); const runB = planScheduledPublications([pub()], ledger, now);
  assert.equal(runA.ready.length, 1); assert.equal(runB.ready.length, 1, "planlama tek başına eşzamanlılığı önlemez");
  const first = recordPublication(ledger, runA.ready[0], "2026-10-23T12:00:01Z");
  assert.equal(first.ok, true);
  const second = recordPublication(first.ledger, runB.ready[0], "2026-10-23T12:00:01Z");
  assert.equal(second.ok, false); assert.match(second.reason, /zaten kayıtlı/);
});

test("çökme sonrası yeniden deneme: defter kaydı varsa tekrar planlanmaz; yoksa aynı plan üretilir", () => {
  const before = planScheduledPublications([pub()], [], now);
  const retryWithoutCommit = planScheduledPublications([pub()], [], now);
  assert.deepEqual(retryWithoutCommit, before, "dry-run tekrar üretilebilir");
  const committed = recordPublication([], before.ready[0], now);
  assert.equal(planScheduledPublications([pub()], committed.ledger, now).ready.length, 0);
});

test("silinmiş veya yayından çekilmiş arşiv kaydına bağlı yazı planlanmaz", () => {
  const plan = planScheduledPublications([pub(), pub({ id: "yazi-002", slug: "yazi-002", relatedArchiveIds: ["silinmis-kayit"] })], [], now);
  const gated = withArchiveReferenceGate(plan, [pub(), pub({ id: "yazi-002", slug: "yazi-002", relatedArchiveIds: ["silinmis-kayit"] })], new Set(["arsiv-001"]));
  assert.deepEqual(gated.ready.map((item) => item.publicationId), ["yazi-001"]);
  assert.match(gated.skipped.at(-1).reason, /silinmiş/);
});

test("bozuk yayın girdileri çökme yerine doğrulama hatası üretir", () => {
  for (const broken of [undefined, [], { status: "scheduled", approval: "evet" }, { ...pub(), body: [{ type: "script", text: "<script>" }] }]) assert.equal(validatePublication(broken).ok, false);
});

test("günlük redaksiyonu: hassas anahtarlar ve değer desenleri gizlenir", () => {
  const lines = [];
  const fakeToken = ["gh", "p_", "A".repeat(36)].join("");
  logEvent("error", "test", { password: "x", nested: { Authorization: "Bearer abcdef123456", note: `belirteç ${fakeToken} sızdı` }, cookie: "s=1", safe: "görünür" }, (line) => lines.push(line));
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.password, "[REDACTED]"); assert.equal(entry.cookie, "[REDACTED]"); assert.equal(entry.nested.Authorization, "[REDACTED]");
  assert.equal(entry.nested.note, "belirteç [REDACTED] sızdı"); assert.equal(entry.safe, "görünür");
  assert.equal(redact("Bearer abc.def.ghi-token"), "[REDACTED]");
});

test("hata sınıflandırması veri, yapılandırma, bağımlılık ve iç hatayı ayırır", () => {
  assert.equal(classifyError(new SyntaxError("Unexpected token in JSON")), "data");
  assert.equal(classifyError(Object.assign(new Error("yok"), { code: "ENOENT" })), "config");
  assert.equal(classifyError(Object.assign(new Error("bağlantı"), { code: "ECONNREFUSED" })), "dependency");
  assert.equal(classifyError(new Error("beklenmeyen")), "internal");
});
