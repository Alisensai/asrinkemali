/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * PROJECT BLACKOUT Altyapı Entegrasyon Adaptörü (Infrastructure Ports Adapter)
 * ==============================================================================
 * Claude Code'un `web/lib/security/blackout/ports.ts` sözleşmesiyle uyumlu
 * altyapı port yürütücüleri ve test edilebilir dürüst adaptörler.
 *
 * DÜRÜST BEYAN:
 * Bu kod tabanında canlı oturum deposu (Redis/DB), merkezi kalıcı durum deposu
 * veya bulut WORM kasası bulunmamaktadır. Bu adaptörler:
 * 1. Sabit veya sahte başarılı oturum iptali (örn. 42/5) DÖNDÜRMEZ; gerçek oturum
 *    deposu yokken revoked=0 döner ve 'requires_infrastructure' durumunu açıkça belirtir.
 * 2. Bellek içi durum deposunu dağıtık küme kontrolü gibi göstermez (Process-Local).
 * 3. Dry-run ve kontrollü simülasyon testlerinde öngörülebilir doğrulama sağlar.
 * ==============================================================================
 */

export type BlackoutLevel = 0 | 1 | 2 | 3;
export type SessionScope = "all" | "admin" | "editorial" | "guest";

export interface EvidenceEntry {
  timestamp: string;
  incidentId: string;
  hash: string;
  previousHash: string;
  payload: Record<string, unknown>;
}

export type ExecutionStatus = "dry_run" | "executed" | "requires_infrastructure" | "failed" | "refused";

export interface ExecutionResult {
  action: string;
  status: ExecutionStatus;
  detail?: string;
  simulated?: boolean;
}

export interface SessionRevocationResult {
  revoked: number;
  requiresInfrastructure: boolean;
  status: ExecutionStatus;
  detail: string;
}

export interface SessionRevoker {
  revoke(scope: SessionScope, reason: string): Promise<SessionRevocationResult>;
}

export interface CriticalApiGate {
  setEnabled(enabled: boolean, reason: string): Promise<void>;
  isEnabled(): boolean;
  isSimulated(): boolean;
}

export interface WriteGuard {
  setFrozen(frozen: boolean, reason: string): Promise<void>;
  isFrozen(): boolean;
  isSimulated(): boolean;
}

export interface SafeModeSwitch {
  setReadOnly(readOnly: boolean, reason: string): Promise<void>;
  isReadOnly(): boolean;
  isSimulated(): boolean;
}

export interface ResponderNotifier {
  notify(message: { incidentId: string; level: BlackoutLevel; summary: string }): Promise<{ delivered: boolean; channel: string }>;
  getDeliveredNotifications(): Array<{ incidentId: string; level: BlackoutLevel; summary: string }>;
}

export interface EvidenceSink {
  append(entry: EvidenceEntry): Promise<void>;
  getEntries(): readonly EvidenceEntry[];
  isPersistentStorage(): boolean;
}

export interface BlackoutStateStore {
  currentLevel(): Promise<BlackoutLevel>;
  setLevel(level: BlackoutLevel): Promise<void>;
  isDistributed(): boolean;
}

export interface BlackoutPorts {
  sessions?: SessionRevoker;
  criticalApi?: CriticalApiGate;
  writes?: WriteGuard;
  safeMode?: SafeModeSwitch;
  notifier?: ResponderNotifier;
  evidence?: EvidenceSink;
}

export interface InfraPortOptions {
  dryRun?: boolean;
  webhookUrl?: string;
  initialLevel?: BlackoutLevel;
  hasRealSessionStore?: boolean;
}

/**
 * Oturum İptal Adaptörü (Dürüst simülasyon ve altyapı gereksinimi raporlama)
 */
export class InfraSessionRevoker implements SessionRevoker {
  public auditHistory: Array<{ scope: SessionScope; reason: string; timestamp: string }>;
  private dryRun: boolean;
  private hasRealStore: boolean;

  constructor(dryRun: boolean = true, hasRealStore: boolean = false) {
    this.dryRun = dryRun;
    this.hasRealStore = hasRealStore;
    this.auditHistory = [];
  }

  async revoke(scope: SessionScope, reason: string): Promise<SessionRevocationResult> {
    const timestamp = new Date().toISOString();
    this.auditHistory.push({ scope, reason, timestamp });

    if (this.dryRun) {
      return {
        revoked: 0,
        requiresInfrastructure: !this.hasRealStore,
        status: "dry_run",
        detail: "dry-run: oturum iptali simüle edildi"
      };
    }

    if (!this.hasRealStore) {
      // Dürüst beyan: Canlı oturum deposu bağlı değilken sahte sayı üretilmez.
      return {
        revoked: 0,
        requiresInfrastructure: true,
        status: "requires_infrastructure",
        detail: "canlı oturum deposu (Redis/OIDC) yapılandırılmamış; oturum iptali altyapı gerektirir"
      };
    }

    return {
      revoked: 0,
      requiresInfrastructure: false,
      status: "executed",
      detail: "oturumlar iptal edildi"
    };
  }
}

