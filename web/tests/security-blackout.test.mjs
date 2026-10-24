import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  actionsForLevel,
  appendEvidence,
  blackoutRouteDecision,
  checkApprovals,
  classifyEvent,
  currentBlackoutState,
  escalate,
  evaluateIncident,
  executeActions,
  FORBIDDEN_ACTION_TYPES,
  impactOf,
  INITIAL_STATE,
  MIN_DWELL_MS,
  planDigest,
  planRecovery,
  REGISTERED_APPROVAL_VERIFIER,
  REGISTERED_STATE_STORE,
  stepDown,
  verifyEvidence,
} from "../lib/security/blackout/index.ts";

// MKA FORTRESS X — PROJECT BLACKOUT karar motoru testleri. Hiçbir test gerçek sisteme dokunmaz;
// portlar bellek içi sahte uygulamalardır.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOW = Date.parse("2026-10-24T12:00:00.000Z");
const SHA = "a".repeat(64);
const ev = (id, kind, source, extra = {}) => ({ id, kind, source, observedAt: NOW - 1000, confidence: 0.95, ...extra });
const healthy = { threatContained: true, evidencePreserved: true, healthChecksPassing: true, rootCauseDocumented: true };

function fakePorts() {
  const calls = [];
  const state = { apiEnabled: true, writesFrozen: false, readOnly: false, evidence: [] };
  return {
    calls,
    state,
    ports: {
      sessions: { revoke: async (scope) => { calls.push(`revoke:${scope}`); return { revoked: 3 }; } },
      criticalApi: { setEnabled: async (enabled) => { calls.push(`api:${enabled}`); state.apiEnabled = enabled; } },
      writes: { setFrozen: async (frozen) => { calls.push(`writes:${frozen}`); state.writesFrozen = frozen; } },
      safeMode: { setReadOnly: async (on) => { calls.push(`readonly:${on}`); state.readOnly = on; } },
      notifier: { notify: async (m) => { calls.push(`notify:${m.level}`); } },
      evidence: { append: async (entry) => { state.evidence.push(entry); } },
    },
  };
}

function verifierFor(table) {
  return { id: "test-verifier", verify: async (record) => table[record.token] ?? null };
}
const approver = (subject, extra = {}) => ({ subject, roles: ["security_officer"], mfa: true, issuedAt: NOW - 60_000, expiresAt: NOW + 600_000, ...extra });

// ---------------------------------------------------------------------------
// 1. Sınıflandırma
// ---------------------------------------------------------------------------
test("[BO-01] olay türleri temel önem düzeyine sınıflanır; tatbikat ve düşük güven yükseltmez", () => {
  assert.equal(classifyEvent(ev("1", "secret_exposed", "secrets_tool")).severity, "critical");
  assert.equal(classifyEvent(ev("2", "admin_route_probe", "proxy")).severity, "low");
  assert.equal(classifyEvent(ev("3", "privileged_session_anomaly", "identity_provider")).severity, "high");
  assert.equal(classifyEvent(ev("4", "secret_exposed", "test_harness")).severity, "info", "tatbikat gerçek müdahale başlatmaz");
  assert.equal(classifyEvent(ev("5", "audit_chain_broken", "audit_chain", { confidence: 0.3 })).severity, "high", "düşük güven bir düzey düşer");
});

// ---------------------------------------------------------------------------
// 2. Yanlış alarm koruması
// ---------------------------------------------------------------------------
test("[BO-02] tek kaynaklı, kanıtsız kritik olay yalnız WATCH üretir (kilitleme yok)", () => {
  const r = evaluateIncident([ev("c1", "data_exfiltration_suspected", "siem")], NOW);
  assert.equal(r.recommendedLevel, 1);
  assert.equal(r.corroborated, false);
  assert.ok(!r.actions.some((a) => a.type === "freeze_writes" || a.type === "enable_read_only_mode"));
});

test("[BO-03] yüzlerce yönetim rotası taraması (bot gürültüsü) yalnız izlemeye alır, asla kısıtlamaz", () => {
  const probes = Array.from({ length: 500 }, (_, i) => ev(`p${i}`, "admin_route_probe", "proxy"));
  const r = evaluateIncident(probes, NOW);
  assert.equal(r.recommendedLevel, 1);
  assert.deepEqual(r.actions.map((a) => a.type), ["preserve_evidence", "notify_responders"]);
});

