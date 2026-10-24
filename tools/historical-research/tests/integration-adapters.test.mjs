/**
 * Görev 07 — isteğe bağlı modül adaptörleri ve sürüm/çalışma alanı güvenliği (QA-106, QA-107, QA-114, QA-115).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { createAuthorityResolver, loadSourceReliabilityAdapter, mapReliabilityClass } from "../lib/integration/optional-adapters.mjs";
import { REAL_ROOT } from "./fixture-repo.mjs";
import { makeCandidate } from "./helpers.mjs";

test("QA-107 Source Reliability (PR #20) yoksa güvenli degrade", async () => {
  const adapter = await loadSourceReliabilityAdapter({ root: REAL_ROOT });
  assert.equal(adapter.available, false);
  assert.deepEqual(adapter.classify(makeCandidate()), { state: "unavailable" });
});

test("QA-107 Source Reliability varsa sınıf eşlemesi açık uyarıyla yapılır; puan tarihsel doğruluk değildir", async () => {
  const adapter = await loadSourceReliabilityAdapter({ root: REAL_ROOT, importer: async () => ({ classifySource: () => ({ classification: "reference" }) }) });
  const result = adapter.classify(makeCandidate());
  assert.equal(result.suggestedSourceNature, "secondary");
  assert.match(result.warning, /insan kararı/);
  assert.equal(result.qualityScoreIsNotHistoricalAccuracy, true);
  assert.equal(mapReliabilityClass("uydurma").sourceNature, "unknown");
  const broken = await loadSourceReliabilityAdapter({ root: REAL_ROOT, importer: async () => { throw new Error("yüklenemedi"); } });
  assert.equal(broken.available, false);
});

test("QA-106 Authority Registry yoksa çözümleme unresolved; belirsiz eşleşme otomatik seçilmez", () => {
  const none = createAuthorityResolver(null);
  assert.equal(none.resolvePerson("Mustafa Kemal").state, "unresolved");
  const registry = { resolvePerson: () => [{ id: "kisi-b" }, { id: "kisi-a" }], resolvePlace: () => ({ id: "yer-1" }), resolveWork: () => null };
  const resolver = createAuthorityResolver(registry);
  assert.deepEqual(resolver.resolvePerson("Ali Fuat"), { state: "ambiguous", id: null, candidates: ["kisi-a", "kisi-b"], reason: "Birden fazla varlık; otomatik seçilmez." });
  assert.equal(resolver.resolvePlace("Selanik").id, "yer-1");
  assert.equal(resolver.resolveWork("x").state, "unresolved");
  assert.equal(resolver.resolveInstitution("x").state, "unresolved");
});

test("QA-114 paket gizli lockfile veya ek bağımlılık varsaymaz; Node ≥20", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, "tools/historical-research/package.json"), "utf8"));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(fs.existsSync(path.join(REAL_ROOT, "tools/historical-research/package-lock.json")), false);
});

test("QA-115 testlerin geçici dosyaları depoyu kirletmez", () => {
  const exports = path.join(REAL_ROOT, "data/research/candidates/exports");
  const reports = path.join(REAL_ROOT, "tools/historical-research/reports");
  assert.equal(fs.existsSync(reports) && fs.readdirSync(reports).length > 0, false);
  if (fs.existsSync(exports)) assert.deepEqual(fs.readdirSync(exports).filter((name) => !name.startsWith(".")), []);
});
