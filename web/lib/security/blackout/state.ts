import { ALLOWED_ACTION_TYPES, type ActionType, type BlackoutLevel } from "./types.ts";

/**
 * Paylaşılan BLACKOUT durum kaydı ve fail-safe çözümleme.
 *
 * Kayıt yalnız onaylı bir geçişle (controller) ve sürüm karşılaştırmalı yazma (compare-and-set)
 * ile değişir. Okuyan her katman (proxy, edge) kaydı doğrular; geçersiz veya erişilemeyen kayıt
 * "degraded" sayılır: herkese açık okuma sürer, hassas yüzeyler en az RESTRICTED gibi kapanır.
 * Ortam değişkeniyle düzey belirlemek bilinçli olarak desteklenmez (yetkisiz değişiklik yolu olur).
 */

export interface StoredBlackoutState {
  level: BlackoutLevel;
  /** Monoton artan sürüm; her onaylı yazımda +1. */
  version: number;
  /** Bu düzeye geçiş zamanı (epoch ms); geri dönüş bekleme süresi buna göre hesaplanır. */
  since: number;
  updatedAt: number;
  incidentId: string | null;
  /** Bu düzeyde uygulanmış ve geri alınabilir eylemler (geri dönüşte ters eylemler için). */
  appliedActions: ActionType[];
  /** Onaylı geçiş kaydının SHA-256 özeti (kanıt defterindeki kayda bağ). */
  transitionSha256: string;
  /** İsteğe bağlı imza (ör. HMAC/Ed25519); doğrulayıcı kayıtlıysa zorunlu. */
  signature?: string;
}

export const INITIAL_STORED_STATE: StoredBlackoutState = Object.freeze({
  level: 0, version: 0, since: 0, updatedAt: 0, incidentId: null, appliedActions: [], transitionSha256: "0".repeat(64),
}) as StoredBlackoutState;

/** Kayıt imzası doğrulayıcısı (KMS/HSM anahtarıyla). Bu repoda kayıtlı değil. */
export interface StateRecordVerifier { verify(record: StoredBlackoutState): Promise<boolean> }
export const REGISTERED_STATE_RECORD_VERIFIER: StateRecordVerifier | null = null;

export function validateStoredState(value: unknown, now: number): { ok: true; state: StoredBlackoutState } | { ok: false; reason: string } {
  if (!value || typeof value !== "object") return { ok: false, reason: "kayıt-nesne-değil" };
  const v = value as Record<string, unknown>;
  if (v.level !== 0 && v.level !== 1 && v.level !== 2 && v.level !== 3) return { ok: false, reason: "düzey-geçersiz" };
  if (!Number.isInteger(v.version) || (v.version as number) < 0) return { ok: false, reason: "sürüm-geçersiz" };
  for (const key of ["since", "updatedAt"] as const) {
    if (!Number.isFinite(v[key]) || (v[key] as number) < 0) return { ok: false, reason: `${key}-geçersiz` };
    if ((v[key] as number) > now + 60_000) return { ok: false, reason: `${key}-gelecekte` };
  }
  if (v.incidentId !== null && typeof v.incidentId !== "string") return { ok: false, reason: "olay-kimliği-geçersiz" };
  if (!Array.isArray(v.appliedActions) || !v.appliedActions.every((a) => (ALLOWED_ACTION_TYPES as readonly unknown[]).includes(a))) return { ok: false, reason: "eylem-listesi-geçersiz" };
  if (typeof v.transitionSha256 !== "string" || !/^[0-9a-f]{64}$/.test(v.transitionSha256)) return { ok: false, reason: "geçiş-özeti-geçersiz" };
  if (v.signature !== undefined && typeof v.signature !== "string") return { ok: false, reason: "imza-geçersiz" };
  return { ok: true, state: v as unknown as StoredBlackoutState };
}

export type ResolvedSource = "not_configured" | "store" | "store_unavailable" | "invalid_record" | "signature_invalid";

export interface ResolvedBlackoutState {
  level: BlackoutLevel;
  degraded: boolean;
  source: ResolvedSource;
  version: number | null;
  reason?: string;
}

/** Durum deposunun okuma sözleşmesi (yazma: compareAndSet, bkz. ports.ts). */
export interface BlackoutStateReader { read(): Promise<unknown> }

/**
 * Etkin düzeyi çözer. Depo kayıtlı değilse NORMAL (bugünkü durum; davranış değişmez).
 * Depo hatası, geçersiz kayıt veya imza hatası: son bilinen düzey bilinmez kabul edilir,
 * `degraded: true` döner. Okuma katmanı bunu hassas yüzeyleri kapatmak için kullanır.
 */
export async function resolveBlackoutState(
  store: BlackoutStateReader | null,
  now: number,
  verifier: StateRecordVerifier | null = REGISTERED_STATE_RECORD_VERIFIER,
): Promise<ResolvedBlackoutState> {
  if (!store) return { level: 0, degraded: false, source: "not_configured", version: null };
  let raw: unknown;
  try { raw = await store.read(); } catch { return { level: 0, degraded: true, source: "store_unavailable", version: null, reason: "depo-erişilemez" }; }
  const checked = validateStoredState(raw, now);
  if (!checked.ok) return { level: 0, degraded: true, source: "invalid_record", version: null, reason: checked.reason };
  if (verifier) {
    let valid = false;
    try { valid = await verifier.verify(checked.state); } catch { valid = false; }
    if (!valid) return { level: 0, degraded: true, source: "signature_invalid", version: null, reason: "imza-doğrulanamadı" };
  }
  return { level: checked.state.level, degraded: false, source: "store", version: checked.state.version };
}
