import { blackoutRouteDecision, type BlackoutRouteDecision } from "./access.ts";
import { REGISTERED_STATE_STORE } from "./ports.ts";
import { resolveBlackoutState, type BlackoutStateReader, type ResolvedBlackoutState, type StateRecordVerifier } from "./state.ts";

/**
 * Next.js proxy için BLACKOUT geçiş katmanı (`proxy.ts` FORTRESS kararından SONRA çağırır).
 *
 * - Kayıtlı durum deposu yoksa (bugün) düzey NORMAL çözülür, karar her zaman "allow"; davranış
 *   değişmez ve ağ çağrısı yapılmaz.
 * - Depo kayıtlıysa kayıt okunur ve doğrulanır. Erişilemez/geçersiz kayıt "degraded" sayılır:
 *   herkese açık okuma sürer, yönetim/araştırma yüzeyleri ve API yazımları 503 olur.
 * - Bu katman tek bir sunucu örneğinin görüşüdür. Çok sunuculu tutarlılık yalnız paylaşılan ve
 *   kalıcı bir depo (ör. KV) ile sağlanır; o yokken çok sunuculu koruma varmış gibi davranılmaz.
 * - Gecikme sınırı: depo okuması `timeoutMs` içinde dönmezse kayıt erişilemez sayılır (degraded).
 */

export interface BlackoutGateOptions {
  store?: BlackoutStateReader | null;
  verifier?: StateRecordVerifier | null;
  now?: number;
  timeoutMs?: number;
}

export interface BlackoutGateResult {
  decision: BlackoutRouteDecision;
  state: ResolvedBlackoutState;
}

function withTimeout(reader: BlackoutStateReader, timeoutMs: number): BlackoutStateReader {
  return {
    read: () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("blackout-state-timeout")), timeoutMs);
      reader.read().then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
    }),
  };
}

export async function blackoutGate(request: { method: string; pathname: string }, options: BlackoutGateOptions = {}): Promise<BlackoutGateResult> {
  const store = options.store === undefined ? REGISTERED_STATE_STORE : options.store;
  const now = options.now ?? Date.now();
  const reader = store ? withTimeout(store, options.timeoutMs ?? 250) : null;
  const state = await resolveBlackoutState(reader, now, options.verifier === undefined ? undefined : options.verifier);
  return { decision: blackoutRouteDecision(state.level, request, { degraded: state.degraded }), state };
}

/** 503 yanıt gövdesi: düzey adı veya iç ayrıntı sızdırılmaz. */
export const BLACKOUT_DENY_BODY = "Hizmet güvenlik incelemesi nedeniyle geçici olarak kısıtlandı.";
