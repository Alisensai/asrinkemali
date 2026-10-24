import { ALLOWED_ACTION_TYPES, FORBIDDEN_ACTION_TYPES, type BlackoutLevel, type ResponseAction, type SessionScope } from "./types.ts";
import type { EvidenceEntry } from "./evidence.ts";

/**
 * Altyapı entegrasyon arayüzleri ve yürütücü.
 *
 * Bu repoda hiçbir port için gerçek uygulama YOKTUR (kimlik sağlayıcısı, oturum deposu,
 * veritabanı, WAF/CDN, kalıcı durum deposu bulunmuyor). Yürütücü varsayılan olarak dry-run
 * çalışır; port eksikse eylem "requires_infrastructure" döner ve hiçbir şey kesilmez.
 * Yasak eylemler (veri silme, yedek imhası, günlük yok etme) her koşulda reddedilir.
 */

export interface SessionRevoker { revoke(scope: SessionScope, reason: string): Promise<{ revoked: number }> }
export interface CriticalApiGate { setEnabled(enabled: boolean, reason: string): Promise<void> }
export interface WriteGuard { setFrozen(frozen: boolean, reason: string): Promise<void> }
export interface SafeModeSwitch { setReadOnly(readOnly: boolean, reason: string): Promise<void> }
export interface ResponderNotifier { notify(message: { incidentId: string; level: BlackoutLevel; summary: string }): Promise<void> }
/** Değiştirilemez kanıt deposu (WORM). Arayüzde bilinçli olarak silme yöntemi yoktur. */
export interface EvidenceSink { append(entry: EvidenceEntry): Promise<void> }
/** Paylaşılan BLACKOUT düzeyi deposu (çok örnekli dağıtımda tüm sunucular aynı düzeyi okur). */
export interface BlackoutStateStore { currentLevel(): Promise<BlackoutLevel> }

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

export async function currentBlackoutLevel(store: BlackoutStateStore | null = REGISTERED_STATE_STORE): Promise<BlackoutLevel> {
  if (!store) return 0;
  try {
    const level = await store.currentLevel();
    return level === 1 || level === 2 || level === 3 ? level : 0;
  } catch {
    // Depo erişilemezse son bilinen düzey bilinmez; ayrıcalıklı yüzeyler zaten kapalı-başarısız
    // olduğundan herkese açık okuma kesilmez. İzleme düzeyine geçilir ve olay kaydedilmelidir.
    return 1;
  }
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
      await run();
      results.push({ action: type, status: "executed" });
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
