import { createHash } from "node:crypto";
import { checkApprovals, impactOf, planDigest, REGISTERED_APPROVAL_VERIFIER, type ApprovalRecord, type ApprovalVerifier, type ResponsePlan } from "./approval.ts";
import { appendEvidence, type EvidenceEntry, type EvidenceKind } from "./evidence.ts";
import { actionsForLevel, evaluateIncident, type IncidentAssessment } from "./policy.ts";
import { describePorts, executeActions, productionReady, REGISTERED_STATE_STORE, type BlackoutPorts, type BlackoutStateStore, type ExecutionResult, type PortName, type PortStatus } from "./ports.ts";
import { INITIAL_STORED_STATE, validateStoredState, type StoredBlackoutState } from "./state.ts";
import { planRecovery, type RecoveryChecklist } from "./state-machine.ts";
import type { ActionType, BlackoutLevel, ResponseAction, SecurityEvent } from "./types.ts";

/**
 * BLACKOUT olay müdahale denetleyicisi: değerlendirme → plan → insan onayı → yürütme →
 * sürüm karşılaştırmalı durum yazımı → kanıt.
 *
 * Güvenceler:
 *  - Varsayılan dry-run; hiçbir port çağrılmaz, durum yazılmaz.
 *  - RESTRICTED/LOCKDOWN yalnız o düzeyin tüm eylemleri doğrulanmış onayla yürütülebiliyorsa
 *    uygulanır; aksi hâlde en fazla WATCH (yalnız izleme, rota etkisi yok).
 *  - Düzeyi doğrudan ayarlayan genel bir yöntem YOKTUR; düzey yalnız bu akışla değişir.
 *  - Aynı olay yeniden gönderildiğinde daha önce yürütülen eylemler tekrarlanmaz.
 *  - Paylaşılan depo yoksa sonuç "requires_infrastructure"; yalnız bu sürecin görüşü güncellenir
 *    ve proxy/edge bunu görmez (çok sunuculu koruma iddia edilmez).
 *  - Depo erişilemezse düzey değiştirilmez; otomatik eylemler (kanıt, bildirim) yine denenir.
 */

export type PersistenceStatus = "persisted" | "dry_run" | "requires_infrastructure" | "store_unavailable" | "version_conflict" | "failed" | "not_needed";

export interface ControllerDeps {
  ports?: BlackoutPorts;
  store?: BlackoutStateStore | null;
  approvalVerifier?: ApprovalVerifier | null;
  now?: () => number;
  dryRun?: boolean;
}

export interface IncidentReport {
  incidentId: string;
  duplicate: boolean;
  assessment: Pick<IncidentAssessment, "recommendedLevel" | "maxSeverity" | "corroborated" | "reasons" | "discarded">;
  planSha256: string;
  previousLevel: BlackoutLevel;
  appliedLevel: BlackoutLevel;
  levelLimitedBy: string[];
  approvers: string[];
  rejectedApprovals: { reason: string }[];
  blocked: { action: string; reason: string }[];
  results: ExecutionResult[];
  persistence: PersistenceStatus;
  evidence: { entries: number; sink: PortStatus };
  portStatus: Record<PortName, PortStatus>;
  productionReady: boolean;
}

export interface RecoveryReport {
  allowed: boolean;
  from: BlackoutLevel;
  to: BlackoutLevel;
  reasons: string[];
  approvers: string[];
  results: ExecutionResult[];
  persistence: PersistenceStatus;
}

const actionKey = (action: ResponseAction) => `${action.type}${"scope" in action ? `:${action.scope}` : ""}`;
const REVERSIBLE: readonly ActionType[] = ["disable_critical_api", "freeze_writes", "enable_read_only_mode"];
/** Eylemin ilk göründüğü düzey (salt okuma; sınıf yüzeyinde değil). */
function actionTier(action: ResponseAction): BlackoutLevel {
  for (const tier of [1, 2, 3] as const) if (actionsForLevel(tier).some((a) => actionKey(a) === actionKey(action))) return tier;
  return 3;
}

