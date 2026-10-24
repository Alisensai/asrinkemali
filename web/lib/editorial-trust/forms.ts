import { legacyRecordHash } from "./canonical.ts";
import type { ReviewState, TrustClass } from "./model.ts";

/**
 * PR #15 inceleme formlarının (schema 1.0.0) salt-okunur sınıflandırması.
 * Formlar asla yazılmaz veya "düzeltilmez". Formdaki isim ve tarih bir iddiadır; formda
 * kimlik kanıtı olmadığından en yüksek güven sınıfı `submitted_claim_unverified`'dır.
 * Tam anlamsal doğrulama PR #15'in `editorial_review.py validate-forms` komutunda kalır.
 */

export const LEGACY_FORM_FIELDS = Object.freeze([
  "schema_version",
  "record_id",
  "record_path",
  "record_snapshot_sha256",
  "record_snapshot",
  "review_status",
  "reviewer",
  "review_date",
  "checks",
  "outcome",
  "evidence",
  "explanation",
  "publicationApproval",
]);
const CHECK_KEYS = ["historical_facts", "source_authenticity", "source_record_consistency", "quotation", "copyright_and_reuse"];
const CHECK_VALUES = new Set(["not_reviewed", "pass", "fail", "not_applicable"]);

export function legacyFormStructuralErrors(form: unknown): string[] {
  if (form === null || typeof form !== "object" || Array.isArray(form)) return ["form_root_must_be_object"];
  const value = form as Record<string, unknown>;
  const errors: string[] = [];
  const keys = Object.keys(value).sort();
  if (keys.join("|") !== [...LEGACY_FORM_FIELDS].sort().join("|")) errors.push("form_fields_do_not_match_schema");
  if (value.schema_version !== "1.0.0") errors.push("unsupported_schema_version");
  if (typeof value.record_id !== "string" || !value.record_id.trim()) errors.push("missing_record_id");
  if (typeof value.record_snapshot_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.record_snapshot_sha256)) errors.push("invalid_record_snapshot_hash");
  if (value.review_status !== "pending" && value.review_status !== "submitted") errors.push("invalid_review_status");
  if (!["pending", "approved", "correction_required", "rejected"].includes(String(value.outcome))) errors.push("invalid_outcome");
  const checks = value.checks;
  if (checks === null || typeof checks !== "object" || CHECK_KEYS.some((key) => !CHECK_VALUES.has(String((checks as Record<string, unknown>)[key])))) {
    errors.push("invalid_checks");
  }
  if (value.review_status === "pending" && (value.reviewer !== null || value.publicationApproval !== null || value.outcome !== "pending")) {
    errors.push("pending_form_contains_review_decision");
  }
  return errors;
}

export interface LegacyFormClassification {
  reviewState: ReviewState;
  trustClass: TrustClass | null;
  stale: boolean;
  claimsHumanReview: boolean;
  claimsEditorApproval: boolean;
  errors: string[];
}

export function classifyLegacyForm(form: unknown, record: Record<string, unknown> | null): LegacyFormClassification {
  if (form === undefined || form === null) {
    return { reviewState: "not_started", trustClass: null, stale: false, claimsHumanReview: false, claimsEditorApproval: false, errors: [] };
  }
  const errors = legacyFormStructuralErrors(form);
  const value = (typeof form === "object" ? form : {}) as Record<string, unknown>;
  const claimsHumanReview = value.review_status === "submitted" && value.reviewer !== null && typeof value.reviewer === "object";
  const claimsEditorApproval = value.publicationApproval !== null && typeof value.publicationApproval === "object";
  if (errors.length) return { reviewState: "invalid", trustClass: null, stale: false, claimsHumanReview, claimsEditorApproval, errors };
  const stale = record !== null && value.record_snapshot_sha256 !== legacyRecordHash(record);
  if (record !== null && value.record_id !== record.id) errors.push("record_id_mismatch");
  if (errors.length) return { reviewState: "invalid", trustClass: null, stale, claimsHumanReview, claimsEditorApproval, errors };
  if (stale) return { reviewState: "stale", trustClass: "structural_valid", stale, claimsHumanReview, claimsEditorApproval, errors };
  if (value.review_status === "pending") return { reviewState: "pending", trustClass: "structural_valid", stale, claimsHumanReview, claimsEditorApproval, errors };
  if (value.outcome === "correction_required") return { reviewState: "changes_requested", trustClass: "submitted_claim_unverified", stale, claimsHumanReview, claimsEditorApproval, errors };
  if (value.outcome === "rejected") return { reviewState: "rejected", trustClass: "submitted_claim_unverified", stale, claimsHumanReview, claimsEditorApproval, errors };
  // submitted + approved: yine yalnız iddia; güvenilir kimlik doğrulaması bekler.
  return { reviewState: "awaiting_identity_verification", trustClass: "submitted_claim_unverified", stale, claimsHumanReview, claimsEditorApproval, errors };
}

/** İnceleme ekseni için izinli geçişler. Yayın ekseni (PR #21) bundan bağımsızdır. */
export const REVIEW_TRANSITIONS: Readonly<Record<ReviewState, readonly ReviewState[]>> = Object.freeze({
  not_started: ["pending"],
  pending: ["assigned", "superseded", "stale", "invalid"],
  assigned: ["in_progress", "pending", "superseded", "stale"],
  in_progress: ["submitted", "changes_requested", "stale", "superseded"],
  changes_requested: ["pending", "superseded", "stale"],
  submitted: ["awaiting_identity_verification", "stale", "invalid"],
  awaiting_identity_verification: ["awaiting_editor", "rejected", "stale", "invalid"],
  awaiting_editor: ["completed", "changes_requested", "rejected", "stale", "superseded"],
  // Reddedilmiş karar doğrudan onaya dönemez; yeni bir inceleme turu (pending) gerekir.
  rejected: ["pending", "superseded"],
  completed: ["stale", "superseded"],
  superseded: [],
  stale: ["pending", "superseded"],
  invalid: ["pending"],
});

export function canTransitionReview(from: unknown, to: unknown): boolean {
  if (typeof from !== "string" || typeof to !== "string" || !Object.hasOwn(REVIEW_TRANSITIONS, from)) return false;
  return (REVIEW_TRANSITIONS[from as ReviewState] as readonly string[]).includes(to);
}
