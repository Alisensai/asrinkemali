import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BlackoutController,
  blackoutGate,
  blackoutRouteDecision,
  classifyRoute,
  describePorts,
  FORBIDDEN_ACTION_TYPES,
  INITIAL_STORED_STATE,
  MIN_DWELL_MS,
  productionReady,
  REGISTERED_APPROVAL_VERIFIER,
  REGISTERED_STATE_RECORD_VERIFIER,
  REGISTERED_STATE_STORE,
  ROUTE_POLICY,
  verifyEvidence,
} from "../lib/security/blackout/index.ts";
import {
  MemoryCriticalApiGate,
  MemoryEvidenceSink,
  MemoryNotifier,
  MemorySafeModeSwitch,
  MemorySessionRevoker,
  MemoryStateStore,
  MemoryWriteGuard,
} from "../lib/security/blackout/adapters/memory.ts";
import { HttpBlackoutStateStore, HttpStateStoreError } from "../lib/security/blackout/adapters/http-state-store.ts";
import { checkEvidenceSinkConformance, checkStateStoreConformance } from "../lib/security/blackout/adapters/conformance.ts";
import { headerOptionsFromEnv, securityHeaders } from "../lib/security/headers.ts";

// PROJECT BLACKOUT uygulama entegrasyonu: rota etkileri, proxy geçişi, olay müdahale senaryoları,
// port sözleşmeleri. Tüm portlar bellek içi TEST İKİZLERİDİR; hiçbir test gerçek sisteme dokunmaz.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T0 = Date.parse("2026-10-24T12:00:00.000Z");
const SHA = "a".repeat(64);
const ev = (id, kind, source, extra = {}) => ({ id, kind, source, observedAt: T0 - 1000, confidence: 0.95, ...extra });
const CRITICAL_VERIFIED = [ev("int-1", "integrity_unexpected_change", "integrity_tool", { evidenceSha256: SHA })];
const HEALTHY = { threatContained: true, evidencePreserved: true, healthChecksPassing: true, rootCauseDocumented: true };

function clock(start = T0) { let t = start; return { now: () => t, advance: (ms) => { t += ms; } }; }

/** Onay doğrulayıcı ikizi: belirteç → kişi. Süreler doğrulama anına göre geçerli üretilir. */
function verifier(table) {
  return {
    id: "test-verifier",
    verify: async (record, now) => {
      const p = table[record.token];
      return p ? { subject: p.subject, roles: p.roles ?? ["security_officer"], mfa: p.mfa ?? true, issuedAt: now - 1000, expiresAt: now + 600_000 } : null;
    },
  };
}
const PEOPLE = { a: { subject: "ayse" }, b: { subject: "burak" }, a2: { subject: "ayse" }, nomfa: { subject: "cem", mfa: false }, editor: { subject: "deniz", roles: ["editor"] }, self: { subject: "nobetci" } };

function system(options = {}) {
  const c = clock();
  const store = options.store === undefined ? new MemoryStateStore() : options.store;
  const ports = {
    sessions: new MemorySessionRevoker([{ id: "s1", suspicious: true }, { id: "s2", privileged: true }, { id: "s3" }]),
    criticalApi: new MemoryCriticalApiGate(),
    writes: new MemoryWriteGuard(),
    safeMode: new MemorySafeModeSwitch(),
    notifier: new MemoryNotifier(),
    evidence: new MemoryEvidenceSink(),
  };
  const controller = new BlackoutController({ ports, store, approvalVerifier: options.verifier === undefined ? verifier(PEOPLE) : options.verifier, now: c.now, dryRun: options.dryRun ?? false });
  return { c, store, ports, controller };
}
const approve = (planSha256, ...tokens) => tokens.map((token) => ({ token, planSha256 }));

