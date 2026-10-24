/**
 * Haricî Rerank Sağlayıcı Adaptörü (Simüle / Mock Mod)
 * 
 * Güvenlik ve Uyumluluk:
 * - Ücretli API, API Key veya dış ağ isteği kesinlikle YOKTUR.
 * - Çevrimdışı, deterministik simülasyon modunda çalışır.
 * - Açıkça 'external_mock' ve 'simulated' olarak etiketlenir.
 */

export class MockExternalReranker {
  constructor(options = {}) {
    this.providerType = "external_mock";
    this.measuredAs = "simulated";
    this.shouldFail = options.shouldFail || false;
  }

  async rerank(query, candidateIds, recordsMap, options = {}) {
    const k = options.k || 10;
    const start = Date.now();

    if (this.shouldFail) {
      return {
        providerType: this.providerType,
        measuredAs: this.measuredAs,
        usedFallback: true,
        failureClass: "SIMULATED_NETWORK_TIMEOUT",
        rankedIds: candidateIds.slice(0, k),
        elapsedMs: Date.now() - start,
      };
    }

    // Semantik skor simülasyonu: query uzunluğu ve başlık benzerliğiyle hafif puan artırımı
    const qLower = query.toLowerCase();
    const scored = candidateIds.map((id) => {
      const rec = recordsMap.get(id);
      let simScore = 50;
      if (rec && rec.title && rec.title.toLowerCase().includes(qLower)) {
        simScore += 30;
      }
      return { id, simScore };
    });

    scored.sort((a, b) => b.simScore - a.simScore || a.id.localeCompare(b.id, "tr"));

    return {
      providerType: this.providerType,
      measuredAs: this.measuredAs,
      usedFallback: false,
      rankedIds: scored.slice(0, k).map((s) => s.id),
      elapsedMs: Date.now() - start,
    };
  }
}
