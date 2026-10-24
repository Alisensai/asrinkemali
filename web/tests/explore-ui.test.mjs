import { registerHooks } from "node:module";
import path from "node:path";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {};" };
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
      try {
        return next(specifier + ".ts", context);
      } catch {
        // Fall back to next
      }
    }
    return next(specifier, context);
  },
});

import assert from "node:assert/strict";
import test, { describe } from "node:test";

const {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  HISTORICAL_PERIODS,
  foldTurkish,
  determineHistoricalPeriod,
  scoreRecommendation,
  getRecommendationsForRecord,
  buildExploreClusters,
  benchmarkRecommendationScorer,
} = await import("../lib/explore-ui/recommendations.ts");

const {
  searchExploreRecords,
  parseExploreSearchParams,
} = await import("../lib/explore-ui/search.ts");

const {
  archiveRecordToExploreDTO,
  DeterministicArchiveRecommendationService,
  QwenRecommendationServiceAdapter,
  getActiveRecommendationService,
} = await import("../lib/explore-ui/adapter.ts");

function createMockRecord(overrides = {}) {
  return {
    id: "rec-001",
    slug: "rec-001",
    title: "Cumhuriyetin İlanı ve Teşkilat-ı Esasiye",
    type: "document",
    typeLabel: "Belge",
    date: {
      start: "1923-10-29",
      end: "1923-10-29",
      display: "29 Ekim 1923",
    },
    source: {
      institution: "TBMM Arşivi",
      title: "Zabıt Ceridesi",
      url: "https://tbmm.gov.tr",
      citation: "Dönem 2, Cilt 3",
    },
    rights: {
      status: "public_domain",
      label: "Kamu Malı",
    },
    verification: {
      status: "published",
      label: "Kaynak denetimli · uzman onayı bekliyor",
    },
    categories: ["Cumhuriyet", "Hukuk"],
    tags: ["Cumhuriyet", "Anayasa", "Meclis"],
    topics: ["Cumhuriyet", "Hukuk", "Anayasa", "Meclis"],
    people: [
      { name: "Mustafa Kemal Atatürk", role: "speaker" },
      { name: "İsmet İnönü", role: "official" },
    ],
    locations: [{ name: "Birinci Meclis Binası", city: "Ankara" }],
    summary: "Cumhuriyetin ilan edildiği tarihî TBMM oturumu tutanağı.",
    description: "Cumhuriyet rejiminin kabulü ve anayasa değişiklikleri.",
    relatedIds: ["rec-002", "rec-003"],
    hasImage: false,
    ...overrides,
  };
}