// ---------------------------------------------------------------------------
// 1. Rota etkileri
// ---------------------------------------------------------------------------
test("[BI-01] her düzeyin her rota sınıfına etkisi tabloyla birebir; sağlık her düzeyde açık", () => {
  const sample = { health: "/api/health", admin: "/yonetim", research: "/api/arastirma-laboratuvari/export", public_api: "/api/health-integration", public_page: "/arsiv/anitkabir" };
  for (const level of [0, 1, 2, 3]) {
    for (const [cls, pathname] of Object.entries(sample)) {
      assert.equal(classifyRoute(pathname), cls, pathname);
      for (const [method, kind] of [["GET", "read"], ["HEAD", "read"], ["POST", "write"], ["DELETE", "write"]]) {
        const expected = ROUTE_POLICY[level][cls][kind];
        assert.equal(blackoutRouteDecision(level, { method, pathname }).action, expected, `${level} ${cls} ${method}`);
      }
    }
  }
  for (const level of [0, 1, 2, 3]) for (const m of ["GET", "POST"]) assert.equal(blackoutRouteDecision(level, { method: m, pathname: "/api/ready" }).action, "allow");
  assert.equal(blackoutRouteDecision(3, { method: "GET", pathname: "/" }).action, "allow", "LOCKDOWN'da herkese açık okuma sürer");
  assert.equal(blackoutRouteDecision(2, { method: "POST", pathname: "/api/health-integration" }).action, "deny");
});

test("[BI-02] uygulamadaki tüm gerçek rotalar sınıflanır; yol hileleri hassas sınıfı atlatamaz", () => {
  const apiDir = path.join(webRoot, "app", "api");
  const routes = [];
  const walk = (dir) => { for (const name of readdirSync(dir)) { const p = path.join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (name === "route.ts") routes.push("/" + path.relative(path.join(webRoot, "app"), path.dirname(p)).split(path.sep).join("/")); } };
  walk(apiDir);
  assert.deepEqual(routes.map((r) => [r, classifyRoute(r)]).sort(), [
    ["/api/arastirma-laboratuvari/export", "research"], ["/api/health", "health"], ["/api/health-integration", "public_api"], ["/api/ready", "health"],
  ]);
  assert.equal(classifyRoute("/arastirma-laboratuvari"), "research");
  for (const trick of ["/API/ARASTIRMA-LABORATUVARI/export", "/api//arastirma-laboratuvari/export", "/api/arastirma-laboratuvari%2Fexport", "/%61pi/arastirma-laboratuvari/export", "/api/arastirma-laboratuvari/", "/api\\arastirma-laboratuvari/export"]) {
    assert.equal(classifyRoute(trick), "research", trick);
  }
  assert.equal(classifyRoute("/api/%E0%A4%A"), "admin", "çözülemeyen kodlama en hassas sınıf");
  assert.equal(classifyRoute("/Yonetim/Incelemeler/"), "admin");
  assert.equal(classifyRoute("/api/health/"), "health");
  assert.equal(classifyRoute("/api/healthz"), "public_api", "sağlık istisnası tam eşleşmedir");
});

// ---------------------------------------------------------------------------
// 2. Proxy geçiş katmanı
// ---------------------------------------------------------------------------
test("[BI-03] proxy geçişi: depo yokken davranış değişmez; kayıtlı depo düzeyi uygulanır; kesinti/bozuk kayıt/imza hatası degraded", async () => {
  assert.equal(REGISTERED_STATE_STORE, null);
  assert.equal(REGISTERED_STATE_RECORD_VERIFIER, null);
  for (const [method, pathname] of [["GET", "/api/arastirma-laboratuvari/export"], ["POST", "/arsiv"], ["GET", "/yonetim"]]) {
    const r = await blackoutGate({ method, pathname });
    assert.equal(r.decision.action, "allow");
    assert.equal(r.state.source, "not_configured");
  }
  const lockdown = new MemoryStateStore({ ...INITIAL_STORED_STATE, level: 3, version: 4, since: T0 - 1, updatedAt: T0 - 1, incidentId: "INC-X", transitionSha256: SHA });
  assert.equal((await blackoutGate({ method: "POST", pathname: "/arsiv" }, { store: lockdown, now: T0 })).decision.action, "deny");
  assert.equal((await blackoutGate({ method: "GET", pathname: "/arsiv" }, { store: lockdown, now: T0 })).decision.action, "allow");

  const down = new MemoryStateStore(); down.failReads = true;
  const slow = { read: () => new Promise((resolve) => setTimeout(() => resolve(INITIAL_STORED_STATE), 200)) };
  const corrupt = { read: async () => ({ level: 2, version: "x" }) };
  const forged = new MemoryStateStore({ ...INITIAL_STORED_STATE, signature: "sahte" });
  const rejectAll = { verify: async () => false };
  for (const [name, store, opts] of [["kesinti", down, {}], ["zaman-aşımı", slow, { timeoutMs: 20 }], ["bozuk", corrupt, {}], ["imza", forged, { verifier: rejectAll }]]) {
    const research = await blackoutGate({ method: "GET", pathname: "/api/arastirma-laboratuvari/export" }, { store, now: T0, ...opts });
    const page = await blackoutGate({ method: "GET", pathname: "/arsiv" }, { store, now: T0, ...opts });
    assert.equal(research.state.degraded, true, name);
    assert.equal(research.decision.action, "deny", `${name}: hassas yüzey kapalı`);
    assert.equal(page.decision.action, "allow", `${name}: herkese açık okuma sürer`);
  }
});