test("[BO-04] yalnız elle bildirilen olaylar WATCH'ı aşamaz", () => {
  const r = evaluateIncident([ev("m1", "secret_exposed", "manual_report"), ev("m2", "audit_chain_broken", "manual_report", { evidenceSha256: SHA })], NOW);
  assert.equal(r.recommendedLevel, 1);
});

test("[BO-05] geçersiz, gelecekten gelen, pencere dışı ve yinelenen olaylar atılır", () => {
  const r = evaluateIncident([
    ev("ok", "rate_anomaly", "waf"),
    ev("ok", "rate_anomaly", "waf"),
    ev("future", "secret_exposed", "secrets_tool", { observedAt: NOW + 3_600_000, evidenceSha256: SHA }),
    ev("old", "secret_exposed", "secrets_tool", { observedAt: NOW - 3_600_000, evidenceSha256: SHA }),
    ev("bad", "secret_exposed", "secrets_tool", { confidence: 7 }),
    { id: "", kind: "secret_exposed", source: "secrets_tool", observedAt: NOW, confidence: 1 },
  ], NOW);
  assert.deepEqual(r.discarded.map((d) => d.reason).sort(), ["gelecekten-gelen", "güven-aralık-dışı", "kimliksiz", "pencere-dışı", "yinelenen"]);
  assert.equal(r.recommendedLevel, 1, "kalan tek geçerli olay orta önemli");
});

test("[BO-06] tatbikat kaynağından gelen kritik olaylar hiçbir eylem üretmez", () => {
  const r = evaluateIncident([ev("t1", "secret_exposed", "test_harness", { evidenceSha256: SHA }), ev("t2", "audit_chain_broken", "test_harness")], NOW);
  assert.equal(r.recommendedLevel, 0);
  assert.deepEqual(r.actions, []);
});

// ---------------------------------------------------------------------------
// 3. Doğrulanmış olaylar
// ---------------------------------------------------------------------------
test("[BO-07] deterministik araçtan kanıt özetli kritik bulgu LOCKDOWN önerir", () => {
  const r = evaluateIncident([ev("i1", "integrity_unexpected_change", "integrity_tool", { evidenceSha256: SHA })], NOW);
  assert.equal(r.recommendedLevel, 3);
  assert.ok(r.corroborated);
  assert.deepEqual(r.actions.map((a) => a.type), ["preserve_evidence", "notify_responders", "revoke_sessions", "disable_critical_api", "revoke_sessions", "freeze_writes", "enable_read_only_mode"]);
});

test("[BO-08] iki bağımsız otomatik kaynaktan yüksek önemli olay RESTRICTED önerir", () => {
  const r = evaluateIncident([ev("h1", "privileged_session_anomaly", "identity_provider"), ev("h2", "approval_forgery_attempt", "siem")], NOW);
  assert.equal(r.recommendedLevel, 2);
  assert.ok(r.actions.some((a) => a.type === "disable_critical_api"));
  assert.ok(!r.actions.some((a) => a.type === "enable_read_only_mode"));
});

// ---------------------------------------------------------------------------
// 4. İnsan onayı
// ---------------------------------------------------------------------------
const lockdownPlan = { incidentId: "INC-1", requestedBy: "nobetci", targetLevel: 3, actions: actionsForLevel(3), createdAt: NOW };

test("[BO-09] kayıtlı onay doğrulayıcısı yok: yalnız kanıt koruma ve bildirim yürütülebilir", async () => {
  assert.equal(REGISTERED_APPROVAL_VERIFIER, null);
  const r = await checkApprovals(lockdownPlan, [], REGISTERED_APPROVAL_VERIFIER, NOW);
  assert.deepEqual(r.executable.map((a) => a.type), ["preserve_evidence", "notify_responders"]);
  assert.ok(r.blocked.every((b) => b.reason === "onay-doğrulayıcısı-kayıtlı-değil"));
});

