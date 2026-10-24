import type { EvidenceEntry } from "../evidence.ts";
import type {
  BlackoutStateStore, CompareAndSetResult, CriticalApiGate, EvidenceSink, PortDescriptor,
  ResponderNotifier, SafeModeSwitch, SessionRevoker, WriteGuard,
} from "../ports.ts";
import { INITIAL_STORED_STATE, type StoredBlackoutState } from "../state.ts";
import type { BlackoutLevel, SessionScope } from "../types.ts";

/**
 * Bellek içi TEST İKİZLERİ. Süreç belleğinde tutulur; yeniden başlatmada kaybolur, sunucu
 * örnekleri arasında paylaşılmaz. Hiçbiri production entegrasyonu değildir ve tanımlayıcıları
 * bunu açıkça bildirir (`describePorts` → "test_double", `productionReady` → false).
 * Sözleşme davranışı (CAS, zincir sürekliliği, gerçek iptal sayısı) gerçek adaptörlerle aynıdır.
 */

const memoryDescriptor = (description: string): PortDescriptor => Object.freeze({ kind: "test_double", persistence: "memory", productionEligible: false, description });

export class MemoryStateStore implements BlackoutStateStore {
  readonly descriptor = memoryDescriptor("Bellek içi durum deposu (tek süreç)");
  private record: StoredBlackoutState;
  failReads = false;
  failWrites = false;
  constructor(initial: StoredBlackoutState = INITIAL_STORED_STATE) { this.record = { ...initial, appliedActions: [...initial.appliedActions] }; }
  async read(): Promise<unknown> {
    if (this.failReads) throw new Error("depo-erişilemez");
    return { ...this.record, appliedActions: [...this.record.appliedActions] };
  }
  async compareAndSet(expectedVersion: number, next: StoredBlackoutState): Promise<CompareAndSetResult> {
    if (this.failWrites) throw new Error("depo-yazılamaz");
    if (expectedVersion !== this.record.version) return { ok: false, reason: "version_conflict", currentVersion: this.record.version };
    if (next.version !== expectedVersion + 1) return { ok: false, reason: "version_conflict", currentVersion: this.record.version };
    this.record = { ...next, appliedActions: [...next.appliedActions] };
    return { ok: true, version: next.version };
  }
  /** Yalnız testlerde başka bir yazarı taklit etmek için (sürüm atlatır). */
  simulateConcurrentWrite(level: BlackoutLevel) { this.record = { ...this.record, level, version: this.record.version + 1 }; }
}

/** Gerçek iptal sayısı: yalnız bu ikizin tuttuğu oturumlar sayılır. */
export class MemorySessionRevoker implements SessionRevoker {
  readonly descriptor = memoryDescriptor("Bellek içi oturum kümesi");
  private sessions: { id: string; privileged: boolean; suspicious: boolean }[];
  constructor(sessions: { id: string; privileged?: boolean; suspicious?: boolean }[] = []) {
    this.sessions = sessions.map((s) => ({ id: s.id, privileged: Boolean(s.privileged), suspicious: Boolean(s.suspicious) }));
  }
  async revoke(scope: SessionScope): Promise<{ revoked: number }> {
    const match = (s: { privileged: boolean; suspicious: boolean }) => scope === "all" || (scope === "privileged" && s.privileged) || (scope === "suspicious" && s.suspicious);
    const before = this.sessions.length;
    this.sessions = this.sessions.filter((s) => !match(s));
    return { revoked: before - this.sessions.length };
  }
  activeSessionIds() { return this.sessions.map((s) => s.id); }
}

export class MemoryCriticalApiGate implements CriticalApiGate {
  readonly descriptor = memoryDescriptor("Bellek içi API anahtarı");
  enabled = true;
  async setEnabled(enabled: boolean) { this.enabled = enabled; }
}

export class MemoryWriteGuard implements WriteGuard {
  readonly descriptor = memoryDescriptor("Bellek içi yazma dondurma bayrağı (veritabanı yok)");
  frozen = false;
  async setFrozen(frozen: boolean) { this.frozen = frozen; }
}

export class MemorySafeModeSwitch implements SafeModeSwitch {
  readonly descriptor = memoryDescriptor("Bellek içi salt-okunur bayrağı");
  readOnly = false;
  async setReadOnly(readOnly: boolean) { this.readOnly = readOnly; }
}

export class MemoryNotifier implements ResponderNotifier {
  readonly descriptor = memoryDescriptor("Bellek içi bildirim kutusu (dışarı gönderilmez)");
  readonly messages: { incidentId: string; level: BlackoutLevel; summary: string }[] = [];
  async notify(message: { incidentId: string; level: BlackoutLevel; summary: string }) { this.messages.push(message); }
}

/**
 * Yalnız ekleme yapılabilen kanıt deposu ikizi: zincir sürekliliğini doğrular, aynı kaydın yeniden
 * gönderimini yok sayar, sıra dışı veya değiştirilmiş kaydı reddeder. Silme yöntemi yoktur.
 * WORM DEĞİLDİR: süreç belleğidir.
 */
export class MemoryEvidenceSink implements EvidenceSink {
  readonly descriptor = memoryDescriptor("Bellek içi kanıt listesi (WORM değil)");
  private readonly items: EvidenceEntry[] = [];
  async append(entry: EvidenceEntry) {
    const last = this.items.at(-1);
    if (last && entry.sequence <= last.sequence) {
      const existing = this.items[entry.sequence - 1];
      if (existing && existing.hash === entry.hash) return;
      throw new Error("kanıt-zinciri-çakışması");
    }
    const expectedPrevious = last?.hash ?? "0".repeat(64);
    if (entry.previousHash !== expectedPrevious || entry.sequence !== (last?.sequence ?? 0) + 1) throw new Error("kanıt-zinciri-kopuk");
    this.items.push(entry);
  }
  entries(): readonly EvidenceEntry[] { return Object.freeze([...this.items]); }
}