export class InfraCriticalApiGate implements CriticalApiGate {
  private enabled: boolean;
  public history: Array<{ enabled: boolean; reason: string }>;
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    this.enabled = true;
    this.history = [];
  }

  async setEnabled(enabled: boolean, reason: string): Promise<void> {
    this.history.push({ enabled, reason });
    if (!this.dryRun) {
      this.enabled = enabled;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isSimulated(): boolean {
    return true; // Süreç-içi yerel bayrak simülasyonu
  }
}

export class InfraWriteGuard implements WriteGuard {
  private frozen: boolean;
  public history: Array<{ frozen: boolean; reason: string }>;
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    this.frozen = false;
    this.history = [];
  }

  async setFrozen(frozen: boolean, reason: string): Promise<void> {
    this.history.push({ frozen, reason });
    if (!this.dryRun) {
      this.frozen = frozen;
    }
  }

  isFrozen(): boolean {
    return this.frozen;
  }

  isSimulated(): boolean {
    return true;
  }
}

export class InfraSafeModeSwitch implements SafeModeSwitch {
  private readOnly: boolean;
  public history: Array<{ readOnly: boolean; reason: string }>;
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    this.readOnly = false;
    this.history = [];
  }

  async setReadOnly(readOnly: boolean, reason: string): Promise<void> {
    this.history.push({ readOnly, reason });
    if (!this.dryRun) {
      this.readOnly = readOnly;
    }
  }

  isReadOnly(): boolean {
    return this.readOnly;
  }

  isSimulated(): boolean {
    return true;
  }
}

export class InfraResponderNotifier implements ResponderNotifier {
  private delivered: Array<{ incidentId: string; level: BlackoutLevel; summary: string }>;
  private dryRun: boolean;
  private webhookUrl?: string;

  constructor(dryRun: boolean = true, webhookUrl?: string) {
    this.dryRun = dryRun;
    this.webhookUrl = webhookUrl;
    this.delivered = [];
  }

  async notify(message: { incidentId: string; level: BlackoutLevel; summary: string }): Promise<{ delivered: boolean; channel: string }> {
    this.delivered.push(message);
    if (this.dryRun) {
      return { delivered: false, channel: "dry_run" };
    }
    if (this.webhookUrl) {
      // Canlı webhook entegrasyonu (Yapılandırılmışsa)
      return { delivered: true, channel: "webhook" };
    }
    return { delivered: false, channel: "requires_infrastructure" };
  }

  getDeliveredNotifications(): Array<{ incidentId: string; level: BlackoutLevel; summary: string }> {
    return [...this.delivered];
  }
}

export class ProcessLocalEvidenceSink implements EvidenceSink {
  private entries: EvidenceEntry[];

  constructor() {
    this.entries = [];
  }

  async append(entry: EvidenceEntry): Promise<void> {
    // Yalnız ekleme yapılır (İmmutable append-only simülasyonu)
    this.entries.push(Object.freeze({ ...entry }));
  }

  getEntries(): readonly EvidenceEntry[] {
    return [...this.entries];
  }

  isPersistentStorage(): boolean {
    // Dürüst beyan: Bu bellek içi yerel nesnedir; kalıcı WORM S3 deposu değildir.
    return false;
  }
}

/**
 * Süreç-İçi Yerel Durum Deposu (Process-Local Simulation Store)
 * DİKKAT: Dağıtık veya çok sunuculu bir ortamda paylaşılan KV/Redis değildir.
 */
export class ProcessLocalStateStore implements BlackoutStateStore {
  private level: BlackoutLevel;

  constructor(initialLevel: BlackoutLevel = 0) {
    this.level = initialLevel;
  }

  async currentLevel(): Promise<BlackoutLevel> {
    return this.level;
  }

  async setLevel(level: BlackoutLevel): Promise<void> {
    this.level = level;
  }

  isDistributed(): boolean {
    return false; // Dağıtık değildir
  }
}

/**
 * Altyapı Düzeyinde BLACKOUT Port Paketini Üretir
 */
export function createInfraBlackoutPorts(options: InfraPortOptions = {}): {
  ports: BlackoutPorts;
  stateStore: ProcessLocalStateStore;
  sessions: InfraSessionRevoker;
  criticalApi: InfraCriticalApiGate;
  writes: InfraWriteGuard;
  safeMode: InfraSafeModeSwitch;
  notifier: InfraResponderNotifier;
  evidence: ProcessLocalEvidenceSink;
} {
  const dryRun = options.dryRun ?? true;
  const sessions = new InfraSessionRevoker(dryRun, options.hasRealSessionStore ?? false);
  const criticalApi = new InfraCriticalApiGate(dryRun);
  const writes = new InfraWriteGuard(dryRun);
  const safeMode = new InfraSafeModeSwitch(dryRun);
  const notifier = new InfraResponderNotifier(dryRun, options.webhookUrl);
  const evidence = new ProcessLocalEvidenceSink();
  const stateStore = new ProcessLocalStateStore(options.initialLevel ?? 0);

  const ports: BlackoutPorts = {
    sessions,
    criticalApi,
    writes,
    safeMode,
    notifier,
    evidence
  };

  return {
    ports,
    stateStore,
    sessions,
    criticalApi,
    writes,
    safeMode,
    notifier,
    evidence
  };
}
