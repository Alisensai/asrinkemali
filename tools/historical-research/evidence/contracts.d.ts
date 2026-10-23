/**
 * MKA Evidence Workbench 2.0 — Veri Sözleşmeleri (TypeScript)
 *
 * Bu dosya yalnızca TİP sözleşmelerini tanımlar; çalışma zamanı kodu
 * aynı dizindeki .mjs dosyalarındadır ve `tsc --noEmit` ile bu sözleşmelere
 * karşı denetlenir (tsconfig.evidence.json → checkJs).
 *
 * Kritik ayrımlar (karıştırılmamalı):
 * - İstenen ilişki (relation) ≠ pasaj temelli destek değerlendirmesi (supportAssessment)
 * - Araştırma doğrulama seviyesi (verificationLevel) ≠ insan onayı (humanReview)
 * - Özgün eser/belge ≠ onu yayımlayan dijital platform
 * - Özetlenen (stale) kanıt, geçerliliğini yitirmiş demek DEĞİLDİR; yeniden değerlendirme bekler.
 */

/** İddia onayı ÜRETİLEMEYEN durumlar. "approved" bilinçli olarak yoktur. */
export type ClaimStatus =
  | "new"
  | "under_research"
  | "awaiting_human_review"
  | "insufficient_info"
  | "rejected";

export type ClaimDateCertainty = "exact" | "estimated" | "uncertain";

export interface ClaimDateRange {
  start: string;
  end: string | null;
  precision: "year" | "month" | "day" | "range";
  certainty: ClaimDateCertainty;
  display: string;
}

/** Kanıtın iddia sürümüne BAĞLANMASI zorunludur. */
export interface EvidenceRelation {
  /** Kaynağın iddia ile ilgisi — tek başına destek anlamına gelmez. */
  relation: "supports" | "contradicts" | "partial" | "mentions";
}

/** Kanıt konumu: özgün kaynağın nerede ne söylediği. */
export interface EvidenceLocator {
  /** Özgün kaynak URL'si (kurumsal beyaz liste dışına çıkmamalıdır). */
  url: string;
  /** Belge başlığı. */
  title: string;
  /** Yazar (yoksa null — uydurulmaz). */
  author: string | null;
  /** Kaynak kurum. */
  institution: string;
  /** Sayfa numarası (yoksa null). */
  page: string | null;
  /** Bölüm başlığı (yoksa null). */
  section: string | null;
  /** Paragraf veya katalog öğesi (yoksa null). */
  locator: string | null;
}

export type SupportMethod =
  | "direct_passage"   // ilgili pasaj doğrudan okundu
  | "title_only"       // yalnızca başlık — destek KANITI SAYILMAZ
  | "metadata_only"    // yalnızca künye — destek KANITI SAYILMAZ
  | null;              // henüz değerlendirilmedi

export interface SupportAssessment {
  /** Değerlendirme yapıldı mı? */
  assessed: boolean;
  /** Kaynak ilgili iddiayı GERÇEKTEN destekliyor mu? (null = belirsiz) */
  actuallySupports: boolean | null;
  method: SupportMethod;
  note: string | null;
}

export type VerificationLevel =
  | "unverified"       // hiçbir kanıt konumu yok
  | "located"          // kaynak konumu kaydedildi
  | "passage_reviewed" // pasaj kaydedildi ve araştırma değerlendirmesi yapıldı
  | "human_verified";   // insan uzman onayı (bu teslimde ASLA üretilmez)

export interface HumanReviewState {
  /** İnsan uzman incelemesi tamamlandı mı? Mock değerler ASLA true olamaz. */
  reviewed: boolean;
  reviewer: string | null;
  reviewedAt: string | null;
}

export interface EvidenceRecord {
  schemaVersion: "1.0.0";
  id: string;
  /** Hangi iddiaya bağlı. */
  claimId: string;
  /** Hangi iddia SÜRÜMÜNE bağlı — iddia metni değişince eski kanıt otomatik geçerli sayılmaz. */
  claimVersion: number;
  /** Pool'daki kaynak adayına bağ (yoksa null). */
  candidateId: string | null;
  relation: EvidenceRelation["relation"];
  locator: EvidenceLocator;
  /** Kısa alıntı (≤ 300 karakter; telif güvenli; yoksa null). */
  shortQuote: string | null;
  /** Erişim tarihi (ISO tam tarih). */
  accessDate: string;
  /** Kanıtın bildirdiği tarih aralığı (uygulanabilirse; yoksa null). */
  dateRange: ClaimDateRange | null;
  supportAssessment: SupportAssessment;
  verificationLevel: VerificationLevel;
  humanReview: HumanReviewState;
  /** Bu kaydın üretilme kaynağı: gerçek araştırma mı sentetik test mi. */
  synthetic: boolean;
}

export interface ClaimRevision {
  version: number;
  text: string;
  dateRange: ClaimDateRange | null;
  /** Bu sürümde geçerli sayılan kanıt kimlikleri (stale olanlar hariç tutulur). */
  evidenceIds: string[];
  revisionNote: string;
  /** Sürümün ne zaman devre dışı bırakıldığı (null = güncel sürüm). */
  supersededAt: string | null;
  createdAt: string;
}