export class BlackoutController {
  private readonly ports: BlackoutPorts;
  private readonly store: BlackoutStateStore | null;
  private readonly verifier: ApprovalVerifier | null;
  private readonly now: () => number;
  private readonly dryRun: boolean;
  private ledger: readonly EvidenceEntry[] = [];
  private flushed = 0;
  /** Paylaşılan depo yokken bu sürecin görüşü (proxy bunu okumaz). */
  private local: StoredBlackoutState = INITIAL_STORED_STATE;
  private readonly executedByIncident = new Map<string, Set<string>>();

  constructor(deps: ControllerDeps = {}) {
    this.ports = deps.ports ?? {};
    this.store = deps.store === undefined ? REGISTERED_STATE_STORE : deps.store;
    this.verifier = deps.approvalVerifier === undefined ? REGISTERED_APPROVAL_VERIFIER : deps.approvalVerifier;
    this.now = deps.now ?? Date.now;
    this.dryRun = deps.dryRun !== false;
  }

  getLedger(): readonly EvidenceEntry[] { return this.ledger; }

  /** Onaylayanların imzalayacağı planı ve özetini üretir (deterministik). */
  previewPlan(events: readonly SecurityEvent[], requestedBy: string): { plan: ResponsePlan; planSha256: string; assessment: IncidentAssessment } {
    const assessment = evaluateIncident(events, this.now());
    const incidentId = this.incidentIdFor(assessment);
    const createdAt = assessment.considered.reduce((max, e) => Math.max(max, e.observedAt), 0);
    const plan: ResponsePlan = { incidentId, requestedBy, targetLevel: assessment.recommendedLevel, actions: actionsForLevel(assessment.recommendedLevel), createdAt };
    return { plan, planSha256: planDigest(plan), assessment };
  }

  async respond(input: { events: readonly SecurityEvent[]; requestedBy: string; approvals?: readonly ApprovalRecord[] }): Promise<IncidentReport> {
    const now = this.now();
    const { plan, planSha256, assessment } = this.previewPlan(input.events, input.requestedBy);
    const current = await this.readCurrent(now);
    const previousLevel = current.state.level;
    const executed = this.executedByIncident.get(plan.incidentId) ?? new Set<string>();
    const duplicate = this.executedByIncident.has(plan.incidentId) && previousLevel >= plan.targetLevel;

    this.record(now, plan.incidentId, "assessment", { recommendedLevel: assessment.recommendedLevel, maxSeverity: assessment.maxSeverity, corroborated: assessment.corroborated, reasons: assessment.reasons, events: assessment.considered.map((e) => ({ id: e.id, kind: e.kind, source: e.source, severity: e.severity })), discarded: assessment.discarded });
    this.record(now, plan.incidentId, "plan", { planSha256, targetLevel: plan.targetLevel, actions: plan.actions.map(actionKey), requestedBy: plan.requestedBy, duplicate });

    const check = await checkApprovals(plan, input.approvals ?? [], this.verifier, now);
    this.record(now, plan.incidentId, "approval", { approvers: check.approvers, rejected: check.rejectedApprovals, blocked: check.blocked.map((b) => ({ action: actionKey(b.action), reason: b.reason })) });

    // Uygulanabilecek en yüksek düzey: düzeye özgü eylemlerin tamamı yürütülebilir olmalı.
    const executableKeys = new Set(check.executable.map(actionKey));
    const levelLimitedBy: string[] = [];
    let appliedLevel: BlackoutLevel = previousLevel;
    for (const level of [1, 2, 3] as const) {
      if (level > plan.targetLevel || level <= previousLevel) continue;
      const needed = actionsForLevel(level).filter((a) => impactOf(a) !== "automatic");
      const missing = needed.filter((a) => !executableKeys.has(actionKey(a)));
      if (missing.length) { levelLimitedBy.push(...missing.map((a) => `${actionKey(a)}:onay-yok`)); break; }
      appliedLevel = level;
    }
    if (current.unavailable && appliedLevel !== previousLevel) { levelLimitedBy.push("durum-deposu-erişilemez"); appliedLevel = previousLevel; }

    const toRun = check.executable.filter((a) => !executed.has(actionKey(a)) && (impactOf(a) === "automatic" || appliedLevel >= actionTier(a)));
    const pending = this.ledger.slice(this.flushed);
    const results = await executeActions(toRun, this.ports, { incidentId: plan.incidentId, level: appliedLevel, reason: assessment.reasons.join(","), ledger: pending, dryRun: this.dryRun });
    for (const [i, action] of toRun.entries()) if (results[i].status === "executed" || results[i].status === "dry_run") executed.add(actionKey(action));
    if (results.some((r) => r.action === "preserve_evidence" && r.status === "executed")) this.flushed += pending.length;
    for (const action of check.executable.filter((a) => !toRun.includes(a))) results.push({ action: action.type, status: "dry_run", detail: executed.has(actionKey(action)) ? "daha-önce-uygulandı" : "düzey-uygulanmadı" });
    this.executedByIncident.set(plan.incidentId, executed);
    this.record(now, plan.incidentId, "execution", { dryRun: this.dryRun, results });

    let persistence: PersistenceStatus = "not_needed";
    if (appliedLevel !== previousLevel) {
      const applied = [...new Set([...current.state.appliedActions, ...toRun.map((a) => a.type).filter((t) => REVERSIBLE.includes(t))])];
      const next: StoredBlackoutState = { level: appliedLevel, version: current.state.version + 1, since: now, updatedAt: now, incidentId: plan.incidentId, appliedActions: applied, transitionSha256: planSha256 };
      persistence = await this.persist(current, next);
    } else if (current.unavailable) {
      persistence = "store_unavailable";
    }
    this.record(now, plan.incidentId, "transition", { from: previousLevel, to: persistence === "persisted" || persistence === "requires_infrastructure" ? appliedLevel : previousLevel, attempted: appliedLevel, persistence, levelLimitedBy });
    await this.flushEvidence();

    const portStatus = describePorts(this.ports, this.store);
    return {
      incidentId: plan.incidentId,
      duplicate,
      assessment: { recommendedLevel: assessment.recommendedLevel, maxSeverity: assessment.maxSeverity, corroborated: assessment.corroborated, reasons: assessment.reasons, discarded: assessment.discarded },
      planSha256,
      previousLevel,
      appliedLevel: persistence === "persisted" || persistence === "requires_infrastructure" || persistence === "dry_run" || persistence === "not_needed" ? appliedLevel : previousLevel,
      levelLimitedBy,
      approvers: check.approvers,
      rejectedApprovals: check.rejectedApprovals,
      blocked: check.blocked.map((b) => ({ action: actionKey(b.action), reason: b.reason })),
      results,
      persistence,
      evidence: { entries: this.ledger.length, sink: portStatus.evidence },
      portStatus,
      productionReady: productionReady(this.ports, this.store),
    };
  }

