import assert from "node:assert/strict";
import test from "node:test";
import { areRecommendationsEnabled } from "../lib/recommendations/feature-flag.ts";
import { getRecommendations } from "../lib/recommendations/recommender.ts";

const record = (id, overrides = {}) => ({
  id, slug: id, title: id, type: "document", date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
  people: [], locations: [], categories: ["cumhuriyet"], summary: "Sentetik test kaydı.", source: { institution: "ATAM", institutionType: "institutional", institutionUrl: "https://atam.gov.tr", title: "Kaynak", url: "https://atam.gov.tr/kaynak", accessedAt: "2026-10-24" }, provenance: [], rights: { status: "unknown", imageReuse: "not_downloaded", note: "Test" }, image: null, verification: { status: "published", reviewedBy: null, reviewedAt: null, checks: { schema: false, source: false, rights: false, date: false, quote: false, image: false }, notes: "" }, tags: ["tarih"], createdAt: "2026-10-24T00:00:00.000Z", updatedAt: "2026-10-24T00:00:00.000Z", ...overrides,
});

test("açık ilgili kimlik en yüksek gerekçeli öneriyi üretir", () => {
  const target = record("hedef", { relatedIds: ["bagli"] });
  const related = record("bagli", { categories: ["farkli"], tags: [] });
  const result = getRecommendations(target, [target, related]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].recordId, "bagli");
  assert.equal(result.items[0].reasonCodes.includes("explicit_related_id"), true);
});

test("yayında olmayan kayıt öneri sonucu olamaz", () => {
  const target = record("hedef");
  const hidden = record("gizli", { verification: { ...target.verification, status: "reviewed" } });
  assert.equal(getRecommendations(target, [target, hidden]).items.length, 0);
});

test("feature flag yalnız sunucu ortam sözleşmesiyle açılır", () => {
  assert.equal(areRecommendationsEnabled({}), false);
  assert.equal(areRecommendationsEnabled({ ASRIN_RECOMMENDATIONS: "0" }), false);
  assert.equal(areRecommendationsEnabled({ ASRIN_RECOMMENDATIONS: "1" }), true);
});
