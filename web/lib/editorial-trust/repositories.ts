import type { AuditEvent } from "./audit.ts";
import type { DecisionKind, DecisionReceipt, InvalidationReason, ReviewState, SubjectType } from "./model.ts";

/**
 * Arayüz-öncelikli depolar. Repoda kalıcı veritabanı yoktur; üretim uygulamaları ancak
 * güvenilir kimlik + kalıcı depo + audit birlikte sağlandığında yazılabilir. Testler
 * `tools/editorial-trust/tests/helpers/` altındaki bellek içi sahte uygulamaları kullanır.
 */

export interface SubjectSnapshot {
  subjectType: SubjectType;
  recordId: string;
  record: Readonly<Record<string, unknown>>;
  /** Kaydı oluşturan/değiştiren güvenilir aktörler (bilinmiyorsa boş). */
  authorActorIds: readonly string[];
}

export interface ArchiveSnapshotReader {
  readSubject(subjectType: SubjectType, recordId: string): Promise<SubjectSnapshot | null>;
}

export interface ReviewFormReader {
  /** PR #15 formları; salt-okunur. Bu arayüzde yazma yöntemi bilinçli olarak yoktur. */
  readForm(recordId: string): Promise<Readonly<Record<string, unknown>> | null>;
}

export interface ReviewAssignment {
  assignmentId: string;
  recordId: string;
  recordRevision: string;
  reviewKind: DecisionKind;
  assignedActorId: string;
  requestedBy: string;
  createdAt: string;
  dueAt: string | null;
  state: ReviewState;
  expectedSnapshotHash: string;
  reason: string;
}

export interface ReviewAssignmentRepository {
  listForRecord(recordId: string): Promise<readonly ReviewAssignment[]>;
  create(assignment: ReviewAssignment): Promise<{ ok: true } | { ok: false; error: "duplicate_assignment" }>;
}

export interface ReviewDecisionRepository {
  listForSubject(subjectType: SubjectType, recordId: string): Promise<readonly DecisionReceipt[]>;
  /** Karşılaştır-ve-yaz: `expectedCount` mevcut karar sayısıyla eşleşmezse revision_conflict. */
  append(receipt: DecisionReceipt, expectedCount: number): Promise<{ ok: true } | { ok: false; error: "revision_conflict" | "write_failed" }>;
  invalidate(decisionId: string, reason: InvalidationReason): Promise<{ ok: true } | { ok: false; error: "not_found" | "already_invalidated" }>;
}

/** Yayın kapısı yalnız okur. */
export interface PublicationGateReader {
  listDecisions(subjectType: SubjectType, recordId: string): Promise<readonly DecisionReceipt[]>;
}

export interface AuditEventSink {
  last(): Promise<AuditEvent | null>;
  findByIdempotencyKey(key: string): Promise<AuditEvent | null>;
  /** `expectedPrevHash` son olayın hash'i değilse eşzamanlı yazım: revision_conflict. */
  append(event: AuditEvent, expectedPrevHash: string): Promise<{ ok: true } | { ok: false; error: "revision_conflict" | "write_failed" }>;
}
