import { LEVEL_NAMES, type BlackoutLevel, type ResponseAction } from "./types.ts";

/**
 * BLACKOUT durum makinesi (saf, değişmez durum nesneleri).
 *
 * - Yükseltme doğrudan hedef düzeye yapılabilir (kritik olayda NORMAL → LOCKDOWN).
 * - Geri dönüş yalnız bir kademe aşağı yapılır ve her kademe için en kısa bekleme süresi,
 *   kurtarma kontrol listesi ve (onay modülünde) iki kişilik onay gerekir.
 * - Uygulanan her geri alınabilir eylemin tersi kaydedilir; geri dönüşte ters eylemler önerilir.
 *   Oturum iptali geri alınamaz ama yıkıcı değildir (kullanıcılar yeniden oturum açar).
 *   Kanıt koruma hiçbir zaman geri alınmaz (kanıt saklama kilidi).
 */

export interface AppliedAction {
  action: ResponseAction;
  appliedAt: number;
}

export interface BlackoutState {
  readonly level: BlackoutLevel;
  readonly since: number;
  readonly incidentId: string | null;
  readonly applied: readonly AppliedAction[];
  readonly history: readonly { from: BlackoutLevel; to: BlackoutLevel; at: number; reason: string }[];
}

export const INITIAL_STATE: BlackoutState = Object.freeze({ level: 0, since: 0, incidentId: null, applied: [], history: [] });

/** Bir düzeyden aşağı inmeden önce o düzeyde geçirilmesi gereken en kısa süre. */
export const MIN_DWELL_MS: Record<BlackoutLevel, number> = { 0: 0, 1: 5 * 60_000, 2: 15 * 60_000, 3: 30 * 60_000 };

const INVERSE: Partial<Record<ResponseAction["type"], ResponseAction>> = {
  disable_critical_api: { type: "enable_critical_api" },
  freeze_writes: { type: "unfreeze_writes" },
  enable_read_only_mode: { type: "disable_read_only_mode" },
};

/** Bir düzeye özgü (o düzeye çıkarken eklenen) geri alınabilir eylem türleri. */
const LEVEL_REVERSIBLE: Record<BlackoutLevel, ResponseAction["type"][]> = {
  0: [],
  1: [],
  2: ["disable_critical_api"],
  3: ["freeze_writes", "enable_read_only_mode"],
};

export function escalate(state: BlackoutState, target: BlackoutLevel, executed: readonly ResponseAction[], now: number, incidentId: string, reason: string): BlackoutState {
  if (target <= state.level) throw new Error(`yükseltme hedefi mevcut düzeyden yüksek olmalı (${LEVEL_NAMES[state.level]} → ${LEVEL_NAMES[target]})`);
  return Object.freeze({
    level: target,
    since: now,
    incidentId: state.incidentId ?? incidentId,
    applied: Object.freeze([...state.applied, ...executed.map((action) => ({ action, appliedAt: now }))]),
    history: Object.freeze([...state.history, { from: state.level, to: target, at: now, reason }]),
  });
}

export interface RecoveryChecklist {
  threatContained: boolean;
  evidencePreserved: boolean;
  healthChecksPassing: boolean;
  rootCauseDocumented: boolean;
}

export interface RecoveryPlan {
  allowed: boolean;
  from: BlackoutLevel;
  to: BlackoutLevel;
  reasons: string[];
  /** Bu kademe inişinde yürütülecek ters eylemler (onay modülünde iki kişilik onay ister). */
  inverseActions: ResponseAction[];
}

export function planRecovery(state: BlackoutState, checklist: RecoveryChecklist, now: number): RecoveryPlan {
  const from = state.level;
  if (from === 0) return { allowed: false, from, to: 0, reasons: ["zaten-normal"], inverseActions: [] };
  const to = (from - 1) as BlackoutLevel;
  const reasons: string[] = [];
  if (now - state.since < MIN_DWELL_MS[from]) reasons.push("bekleme-süresi-dolmadı");
  if (!checklist.threatContained) reasons.push("tehdit-kontrol-altında-değil");
  if (!checklist.evidencePreserved) reasons.push("kanıt-korunmadı");
  if (!checklist.healthChecksPassing) reasons.push("sağlık-kontrolleri-başarısız");
  if (from === 3 && !checklist.rootCauseDocumented) reasons.push("kök-neden-belgelenmedi");
  const reversible = LEVEL_REVERSIBLE[from];
  const inverseActions = state.applied
    .filter((item) => reversible.includes(item.action.type))
    .map((item) => INVERSE[item.action.type])
    .filter((action): action is ResponseAction => Boolean(action))
    .reverse();
  return { allowed: reasons.length === 0, from, to, reasons, inverseActions };
}

export function stepDown(state: BlackoutState, plan: RecoveryPlan, executedInverse: readonly ResponseAction[], now: number, reason: string): BlackoutState {
  if (!plan.allowed) throw new Error(`geri dönüşe izin yok: ${plan.reasons.join(", ")}`);
  if (plan.from !== state.level) throw new Error("plan güncel düzeyle uyuşmuyor");
  const missing = plan.inverseActions.filter((inverse) => !executedInverse.some((done) => done.type === inverse.type));
  if (missing.length) throw new Error(`ters eylemler yürütülmedi: ${missing.map((m) => m.type).join(", ")}`);
  const reversedTypes = new Set(LEVEL_REVERSIBLE[state.level]);
  return Object.freeze({
    level: plan.to,
    since: now,
    incidentId: plan.to === 0 ? null : state.incidentId,
    applied: Object.freeze(state.applied.filter((item) => !reversedTypes.has(item.action.type))),
    history: Object.freeze([...state.history, { from: state.level, to: plan.to, at: now, reason }]),
  });
}