// ---------------------------------------------------------------------------
// 3. Olay müdahale senaryoları (görev maddeleri 1–10)
// ---------------------------------------------------------------------------
test("[BI-04] (1) tek şüpheli sinyal LOCKDOWN başlatmaz; yalnız izleme", async () => {
  const { controller, ports, store } = system();
  const r = await controller.respond({ events: [ev("siem-1", "data_exfiltration_suspected", "siem")], requestedBy: "nobetci" });
  assert.equal(r.appliedLevel, 1);
  assert.equal(r.persistence, "persisted");
  assert.equal((await store.read()).level, 1);
  assert.deepEqual([ports.criticalApi.enabled, ports.writes.frozen, ports.safeMode.readOnly], [true, false, false]);
  assert.equal(ports.sessions.activeSessionIds().length, 3, "oturum iptal edilmedi");
});

test("[BI-05] (2,5) birden fazla güvenilir sinyal LOCKDOWN önerir; iki farklı yetkili onayıyla uygulanır ve proxy salt-okunur moda geçer", async () => {
  const { controller, ports, store } = system();
  const events = [...CRITICAL_VERIFIED, ev("idp-1", "privileged_session_anomaly", "identity_provider")];
  const { planSha256, assessment } = controller.previewPlan(events, "nobetci");
  assert.equal(assessment.recommendedLevel, 3);
  const r = await controller.respond({ events, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  assert.equal(r.appliedLevel, 3);
  assert.equal(r.persistence, "persisted");
  assert.deepEqual([ports.criticalApi.enabled, ports.writes.frozen, ports.safeMode.readOnly], [false, true, true]);
  assert.deepEqual(ports.sessions.activeSessionIds(), ["s3"], "şüpheli ve ayrıcalıklı oturumlar gerçekten iptal edildi");
  assert.ok(r.results.some((x) => x.action === "revoke_sessions" && x.detail === "iptal-edilen-oturum=1"));
  const stored = await store.read();
  assert.deepEqual([stored.level, stored.version, stored.transitionSha256], [3, 1, planSha256]);
  assert.equal((await blackoutGate({ method: "POST", pathname: "/arsiv" }, { store, now: T0 })).decision.action, "deny");
  assert.equal((await blackoutGate({ method: "GET", pathname: "/kronoloji" }, { store, now: T0 })).decision.action, "allow");
  assert.equal(ports.notifier.messages.length, 1);
});

test("[BI-06] (3) sahte alarm (tatbikat kaynağı) hizmeti durdurmaz, durum yazılmaz", async () => {
  const { controller, store, ports } = system();
  const r = await controller.respond({ events: [ev("drill-1", "secret_exposed", "test_harness", { evidenceSha256: SHA })], requestedBy: "nobetci" });
  assert.equal(r.appliedLevel, 0);
  assert.equal(r.persistence, "not_needed");
  assert.equal((await store.read()).version, 0);
  assert.equal(ports.notifier.messages.length, 0);
});

test("[BI-07] (4) yetkisiz kişiler güvenlik düzeyini değiştiremez; düzeyi doğrudan ayarlayan yöntem yoktur", async () => {
  const events = CRITICAL_VERIFIED;
  for (const [name, opts, tokens] of [["doğrulayıcı-yok", { verifier: null }, ["a", "b"]], ["yetkisiz-rol", {}, ["editor", "a"]], ["sahte-belirteç", {}, ["yok1", "yok2"]], ["talep-eden", {}, ["self", "a"]]]) {
    const { controller, store, ports } = system(opts);
    const { planSha256 } = controller.previewPlan(events, "nobetci");
    const r = await controller.respond({ events, requestedBy: "nobetci", approvals: approve(planSha256, ...tokens) });
    assert.ok(r.appliedLevel <= 1, `${name}: ${r.appliedLevel}`);
    assert.ok((await store.read()).level <= 1, name);
    assert.equal(ports.criticalApi.enabled, true, name);
  }
  const methods = Object.getOwnPropertyNames(BlackoutController.prototype).filter((m) => m !== "constructor");
  assert.deepEqual(methods.filter((m) => /set|level|force|override/i.test(m)), [], "düzey ayarlayan genel yöntem yok");
});

test("[BI-08] (5,6,7) iki farklı yetkili, MFA zorunlu, aynı kişinin iki onayı tek sayılır", async () => {
  for (const [name, tokens, expectedApprovers] of [["tek-onay", ["a"], 1], ["aynı-kişi", ["a", "a2"], 1], ["mfa-yok", ["a", "nomfa"], 1]]) {
    const { controller, store } = system();
    const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
    const r = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, ...tokens) });
    assert.equal(r.approvers.length, expectedApprovers, name);
    assert.ok(r.appliedLevel < 3, `${name}: LOCKDOWN uygulanmamalı`);
    assert.ok(r.levelLimitedBy.some((x) => x.endsWith(":onay-yok")), name);
    assert.ok((await store.read()).level < 3, name);
  }
  const { controller } = system();
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const r = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "nomfa") });
  assert.ok(r.rejectedApprovals.some((x) => x.reason === "mfa-yok"));
});

