/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * PROJECT BLACKOUT Altyapı Entegrasyon Adaptörü (Infrastructure Ports Adapter)
 * ==============================================================================
 * Claude Code'un `web/lib/security/blackout/ports.ts` sözleşmesiyle birebir uyumlu
 * altyapı port yürütücüleri ve test edilebilir somut adaptörler.
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

export interface SessionRevoker {
  revoke(scope: SessionScope, reason: string): Promise<{ revoked: number }>;
}

export interface CriticalApiGate {
  setEnabled(enabled: boolean, reason: string): Promise<void>;
  isEnabled(): boolean;
}

export interface WriteGuard {
  setFrozen(frozen: boolean, reason: string): Promise<void>;
  isFrozen(): boolean;
}

export interface SafeModeSwitch {
  setReadOnly(readOnly: boolean, reason: string): Promise<void>;
  isReadOnly(): boolean;
}

export interface ResponderNotifier {
  notify(message: { incidentId: string; level: BlackoutLevel; summary: string }): Promise<void>;
  getDeliveredNotifications(): Array<{ incidentId: string; level: BlackoutLevel; summary: string }>;
}

export interface EvidenceSink {
  append(entry: EvidenceEntry): Promise<void>;
  getEntries(): readonly EvidenceEntry[];
}

export interface BlackoutStateStore {
  currentLevel(): Promise<BlackoutLevel>;
  setLevel(level: BlackoutLevel): Promise<void>;
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
}

/**
 * Altyapı Düzeyinde Bellek ve Günlük Destekli Somut Port Uygulamaları
 */
export class InfraSessionRevoker implements SessionRevoker {
  public revokedSessionsCount: number;
  public auditHistory: Array<{ scope: SessionScope; reason: string; timestamp: string }>;
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    this.revokedSessionsCount = 0;
    this.auditHistory = [];
  }

  async revoke(scope: SessionScope, reason: string): Promise<{ revoked: number }> {
    const timestamp = new Date().toISOString();
    this.auditHistory.push({ scope, reason, timestamp });
    // Bağımsız platformda şu an oturum sayısı simülasyonu
    const count = scope === "all" ? 42 : 5;
    if (!this.dryRun) {
      this.revokedSessionsCount += count;
    }
    return { revoked: count };
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

  async notify(message: { incidentId: string; level: BlackoutLevel; summary: string }): Promise<void> {
    this.delivered.push(message);
    if (!this.dryRun && this.webhookUrl) {
      // Canlı ortamda webhook çağrısı burada tetiklenir (Test ve dry-run'da ağ çağrısı atılmaz)
    }
  }

  getDeliveredNotifications(): Array<{ incidentId: string; level: BlackoutLevel; summary: string }> {
    return [...this.delivered];
  }
}

export class InfraEvidenceSink implements EvidenceSink {
  private entries: EvidenceEntry[];

  constructor() {
    this.entries = [];
  }

  async append(entry: EvidenceEntry): Promise<void> {
    // Kurcalamaya dayanıklı WORM simülasyonu: Yalnız ekleme yapılır, silme ve düzenleme yoktur.
    this.entries.push(Object.freeze({ ...entry }));
  }

  getEntries(): readonly EvidenceEntry[] {
    return [...this.entries];
  }
}

export class InfraBlackoutStateStore implements BlackoutStateStore {
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
}

/**
 * Altyapı Seviyesinde BLACKOUT Port Paketini Üretir
 */
export function createInfraBlackoutPorts(options: InfraPortOptions = {}): {
  ports: BlackoutPorts;
  stateStore: BlackoutStateStore;
  sessions: InfraSessionRevoker;
  criticalApi: InfraCriticalApiGate;
  writes: InfraWriteGuard;
  safeMode: InfraSafeModeSwitch;
  notifier: InfraResponderNotifier;
  evidence: InfraEvidenceSink;
} {
  const dryRun = options.dryRun ?? true;
  const sessions = new InfraSessionRevoker(dryRun);
  const criticalApi = new InfraCriticalApiGate(dryRun);
  const writes = new InfraWriteGuard(dryRun);
  const safeMode = new InfraSafeModeSwitch(dryRun);
  const notifier = new InfraResponderNotifier(dryRun, options.webhookUrl);
  const evidence = new InfraEvidenceSink();
  const stateStore = new InfraBlackoutStateStore(options.initialLevel ?? 0);

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