  /** Geri dönüş planının onaylanacak özeti (bir kademe aşağı). */
  async previewRecovery(requestedBy: string, checklist: RecoveryChecklist): Promise<{ plan: ResponsePlan; planSha256: string } | null> {
    const current = await this.readCurrent(this.now());
    if (current.unavailable || current.state.level === 0) return null;
    const recovery = planRecovery(this.asMachineState(current.state), checklist, this.now());
    const plan: ResponsePlan = { incidentId: current.state.incidentId ?? "recovery", requestedBy, targetLevel: recovery.to, actions: recovery.inverseActions, createdAt: current.state.since };
    return { plan, planSha256: planDigest(plan) };
  }

  async recover(input: { requestedBy: string; checklist: RecoveryChecklist; approvals?: readonly ApprovalRecord[] }): Promise<RecoveryReport> {
    const now = this.now();
    const current = await this.readCurrent(now);
    if (current.unavailable) return { allowed: false, from: 0, to: 0, reasons: ["durum-deposu-erişilemez"], approvers: [], results: [], persistence: "store_unavailable" };
    const from = current.state.level;
    const recovery = planRecovery(this.asMachineState(current.state), input.checklist, now);
    if (!recovery.allowed) return { allowed: false, from, to: recovery.to, reasons: recovery.reasons, approvers: [], results: [], persistence: "not_needed" };

    const plan: ResponsePlan = { incidentId: current.state.incidentId ?? "recovery", requestedBy: input.requestedBy, targetLevel: recovery.to, actions: recovery.inverseActions, createdAt: current.state.since };
    const check = await checkApprovals(plan, input.approvals ?? [], this.verifier, now);
    const required = from >= 2 ? 2 : 1;
    const reasons: string[] = [];
    if (!this.verifier) reasons.push("onay-doğrulayıcısı-kayıtlı-değil");
    else if (check.approvers.length < required) reasons.push(required === 2 ? "iki-farklı-onay-gerekli" : "onay-gerekli");
    if (check.blocked.length) reasons.push(...check.blocked.map((b) => `${actionKey(b.action)}:${b.reason}`));
    if (reasons.length) {
      this.record(now, plan.incidentId, "recovery", { from, to: recovery.to, allowed: false, reasons, approvers: check.approvers });
      await this.flushEvidence();
      return { allowed: false, from, to: recovery.to, reasons: [...new Set(reasons)], approvers: check.approvers, results: [], persistence: "not_needed" };
    }

    const results = await executeActions(recovery.inverseActions, this.ports, { incidentId: plan.incidentId, level: recovery.to, reason: "kontrollü-geri-dönüş", dryRun: this.dryRun });
    const failed = results.filter((r) => r.status === "failed");
    if (failed.length) {
      this.record(now, plan.incidentId, "recovery", { from, to: recovery.to, allowed: false, reasons: ["ters-eylem-başarısız"], results });
      await this.flushEvidence();
      return { allowed: false, from, to: recovery.to, reasons: ["ters-eylem-başarısız"], approvers: check.approvers, results, persistence: "not_needed" };
    }
    const reversed = new Set(recovery.inverseActions.length ? (from === 3 ? ["freeze_writes", "enable_read_only_mode"] : from === 2 ? ["disable_critical_api"] : []) : []);
    const next: StoredBlackoutState = { level: recovery.to, version: current.state.version + 1, since: now, updatedAt: now, incidentId: recovery.to === 0 ? null : current.state.incidentId, appliedActions: current.state.appliedActions.filter((a) => !reversed.has(a)), transitionSha256: planDigest(plan) };
    const persistence = await this.persist(current, next);
    this.record(now, plan.incidentId, "recovery", { from, to: recovery.to, allowed: true, approvers: check.approvers, results, persistence });
    await this.flushEvidence();
    return { allowed: true, from, to: recovery.to, reasons: [], approvers: check.approvers, results, persistence };
  }

