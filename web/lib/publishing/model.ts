import type { PublicationRecord, PublicationStatus } from "../../../schemas/publication-record.types";

const ID = /^[a-z0-9][a-z0-9-]{2,119}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const TRANSITIONS: Record<PublicationStatus, readonly PublicationStatus[]> = {
  draft: ["in_review"],
  in_review: ["draft", "approved"],
  approved: ["in_review", "scheduled"],
  scheduled: ["approved", "published"],
  published: [],
};

export interface PublicationValidationResult { ok: boolean; errors: string[] }

function nonEmpty(value: string | undefined) { return Boolean(value?.trim()); }
function isIso(value: string | null | undefined) { return Boolean(value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))); }
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Kaynakça bağlantısı: ayrıştırılabilir, kimlik bilgisi içermeyen, boşluksuz gerçek bir HTTPS adresi. */
export function isSafeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || /\s/.test(value)) return false;
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}

/** Diskten okunan bozuk JSON'un doğrulamayı TypeError ile çökertmesini önleyen yapı denetimi. */
function structuralErrors(record: unknown): string[] {
  if (!isObject(record)) return ["Yayın kaydı bir nesne olmalıdır."];
  const errors: string[] = [];
  for (const field of ["id", "slug", "kind", "title", "summary", "category", "status", "createdAt", "updatedAt"]) if (typeof record[field] !== "string") errors.push(`${field} alanı metin olmalıdır.`);
  for (const field of ["body", "tags", "authors", "bibliography", "relatedArchiveIds"]) if (!Array.isArray(record[field])) errors.push(`${field} alanı liste olmalıdır.`);
  for (const field of ["body", "bibliography"]) if (Array.isArray(record[field]) && (record[field] as unknown[]).some((item) => !isObject(item))) errors.push(`${field} öğeleri nesne olmalıdır.`);
  if (!isObject(record.rights)) errors.push("Hak bilgisi nesne olmalıdır.");
  if (record.approval !== null && !isObject(record.approval)) errors.push("Onay bilgisi nesne veya null olmalıdır.");
  if (record.automation !== null && record.automation !== undefined && !isObject(record.automation)) errors.push("Otomasyon bilgisi nesne veya null olmalıdır.");
  return errors;
}

export function validatePublication(input: PublicationRecord): PublicationValidationResult {
  const structure = structuralErrors(input);
  if (structure.length) return { ok: false, errors: structure };
  const record = input;
  const errors: string[] = [];
  if (record.schemaVersion !== "1.0.0") errors.push("Desteklenmeyen yayın şema sürümü.");
  if (!ID.test(record.id) || !ID.test(record.slug)) errors.push("Kayıt numarası ve slug güvenli küçük harf biçiminde olmalıdır.");
  if (!["research_article", "biography", "historical_analysis", "sourced_article"].includes(record.kind)) errors.push("Geçersiz yayın türü.");
  for (const [label, value] of [["başlık", record.title], ["özet", record.summary], ["kategori", record.category]] as const) if (!nonEmpty(value)) errors.push(`${label} boş olamaz.`);
  if (!record.authors.length || record.authors.some((author) => !nonEmpty(author))) errors.push("En az bir yazar gereklidir.");
  if (!record.body.length || record.body.some((block) => !["heading", "paragraph"].includes(block.type) || !nonEmpty(block.text))) errors.push("Yayın gövdesi güvenli, yapılandırılmış metin blokları içermelidir.");
  if (!record.bibliography.length) errors.push("En az bir kaynakça kaydı gereklidir.");
  for (const source of record.bibliography) {
    if (!nonEmpty(source.id) || !nonEmpty(source.title) || !nonEmpty(source.institution)) errors.push("Kaynakça künyesi eksik.");
    if (!isSafeHttpsUrl(source.url)) errors.push("Kaynakça bağlantıları geçerli HTTPS adresi olmalıdır.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt)) errors.push("Kaynak erişim tarihi YYYY-AA-GG biçiminde olmalıdır.");
  }
  if (!record.relatedArchiveIds.length || record.relatedArchiveIds.some((id) => !ID.test(id))) errors.push("En az bir geçerli arşiv kaydı ilişkisi gereklidir.");
  if (![record.createdAt, record.updatedAt].every(isIso)) errors.push("Oluşturulma ve güncellenme zamanları UTC ISO biçiminde olmalıdır.");
  if (!["draft", "in_review", "approved", "scheduled", "published"].includes(record.status)) errors.push("Geçersiz yayın durumu.");
  if (!nonEmpty(record.rights.license) || !nonEmpty(record.rights.holder) || !nonEmpty(record.rights.note)) errors.push("Lisans, hak sahibi ve kullanım notu zorunludur.");
  if (["approved", "scheduled", "published"].includes(record.status) && (!record.approval || record.approval.kind !== "human" || !nonEmpty(record.approval.approvedBy) || !isIso(record.approval.approvedAt))) errors.push("Onay ve sonrası için tarihli insan editör onayı zorunludur.");
  if (record.status === "scheduled" && !isIso(record.scheduledAt)) errors.push("Zamanlanmış içerikte geçerli yayın zamanı zorunludur.");
  if (record.status === "published" && !isIso(record.publishedAt)) errors.push("Yayımlanmış içerikte yayın zamanı zorunludur.");
  if (record.automation) {
    if (!record.automation.sourceArchiveIds.length) errors.push("Otomatik taslak kaynak arşiv kayıtlarını belirtmelidir.");
    if (record.automation.maxCostCents < 0 || record.automation.actualCostCents < 0 || record.automation.actualCostCents > record.automation.maxCostCents) errors.push("Otomasyon maliyet sınırı geçersiz veya aşılmış.");
    if (record.automation.mode === "ai_assisted" && (!nonEmpty(record.automation.provider) || !nonEmpty(record.automation.model))) errors.push("AI destekli taslakta sağlayıcı ve model zorunludur.");
  }
  return { ok: errors.length === 0, errors };
}

export function canTransition(from: PublicationStatus, to: PublicationStatus) { return TRANSITIONS[from].includes(to); }
export function isPubliclyVisible(record: PublicationRecord) { return isObject(record) && record.status === "published" && validatePublication(record).ok; }
export function publicationKindLabel(kind: PublicationRecord["kind"]) { return ({ research_article: "Araştırma yazısı", biography: "Biyografi", historical_analysis: "Tarihî inceleme", sourced_article: "Kaynaklı makale" } as const)[kind]; }
