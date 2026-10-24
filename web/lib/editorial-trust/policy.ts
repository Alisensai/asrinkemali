import { legacyRecordHash, snapshotHash } from "./canonical.ts";
import { effectiveDecision } from "./decisions.ts";
import type { EditorialPolicy } from "./identity.ts";
import type {
  ActorVerificationState,
  CheckResult,
  DecisionReceipt,
  EditorialReadinessFlags,
  EvidenceCheck,
  FindingCode,
  ReadinessResult,
  Severity,
  SubjectReadiness,
  SubjectType,
  TrustFinding,
} from "./model.ts";
import { parseStrictDate } from "./time.ts";

/**
 * Saf, deterministik politika motoru. Değerlendirme sırasında yazma, ağ veya yapay zekâ
 * çağrısı yapılmaz. Makine yalnız yapısal eksikliği `fail` olarak işaretleyebilir;
 * tarihî doğruluk gerektiren hiçbir kontrolü `pass` yapmaz (o karar insanındır).
 */

export const ACCEPTABLE_RIGHTS = new Set(["public_domain", "open_license", "official_link_only", "institutional_terms"]);
export const REDISTRIBUTABLE_IMAGE_REUSE = new Set(["permitted"]);

export interface GateEnvironment {
  policy: EditorialPolicy | null;
  identityConfigured: boolean;
  /** CI teknik sonucu; bilinmiyorsa null → false sayılır. */
  technicalTestsPassed: boolean | null;
  /** Bu repoda güvenilir audit deposu yoksa null. */
  auditIntegrity: { valid: boolean; eventCount: number } | null;
  now: number;
}

export interface ArchiveIndex {
  ids: ReadonlySet<string>;
  slugToId: ReadonlyMap<string, string>;
}

export interface ArchiveReadinessInput {
  record: Record<string, unknown>;
  sourceFile: string | null;
  schemaErrors: readonly string[];
  form: Record<string, unknown> | null;
  formErrors: readonly string[];
  decisions: readonly DecisionReceipt[];
}