test("[BI-09] (8) tekrarlanan olaylar güvenle işlenir; eşzamanlı yazım sürüm çakışması olarak raporlanır", async () => {
  const { controller, store, ports } = system();
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const first = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  const second = await controller.respond({ events: [...CRITICAL_VERIFIED, ...CRITICAL_VERIFIED], requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.persistence, "not_needed");
  assert.equal((await store.read()).version, 1, "ikinci kez yazılmadı");
  assert.equal(ports.notifier.messages.length, 1, "bildirim bir kez");
  assert.ok(second.results.every((x) => x.status === "dry_run" && x.detail === "daha-önce-uygulandı"));

  const race = system();
  const p = race.controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  race.store.simulateConcurrentWrite(1);
  const original = race.store.read.bind(race.store);
  race.store.read = async () => ({ ...(await original()), version: 0 }); // eski görüş
  const r = await race.controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(p.planSha256, "a", "b") });
  assert.equal(r.persistence, "version_conflict");
  assert.equal(r.appliedLevel, r.previousLevel, "çakışmada düzey uygulanmış sayılmaz");
});

test("[BI-10] (9) durum deposu kesintisinde düzey değişmez, hassas işlemler kapalı kalır, kanıt yine üretilir", async () => {
  const { controller, store, ports } = system();
  store.failReads = true;
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const r = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  assert.equal(r.persistence, "store_unavailable");
  assert.ok(r.levelLimitedBy.includes("durum-deposu-erişilemez"));
  assert.equal(ports.criticalApi.enabled, true, "kısıtlayıcı eylem uygulanmış gibi gösterilmez");
  assert.ok(ports.evidence.entries().length > 0, "kanıt kaydedildi");
  assert.equal(ports.notifier.messages.length, 1, "ekip bilgilendirildi");
  const gate = await blackoutGate({ method: "GET", pathname: "/api/arastirma-laboratuvari/export" }, { store, now: T0 });
  assert.equal(gate.decision.action, "deny", "kesintide hassas yüzey kapalı");
  store.failReads = false; store.failWrites = true;
  const again = system({ store });
  const p2 = again.controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const w = await again.controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(p2.planSha256, "a", "b") });
  assert.equal(w.persistence, "failed");
  assert.equal(w.appliedLevel, w.previousLevel);
});