test("[BO-10] yüksek etkili adımlar iki farklı, MFA'lı, yetkili ve plana bağlı onay ister", async () => {
  const digest = planDigest(lockdownPlan);
  const verifier = verifierFor({ a: approver("ayse"), b: approver("burak"), same: approver("ayse"), nomfa: approver("cem", { mfa: false }), role: approver("deniz", { roles: ["editor"] }), self: approver("nobetci"), old: approver("emre", { issuedAt: NOW - 3_600_000 }) });

  const one = await checkApprovals(lockdownPlan, [{ token: "a", planSha256: digest }, { token: "same", planSha256: digest }], verifier, NOW);
  assert.deepEqual(one.approvers, ["ayse"], "aynı kişinin iki onayı tek sayılır");
  assert.ok(one.blocked.some((b) => b.action.type === "freeze_writes" && b.reason === "iki-farklı-onay-gerekli"));
  assert.ok(one.executable.some((a) => a.type === "revoke_sessions" && a.scope === "suspicious"), "şüpheli oturum iptali tek onayla yürür");

  const rejected = await checkApprovals(lockdownPlan, [
    { token: "nomfa", planSha256: digest }, { token: "role", planSha256: digest }, { token: "self", planSha256: digest },
    { token: "old", planSha256: digest }, { token: "b", planSha256: "f".repeat(64) }, { token: "yok", planSha256: digest },
  ], verifier, NOW);
  assert.deepEqual(rejected.rejectedApprovals.map((x) => x.reason).sort(), ["doğrulanamadı", "mfa-yok", "plan-özeti-uyuşmuyor", "süre-geçersiz", "talep-eden-onaylayamaz", "yetkisiz-rol"]);
  assert.equal(rejected.approvers.length, 0);

  const two = await checkApprovals(lockdownPlan, [{ token: "a", planSha256: digest }, { token: "b", planSha256: digest }], verifier, NOW);
  assert.equal(two.blocked.length, 0);
  assert.equal(two.executable.length, lockdownPlan.actions.length);
});

test("[BO-11] plan değişirse önceki onaylar geçersizleşir; ayrıcalıklı oturum iptali iki onay ister", async () => {
  const digest = planDigest(lockdownPlan);
  const changed = { ...lockdownPlan, actions: [...lockdownPlan.actions, { type: "revoke_sessions", scope: "all" }] };
  assert.notEqual(planDigest(changed), digest);
  const r = await checkApprovals(changed, [{ token: "a", planSha256: digest }, { token: "b", planSha256: digest }], verifierFor({ a: approver("ayse"), b: approver("burak") }), NOW);
  assert.equal(r.approvers.length, 0);
  assert.equal(impactOf({ type: "revoke_sessions", scope: "privileged" }), "dual_approval");
  assert.equal(impactOf({ type: "revoke_sessions", scope: "suspicious" }), "single_approval");
});

// ---------------------------------------------------------------------------
// 5. Yasak eylemler ve yürütücü
// ---------------------------------------------------------------------------
test("[BO-12] veri silme, yedek imhası ve günlük yok etme her koşulda reddedilir", async () => {
  const { ports, calls } = fakePorts();
  const forbidden = [...FORBIDDEN_ACTION_TYPES, "rm_rf", undefined].map((type) => ({ type }));
  const results = await executeActions(forbidden, ports, { incidentId: "INC-X", level: 3, reason: "test", dryRun: false });
  assert.ok(results.every((r) => r.status === "refused"));
  assert.deepEqual(calls, []);
  for (const level of [0, 1, 2, 3]) {
    for (const action of actionsForLevel(level)) assert.ok(!FORBIDDEN_ACTION_TYPES.includes(action.type));
  }
});

test("[BO-13] yürütücü varsayılan olarak dry-run çalışır; port yoksa altyapı gereksinimi bildirir", async () => {
  const { ports, calls } = fakePorts();
  const dry = await executeActions(actionsForLevel(3), ports, { incidentId: "INC-2", level: 3, reason: "tatbikat" });
  assert.ok(dry.every((r) => r.status === "dry_run"));
  assert.deepEqual(calls, [], "dry-run hiçbir porta dokunmaz");
  const none = await executeActions(actionsForLevel(3), {}, { incidentId: "INC-2", level: 3, reason: "x", dryRun: false });
  assert.ok(none.every((r) => r.status === "requires_infrastructure"));
});

test("[BO-14] bir portun hatası diğer eylemleri durdurmaz", async () => {
  const { ports, calls } = fakePorts();
  ports.sessions = { revoke: async () => { throw new Error("idp down"); } };
  const r = await executeActions(actionsForLevel(2), ports, { incidentId: "INC-3", level: 2, reason: "x", dryRun: false });
  assert.equal(r.find((x) => x.action === "revoke_sessions").status, "failed");
  assert.ok(calls.includes("api:false"));
});

