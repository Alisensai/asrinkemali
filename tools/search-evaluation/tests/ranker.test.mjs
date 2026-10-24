import test from "node:test";
import assert from "node:assert/strict";
import { LocalLexicalRanker, normalizeTurkish, tokenize } from "../src/ranker/local-lexical.mjs";
import { MockExternalReranker } from "../src/ranker/reranker.mjs";

test("ranker - normalizeTurkish ve tokenize Türkçe karakterleri düzgün işler", () => {
  assert.equal(normalizeTurkish("İSTANBUL"), "istanbul");
  assert.equal(normalizeTurkish("Çankaya'da"), "cankayada");
  assert.deepEqual(tokenize("Cumhuriyetin İlanı (1923)"), ["cumhuriyetin", "ilani", "1923"]);
});

test("ranker - ReDoS koruması: tehlikeli RegExp karakterleri içeren sorgular güvenle işlenir", () => {
  const dummy = [
    { id: "rec-1", title: "Lozan Barış Antlaşması", status: "published" },
    { id: "rec-2", title: "TBMM Zabıt Ceridesi", status: "published" },
  ];
  const ranker = new LocalLexicalRanker(dummy);

  // Kötü niyetli regex karakterleri: [.*+?^${}()|[\]\\]
  const maliciousQuery = ".*+?^${}()|[]\\ Lozan (.*)*";
  const start = Date.now();
  const results = ranker.rank(maliciousQuery);
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 20, "ReDoS enjeksiyonu anında tamamlanmalıdır (< 20ms)");
  assert.ok(results.includes("rec-1"), "Lozan dokümanı başarıyla bulunmalıdır");
});

test("ranker - publishedOnly filtresi taslak kayıtları hariç tutar", () => {
  const dummy = [
    { id: "pub-1", title: "Açık Belge", verification: { status: "published" } },
    { id: "draft-1", title: "Taslak Belge", verification: { status: "draft" } },
  ];
  const ranker = new LocalLexicalRanker(dummy);

  const results = ranker.rank("Belge", { publishedOnly: true });
  assert.equal(results.length, 1);
  assert.equal(results[0], "pub-1");
});

test("ranker - MockExternalReranker simülasyon ve fallback davranışını doğru etiketler", async () => {
  const reranker = new MockExternalReranker({ shouldFail: false });
  const map = new Map([
    ["id-1", { id: "id-1", title: "Nutuk" }],
    ["id-2", { id: "id-2", title: "Gençliğe Hitabe" }],
  ]);

  const res = await reranker.rerank("Nutuk", ["id-2", "id-1"], map);
  assert.equal(res.providerType, "external_mock");
  assert.equal(res.measuredAs, "simulated");
  assert.equal(res.usedFallback, false);
  assert.equal(res.rankedIds[0], "id-1"); // Nutuk başlığı eşleştiği için 1. sıraya geçti

  // Hata durumunda fallback kontrolü
  const failingReranker = new MockExternalReranker({ shouldFail: true });
  const resFail = await failingReranker.rerank("Nutuk", ["id-2", "id-1"], map);
  assert.equal(resFail.usedFallback, true);
  assert.equal(resFail.failureClass, "SIMULATED_NETWORK_TIMEOUT");
});