test("[BI-11] (10) NORMAL'e kontrollü dönüş: onaysız ve erken dönüş reddedilir; kademe kademe portlar geri yüklenir", async () => {
  const { controller, store, ports, c } = system();
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });

  assert.deepEqual((await controller.recover({ requestedBy: "nobetci", checklist: HEALTHY })).reasons, ["bekleme-süresi-dolmadı"]);
  c.advance(MIN_DWELL_MS[3]);
  const unapproved = await controller.recover({ requestedBy: "nobetci", checklist: HEALTHY });
  assert.equal(unapproved.allowed, false);
  assert.ok(unapproved.reasons.includes("iki-farklı-onay-gerekli"));
  assert.equal((await controller.recover({ requestedBy: "nobetci", checklist: { ...HEALTHY, rootCauseDocumented: false } })).reasons[0], "kök-neden-belgelenmedi");

  for (const [to, tokens] of [[2, ["a", "b"]], [1, ["a", "b"]], [0, ["a"]]]) {
    const preview = await controller.previewRecovery("nobetci", HEALTHY);
    const r = await controller.recover({ requestedBy: "nobetci", checklist: HEALTHY, approvals: approve(preview.planSha256, ...tokens) });
    assert.equal(r.allowed, true, r.reasons.join(","));
    assert.equal(r.to, to);
    assert.equal(r.persistence, "persisted");
    c.advance(MIN_DWELL_MS[to] ?? 0);
  }
  const final = await store.read();
  assert.deepEqual([final.level, final.incidentId, final.appliedActions], [0, null, []]);
  assert.deepEqual([ports.criticalApi.enabled, ports.writes.frozen, ports.safeMode.readOnly], [true, false, false]);
  assert.equal((await blackoutGate({ method: "POST", pathname: "/arsiv" }, { store, now: c.now() })).decision.action, "allow");
});

// ---------------------------------------------------------------------------
// 4. Dürüst raporlama ve varsayılanlar
// ---------------------------------------------------------------------------
test("[BI-12] varsayılan denetleyici dry-run çalışır; port çağrılmaz, durum yazılmaz", async () => {
  assert.equal(REGISTERED_APPROVAL_VERIFIER, null);
  const ports = { criticalApi: new MemoryCriticalApiGate(), notifier: new MemoryNotifier() };
  const store = new MemoryStateStore();
  const controller = new BlackoutController({ ports, store, approvalVerifier: verifier(PEOPLE), now: () => T0 });
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const r = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  assert.equal(r.persistence, "dry_run");
  assert.ok(r.results.every((x) => x.status === "dry_run" || x.status === "requires_infrastructure"));
  assert.equal(ports.criticalApi.enabled, true);
  assert.equal(ports.notifier.messages.length, 0);
  assert.equal((await store.read()).version, 0);
});

test("[BI-13] altyapı yokken başarı bildirilmez: port ve depo eksikliği requires_infrastructure; bellek ikizleri production sayılmaz", async () => {
  const controller = new BlackoutController({ ports: {}, store: null, approvalVerifier: verifier(PEOPLE), now: () => T0, dryRun: false });
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const r = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  assert.equal(r.persistence, "requires_infrastructure");
  assert.ok(r.results.every((x) => x.status === "requires_infrastructure"), JSON.stringify(r.results));
  assert.ok(Object.values(r.portStatus).every((s) => s === "requires_infrastructure"));
  assert.equal(r.productionReady, false);
  assert.equal(r.evidence.sink, "requires_infrastructure");

  const { ports, store } = system();
  assert.ok(Object.values(describePorts(ports, store)).every((s) => s === "test_double"));
  assert.equal(productionReady(ports, store), false);
  const http = new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/blackout", token: "t".repeat(32), transport: async () => ({ status: 404, text: async () => "" }) });
  assert.equal(describePorts({}, http).stateStore, "connected", "gerçek uzak adaptör ayırt edilir");
});

