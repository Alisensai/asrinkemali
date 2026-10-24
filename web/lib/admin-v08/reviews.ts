import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import { sha256CanonicalJson } from "./canonical-hash.ts";

export interface ReviewFormSnapshot {
  title: string;
  type: string;
  date: { start?: string | null; end?: string | null; precision?: string; certainty?: string };
  source_institution: string;
  source_url: string;
  citation: string;
  rights_status: string;
}

export interface ReviewForm {
  record_id: string;
  record_snapshot_sha256: string;
  record_snapshot: ReviewFormSnapshot;
  review_status: "pending" | "submitted";
  reviewer: { name: string; role: "human_expert"; institution?: string } | null;
  review_date: string | null;
  outcome: "pending" | "approved" | "correction_required" | "rejected";
  publicationApproval: unknown;
}

export type ReviewFormState = "pending" | "submitted_claim_unverified" | "stale" | "invalid";

export function isReviewForm(value: unknown): value is ReviewForm {
  if (!value || typeof value !== "object") return false;
  const form = value as Partial<ReviewForm>;
  const snapshot = form.record_snapshot;
  return (
    typeof form.record_id === "string" &&
    typeof form.record_snapshot_sha256 === "string" &&
    Boolean(snapshot) &&
    typeof snapshot?.title === "string" &&
    typeof snapshot?.type === "string" &&
    Boolean(snapshot?.date && typeof snapshot.date === "object") &&
    typeof snapshot?.source_institution === "string" &&
    typeof snapshot?.source_url === "string" &&
    typeof snapshot?.citation === "string" &&
    typeof snapshot?.rights_status === "string" &&
    ["pending", "submitted"].includes(String(form.review_status)) &&
    ["pending", "approved", "correction_required", "rejected"].includes(String(form.outcome)) &&
    (form.reviewer === null ||
      (typeof form.reviewer === "object" &&
        typeof form.reviewer.name === "string" &&
        form.reviewer.role === "human_expert")) &&
    (typeof form.review_date === "string" || form.review_date === null)
  );
}

export function getReviewFormState(form: ReviewForm, record: ArchiveRecord | undefined): ReviewFormState {
  if (
    !form ||
    !/^[a-z0-9][a-z0-9-]{1,119}$/.test(form.record_id) ||
    !/^[0-9a-f]{64}$/.test(form.record_snapshot_sha256) ||
    !form.record_snapshot ||
    typeof form.record_snapshot.title !== "string" ||
    typeof form.record_snapshot.source_url !== "string" ||
    !form.record_snapshot.date ||
    typeof form.record_snapshot.source_institution !== "string" ||
    typeof form.record_snapshot.citation !== "string" ||
    typeof form.record_snapshot.rights_status !== "string"
  ) return "invalid";
  if (!record) return "invalid";
  if (form.record_snapshot_sha256 !== sha256CanonicalJson(record)) return "stale";

  const snapshot = form.record_snapshot;
  const changed =
    snapshot.title !== record.title ||
    snapshot.type !== record.type ||
    snapshot.date.start !== record.date.start ||
    snapshot.date.end !== record.date.end ||
    snapshot.date.precision !== record.date.precision ||
    snapshot.date.certainty !== record.date.certainty ||
    snapshot.source_institution !== record.source.institution ||
    snapshot.source_url !== record.source.url ||
    snapshot.citation !== (record.source.citation ?? "") ||
    snapshot.rights_status !== record.rights.status;
  if (changed) return "stale";

  if (form.review_status === "pending" || form.outcome === "pending") return "pending";
  if (
    form.review_status === "submitted" &&
    form.reviewer?.role === "human_expert" &&
    typeof form.reviewer.name === "string" &&
    Boolean(form.reviewer.name.trim()) &&
    typeof form.review_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.review_date) &&
    ["approved", "correction_required", "rejected"].includes(form.outcome)
  ) {
    return "submitted_claim_unverified";
  }
  return "invalid";
}