  // ---- iç yardımcılar ----

  private incidentIdFor(assessment: IncidentAssessment): string {
    const ids = assessment.considered.map((e) => e.id).sort();
    return `INC-${createHash("sha256").update(JSON.stringify(ids)).digest("hex").slice(0, 16)}`;
  }

  private asMachineState(state: StoredBlackoutState) {
    return { level: state.level, since: state.since, incidentId: state.incidentId, applied: state.appliedActions.map((type) => ({ action: { type } as ResponseAction, appliedAt: state.since })), history: [] };
  }

  private async readCurrent(now: number): Promise<{ state: StoredBlackoutState; unavailable: boolean }> {
    if (!this.store) return { state: this.local, unavailable: false };
    try {
      const raw = await this.store.read();
      const checked = validateStoredState(raw ?? INITIAL_STORED_STATE, now);
      return checked.ok ? { state: checked.state, unavailable: false } : { state: INITIAL_STORED_STATE, unavailable: true };
    } catch {
      return { state: INITIAL_STORED_STATE, unavailable: true };
    }
  }

  private async persist(current: { state: StoredBlackoutState; unavailable: boolean }, next: StoredBlackoutState): Promise<PersistenceStatus> {
    if (this.dryRun) return "dry_run";
    if (!this.store) { this.local = next; return "requires_infrastructure"; }
    if (current.unavailable) return "store_unavailable";
    try {
      const result = await this.store.compareAndSet(current.state.version, next);
      return result.ok ? "persisted" : "version_conflict";
    } catch {
      return "failed";
    }
  }

  private record(at: number, incidentId: string, kind: EvidenceKind, payload: unknown) {
    this.ledger = appendEvidence(this.ledger, { at, incidentId, kind, payload });
  }

  private async flushEvidence() {
    const sink = this.ports.evidence;
    if (!sink || this.dryRun) return;
    for (const entry of this.ledger.slice(this.flushed)) {
      try { await sink.append(entry); this.flushed = entry.sequence; } catch { break; }
    }
  }
}