test("[BI-14] kanıt bütünlüğü: denetleyici defteri zincirli, depoya aynı zincir aktarılır, sırlar redakte", async () => {
  const { controller, ports } = system();
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  await controller.respond({ events: [{ ...CRITICAL_VERIFIED[0], detail: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz" }], requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  const ledger = controller.getLedger();
  assert.deepEqual(verifyEvidence(ledger), { ok: true, brokenAt: null });
  assert.deepEqual(ports.evidence.entries().map((e) => e.hash), ledger.map((e) => e.hash), "depoya eksiksiz ve sıralı aktarıldı");
  assert.deepEqual(ledger.map((e) => e.kind), ["assessment", "plan", "approval", "execution", "transition"]);
  assert.doesNotMatch(JSON.stringify(ledger), /abcdefghijklmnopqrstuvwxyz/);
  assert.deepEqual(await checkEvidenceSinkConformance(new MemoryEvidenceSink(), T0), []);
  const leaky = { append: async () => {}, delete: async () => {} };
  assert.ok((await checkEvidenceSinkConformance(leaky, T0)).some((f) => f.startsWith("silme-yöntemi-olmamalı")));
});

test("[BI-15] durum deposu uygunluğu: bellek ikizi ve HTTPS adaptörü CAS sözleşmesini geçer; koşulsuz setLevel'li depo kalır", async () => {
  assert.deepEqual(await checkStateStoreConformance(new MemoryStateStore(), T0), []);
  let record = null;
  const server = async (_url, init) => {
    if (init.method === "GET") return record ? { status: 200, text: async () => JSON.stringify(record) } : { status: 404, text: async () => "" };
    const expected = Number(init.headers["If-Match"].replaceAll('"', ""));
    const body = JSON.parse(init.body);
    if ((record?.version ?? 0) !== expected || body.version !== expected + 1) return { status: 412, text: async () => JSON.stringify({ version: record?.version ?? 0 }) };
    record = body;
    return { status: 204, text: async () => "" };
  };
  const http = new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/blackout", token: "t".repeat(32), transport: server });
  assert.deepEqual(await checkStateStoreConformance(http, T0), []);
  const naive = { read: async () => INITIAL_STORED_STATE, compareAndSet: async () => ({ ok: true, version: 1 }), setLevel: async () => {} };
  const failures = await checkStateStoreConformance(naive, T0);
  assert.ok(failures.includes("koşulsuz-setLevel-olmamalı"));
  assert.ok(failures.includes("eski-sürümle-yazım-kabul-edildi"));
});

test("[BI-16] HTTPS adaptörü güvenliği: yalnız https, belirteç sızmaz, zaman aşımı/hata/boyut sınırı", async () => {
  const token = "gizli-belirtec-1234567890";
  const transport = async () => ({ status: 200, text: async () => "{}" });
  for (const endpoint of ["http://kv.example.invalid/x", "https://user:pw@kv.example.invalid/x", "kv.example.invalid"]) {
    assert.throws(() => new HttpBlackoutStateStore({ endpoint, token, transport }), HttpStateStoreError, endpoint);
  }
  assert.throws(() => new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/x", token: "kısa", transport }), HttpStateStoreError);
  let seen;
  const spy = async (url, init) => { seen = init; return { status: 500, text: async () => "boom " + token }; };
  const store = new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/x", token, transport: spy });
  await assert.rejects(store.read(), (e) => e instanceof HttpStateStoreError && e.code === "http_status" && !e.message.includes(token));
  assert.equal(seen.redirect, "error");
  assert.equal(seen.headers.Authorization, `Bearer ${token}`);
  const hang = new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/x", token, timeoutMs: 20, transport: (_u, init) => new Promise((_r, reject) => init.signal.addEventListener("abort", () => reject(new Error(`aborted ${token}`)))) });
  await assert.rejects(hang.read(), (e) => e.code === "timeout" && !e.message.includes(token));
  const big = new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/x", token, maxBodyBytes: 10, transport: async () => ({ status: 200, text: async () => "x".repeat(100) }) });
  await assert.rejects(big.read(), (e) => e.code === "body_too_large");
  const junk = new HttpBlackoutStateStore({ endpoint: "https://kv.example.invalid/x", token, transport: async () => ({ status: 200, text: async () => "<html>" }) });
  await assert.rejects(junk.read(), (e) => e.code === "invalid_json");
});

// ---------------------------------------------------------------------------
// 5. Yasaklar ve gerileme koruması
// ---------------------------------------------------------------------------
test("[BI-17] hiçbir senaryoda yıkıcı eylem yürütülmez; portlarda yıkıcı yöntem yoktur", async () => {
  const { controller, ports } = system();
  const { planSha256 } = controller.previewPlan(CRITICAL_VERIFIED, "nobetci");
  const r = await controller.respond({ events: CRITICAL_VERIFIED, requestedBy: "nobetci", approvals: approve(planSha256, "a", "b") });
  for (const result of r.results) assert.ok(!FORBIDDEN_ACTION_TYPES.includes(result.action), result.action);
  for (const port of Object.values(ports)) {
    const names = Object.getOwnPropertyNames(Object.getPrototypeOf(port));
    assert.deepEqual(names.filter((n) => /delete|drop|destroy|purge|wipe|truncate|remove/i.test(n)), [], port.constructor.name);
  }
});

test("[BI-18] eski CSP davranışı korunur: production'da zorunlu CSP hiçbir modda kalkmaz", () => {
  for (const mode of [undefined, "enforce", "off", "report-only"]) {
    const h = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "production", ASRIN_CSP_MODE: mode }));
    assert.ok(h.some((x) => x.key === "Content-Security-Policy"), String(mode));
  }
});