// ---------------------------------------------------------------------------
// 6. Güvenli moda geçiş ve kontrollü geri dönüş
// ---------------------------------------------------------------------------
test("[BO-15] LOCKDOWN'a geçiş ve NORMAL'e kademeli dönüş tüm geri alınabilir eylemleri tersine çevirir", async () => {
  const { ports, state: sys, calls } = fakePorts();
  const actions = actionsForLevel(3);
  await executeActions(actions, ports, { incidentId: "INC-4", level: 3, reason: "kanıtlı bütünlük ihlali", dryRun: false });
  assert.deepEqual([sys.apiEnabled, sys.writesFrozen, sys.readOnly], [false, true, true]);

  let state = escalate(INITIAL_STATE, 3, actions, NOW, "INC-4", "kanıtlı-kritik");
  let t = NOW;
  for (const expected of [2, 1, 0]) {
    t += MIN_DWELL_MS[state.level];
    const plan = planRecovery(state, healthy, t);
    assert.ok(plan.allowed, plan.reasons.join(","));
    assert.equal(plan.to, expected);
    await executeActions(plan.inverseActions, ports, { incidentId: "INC-4", level: plan.to, reason: "geri dönüş", dryRun: false });
    state = stepDown(state, plan, plan.inverseActions, t, "kontrollü-dönüş");
  }
  assert.equal(state.level, 0);
  assert.equal(state.incidentId, null);
  assert.deepEqual([sys.apiEnabled, sys.writesFrozen, sys.readOnly], [true, false, false], "sistem başlangıç durumuna döndü");
  assert.deepEqual(state.history.map((h) => `${h.from}>${h.to}`), ["0>3", "3>2", "2>1", "1>0"]);
  assert.ok(calls.indexOf("readonly:false") < calls.indexOf("api:true"), "ters eylemler kademeli (önce yazma/salt-okunur, sonra API)");
});

test("[BO-16] geri dönüş: bekleme süresi, kontrol listesi ve kademe atlama engelleri", () => {
  const state = escalate(INITIAL_STATE, 3, actionsForLevel(3), NOW, "INC-5", "x");
  assert.deepEqual(planRecovery(state, healthy, NOW + 1000).reasons, ["bekleme-süresi-dolmadı"]);
  const later = NOW + MIN_DWELL_MS[3];
  assert.deepEqual(planRecovery(state, { ...healthy, threatContained: false, rootCauseDocumented: false }, later).reasons, ["tehdit-kontrol-altında-değil", "kök-neden-belgelenmedi"]);
  const plan = planRecovery(state, healthy, later);
  assert.equal(plan.to, 2, "LOCKDOWN'dan doğrudan NORMAL'e inilmez");
  assert.throws(() => stepDown(state, plan, [], later, "x"), /ters eylemler yürütülmedi/);
  assert.throws(() => escalate(state, 2, [], later, "INC-5", "x"), /yükseltme hedefi/);
});

// ---------------------------------------------------------------------------
// 7. Rota kararları (salt-okunur güvenli mod)
// ---------------------------------------------------------------------------
test("[BO-17] düzeylere göre rota kararı; sağlık uç noktaları her zaman açık", () => {
  const d = (level, method, pathname) => blackoutRouteDecision(level, { method, pathname }).action;
  for (const level of [0, 1]) assert.equal(d(level, "GET", "/api/arastirma-laboratuvari/export"), "allow");
  assert.equal(d(2, "GET", "/api/arastirma-laboratuvari/export"), "deny");
  assert.equal(d(2, "GET", "/YONETIM/incelemeler"), "deny");
  assert.equal(d(2, "GET", "/arsiv"), "allow");
  assert.equal(d(3, "POST", "/arsiv"), "deny");
  assert.equal(d(3, "GET", "/api/health-integration"), "deny");
  assert.equal(d(3, "GET", "/arsiv/anitkabir"), "allow");
  assert.equal(d(3, "HEAD", "/"), "allow");
  for (const level of [0, 1, 2, 3]) { assert.equal(d(level, "GET", "/api/health"), "allow"); assert.equal(d(level, "GET", "/api/ready"), "allow"); }
  const denied = blackoutRouteDecision(3, { method: "POST", pathname: "/x" });
  assert.equal(denied.status, 503);
  assert.equal(denied.headers["Cache-Control"], "no-store");
});