export interface ClaimRecord {
  schemaVersion: "2.0.0";
  id: string;
  currentVersion: number;
  revisions: ClaimRevision[];
  status: ClaimStatus;
  category: string;
  relatedPeople: string[];
  relatedPlaces: string[];
  relatedEvents: string[];
  /** Belirsizlik açıklaması (uydurulmaz; yoksa null). */
  uncertaintyNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCandidateRef {
  candidateId: string;
  title: string;
  institution: string;
  url: string;
  sourceNature: "primary" | "secondary" | "unknown";
}

/** Kaynak bağımsızlık ilişkisi. */
export type SourceRelationType =
  | "same_original_work"     // aynı özgün eser/belge
  | "copy_republication"     // kopya yayın
  | "citing_secondary"       // alıntılayan ikinci kaynak
  | "separate_primary_document" // gerçekten ayrı birincil belge
  | "unknown";               // bağımsızlık belirsiz

export interface IndependenceAssessment {
  type: SourceRelationType;
  /** Belirsizse bu açıkça true kalır ve bağımsız kanıt SAYILMAZ. */
  uncertain: boolean;
  basis: string;
}

export interface ContradictionCandidate {
  id: string;
  /** Çelişki alanı. */
  field: "event_date" | "publication_date" | "person_name" | "place_name" | "institution_name" | "quote_attribution" | "event_order" | "interpretation";
  /** Çelişen iki kanıt konumu — ikisi de görünür olmalı. */
  evidenceIds: [string, string];
  claimId: string;
  description: string;
  /** Bu aday kesin tarihî çelişki DEĞİLDİR; insan incelemesi bekler. */
  status: "needs_review" | "dismissed";
  createdAt: string;
}

export type NoteKind =
  | "commentary"        // araştırmacı yorumu — kaynakta yazan DEĞİL
  | "source_quotation"  // kaynakta geçen ifade (kısa alıntı)
  | "research_question"
  | "missing_info"
  | "comparison";

export interface ResearchNote {
  schemaVersion: "1.0.0";
  id: string;
  kind: NoteKind;
  author: string;
  createdAt: string;
  updatedAt: string;
  target: {
    claimId: string | null;
    candidateId: string | null;
    evidenceId: string | null;
  };
  text: string;
  linkedRecordIds: string[];
  history: Array<{ at: string; change: string }>;
}

export type GraphNodeType =
  | "claim" | "source" | "document" | "person" | "institution" | "event";

export type GraphEdgeType =
  | "supports" | "contradicts" | "mentions" | "quotes"
  | "derived_from" | "duplicate_of" | "references" | "needs_review";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  /** İlgili kaydın kimliği (claim-001, src-2026-0001 gibi). */
  ref: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: GraphEdgeType;
  /** Kanıt kaydı kimliği (varsa). */
  evidenceId: string | null;
  /** İddia sürümü — güncel olmayan sürüm kenarları güncel görünüme dahil edilmez. */
  claimVersion: number | null;
}

export interface EvidenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Dışarı aktarılan indeksler (performans). */
  nodeIndex: Map<string, GraphNode>;
  adjacency: Map<string, GraphEdge[]>;
}

/** OpenCode Authority Registry sözleşmesi — kimlik uydurulmaz. */
export interface AuthorityRef {
  personAuthorityId: string | null;
  placeAuthorityId: string | null;
  institutionAuthorityId: string | null;
  eventAuthorityId: string | null;
}

export interface AuthorityRegistryAdapter {
  /** Registry birleştirilmemişse null döner; asla uydurma kimlik üretmez. */
  resolve(entityType: "person" | "place" | "institution" | "event", naturalKey: string): Promise<string | null>;
  available(): boolean;
}

/** Copilot MKA Control Center — ResearchReviewService sözleşmesi. */
export interface ReviewDecisionRequest {
  claimId: string;
  claimVersion: number;
  decision: "approve" | "reject" | "request_changes";
  rationale: string;
}

export interface ReviewDecision {
  claimId: string;
  claimVersion: number;
  decision: "approve" | "reject" | "request_changes";
  rationale: string;
  /** Gerçek kimlik/Yetki sağlayıcısı olmadan üretilen karar ASLA trusted olamaz. */
  trusted: false;
  createdAt: string;
}

export interface ResearchReviewService {
  /** Gerçek kimlik doğrulaması kurulmadan karar ÜRETİLEMEZ — hata fırlatır. */
  createDecision(request: ReviewDecisionRequest): Promise<ReviewDecision>;
  isRealAuthorizationConfigured(): boolean;
}

/** Gemini/DeepSeek SearchAdapter sözleşmesi. */
export interface SearchQuery {
  query: string;
  maxResults: number;
}

export interface SearchResultItem {
  title: string;
  url: string;
  institution: string | null;
  snippet: string | null;
}

export interface SearchAdapter {
  /** Arama motoru bağlı değilse boş döner; uydurma sonuç üretmez. */
  search(query: SearchQuery): Promise<SearchResultItem[]>;
  available(): boolean;
}

/** Kaynaklı mekân ilişkisi (Gemini tarih atlası dışa aktarımı). */
export interface SourcedPlaceRelation {
  placeName: string;
  claimId: string | null;
  candidateId: string | null;
  evidenceId: string | null;
  dateRange: ClaimDateRange | null;
}