function obj(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function httpsUrl(value: unknown): boolean {
  try {
    return new URL(str(value)).protocol === "https:";
  } catch {
    return false;
  }
}

const REMEDIATION: Record<FindingCode, string> = {
  missing_historian_review: "Yetkili ve kimliği doğrulanmış bir tarih uzmanı kaydı güncel revizyonda incelemeli.",
  missing_editor_approval: "Tarih uzmanı incelemesinden sonra ayrı bir yayın editörü güncel revizyonu onaylamalı.",
  unverified_actor_claim: "İnceleme/onay iddiası güvenilir kimlik sağlayıcısıyla doğrulanmalı; isim tek başına yetmez.",
  stale_record_snapshot: "Kayıt formdaki anlık görüntüden sonra değişmiş; inceleme güncel revizyonda yeniden yapılmalı.",
  permission_required: "Hak sahibinden yazılı izin alınmadan içerik/görsel kamuya açılamaz.",
  evidence_location_missing: "Kurumsal katalog numarası veya belge konumu eklenmeli.",
  audit_chain_invalid: "Audit zinciri onarılamaz; olay kaynağı incelenmeli, yeni kararlar yeniden alınmalı.",
  revision_conflict: "Eşzamanlı kararlar çakıştı; güncel revizyon yeniden okunup karar yeniden verilmeli.",
  credential_provider_unavailable: "Güvenilir kimlik sağlayıcısı ve rol eşlemesi yapılandırılmalı (10-DEPLOYMENT-PREREQUISITES).",
  approval_timestamp_invalid: "Onay zamanı geçerli, saat dilimli ve olay sırasına uygun olmalı.",
  release_blocked_by_policy: "Teknik `published` etiketi insan onayı değildir; kapılar kapanana kadar yayına hazır sayılmaz.",
  schema_invalid: "Kayıt şeması düzeltilmeli.",
  review_form_missing: "Formu `editorial_review.py create-forms` ile pending olarak oluşturun (onay içermez).",
  review_form_invalid: "Form şemaya uygun hâle getirilmeli; formlar otomatik düzeltilmez.",
  duplicate_record_id: "Aynı kimlik birden fazla dosyada; tek kayıt kalmalı.",
  orphan_review_form: "Formun karşılığı olan kayıt bulunamadı; form silinmeden incelenmeli.",
  rights_unclear: "Hak durumu belirsiz; otomatik görsel/metin kopyalama yapılamaz.",
  ai_representation_as_original: "Yapay zekâ/temsilî görsel özgün arşiv belgesi gibi sunulamaz.",
  decision_revoked: "Karar geri çekildi veya geçersizleşti; yeniden inceleme gerekir.",
};

const REASON: Record<FindingCode, string> = {
  missing_historian_review: "Güncel revizyonda doğrulanmış tarih uzmanı kararı yok.",
  missing_editor_approval: "Güncel revizyonda doğrulanmış yayın editörü onayı yok.",
  unverified_actor_claim: "İnsan incelemesi/onayı iddiası var ama aktör kimliği doğrulanmadı.",
  stale_record_snapshot: "Form anlık görüntü hash'i güncel kayıtla eşleşmiyor.",
  permission_required: "Hak durumu izin gerektiriyor.",
  evidence_location_missing: "Kaynak belge için kurumsal katalog/konum bilgisi yok.",
  audit_chain_invalid: "Audit zinciri doğrulanamadı.",
  revision_conflict: "Revizyon çakışması.",
  credential_provider_unavailable: "Güvenilir kimlik sağlayıcısı veya editoryal politika yapılandırılmamış.",
  approval_timestamp_invalid: "Onay zaman damgası geçersiz.",
  release_blocked_by_policy: "Teknik yayın etiketi var, insan yayın kapıları kapalı.",
  schema_invalid: "Şema doğrulaması başarısız.",
  review_form_missing: "İnceleme formu yok.",
  review_form_invalid: "İnceleme formu geçersiz.",
  duplicate_record_id: "Kayıt kimliği yineleniyor.",
  orphan_review_form: "Formun kaydı yok.",
  rights_unclear: "Hak durumu kabul edilebilir değil veya belirsiz.",
  ai_representation_as_original: "Temsilî görsel özgün gibi işaretlenmiş.",
  decision_revoked: "Karar geçersiz.",
};

export function finding(
  code: FindingCode,
  severity: Severity,
  context: {
    subjectType: SubjectType;
    recordId?: string | null;
    recordSlug?: string | null;
    sourceFile?: string | null;
    expected?: string | null;
    actual?: string | null;
    gate: string;
    actorVerificationState?: ActorVerificationState;
    hasHumanApproval?: TrustFinding["hasHumanApproval"];
    reason?: string;
  },
): TrustFinding {
  return {
    code,
    severity,
    subjectType: context.subjectType,
    recordId: context.recordId ?? null,
    recordSlug: context.recordSlug ?? null,
    sourceFile: context.sourceFile ?? null,
    expectedSnapshotHash: context.expected ?? null,
    actualSnapshotHash: context.actual ?? null,
    gate: context.gate,
    reason: context.reason ?? REASON[code],
    remediation: REMEDIATION[code],
    actorVerificationState: context.actorVerificationState ?? "not_applicable",
    hasHumanApproval: context.hasHumanApproval ?? false,
  };
}

/**
 * Yayın kapısı için asgari yapısal şema. Tam arşiv şeması PR #12 `archive_validator.py`
 * ve `scripts/archive` doğrulayıcısında kalır; burada yalnız kapının dayandığı alanlar.
 */
export function archiveStructuralErrors(record: unknown): string[] {
  const value = obj(record);
  if (!Object.keys(value).length) return ["record_root_must_be_object"];
  const errors: string[] = [];
  for (const field of ["id", "slug", "title", "type"]) if (!str(value[field])) errors.push(`missing_${field}`);
  if (str(value.id) && !/^[a-z0-9][a-z0-9-]{1,120}$/.test(str(value.id))) errors.push("invalid_id_format");
  const date = obj(value.date);
  // Şema "unknown" kesinliğe izin verir (başlangıç null). Bu yapısal hata değildir; tarih
  // kanıt kontrolünde `fail` olur ve yayın kapısı yine kapalı kalır.
  const unknownDate = date.precision === "unknown" && date.start === null;
  if (!unknownDate && !parseStrictDate(date.start).ok) errors.push("invalid_date_start");
  if (!["day", "month", "year", "range", "unknown"].includes(str(date.precision))) errors.push("invalid_date_precision");
  if (!str(obj(value.source).institution)) errors.push("missing_source_institution");
  if (!httpsUrl(obj(value.source).url)) errors.push("invalid_source_url");
  if (!str(obj(value.rights).status)) errors.push("missing_rights_status");
  if (!["draft", "reviewed", "published"].includes(str(obj(value.verification).status))) errors.push("invalid_verification_status");
  return errors;
}

/** Kayıttan otomatik çıkarılabilen kanıt kontrol sonuçları (insan kararının yerine geçmez). */
export function archiveEvidenceChecks(record: Record<string, unknown>): Record<EvidenceCheck, CheckResult> {
  const source = obj(record.source);
  const rights = obj(record.rights);
  const image = obj(record.image);
  const date = obj(record.date);
  const provenance = Array.isArray(record.provenance) ? record.provenance.map(obj) : [];
  const quotation = obj(record.quotation);
  const hasQuote = Object.keys(quotation).length > 0;
  const catalogueRef = str(source.archiveIdentifier) || provenance.map((item) => str(item.identifier)).find(Boolean) || "";
  const sourceComplete = Boolean(str(source.institution) && httpsUrl(source.url) && str(source.title));
  const provenanceLinked = provenance.some((item) => str(item.url) === str(source.url) || str(item.identifier) === catalogueRef);
  const dateValid = parseStrictDate(date.start).ok && ["day", "month", "year", "range"].includes(str(date.precision));
  const rightsStatus = str(rights.status);
  const imageKind = str(image.kind);
  return {
    source_provenance: sourceComplete && provenanceLinked ? "needs_review" : "fail",
    original_document_identity: catalogueRef ? "needs_review" : "fail",
    institutional_catalogue_reference: catalogueRef ? "needs_review" : "fail",
    event_date: dateValid ? "needs_review" : "fail",
    document_date: "needs_review",
    date_precision: ["day", "month", "year", "range"].includes(str(date.precision)) ? "needs_review" : "fail",
    authorship_or_attribution: str(source.institution) ? "needs_review" : "fail",
    quote_or_transcription: hasQuote ? (str(quotation.text) && (str(quotation.sourceUrl) || str(quotation.evidenceMethod)) ? "needs_review" : "fail") : "not_applicable",
    image_is_original_or_representative: !Object.keys(image).length || imageKind === "none" ? "not_applicable" : imageKind === "ai_representative" && rightsStatus !== "ai_representative" ? "fail" : "needs_review",
    rights_and_reuse: ACCEPTABLE_RIGHTS.has(rightsStatus) ? "needs_review" : "fail",
    source_record_consistency: "needs_review",
    contradictory_evidence: "needs_review",
    missing_evidence: sourceComplete && catalogueRef ? "needs_review" : "fail",
  };
}

function legacyClaimState(record: Record<string, unknown>, form: Record<string, unknown> | null): ActorVerificationState {
  const reviewer = obj(form?.reviewer);
  const verification = obj(record.verification);
  const claimed =
    str(reviewer.name) ||
    form?.publicationApproval ||
    record.publicationApproval ||
    (str(verification.reviewedBy) && !/yapay zek|\bai\b|opencode|copilot|claude|agent|bot/i.test(str(verification.reviewedBy)));
  return claimed ? "claim_unverified" : "no_claim";
}

function resultFor(findings: readonly TrustFinding[], environment: GateEnvironment, needsReview: boolean): ReadinessResult {
  if (findings.some((item) => item.severity === "critical")) return "deny";
  if (!environment.policy || !environment.identityConfigured) return "not_configured";
  if (findings.some((item) => item.severity === "error") || needsReview) return "needs_review";
  return "allow";
}

function decisionFindings(
  subjectType: SubjectType,
  decisions: readonly DecisionReceipt[],
  currentHash: string,
  environment: GateEnvironment,
  base: { recordId: string; recordSlug: string | null; sourceFile: string | null },
  claimState: ActorVerificationState,
): { historian: boolean; editor: boolean; findings: TrustFinding[] } {
  const findings: TrustFinding[] = [];
  const historian = effectiveDecision(decisions, "historian_review", currentHash, environment.now, environment.policy);
  const editor = effectiveDecision(decisions, "publication_editor", currentHash, environment.now, environment.policy);
  const verifiedState: ActorVerificationState = decisions.length ? "verified" : claimState;
  for (const [validity, code, gate] of [
    [historian, "missing_historian_review", "human_historian_review"],
    [editor, "missing_editor_approval", "human_editor_approval"],
  ] as const) {
    if (validity.state === "valid") continue;
    const reasonSuffix = validity.state === "missing" ? "" : ` (durum: ${validity.state})`;
    findings.push(
      finding(code, "critical", {
        ...base,
        subjectType,
        gate,
        actual: currentHash,
        expected: validity.receipt?.revision.snapshotHash ?? null,
        actorVerificationState: verifiedState,
        hasHumanApproval: claimState === "claim_unverified" ? "claimed_unverified" : false,
        reason: `${REASON[code]}${reasonSuffix}`,
      }),
    );
    if (validity.state === "invalidated") findings.push(finding("decision_revoked", "critical", { ...base, subjectType, gate }));
  }
  return { historian: historian.state === "valid", editor: editor.state === "valid", findings };
}

function finalize(
  subjectType: SubjectType,
  recordId: string,
  findings: TrustFinding[],
  partial: Omit<EditorialReadinessFlags, "release_ready" | "technical_tests_passed" | "audit_integrity_verified">,
  environment: GateEnvironment,
  needsReview: boolean,
): SubjectReadiness {
  const flags: EditorialReadinessFlags = {
    technical_tests_passed: environment.technicalTestsPassed === true,
    ...partial,
    audit_integrity_verified: Boolean(environment.auditIntegrity?.valid && environment.auditIntegrity.eventCount > 0),
    release_ready: false,
  };
  const result = resultFor(findings, environment, needsReview);
  // release_ready yalnız bütün bağımsız bayraklar doğruysa ve sonuç allow ise.
  flags.release_ready = result === "allow" && Object.entries(flags).every(([key, value]) => key === "release_ready" || value === true);
  return { subjectType, recordId, result, flags, findings };
}

export function evaluateArchiveReviewReadiness(input: ArchiveReadinessInput, environment: GateEnvironment): SubjectReadiness {
  const record = input.record;
  const recordId = str(record.id) || "(kimliksiz)";
  const base = { recordId, recordSlug: str(record.slug) || null, sourceFile: input.sourceFile };
  const subjectType: SubjectType = "archive_record";
  const findings: TrustFinding[] = [];
  const currentHash = snapshotHash(subjectType, record);
  const legacyHash = legacyRecordHash(record);
  const claimState = legacyClaimState(record, input.form);

  if (input.schemaErrors.length) findings.push(finding("schema_invalid", "critical", { ...base, subjectType, gate: "schema", reason: `Şema hataları: ${input.schemaErrors.slice(0, 5).join(", ")}` }));
  let revisionMatched = true;
  if (!input.form) {
    findings.push(finding("review_form_missing", "warning", { ...base, subjectType, gate: "review_form" }));
  } else {
    if (input.formErrors.length) findings.push(finding("review_form_invalid", "error", { ...base, subjectType, gate: "review_form", reason: `Form hataları: ${input.formErrors.slice(0, 5).join(", ")}` }));
    const formHash = str(input.form.record_snapshot_sha256);
    if (formHash !== legacyHash) {
      revisionMatched = false;
      findings.push(finding("stale_record_snapshot", "critical", { ...base, subjectType, gate: "current_revision", expected: formHash || null, actual: legacyHash }));
    }
  }
  if (claimState === "claim_unverified") {
    findings.push(finding("unverified_actor_claim", "error", { ...base, subjectType, gate: "actor_identity", actorVerificationState: "claim_unverified", hasHumanApproval: "claimed_unverified" }));
  }

  const decided = decisionFindings(subjectType, input.decisions, currentHash, environment, base, claimState);
  findings.push(...decided.findings);
  if (input.decisions.some((receipt) => receipt.revision.snapshotHash !== currentHash)) revisionMatched = false;

  const checks = archiveEvidenceChecks(record);
  const rights = obj(record.rights);
  const image = obj(record.image);
  const rightsStatus = str(rights.status);
  const imagePresent = Object.keys(image).length > 0 && str(image.kind) !== "none";
  let rightsOk = ACCEPTABLE_RIGHTS.has(rightsStatus);
  if (rightsStatus === "permission_required") findings.push(finding("permission_required", "critical", { ...base, subjectType, gate: "rights" }));
  else if (!rightsOk) findings.push(finding("rights_unclear", "critical", { ...base, subjectType, gate: "rights", reason: `Hak durumu: ${rightsStatus || "(boş)"}` }));
  if (imagePresent && !REDISTRIBUTABLE_IMAGE_REUSE.has(str(rights.imageReuse)) && str(image.displayPolicy) === "embedded_allowed") {
    rightsOk = false;
    findings.push(finding("rights_unclear", "critical", { ...base, subjectType, gate: "image_rights", reason: "Görsel gömülü gösterime açık ama yeniden kullanım izni `permitted` değil." }));
  }
  if (checks.image_is_original_or_representative === "fail") findings.push(finding("ai_representation_as_original", "critical", { ...base, subjectType, gate: "image_authenticity" }));
  const provenanceOk = checks.source_provenance !== "fail" && checks.institutional_catalogue_reference !== "fail";
  if (checks.institutional_catalogue_reference === "fail") findings.push(finding("evidence_location_missing", "error", { ...base, subjectType, gate: "source_provenance" }));

  const verification = obj(record.verification);
  if (verification.status === "published" && !(decided.historian && decided.editor)) {
    findings.push(finding("release_blocked_by_policy", "error", { ...base, subjectType, gate: "technical_label", hasHumanApproval: claimState === "claim_unverified" ? "claimed_unverified" : false }));
  }

  const needsReview = Object.values(checks).some((value) => value === "needs_review") && !(decided.historian && decided.editor);
  return finalize(
    subjectType,
    recordId,
    findings,
    {
      schema_valid: input.schemaErrors.length === 0,
      source_provenance_sufficient: provenanceOk,
      human_historian_review_verified: decided.historian,
      human_editor_approval_verified: decided.editor,
      rights_status_acceptable: rightsOk,
      current_revision_matched: revisionMatched,
    },
    environment,
    needsReview,
  );
}

function referencedArchiveErrors(ids: readonly unknown[], index: ArchiveIndex): string[] {
  return ids.map(str).flatMap((id) => {
    if (index.ids.has(id)) return [];
    const viaSlug = index.slugToId.get(id);
    return [viaSlug ? `slug_used_instead_of_id:${id}->${viaSlug}` : `unknown_archive_id:${id}`];
  });
}

/** Makale onayı arşiv onayından bağımsızdır; arşiv kaydı onaylı olsa da makale kendi kararlarını ister. */
export function evaluatePublicationReviewReadiness(
  input: { record: Record<string, unknown>; sourceFile: string | null; schemaErrors: readonly string[]; decisions: readonly DecisionReceipt[]; archiveIndex: ArchiveIndex },
  environment: GateEnvironment,
): SubjectReadiness {
  const subjectType: SubjectType = "publication_record";
  const record = input.record;
  const recordId = str(record.id) || "(kimliksiz)";
  const base = { recordId, recordSlug: str(record.slug) || null, sourceFile: input.sourceFile };
  const findings: TrustFinding[] = [];
  const currentHash = snapshotHash(subjectType, record);
  const relationErrors = referencedArchiveErrors(Array.isArray(record.relatedArchiveIds) ? record.relatedArchiveIds : [], input.archiveIndex);
  const schemaErrors = [...input.schemaErrors, ...relationErrors];
  if (schemaErrors.length) findings.push(finding("schema_invalid", "critical", { ...base, subjectType, gate: "schema", reason: `Şema/ilişki hataları: ${schemaErrors.slice(0, 5).join(", ")}` }));
  const bibliography = Array.isArray(record.bibliography) ? record.bibliography.map(obj) : [];
  const provenanceOk = bibliography.length > 0 && bibliography.every((item) => str(item.institution) && httpsUrl(item.url));
  if (!provenanceOk) findings.push(finding("evidence_location_missing", "critical", { ...base, subjectType, gate: "bibliography" }));
  const claimState: ActorVerificationState = record.approval ? "claim_unverified" : "no_claim";
  if (claimState === "claim_unverified") findings.push(finding("unverified_actor_claim", "error", { ...base, subjectType, gate: "actor_identity", actorVerificationState: claimState, hasHumanApproval: "claimed_unverified" }));
  const decided = decisionFindings(subjectType, input.decisions, currentHash, environment, base, claimState);
  findings.push(...decided.findings);
  const rights = obj(record.rights);
  const rightsOk = Boolean(str(rights.license) && str(rights.holder));
  if (!rightsOk) findings.push(finding("rights_unclear", "critical", { ...base, subjectType, gate: "rights" }));
  if (record.status === "published" && !(decided.historian && decided.editor)) findings.push(finding("release_blocked_by_policy", "error", { ...base, subjectType, gate: "technical_label" }));
  return finalize(
    subjectType,
    recordId,
    findings,
    {
      schema_valid: schemaErrors.length === 0,
      source_provenance_sufficient: provenanceOk,
      human_historian_review_verified: decided.historian,
      human_editor_approval_verified: decided.editor,
      rights_status_acceptable: rightsOk,
      current_revision_matched: input.decisions.every((receipt) => receipt.revision.snapshotHash === currentHash),
    },
    environment,
    !(decided.historian && decided.editor),
  );
}

/** Sergi kuratöryel anlatımı ayrı değerlendirilir; kullandığı arşiv kayıtlarının onayı yetmez. */
export function evaluateExhibitionReviewReadiness(
  input: { record: Record<string, unknown>; sourceFile: string | null; schemaErrors: readonly string[]; decisions: readonly DecisionReceipt[]; archiveIndex: ArchiveIndex; archiveIdsField?: string },
  environment: GateEnvironment,
): SubjectReadiness {
  const subjectType: SubjectType = "exhibition_record";
  const record = input.record;
  const recordId = str(record.id) || "(kimliksiz)";
  const base = { recordId, recordSlug: str(record.slug) || null, sourceFile: input.sourceFile };
  const findings: TrustFinding[] = [];
  const currentHash = snapshotHash(subjectType, record);
  const field = input.archiveIdsField ?? "archiveRecordIds";
  const relationErrors = referencedArchiveErrors(Array.isArray(record[field]) ? (record[field] as unknown[]) : [], input.archiveIndex);
  const schemaErrors = [...input.schemaErrors, ...relationErrors];
  if (schemaErrors.length) findings.push(finding("schema_invalid", "critical", { ...base, subjectType, gate: "schema", reason: `Şema/ilişki hataları: ${schemaErrors.slice(0, 5).join(", ")}` }));
  const claimState: ActorVerificationState = record.approval ? "claim_unverified" : "no_claim";
  if (claimState === "claim_unverified") findings.push(finding("unverified_actor_claim", "error", { ...base, subjectType, gate: "actor_identity", actorVerificationState: claimState, hasHumanApproval: "claimed_unverified" }));
  const decided = decisionFindings(subjectType, input.decisions, currentHash, environment, base, claimState);
  findings.push(...decided.findings);
  if (record.reviewStatus === "published" && !(decided.historian && decided.editor)) findings.push(finding("release_blocked_by_policy", "error", { ...base, subjectType, gate: "technical_label" }));
  return finalize(
    subjectType,
    recordId,
    findings,
    {
      schema_valid: schemaErrors.length === 0,
      source_provenance_sufficient: relationErrors.length === 0,
      human_historian_review_verified: decided.historian,
      human_editor_approval_verified: decided.editor,
      rights_status_acceptable: true,
      current_revision_matched: input.decisions.every((receipt) => receipt.revision.snapshotHash === currentHash),
    },
    environment,
    !(decided.historian && decided.editor),
  );
}

/**
 * PR #12 `publication_guard.py` bulgu kodlarıyla uyum eşlemesi. Eski kapı ve rapor biçimi
 * değişmez; bu tablo yalnız iki raporun aynı sorunu iki kez saymaması içindir.
 */
export const PR12_COMPATIBILITY: Readonly<Record<string, FindingCode>> = Object.freeze({
  "published-without-human-review": "missing_historian_review",
  "human-expert-review-required": "missing_historian_review",
  "unauthorized-published-record": "missing_editor_approval",
  "approval-after-schedule": "approval_timestamp_invalid",
  "unauthorized-scheduled-publication": "missing_editor_approval",
  "schedule-publishes-unapproved-record": "missing_editor_approval",
  "unpublishable-rights-status": "rights_unclear",
  "missing-rights-status": "rights_unclear",
  "published-ai-representation": "ai_representation_as_original",
  "missing-catalog-provenance": "evidence_location_missing",
  "source-not-in-provenance": "evidence_location_missing",
  "duplicate-catalog-record": "duplicate_record_id",
  "invalid-catalog-date": "schema_invalid",
  "invalid-publication-json": "schema_invalid",
});
