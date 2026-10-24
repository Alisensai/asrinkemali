import { ALLOWED_ACTION_TYPES, FORBIDDEN_ACTION_TYPES, type BlackoutLevel, type ResponseAction, type SessionScope } from "./types.ts";
import type { EvidenceEntry } from "./evidence.ts";
import { resolveBlackoutState, type BlackoutStateReader, type ResolvedBlackoutState, type StoredBlackoutState } from "./state.ts";

/**
 * Altyapı entegrasyon arayüzleri ve yürütücü.
 *
 * Bu repoda hiçbir port production'a BAĞLI DEĞİLDİR (kimlik sağlayıcısı, oturum deposu,
 * veritabanı, WAF/CDN, kalıcı durum deposu bulunmuyor). `adapters/` altında bağımsız test
 * edilen bir HTTPS durum deposu adaptörü ve kendini "test_double" olarak tanıtan bellek içi
 * adaptörler vardır; bellek içi adaptörler production entegrasyonu sayılmaz.
 * Yürütücü varsayılan olarak dry-run çalışır; port eksikse eylem "requires_infrastructure"
 * döner ve hiçbir şey kesilmez.
 * Yasak eylemler (veri silme, yedek imhası, günlük yok etme) her koşulda reddedilir.
 */

/** Port tanımlayıcısı: raporlarda gerçek entegrasyon ile test ikizini ayırt etmek için. */
export interface PortDescriptor {
  kind: "external" | "test_double";
  /** "memory": süreç belleği (yeniden başlatmada kaybolur, örnekler arası paylaşılmaz). */
  persistence: "remote" | "memory";
  /** Bellek içi ikizler hiçbir zaman production'a uygun sayılmaz. */
  productionEligible: boolean;
  description: string;
}
interface Described { readonly descriptor?: PortDescriptor }

/** Gerçek iptal sayısı döndürmelidir; oturum deposu yoksa port tanımlanmaz (sahte sayı yok). */
export interface SessionRevoker extends Described { revoke(scope: SessionScope, reason: string): Promise<{ revoked: number }> }
export interface CriticalApiGate extends Described { setEnabled(enabled: boolean, reason: string): Promise<void> }
export interface WriteGuard extends Described { setFrozen(frozen: boolean, reason: string): Promise<void> }
export interface SafeModeSwitch extends Described { setReadOnly(readOnly: boolean, reason: string): Promise<void> }
export interface ResponderNotifier extends Described { notify(message: { incidentId: string; level: BlackoutLevel; summary: string }): Promise<void> }
/**
 * Değiştirilemez kanıt deposu (WORM). Arayüzde bilinçli olarak silme yöntemi yoktur.
 * `append`, zincir sürekliliğini (previousHash = son hash, sequence = son + 1) doğrulamalı ve
 * uymayan kaydı reddetmelidir. Aynı kaydın yeniden gönderimi (aynı hash) idempotent kabul edilir.
 */
export interface EvidenceSink extends Described { append(entry: EvidenceEntry): Promise<void> }

export type CompareAndSetResult = { ok: true; version: number } | { ok: false; reason: "version_conflict"; currentVersion: number };
/**
 * Paylaşılan BLACKOUT düzeyi deposu (çok örnekli dağıtımda tüm sunucular ve edge aynı kaydı okur).
 * Koşulsuz `setLevel` bilinçli olarak YOKTUR: yazma yalnız beklenen sürüm eşleşirse yapılır.
 */
export interface BlackoutStateStore extends BlackoutStateReader, Described {
  read(): Promise<unknown>;
  compareAndSet(expectedVersion: number, next: StoredBlackoutState): Promise<CompareAndSetResult>;
}

export interface BlackoutPorts {
  sessions?: SessionRevoker;
  criticalApi?: CriticalApiGate;
  writes?: WriteGuard;
  safeMode?: SafeModeSwitch;
  notifier?: ResponderNotifier;
  evidence?: EvidenceSink;
}

/** Kayıtlı paylaşılan durum deposu YOKTUR; etkin düzey her zaman NORMAL okunur. */
export const REGISTERED_STATE_STORE: BlackoutStateStore | null = null;

/** Etkin düzeyi çözer (bkz. state.ts `resolveBlackoutState`): depo yoksa NORMAL, hata/geçersizse degraded. */
export function currentBlackoutState(store: BlackoutStateStore | BlackoutStateReader | null = REGISTERED_STATE_STORE, now: number = Date.now()): Promise<ResolvedBlackoutState> {
  return resolveBlackoutState(store, now);
}

export type PortName = "sessions" | "criticalApi" | "writes" | "safeMode" | "notifier" | "evidence" | "stateStore";
export type PortStatus = "connected" | "test_double" | "requires_infrastructure";

