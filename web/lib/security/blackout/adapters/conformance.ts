import { appendEvidence, type EvidenceEntry } from "../evidence.ts";
import type { BlackoutStateStore, EvidenceSink } from "../ports.ts";
import { INITIAL_STORED_STATE, validateStoredState, type StoredBlackoutState } from "../state.ts";

/**
 * Port uygunluk kontrolleri. Her gerçek adaptör (Antigravity altyapısı dahil) bunları geçmelidir.
 * Kontroller yalnız verilen adaptörü kullanır; ağ veya dosya sistemi açmaz.
 * Dönüş: başarısız kontrollerin listesi (boş = uygun).
 */

export async function checkStateStoreConformance(store: BlackoutStateStore, now: number): Promise<string[]> {
  const failures: string[] = [];
  if ("setLevel" in (store as object)) failures.push("koşulsuz-setLevel-olmamalı");
  const raw = await store.read();
  const current = raw === null ? INITIAL_STORED_STATE : (validateStoredState(raw, now) as { ok: boolean; state?: StoredBlackoutState }).state;
  if (!current) { failures.push("okunan-kayıt-geçersiz"); return failures; }
  const next: StoredBlackoutState = { ...current, level: 1, version: current.version + 1, since: now, updatedAt: now, transitionSha256: "b".repeat(64) };
  const stale = await store.compareAndSet(current.version + 5, { ...next, version: current.version + 6 });
  if (stale.ok) failures.push("eski-sürümle-yazım-kabul-edildi");
  const ok = await store.compareAndSet(current.version, next);
  if (!ok.ok) failures.push("doğru-sürümle-yazım-reddedildi");
  const replay = await store.compareAndSet(current.version, next);
  if (replay.ok) failures.push("aynı-sürüme-ikinci-yazım-kabul-edildi");
  const after = validateStoredState(await store.read(), now);
  if (!after.ok || after.state.version !== next.version || after.state.level !== 1) failures.push("yazılan-kayıt-okunamadı");
  return failures;
}

export async function checkEvidenceSinkConformance(sink: EvidenceSink, now: number): Promise<string[]> {
  const failures: string[] = [];
  for (const forbidden of ["delete", "remove", "purge", "clear", "truncate", "overwrite"]) {
    if (typeof (sink as unknown as Record<string, unknown>)[forbidden] === "function") failures.push(`silme-yöntemi-olmamalı:${forbidden}`);
  }
  let ledger: readonly EvidenceEntry[] = [];
  ledger = appendEvidence(ledger, { at: now, incidentId: "CONF", kind: "event", payload: { n: 1 } });
  ledger = appendEvidence(ledger, { at: now, incidentId: "CONF", kind: "event", payload: { n: 2 } });
  await sink.append(ledger[0]);
  try { await sink.append(ledger[0]); } catch { failures.push("aynı-kaydın-yeniden-gönderimi-idempotent-değil"); }
  let rejectedTamper = false;
  try { await sink.append({ ...ledger[1], payload: { n: 999 }, previousHash: "f".repeat(64) }); } catch { rejectedTamper = true; }
  if (!rejectedTamper) failures.push("kopuk-zincir-kabul-edildi");
  let rejectedRewrite = false;
  try { await sink.append({ ...ledger[0], payload: { n: 42 }, hash: "e".repeat(64) }); } catch { rejectedRewrite = true; }
  if (!rejectedRewrite) failures.push("var-olan-kaydın-değiştirilmesi-kabul-edildi");
  await sink.append(ledger[1]);
  return failures;
}