// ---------------------------------------------------------------------------
// 8. Kanıt defteri
// ---------------------------------------------------------------------------
test("[BO-18] kanıt defteri hash zincirlidir, kurcalamayı tespit eder ve sırları redakte eder", () => {
  let ledger = [];
  ledger = appendEvidence(ledger, { at: NOW, incidentId: "INC-6", kind: "event", payload: { token: "gizli-deger", header: "Bearer abcdefghijklmnop", note: "ok" } });
  ledger = appendEvidence(ledger, { at: NOW + 1, incidentId: "INC-6", kind: "assessment", payload: { level: 3 } });
  assert.deepEqual(verifyEvidence(ledger), { ok: true, brokenAt: null });
  assert.equal(ledger[0].payload.token, "[REDACTED]");
  assert.equal(ledger[0].payload.header, "[REDACTED]");
  assert.ok(Object.isFrozen(ledger) && Object.isFrozen(ledger[0]));
  assert.throws(() => { ledger.pop(); });
  const tampered = [{ ...ledger[0], payload: { note: "değişti" } }, ledger[1]];
  assert.deepEqual(verifyEvidence(tampered), { ok: false, brokenAt: 1 });
  assert.deepEqual(verifyEvidence([ledger[1]]), { ok: false, brokenAt: 1 }, "baştan silme tespit edilir");
});

test("[BO-19] kanıt koruma, kanıt kaydını depoya ekler; depodan silme arayüzü yoktur", async () => {
  const { ports, state: sys } = fakePorts();
  const ledger = appendEvidence([], { at: NOW, incidentId: "INC-7", kind: "event", payload: { kind: "secret_exposed" } });
  await executeActions([{ type: "preserve_evidence" }], ports, { incidentId: "INC-7", level: 1, reason: "x", ledger, dryRun: false });
  assert.equal(sys.evidence.length, 1);
  const portsSource = readFileSync(path.join(webRoot, "lib", "security", "blackout", "ports.ts"), "utf8");
  const sinkInterface = portsSource.match(/interface EvidenceSink[^{]*\{[^}]*\}/)[0];
  assert.doesNotMatch(sinkInterface, /delete|remove|purge|clear|truncate/i);
});

// ---------------------------------------------------------------------------
// 9. Varsayılan yapılandırma ve kaynak güvencesi
// ---------------------------------------------------------------------------
test("[BO-20] varsayılan yapılandırma: durum deposu yok, etkin düzey NORMAL; depo hatası ve geçersiz kayıt degraded olur", async () => {
  assert.equal(REGISTERED_STATE_STORE, null);
  assert.deepEqual(await currentBlackoutState(), { level: 0, degraded: false, source: "not_configured", version: null });
  const down = await currentBlackoutState({ read: async () => { throw new Error("down"); } }, NOW);
  assert.equal(down.degraded, true);
  assert.equal(down.source, "store_unavailable");
  const bad = await currentBlackoutState({ read: async () => ({ level: 9 }) }, NOW);
  assert.equal(bad.degraded, true);
  assert.equal(bad.source, "invalid_record");
});

test("[BO-21] BLACKOUT kaynağı dosya silme/yazma, süreç sonlandırma veya genel ağ çağrısı içermez; proxy yalnız FORTRESS'ten sonra çağırır", () => {
  const dir = path.join(webRoot, "lib", "security", "blackout");
  const files = [
    ...readdirSync(dir).filter((f) => f.endsWith(".ts")),
    ...readdirSync(path.join(dir, "adapters")).filter((f) => f.endsWith(".ts")).map((f) => path.join("adapters", f)),
  ];
  assert.ok(files.length >= 14, "adaptörler dahil tüm dosyalar taranır");
  for (const file of files) {
    const src = readFileSync(path.join(dir, file), "utf8");
    assert.doesNotMatch(src, /node:fs|from "fs"|unlink|rmSync|rmdir|writeFile|child_process|process\.exit|\bfetch\(|globalThis\.fetch/, file);
  }
  const proxy = readFileSync(path.join(webRoot, "proxy.ts"), "utf8");
  assert.ok(proxy.indexOf("decideAccess(") < proxy.indexOf("blackoutGate("), "FORTRESS kararı önce");
  assert.match(proxy, /if \(decision\.action === "allow"\) \{[\s\S]*blackoutGate\(/, "BLACKOUT yalnız FORTRESS izin verdiğinde çalışır (asla gevşetmez)");
});