/** Her portun gerçek durumu. Tanımlayıcısı olmayan port "external" sayılmaz; test ikizi kabul edilir. */
export function describePorts(ports: BlackoutPorts, stateStore: BlackoutStateStore | null = REGISTERED_STATE_STORE): Record<PortName, PortStatus> {
  const status = (port: Described | undefined | null): PortStatus => {
    if (!port) return "requires_infrastructure";
    const d = port.descriptor;
    return d && d.kind === "external" && d.persistence === "remote" && d.productionEligible ? "connected" : "test_double";
  };
  return {
    sessions: status(ports.sessions), criticalApi: status(ports.criticalApi), writes: status(ports.writes),
    safeMode: status(ports.safeMode), notifier: status(ports.notifier), evidence: status(ports.evidence), stateStore: status(stateStore),
  };
}

/** Production'a hazırlık: tüm portlar gerçek ve uzak olmalı. Bugün false döner. */
export function productionReady(ports: BlackoutPorts, stateStore: BlackoutStateStore | null = REGISTERED_STATE_STORE): boolean {
  return Object.values(describePorts(ports, stateStore)).every((s) => s === "connected");
}

export type ExecutionStatus = "dry_run" | "executed" | "requires_infrastructure" | "failed" | "refused";
export interface ExecutionResult { action: string; status: ExecutionStatus; detail?: string }

export interface ExecutionContext {
  incidentId: string;
  level: BlackoutLevel;
  reason: string;
  ledger?: readonly EvidenceEntry[];
  /** Varsayılan true. Gerçek yürütme yalnız açıkça false verildiğinde ve port varsa yapılır. */
  dryRun?: boolean;
}

export async function executeActions(actions: readonly ResponseAction[], ports: BlackoutPorts, context: ExecutionContext): Promise<ExecutionResult[]> {
  const dryRun = context.dryRun !== false;
  const results: ExecutionResult[] = [];
  for (const action of actions) {
    const type = (action as { type?: unknown })?.type;
    if (typeof type !== "string" || (FORBIDDEN_ACTION_TYPES as readonly string[]).includes(type) || !(ALLOWED_ACTION_TYPES as readonly string[]).includes(type)) {
      results.push({ action: String(type), status: "refused", detail: "izin-verilmeyen-eylem" });
      continue;
    }
    const run = runner(action, ports, context);
    if (!run) { results.push({ action: type, status: "requires_infrastructure" }); continue; }
    if (dryRun) { results.push({ action: type, status: "dry_run" }); continue; }
    try {
      const outcome = await run();
      const revoked = type === "revoke_sessions" && outcome && typeof (outcome as { revoked?: unknown }).revoked === "number" ? (outcome as { revoked: number }).revoked : undefined;
      results.push({ action: type, status: "executed", ...(revoked !== undefined ? { detail: `iptal-edilen-oturum=${revoked}` } : {}) });
    } catch (error) {
      // Bir eylemin hatası diğerlerini durdurmaz; ayrıntı redakte edilmeden kanıta yazılmaz.
      results.push({ action: type, status: "failed", detail: error instanceof Error ? error.name : "error" });
    }
  }
  return results;
}

function runner(action: ResponseAction, ports: BlackoutPorts, context: ExecutionContext): (() => Promise<unknown>) | null {
  const reason = `${context.incidentId}: ${context.reason}`;
  switch (action.type) {
    case "preserve_evidence": {
      const sink = ports.evidence;
      return sink ? async () => { for (const entry of context.ledger ?? []) await sink.append(entry); } : null;
    }
    case "notify_responders": {
      const notifier = ports.notifier;
      return notifier ? () => notifier.notify({ incidentId: context.incidentId, level: context.level, summary: context.reason }) : null;
    }
    case "revoke_sessions": { const s = ports.sessions; return s ? () => s.revoke(action.scope, reason) : null; }
    case "disable_critical_api": { const g = ports.criticalApi; return g ? () => g.setEnabled(false, reason) : null; }
    case "enable_critical_api": { const g = ports.criticalApi; return g ? () => g.setEnabled(true, reason) : null; }
    case "freeze_writes": { const w = ports.writes; return w ? () => w.setFrozen(true, reason) : null; }
    case "unfreeze_writes": { const w = ports.writes; return w ? () => w.setFrozen(false, reason) : null; }
    case "enable_read_only_mode": { const m = ports.safeMode; return m ? () => m.setReadOnly(true, reason) : null; }
    case "disable_read_only_mode": { const m = ports.safeMode; return m ? () => m.setReadOnly(false, reason) : null; }
    default: return null;
  }
}
