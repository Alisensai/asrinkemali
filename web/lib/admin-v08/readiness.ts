export interface AdminReadinessInput {
  archiveAvailable: boolean;
  archiveCount: number;
  formsAvailable: boolean;
  formCount: number;
  pendingForms: number;
  staleForms: number;
  invalidForms: number;
  unverifiedSubmissions: number;
  identityProviderConfigured: boolean;
  durableDatabaseConfigured: boolean;
  auditRepositoryConfigured: boolean;
  ciStatus: "success" | "failure" | "in_progress" | "unavailable";
}

export interface AdminReadinessReport {
  capturedAt: string;
  archive: { status: "available" | "unavailable"; count: number };
  editorial: { status: "available" | "unavailable"; count: number };
  identity: "configured" | "not_configured";
  database: "configured" | "not_configured";
  audit: "configured" | "not_configured";
  ci: "success" | "failure" | "in_progress" | "unavailable";
  releaseGate: {
    status: "blocked" | "awaiting_human_review";
    pending: number;
    stale: number;
    invalid: number;
    unverifiedSubmissions: number;
  };
  ready: false;
}

export function buildAdminReadinessReport(input: AdminReadinessInput, now = new Date()): AdminReadinessReport {
  const pending = Math.max(0, input.pendingForms);
  const stale = Math.max(0, input.staleForms);
  const invalid = Math.max(0, input.invalidForms);
  const unverifiedSubmissions = Math.max(0, input.unverifiedSubmissions);
  const hasUnresolvedReview = !input.formsAvailable ||
    pending + stale + invalid + unverifiedSubmissions > 0;

  return Object.freeze({
    capturedAt: now.toISOString(),
    archive: Object.freeze({
      status: input.archiveAvailable ? "available" : "unavailable",
      count: Math.max(0, input.archiveCount),
    }),
    editorial: Object.freeze({
      status: input.formsAvailable ? "available" : "unavailable",
      count: Math.max(0, input.formCount),
    }),
    identity: input.identityProviderConfigured ? "configured" : "not_configured",
    database: input.durableDatabaseConfigured ? "configured" : "not_configured",
    audit: input.auditRepositoryConfigured ? "configured" : "not_configured",
    ci: input.ciStatus,
    releaseGate: Object.freeze({
      status: hasUnresolvedReview ? "blocked" : "awaiting_human_review",
      pending,
      stale,
      invalid,
      unverifiedSubmissions,
    }),
    ready: false,
  });
}