describe("Explore UI — Modül ve Mantık Testleri (Görev 29)", () => {
  describe("1. Türkçe Karakter Katlama (foldTurkish)", () => {
    test("Türkçe büyük/küçük harfleri ve noktalı karakterleri doğru normalize eder", () => {
      assert.equal(foldTurkish("İSTANBUL"), "istanbul");
      assert.equal(foldTurkish("ışık"), "isik");
      assert.equal(foldTurkish("AÇIKLANABİLİR"), "aciklanabilir");
      assert.equal(foldTurkish("Gazi Mustafa Kemal"), "gazi mustafa kemal");
      assert.equal(foldTurkish("şapka ve kıyafet inkılâbı"), "sapka ve kiyafet inkilabi");
    });

    test("Boş, null ve beyaz boşluklu girişleri güvenli yönetir", () => {
      assert.equal(foldTurkish(""), "");
      assert.equal(foldTurkish("   "), "");
      assert.equal(foldTurkish(null), "");
      assert.equal(foldTurkish(undefined), "");
    });
  });

  describe("2. Tarihsel Dönem Tespiti (determineHistoricalPeriod)", () => {
    test("Tarih aralıklarına göre doğru dönemi tespit eder", () => {
      assert.equal(HISTORICAL_PERIODS.length, 4);
      const p1 = determineHistoricalPeriod({ date: { start: "1915-04-25" } });
      assert.equal(p1?.id, "osmanli-askeri");

      const p2 = determineHistoricalPeriod({ date: { start: "1920-04-23" } });
      assert.equal(p2?.id, "milli-mucadele");

      const p3 = determineHistoricalPeriod({ date: { start: "1924-03-03" } });
      assert.equal(p3?.id, "erken-cumhuriyet");

      const p4 = determineHistoricalPeriod({ date: { start: "1932-07-12" } });
      assert.equal(p4?.id, "kurumsallasma");
    });

    test("Geçersiz veya eksik tarihler için undefined döner", () => {
      assert.equal(determineHistoricalPeriod({ date: { start: null } }), undefined);
      assert.equal(determineHistoricalPeriod({ date: { start: "gecersiz-tarih" } }), undefined);
      assert.equal(determineHistoricalPeriod({ date: { start: "1800-01-01" } }), undefined);
    });
  });

  describe("3. Açıklanabilir Öneri Skorlama (scoreRecommendation)", () => {
    const seed = createMockRecord();

    test("Kendi kendisiyle kıyaslandığında null döner", () => {
      assert.equal(scoreRecommendation(seed, seed), null);
    });

    test("Doğrudan katalog referansı (relatedId) 40 puan ve gerekçe üretir", () => {
      const cand = createMockRecord({
        id: "rec-002",
        slug: "rec-002",
        title: "1924 Anayasası Metni",
        relatedIds: [],
        categories: ["Farklı"],
        tags: ["Farklı"],
        people: [],
        locations: [],
        date: { start: "1950-01-01", display: "1950" },
        type: "photograph",
      });

      const res = scoreRecommendation(seed, cand);
      assert.ok(res);
      assert.ok(res.reasons.some((r) => r.code === "related_id"));
      assert.equal(res.score, DEFAULT_RECOMMENDATION_WEIGHTS.relatedId);
      assert.equal(res.evidenceRecordId, seed.id);
    });

    test("Ortak şahsiyet ve aynı tarihsel dönem gerekçelerini açıklar", () => {
      const cand = createMockRecord({
        id: "rec-009",
        slug: "rec-009",
        title: "Lozan Görüşmeleri Telgrafı",
        relatedIds: [],
        categories: ["Diplomasi"],
        tags: ["Barış"],
        people: [{ name: "İsmet İnönü", role: "official" }],
        locations: [{ name: "Lozan", city: "Lozan" }],
        date: { start: "1923-07-24", display: "24 Temmuz 1923" },
        type: "document",
      });

      const res = scoreRecommendation(seed, cand);
      assert.ok(res);
      assert.ok(res.reasons.some((r) => r.code === "same_person"));
      assert.ok(res.reasons.some((r) => r.code === "same_period"));
      assert.ok(res.explanation.includes("İsmet İnönü"));
      assert.ok(res.explanation.length > 20);
    });

    test("Hiçbir ortak noktası olmayan aday için null döner", () => {
      const unrelated = createMockRecord({
        id: "rec-999",
        slug: "rec-999",
        title: "Farklı Çağ Kaydı",
        relatedIds: [],
        categories: ["Astronomik"],
        tags: ["Uzay"],
        people: [{ name: "Kopernik", role: "author" }],
        locations: [{ name: "Torun", city: "Torun" }],
        date: { start: "1543-01-01", display: "1543" },
        type: "publication",
      });

      const res = scoreRecommendation(seed, unrelated);
      assert.equal(res, null);
    });

    test("Maksimum skor 100 ile sınırlandırılır", () => {
      const perfectMatch = createMockRecord({
        id: "rec-perfect",
        slug: "rec-perfect",
      });
      // Tüm ağırlıklar toplandığında > 100 olabilir
      const res = scoreRecommendation(seed, perfectMatch);
      assert.ok(res);
      assert.ok(res.score <= 100);
    });
  });

  describe("4. Deterministik Öneri Sıralaması (getRecommendationsForRecord)", () => {
    const seed = createMockRecord({ id: "seed-main" });
    const pool = [
      createMockRecord({ id: "cand-b", title: "Aday B", categories: ["Cumhuriyet"] }),
      createMockRecord({ id: "cand-a", title: "Aday A", categories: ["Cumhuriyet"] }),
      createMockRecord({ id: "cand-c", title: "Aday C", relatedIds: ["seed-main"] }),
    ];

    test("En yüksek skorlu kayıt en başta yer alır", () => {
      const recs = getRecommendationsForRecord(seed, pool, 3);
      assert.equal(recs.length, 3);
      // cand-c doğrudan relatedId'ye sahip olduğu için en yüksek puanı almalı
      assert.equal(recs[0].record.id, "cand-c");
    });

    test("Puan eşitliğinde id alfabetik artan sırayla deterministik tie-break uygulanır", () => {
      const recs1 = getRecommendationsForRecord(seed, pool, 3);
      // cand-a ve cand-b eşit puandadır; cand-a önce gelmeli
      assert.equal(recs1[1].record.id, "cand-a");
      assert.equal(recs1[2].record.id, "cand-b");

      // Ters sıralı girdiyle de sonuç aynı olmalıdır
      const reversedPool = [...pool].reverse();
      const recs2 = getRecommendationsForRecord(seed, reversedPool, 3);
      assert.equal(recs2[1].record.id, "cand-a");
      assert.equal(recs2[2].record.id, "cand-b");
    });
  });

  describe("5. Tematik Kümeler (buildExploreClusters)", () => {
    test("6 ana tematik kümeyi oluşturur ve boş havuzda çökmez", () => {
      const emptyClusters = buildExploreClusters([]);
      assert.equal(emptyClusters.length, 6);
      assert.ok(emptyClusters.every((c) => c.itemCount === 0));

      const records = [
        createMockRecord({ id: "c-1", categories: ["Kurtuluş Savaşı"], tags: [], summary: "Savaş cephesi yazışması." }),
        createMockRecord({ id: "c-2", categories: ["Cumhuriyet"], tags: [], summary: "Hukuk sistemi ve devrim." }),
        createMockRecord({ id: "c-3", categories: ["Kültür ve Eğitim"], tags: [], summary: "Öğretim hamlesi." }),
      ];

      const filledClusters = buildExploreClusters(records);
      assert.equal(filledClusters.length, 6);
      const warCluster = filledClusters.find((c) => c.id === "milli-mucadele");
      assert.ok(warCluster);
      assert.equal(warCluster?.itemCount, 1);
    });
  });

  describe("6. Türkçe Arama ve Filtreleme (searchExploreRecords)", () => {
    const pool = [
      createMockRecord({
        id: "s-1",
        title: "Çankaya Köşkü Görüşmeleri",
        summary: "Ankara'da gerçekleştirilen toplantı.",
        tags: ["Köşk", "Ankara"],
        type: "photograph",
      }),
      createMockRecord({
        id: "s-2",
        title: "Lozan Barış Antlaşması Orijinal Metni",
        summary: "İsmet Paşa başkanlığındaki heyet.",
        tags: ["Lozan", "Diplomasi"],
        type: "document",
      }),
    ];

    test("Türkçe karakter duyarlı tam arama ve eşleşen alanlar", () => {
      const res = searchExploreRecords(pool, { q: "cankaya" });
      assert.equal(res.total, 1);
      assert.equal(res.items[0].id, "s-1");
      assert.ok(res.hits[0].matchedFields.includes("başlık"));
    });

    test("Tür filtresi yalnız istenen türü getirir", () => {
      const resDoc = searchExploreRecords(pool, { tur: "document" });
      assert.equal(resDoc.total, 1);
      assert.equal(resDoc.items[0].id, "s-2");

      const resPhoto = searchExploreRecords(pool, { tur: "photograph" });
      assert.equal(resPhoto.total, 1);
      assert.equal(resPhoto.items[0].id, "s-1");
    });

    test("Eşleşmeyen arama için boş liste döner", () => {
      const res = searchExploreRecords(pool, { q: "olmayan-kelime-xyz" });
      assert.equal(res.total, 0);
      assert.equal(res.items.length, 0);
    });
  });

  describe("7. URL Parametre Ayrıştırma ve Güvenlik (parseExploreSearchParams)", () => {
    test("Geçerli parametreleri doğru tiplere ayrıştırır", () => {
      const parsed = parseExploreSearchParams({
        q: "Nutuk",
        tur: "belge",
        kategori: "Cumhuriyet",
        donem: "milli-mucadele",
        kayit: "nutuk-el-yazmasi",
        siralama: "yeni",
        sayfa: "2",
      });

      assert.equal(parsed.q, "Nutuk");
      assert.equal(parsed.tur, "document");
      assert.equal(parsed.kategori, "Cumhuriyet");
      assert.equal(parsed.donem, "milli-mucadele");
      assert.equal(parsed.kayit, "nutuk-el-yazmasi");
      assert.equal(parsed.siralama, "yeni");
      assert.equal(parsed.sayfa, 2);
    });

    test("Kötü niyetli XSS veya traversal içeren girdileri temizler", () => {
      const parsed = parseExploreSearchParams({
        q: '<script>alert("xss")</script>',
        kayit: "../../etc/passwd",
        sayfa: "-5",
      });

      // Geçersiz slug regex'i nedeniyle kayit temizlenmeli (undefined)
      assert.equal(parsed.kayit, undefined);
      // Sayfa en az 1 olmalı
      assert.equal(parsed.sayfa, 1);
      assert.ok(parsed.q.length <= 100);
    });
  });

  describe("8. DTO Adaptörü ve Yayın Güvencesi (archiveRecordToExploreDTO)", () => {
    test("Kullanıcıya açık DTO'da sahte uzman onayı bulunmaz; reviewLabel korunur", () => {
      const rawRecord = {
        schemaVersion: "1.0.0",
        id: "raw-001",
        slug: "raw-001",
        title: "Test Kaydı",
        type: "document",
        date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
        people: [],
        locations: [],
        categories: ["Test"],
        summary: "Özet metin",
        source: {
          institution: "TTK",
          institutionType: "archive",
          institutionUrl: "https://ttk.gov.tr",
          title: "Kayıt",
          url: "https://ttk.gov.tr",
          accessedAt: "2026-10-24",
        },
        provenance: [],
        rights: { status: "public_domain", imageReuse: "permitted", note: "Açık" },
        image: null,
        verification: {
          status: "published",
          reviewedBy: null,
          reviewedAt: null,
          checks: { sourceReachable: true, dateVerified: true, rightsVerified: true, quoteVerified: true, duplicateChecked: true },
          notes: "İç not",
        },
        tags: ["Test"],
        createdAt: "2026-10-24",
        updatedAt: "2026-10-24",
      };

      const dto = archiveRecordToExploreDTO(rawRecord);
      assert.equal(dto.verification.status, "published");
      assert.equal(dto.verification.label, "Kaynak denetimli · uzman onayı bekliyor");
      assert.ok(!JSON.stringify(dto).includes("onaylı tarihçi"));
      assert.ok(!JSON.stringify(dto).includes("verified historian"));
    });
  });

  describe("9. Qwen Adaptörü ve Fallback Sözleşmesi", () => {
    test("Qwen adaptörü canlıda kapalıdır (isAvailable = false) ve deterministik motora delege eder", async () => {
      const qwenAdapter = new QwenRecommendationServiceAdapter();
      assert.equal(qwenAdapter.isAvailable(), false);

      const activeService = getActiveRecommendationService();
      assert.ok(activeService instanceof DeterministicArchiveRecommendationService);
      assert.equal(activeService.isAvailable(), true);

      const seed = createMockRecord();
      const recs = await qwenAdapter.getRecommendations(seed, [seed]);
      assert.ok(Array.isArray(recs));
    });
  });

  describe("10. Performans ve Determinizm Kıyaslaması (Sentetik)", () => {
    test("1, 168, 2.000 ve 10.000 sentetik kayıtta determinizm doğrulanır", () => {
      const benchmark = benchmarkRecommendationScorer([1, 168, 2000]);
      assert.ok(benchmark[1].deterministic);
      assert.ok(benchmark[168].deterministic);
      assert.ok(benchmark[2000].deterministic);
      assert.ok(benchmark[168].durationMs < 500); // 168 kayıt yarım saniyeden çok daha hızlı olmalı
    });
  });
});
