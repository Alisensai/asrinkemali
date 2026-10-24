import { createHash } from "node:crypto";
import { redact } from "../../server/log.ts";

/**
 * Olay kanıtı defteri: yalnız ekleme yapılabilen, SHA-256 hash zincirli kayıt.
 *
 * Bu modülde silme, kırpma veya üzerine yazma işlevi YOKTUR. Kayıtlar dondurulur; zincir
 * doğrulaması herhangi bir değişikliği, silmeyi veya yeniden sıralamayı tespit eder.
 * Yük alanları kaydedilmeden önce redakte edilir (parola, belirteç, çerez, anahtar yazılmaz).
 * Kalıcı, değiştirilemez depolama (WORM/nesne kilidi) altyapı gereksinimidir; bkz. EvidenceSink.
 */

export type EvidenceKind = "event" | "assessment" | "plan" | "approval" | "execution" | "transition" | "recovery";

export interface EvidenceEntry {
  readonly sequence: number;
  readonly at: number;
  readonly incidentId: string;
  readonly kind: EvidenceKind;
  readonly payload: unknown;
  readonly previousHash: string;
  readonly hash: string;
}

export const EVIDENCE_GENESIS = "0".repeat(64);

function entryHash(sequence: number, at: number, incidentId: string, kind: EvidenceKind, payload: unknown, previousHash: string) {
  return createHash("sha256").update(JSON.stringify([sequence, at, incidentId, kind, payload, previousHash])).digest("hex");
}

export function appendEvidence(
  ledger: readonly EvidenceEntry[],
  input: { at: number; incidentId: string; kind: EvidenceKind; payload: unknown },
): readonly EvidenceEntry[] {
  const previousHash = ledger.at(-1)?.hash ?? EVIDENCE_GENESIS;
  const sequence = ledger.length + 1;
  const payload = redact(input.payload);
  const entry: EvidenceEntry = Object.freeze({
    sequence,
    at: input.at,
    incidentId: input.incidentId,
    kind: input.kind,
    payload,
    previousHash,
    hash: entryHash(sequence, input.at, input.incidentId, input.kind, payload, previousHash),
  });
  return Object.freeze([...ledger, entry]);
}

export function verifyEvidence(ledger: readonly EvidenceEntry[]): { ok: boolean; brokenAt: number | null } {
  let previous = EVIDENCE_GENESIS;
  for (const [index, entry] of ledger.entries()) {
    const expected = entryHash(index + 1, entry.at, entry.incidentId, entry.kind, entry.payload, previous);
    if (entry.sequence !== index + 1 || entry.previousHash !== previous || entry.hash !== expected) return { ok: false, brokenAt: index + 1 };
    previous = entry.hash;
  }
  return { ok: true, brokenAt: null };
}
