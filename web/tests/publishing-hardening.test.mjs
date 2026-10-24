import assert from "node:assert/strict";
import test from "node:test";
import { isPubliclyVisible, validatePublication } from "../lib/publishing/model.ts";
import { planScheduledPublications, publicationIdempotencyKey } from "../lib/publishing/scheduler.ts";
import { isValidMonthDay, prepareTodayBrief } from "../lib/publishing/today.ts";

// V0.6 sağlamlaştırma: yayın motorunun tekrar yayın, onay zamanlaması ve bozuk girdi davranışları.
const now = "2026-10-23T12:00:00Z";
const approval = { kind: "human", approvedBy: "Sorumlu editör", approvedAt: "2026-10-22T10:00:00Z" };
function publication(overrides = {}) { return { schemaVersion: "1.0.0", id: "kaynakli-yazi-001", slug: "kaynakli-yazi-001", kind: "sourced_article", title: "Kaynaklı çalışma", summary: "Arşiv kaynaklarına dayalı çalışma özeti.", body: [{ type: "paragraph", text: "Kaynaklara dayalı içerik." }], category: "Cumhuriyet", tags: [], authors: ["Editör"], bibliography: [{ id: "arsiv-001", title: "Kurumsal kaynak", institution: "Kurum", url: "https://example.org/source", accessedAt: "2026-10-23" }], relatedArchiveIds: ["arsiv-001"], rights: { license: "CC BY 4.0", holder: "Yazar", note: "Atıfla kullanılabilir." }, status: "scheduled", approval, scheduledAt: "2026-10-23T10:00:00Z", publishedAt: null, automation: null, createdAt: "2026-10-21T09:00:00Z", updatedAt: "2026-10-22T09:00:00Z", ...overrides }; }

test("daha önce yayımlanmış kayıt yeni bir zamana alınsa da tekrar yayımlanmaz", () => {
  const first = publication();
  const ledger = [{ idempotencyKey: publicationIdempotencyKey(first), publicationId: first.id, publishedAt: "2026-10-23T10:00:05Z" }];
  const rescheduled = publication({ scheduledAt: "2026-10-23T11:00:00Z" });
  const plan = planScheduledPublications([rescheduled], ledger, now);
  assert.equal(plan.ready.length, 0);
  assert.match(plan.skipped[0].reason, /daha önce yayımlanmış/i);
});

test("aynı çalışmada yinelenen kimlik veya slug iki kez planlanmaz", () => {
  const plan = planScheduledPublications([publication(), publication({ slug: "baska-slug" }), publication({ id: "baska-kimlik" })], [], now);
  assert.deepEqual(plan.ready.map((item) => item.publicationId), ["kaynakli-yazi-001"]);
  assert.equal(plan.skipped.length, 2);
  for (const item of plan.skipped) assert.match(item.reason, /yinelenen/i);
});

test("gelecek tarihli veya zamanlamadan sonra verilmiş insan onayı yayını açmaz", () => {
  const future = planScheduledPublications([publication({ approval: { ...approval, approvedAt: "2026-10-24T09:00:00Z" } })], [], now);
  assert.equal(future.ready.length, 0);
  const afterSchedule = planScheduledPublications([publication({ approval: { ...approval, approvedAt: "2026-10-23T10:30:00Z" } })], [], now);
  assert.equal(afterSchedule.ready.length, 0);
  assert.match(afterSchedule.skipped[0].reason, /onay/i);
});

test("bozuk yapılı kayıt doğrulamayı ve zamanlayıcıyı çökertmez", () => {
  for (const broken of [null, "metin", {}, { ...publication(), authors: undefined }, { ...publication(), body: "metin" }, { ...publication(), bibliography: [null] }, { ...publication(), rights: null }]) {
    const result = validatePublication(broken);
    assert.equal(result.ok, false);
    assert.equal(isPubliclyVisible(broken), false);
  }
  const plan = planScheduledPublications([null, { status: "scheduled" }, publication()], [], now);
  assert.equal(plan.ready.length, 1);
  assert.equal(plan.skipped.length, 2);
});

test("kaynakça bağlantısı gerçek bir HTTPS adresi olmalıdır", () => {
  for (const url of ["https://", "https:// boşluk.org", "https://kullanici:sifre@example.org/x", "http://example.org", "javascript:alert(1)"]) {
    const result = validatePublication(publication({ status: "draft", approval: null, scheduledAt: null, bibliography: [{ id: "a", title: "b", institution: "c", url, accessedAt: "2026-10-23" }] }));
    assert.equal(result.ok, false, url);
  }
});

test("takvimde olmayan gün reddedilir; 29 Şubat kabul edilir", () => {
  assert.equal(isValidMonthDay(2, 31), false);
  assert.equal(isValidMonthDay(4, 31), false);
  assert.equal(isValidMonthDay(2, 29), true);
  assert.equal(isValidMonthDay(12, 31), true);
  assert.throws(() => prepareTodayBrief([], 2, 30), /geçerli/);
  assert.doesNotThrow(() => prepareTodayBrief([], 2, 29));
});
