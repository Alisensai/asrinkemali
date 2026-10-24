import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { toReviewQueueItem } from "../lib/editorial-trust/dto.ts";
import { classifyLegacyForm } from "../lib/editorial-trust/forms.ts";
import { createActorResolver } from "../lib/editorial-trust/identity.ts";
import { evaluateArchiveReviewReadiness } from "../lib/editorial-trust/policy.ts";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");
const record = JSON.parse(readFileSync(path.join(repoRoot, "content/archive/records/anitkabir.json"), "utf8"));
const form = JSON.parse(readFileSync(path.join(repoRoot, "docs/editorial/forms/anitkabir.json"), "utf8"));
const unconfigured = { policy: null, identityConfigured: false, technicalTestsPassed: true, auditIntegrity: null, now: Date.parse("2026-10-24T10:00:00Z") };

test("inceleme DTO'su iç yol, hash veya aktör kimliği sızdırmaz ve 'güvenilir karar yok' der", () => {
  const classification = classifyLegacyForm(form, record);
  const readiness = evaluateArchiveReviewReadiness({ record, sourceFile: "content/archive/records/anitkabir.json", schemaErrors: [], form, formErrors: [], decisions: [] }, unconfigured);
  const dto = toReviewQueueItem(record, classification, readiness, null, { identityConfigured: false, policyConfigured: false });
  const text = JSON.stringify(dto);
  assert.equal(/content\/archive|docs\/editorial|[0-9a-f]{64}|sessionId|actorId/.test(text), false);
  assert.equal(dto.lastTrustedDecision, "güvenilir karar yok");
  assert.equal(dto.releaseReady, false);
  assert.equal(dto.pendingHumanRole, "historian_review");
  assert.match(dto.nextAction, /kimlik sağlayıcısı/);
  const configured = toReviewQueueItem(record, classification, readiness, null, { identityConfigured: true, policyConfigured: true });
  assert.equal(configured.nextAction, "Tarih uzmanı incelemesi");
});

test("üretim bağlantısı kayıtlı sağlayıcı ve politika olmadan kapalıdır; server-only ile korunur", async () => {
  const source = readFileSync(path.join(webRoot, "lib/editorial-trust/server.ts"), "utf8");
  assert.match(source, /^import "server-only";/m);
  // V0.9: değerler tek kaynakta (configuration.ts); server.ts yeniden dışa aktarır.
  assert.match(source, /export \{ ACTIVE_EDITORIAL_POLICY, REGISTERED_IDENTITY_PROVIDER \};/);
  const configuration = readFileSync(path.join(webRoot, "lib/editorial-trust/configuration.ts"), "utf8");
  assert.match(configuration, /REGISTERED_IDENTITY_PROVIDER: TrustedIdentityProvider \| null = null;/);
  assert.match(configuration, /ACTIVE_EDITORIAL_POLICY: EditorialPolicy \| null = null;/);
  assert.deepEqual(await createActorResolver({ provider: null, environment: "production" }).resolve({ headers: { "x-role": "chief_editor" } }), { ok: false, error: "not_configured" });
});

test("Prompt 03 köprüsü: makale revizyonu tek otoriteden gelir, onay iddiası preflight'ı açmaz", async () => {
  const { snapshotHash } = await import("../lib/editorial-trust/canonical.ts");
  const { createPublicationApprovalGateAdapter, hasVerifiedHumanApproval } = await import("../lib/editorial-trust/publication-gate.ts");
  const { computePublicationRevision, runPublicationPreflight } = await import("../lib/publishing-integrations/index.ts");
  const now = "2026-10-24T10:00:00.000Z";
  const article = { schemaVersion: "1.0.0", id: "sentetik-yayin", slug: "sentetik-yayin", kind: "sourced_article", title: "Sentetik", summary: "Sentetik.", body: [{ type: "paragraph", text: "Metin." }], category: "Test", tags: [], authors: ["Sentetik"], bibliography: [{ id: record.id, title: "Kaynak", institution: "Kurum", url: "https://example.org/k", accessedAt: "2026-10-24" }], relatedArchiveIds: [record.id], rights: { license: "Kurum koşulları", holder: "Kurum", note: "" }, status: "approved", approval: { kind: "human", approvedBy: "Sentetik iddia", approvedAt: "2026-10-23T09:00:00.000Z" }, scheduledAt: null, publishedAt: null, automation: null, createdAt: now, updatedAt: now };
  assert.equal(snapshotHash("publication_record", article), computePublicationRevision(article));
  const adapter = createPublicationApprovalGateAdapter({
    decisions: { listDecisions: async () => [] },
    readSubject: async (_type, id) => (id === article.id ? article : null),
    archiveIndex: { ids: new Set([record.id]), slugToId: new Map() },
    environment: () => unconfigured,
  });
  const readiness = await adapter.readinessFor("publication_record", article.id);
  assert.equal(readiness.result, "deny");
  assert.ok(readiness.findings.some((item) => item.code === "unverified_actor_claim"));
  const preflight = runPublicationPreflight(article, { archiveRecords: [record], now, hasVerifiedHumanApproval: hasVerifiedHumanApproval(readiness), hasAuditStore: false });
  assert.equal(preflight.eligibility, "blocked");
  assert.ok(preflight.blockers.some((item) => item.code === "AUTH_PROVIDER_UNAVAILABLE"));
  assert.equal((await adapter.readinessFor("publication_record", "yok")).result, "deny");
});

test("editoryal güven modülleri istemci bileşeni veya route tarafından içe aktarılmaz", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|mjs)$/.test(entry.name) && readFileSync(full, "utf8").includes("editorial-trust")) offenders.push(path.relative(webRoot, full));
    }
  };
  walk(path.join(webRoot, "app"));
  walk(path.join(webRoot, "components"));
  assert.deepEqual(offenders, []);
});
