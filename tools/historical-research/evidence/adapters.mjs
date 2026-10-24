/**
 * OpenCode Authority Registry, Copilot ResearchReviewService ve
 * Gemini/DeepSeek SearchAdapter bağlantı sözleşmeleri.
 *
 * KURALLAR:
 * - Authority Registry birleştirilmemişse kimlik UYDURULMAZ (null döner).
 * - Mock kullanıcıyla üretilen test kararları gerçek arşiv onayı SAYILMAZ.
 * - Arama motoru bağlı değilse boş döner; uydurma sonuç üretmez.
 */

/**
 * @typedef {import("./contracts.d.ts").AuthorityRegistryAdapter} AuthorityRegistryAdapter
 * @typedef {import("./contracts.d.ts").ResearchReviewService} ResearchReviewService
 * @typedef {import("./contracts.d.ts").SearchAdapter} SearchAdapter
 * @typedef {import("./contracts.d.ts").ReviewDecisionRequest} ReviewDecisionRequest
 * @typedef {import("./contracts.d.ts").ReviewDecision} ReviewDecision
 * @typedef {import("./contracts.d.ts").SearchQuery} SearchQuery
 * @typedef {import("./contracts.d.ts").SearchResultItem} SearchResultItem
 */

/**
 * Authority Registry bağdaştırıcısı — kayıt defteri yoksa kimlik uydurmaz.
 * @param {{ resolveFn?: (entityType: "person"|"place"|"institution"|"event", naturalKey: string) => Promise<string|null> }} [options]
 * @returns {AuthorityRegistryAdapter}
 */
export function createAuthorityRegistryAdapter(options = {}) {
  return {
    async resolve(entityType, naturalKey) {
      if (options.resolveFn) return options.resolveFn(entityType, naturalKey);
      // Registry henüz birleştirilmedi → kimlik uydurulmaz
      return null;
    },
    available() {
      return Boolean(options.resolveFn);
    },
  };
}

/**
 * Copilot MKA Control Center için ResearchReviewService.
 * Gerçek kimlik/Yetki sağlayıcısı yapılandırılmadan karar ÜRETİLEMEZ.
 * @param {{ realAuthorizationConfigured?: boolean }} [config]
 * @returns {ResearchReviewService}
 */
export function createResearchReviewService(config = {}) {
  const realAuth = config.realAuthorizationConfigured === true;
  return {
    isRealAuthorizationConfigured() {
      return realAuth;
    },
    async createDecision(request) {
      if (!realAuth) {
        throw new Error(
          "İnsan inceleme kararı üretilamiyor: gerçek kimlik ve Yetki sağlayıcısı yapılandırılmamış. " +
            "Mock/otomatik kararlar gerçek arşiv onayı sayılmaz (ClaimRecord.status 'approved' üretilemez)."
        );
      }
      const decision = /** @type {ReviewDecision} */ ({
        claimId: request.claimId,
        claimVersion: request.claimVersion,
        decision: request.decision,
        rationale: request.rationale,
        trusted: false, // bu teslimde gerçek kimlik altyapısı yok — asla trusted
        createdAt: new Date().toISOString(),
      });
      return decision;
    },
  };
}

/**
 * Gemini/DeepSeek arama bağdaştırıcısı — bağlı değilse boş döner.
 * @param {{ searchFn?: (query: SearchQuery) => Promise<SearchResultItem[]> }} [options]
 * @returns {SearchAdapter}
 */
export function createSearchAdapter(options = {}) {
  return {
    available() {
      return Boolean(options.searchFn);
    },
    async search(query) {
      if (options.searchFn) return options.searchFn(query);
      return [];
    },
  };
}

/**
 * Kaynaklı mekân ilişkisi dışa aktarımı (Gemini tarih atlası veri sözleşmesi).
 * @param {Array<{ placeName: string; claimId: string|null; candidateId: string|null; evidenceId: string|null; dateRange: object|null }>} relations
 */
export function exportSourcedPlaceRelations(relations) {
  return {
    schemaVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    note: "Yalnız kaynaklı ilişkiler; kaynaksız mekân bağlantısı üretilmez.",
    relations,
  };
}
