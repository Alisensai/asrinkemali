import type {
  ExploreCluster,
  ExploreRecommendation,
  ExploreRecordDTO,
  HistoricalPeriod,
  RecommendationReason,
  RecommendationWeights,
} from "./types";

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  relatedId: 40,
  samePerson: 25,
  sameLocation: 20,
  sameCategory: 20,
  samePeriod: 15,
  sharedTag: 10,
  sameType: 5,
};

export const HISTORICAL_PERIODS: readonly HistoricalPeriod[] = [
  {
    id: "osmanli-askeri",
    label: "Osmanlı Dönemi ve Askeri Görevler (1881–1918)",
    startYear: 1881,
    endYear: 1918,
    description:
      "Mustafa Kemal'in askerî eğitimi, Trablusgarp, Çanakkale ve I. Dünya Savaşı cepheleri.",
  },
  {
    id: "milli-mucadele",
    label: "Millî Mücadele ve Kurtuluş Savaşı (1919–1923)",
    startYear: 1919,
    endYear: 1923,
    description:
      "19 Mayıs 1919 Samsun'a çıkış, kongreler, TBMM'nin kuruluşu ve bağımsızlık savaşı.",
  },
  {
    id: "erken-cumhuriyet",
    label: "Cumhuriyetin İlanı ve Erken Devrimler (1923–1930)",
    startYear: 1923,
    endYear: 1930,
    description:
      "Cumhuriyetin ilanı, hilafetin kaldırılması, hukuk, harf ve kıyafet devrimleri.",
  },
  {
    id: "kurumsallasma",
    label: "Kurumsallaşma ve Kültür Atılımları (1930–1938)",
    startYear: 1930,
    endYear: 1938,
    description:
      "Türk Dil ve Tarih kurumları, üniversite reformu, devletçilik ve Hatay meselesi.",
  },
];

/**
 * Türkçe karakter duyarlı metin katlama (küçük harfe çevirip normalize etme).
 */
export function foldTurkish(value: string): string {
  if (!value) return "";
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[âä]/g, "a")
    .replace(/[îï]/g, "i")
    .replace(/[ûü]/g, "u")
    .replace(/[ôö]/g, "o")
    .trim();
}

/**
 * Bir kaydın ait olduğu tarihsel dönemi tespit eder.
 */
export function determineHistoricalPeriod(
  record: Pick<ExploreRecordDTO, "date">
): HistoricalPeriod | undefined {
  const startStr = record.date.start;
  if (!startStr) return undefined;
  const match = startStr.match(/^(\d{4})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  if (isNaN(year)) return undefined;

  return HISTORICAL_PERIODS.find(
    (p) => year >= p.startYear && year <= p.endYear
  );
}

/**
 * İki kayıt arasındaki açıklanabilir öneri skorunu ve gerekçelerini hesaplar.
 */
export function scoreRecommendation(
  seed: ExploreRecordDTO,
  candidate: ExploreRecordDTO,
  weightsConfig?: Partial<RecommendationWeights>
): ExploreRecommendation | null {
  if (!seed || !candidate || seed.id === candidate.id) {
    return null;
  }

  const weights: RecommendationWeights = {
    ...DEFAULT_RECOMMENDATION_WEIGHTS,
    ...weightsConfig,
  };

  const reasons: RecommendationReason[] = [];

  // 1. Doğrudan katalog çapraz referansı (relatedId)
  const isDirectlyRelated =
    (seed.relatedIds && seed.relatedIds.includes(candidate.id)) ||
    (candidate.relatedIds && candidate.relatedIds.includes(seed.id));

  if (isDirectlyRelated && weights.relatedId > 0) {
    reasons.push({
      code: "related_id",
      label: "Katalog Çapraz Referansı",
      weight: weights.relatedId,
      detail: "Arşiv kataloğunda doğrudan birbiriyle ilişkili olarak kayıtlıdır.",
    });
  }

  // 2. Ortak şahsiyetler (people)
  const seedPeopleNames = (seed.people || []).map((p) => foldTurkish(p.name));
  const candidatePeople = candidate.people || [];
  const commonPeople = candidatePeople.filter((p) =>
    seedPeopleNames.includes(foldTurkish(p.name))
  );

  if (commonPeople.length > 0 && weights.samePerson > 0) {
    const personNames = commonPeople.map((p) => p.name).join(", ");
    reasons.push({
      code: "same_person",
      label: `Ortak Şahsiyet (${personNames})`,
      weight: weights.samePerson,
      detail: `Her iki kayıt ortak tarihî aktörleri içermektedir: ${personNames}.`,
    });
  }

  // 3. Ortak mekân / şehir (locations)
  const seedLocations = (seed.locations || []).map((l) => ({
    name: foldTurkish(l.name),
    city: l.city ? foldTurkish(l.city) : "",
  }));
  const candidateLocations = candidate.locations || [];
  const commonLocationNames: string[] = [];

  for (const candLoc of candidateLocations) {
    const cName = foldTurkish(candLoc.name);
    const cCity = candLoc.city ? foldTurkish(candLoc.city) : "";
    const matched = seedLocations.find(
      (sLoc) =>
        (cCity && sLoc.city && cCity === sLoc.city) ||
        (cName && sLoc.name && cName === sLoc.name)
    );
    if (matched) {
      commonLocationNames.push(candLoc.city || candLoc.name);
    }
  }

  if (commonLocationNames.length > 0 && weights.sameLocation > 0) {
    const uniqueLocs = Array.from(new Set(commonLocationNames)).join(", ");
    reasons.push({
      code: "same_location",
      label: `Ortak Mekân/Bölge (${uniqueLocs})`,
      weight: weights.sameLocation,
      detail: `Her iki belge veya olay aynı coğrafi alanda geçmektedir: ${uniqueLocs}.`,
    });
  }

  // 4. Ortak kategori (categories)
  const seedCategories = (seed.categories || []).map(foldTurkish);
  const commonCategories = (candidate.categories || []).filter((cat) =>
    seedCategories.includes(foldTurkish(cat))
  );

  if (commonCategories.length > 0 && weights.sameCategory > 0) {
    const catList = commonCategories.join(", ");
    reasons.push({
      code: "same_category",
      label: `Ortak Kategori (${catList})`,
      weight: weights.sameCategory,
      detail: `Arşiv tematik sınıflandırmasında ortak kategori: ${catList}.`,
    });
  }

  // 5. Aynı tarihsel dönem (period)
  const seedPeriod = determineHistoricalPeriod(seed);
  const candPeriod = determineHistoricalPeriod(candidate);

  if (seedPeriod && candPeriod && seedPeriod.id === candPeriod.id && weights.samePeriod > 0) {
    reasons.push({
      code: "same_period",
      label: seedPeriod.label,
      weight: weights.samePeriod,
      detail: `Her iki kaynak ${seedPeriod.label} sürecine aittir.`,
    });
  }

  // 6. Ortak etiketler (tags)
  const seedTags = (seed.tags || []).map(foldTurkish);
  const commonTags = (candidate.tags || []).filter((tag) =>
    seedTags.includes(foldTurkish(tag))
  );

  if (commonTags.length > 0 && weights.sharedTag > 0) {
    const tagList = commonTags.slice(0, 3).join(", ");
    reasons.push({
      code: "shared_tag",
      label: `Ortak Etiket (${tagList})`,
      weight: weights.sharedTag,
      detail: `Her iki kayıtta paylaşılan anahtar kavramlar: ${tagList}.`,
    });
  }

  // 7. Aynı arşiv türü (sameType)
  if (seed.type === candidate.type && weights.sameType > 0) {
    reasons.push({
      code: "same_type",
      label: `Aynı Arşiv Türü (${candidate.typeLabel || candidate.type})`,
      weight: weights.sameType,
      detail: `Benzer formatta kaynak incelemesi (${candidate.typeLabel || candidate.type}).`,
    });
  }

  // Hiçbir gerekçe eşleşmediyse veya toplam ağırlık 0 ise
  if (reasons.length === 0) {
    return null;
  }

  const rawScore = reasons.reduce((sum, r) => sum + r.weight, 0);
  const score = Math.min(100, Math.max(1, rawScore));

  // En belirleyici birincil gerekçeyi seç
  const sortedReasons = [...reasons].sort((a, b) => b.weight - a.weight);
  const primaryReason = sortedReasons[0].label;

  // Açıklayıcı metin oluştur
  const explanation = reasons.map((r) => r.detail).join(" ");

  return {
    record: candidate,
    score,
    primaryReason,
    reasons,
    evidenceRecordId: seed.id,
    evidenceRecordTitle: seed.title,
    explanation,
  };
}

/**
 * Belirli bir kayıt için tüm aday havuzundan açıklanabilir önerileri deterministik sıralar.
 */
export function getRecommendationsForRecord(
  seed: ExploreRecordDTO,
  pool: readonly ExploreRecordDTO[],
  limit = 6,
  weightsConfig?: Partial<RecommendationWeights>
): ExploreRecommendation[] {
  if (!seed || !pool || pool.length === 0) {
    return [];
  }

  const recommendations: ExploreRecommendation[] = [];

  for (const candidate of pool) {
    const scored = scoreRecommendation(seed, candidate, weightsConfig);
    if (scored && scored.score > 0) {
      recommendations.push(scored);
    }
  }

  // Deterministik sıralama:
  // 1. Skor azalan sırada
  // 2. Eşitlik durumunda record.id alfabetik artan sırada (tie-breaker)
  recommendations.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.record.id.localeCompare(b.record.id, "tr");
  });

  return recommendations.slice(0, limit);
}

/**
 * Arşiv kayıtlarını tematik ve tarihsel kümelere ayırır.
 */
export function buildExploreClusters(
  records: readonly ExploreRecordDTO[]
): ExploreCluster[] {
  const clusterDefinitions = [
    {
      id: "milli-mucadele",
      title: "Millî Mücadele ve Bağımsızlık Yolu",
      description:
        "1919–1923 yılları arasında Samsun'dan Lozan'a uzanan cephe yazışmaları, kongre kararları ve askerî belgeler.",
      category: "Kurtuluş Savaşı",
      periodId: "milli-mucadele",
      keywords: ["kurtulus", "mucadele", "cephe", "savas", "kongre", "tbmm", "ordu", "mudafaa"],
    },
    {
      id: "cumhuriyet-hukuk",
      title: "Cumhuriyetin İlanı ve Hukuk Reformu",
      description:
        "1923 ve 1924 anayasaları, cumhuriyetin ilanı, laiklik ilkesi ve çağdaş hukuk sisteminin temelleri.",
      category: "Cumhuriyet",
      periodId: "erken-cumhuriyet",
      keywords: ["cumhuriyet", "hukuk", "anayasa", "meclis", "devlet", "laiklik", "kanun"],
    },
    {
      id: "egitim-kultur",
      title: "Eğitim, Bilim ve Kültür Hamlesi",
      description:
        "Millet mektepleri, harf devrimi, üniversite reformu, Türk Tarih ve Dil kurumlarının kuruluşu.",
      category: "Kültür ve Eğitim",
      periodId: "kurumsallasma",
      keywords: ["egitim", "kultur", "dil", "tarih", "harf", "mektep", "universite", "ogretim"],
    },
    {
      id: "dis-politika",
      title: "Dış Politika ve Barış Diplomasisi",
      description:
        "Yurtta sulh cihanda sulh ilkesiyle şekillenen diplomatik temaslar, anlaşmalar ve Hatay meselesi.",
      category: "Diplomasi",
      periodId: "kurumsallasma",
      keywords: ["diplomasi", "lozan", "antlasma", "elci", "hatay", "baris", "disisleri"],
    },
    {
      id: "devrimler",
      title: "Toplumsal Dönüşüm ve Modernleşme",
      description:
        "Kıyafet devrimi, soyadı kanunu, kadın hakları ve çağdaş toplum yaşamına geçiş adımları.",
      category: "İnkılaplar",
      periodId: "erken-cumhuriyet",
      keywords: ["inkilap", "devrim", "soyad", "kiyafet", "kadin", "toplum", "modern"],
    },
    {
      id: "tarihi-mekanlar",
      title: "Tarihî Mekânlar ve Kültür Mirası",
      description:
        "Çankaya Köşkü, TBMM Binası, Dolmabahçe ve Millî Mücadele'nin kritik karargâhları.",
      category: "Mekân",
      keywords: ["mekan", "kosk", "saray", "bina", "karargah", "ankara", "istanbul", "anit"],
    },
  ];

  return clusterDefinitions.map((def) => {
    const matchedRecords = records.filter((rec) => {
      // 1. Kategori eşleşmesi
      if (
        rec.categories.some((c) =>
          foldTurkish(c).includes(foldTurkish(def.category))
        )
      ) {
        return true;
      }
      // 2. Anahtar kelime eşleşmesi
      const haystack = foldTurkish(
        `${rec.title} ${rec.summary} ${rec.tags.join(" ")} ${rec.categories.join(" ")}`
      );
      return def.keywords.some((kw) => haystack.includes(kw));
    });

    // Deterministik sıralama: en son tarih önce, eşitlikte id artan
    matchedRecords.sort((a, b) => {
      const dateA = a.date.start || "";
      const dateB = b.date.start || "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return a.id.localeCompare(b.id, "tr");
    });

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      period: def.periodId,
      itemCount: matchedRecords.length,
      records: matchedRecords.slice(0, 6),
    };
  });
}

/**
 * Performans ve determinizm kıyaslama aracı.
 * 1, 168, 2.000 ve 10.000 sentetik kayıt üzerinde determinizmi ve süreleri ölçer.
 */
export function benchmarkRecommendationScorer(
  counts: number[] = [1, 168, 2000, 10000]
): Record<number, { durationMs: number; deterministic: boolean; topId: string }> {
  const results: Record<
    number,
    { durationMs: number; deterministic: boolean; topId: string }
  > = {};

  const baseSeed: ExploreRecordDTO = {
    id: "seed-record-001",
    slug: "seed-record-001",
    title: "Cumhuriyetin İlanı ve Hukuk Sistemi",
    type: "document",
    typeLabel: "Belge",
    date: { start: "1923-10-29", end: "1923-10-29", display: "29 Ekim 1923" },
    source: { institution: "TBMM Arşivi", title: "Tutanak Dergisi", url: "https://tbmm.gov.tr" },
    rights: { status: "public_domain", label: "Kamu Malı" },
    verification: { status: "published", label: "Kaynak denetimli · uzman onayı bekliyor" },
    categories: ["Cumhuriyet", "Hukuk"],
    tags: ["Cumhuriyet", "TBMM", "Anayasa"],
    topics: ["Cumhuriyet", "Hukuk", "TBMM", "Anayasa"],
    people: [{ name: "Mustafa Kemal Atatürk", role: "speaker" }, { name: "İsmet İnönü", role: "official" }],
    locations: [{ name: "TBMM", city: "Ankara" }],
    summary: "Cumhuriyetin ilanına dair meclis oturumu.",
    relatedIds: ["record-005", "record-050"],
    hasImage: false,
  };

  for (const count of counts) {
    const syntheticPool: ExploreRecordDTO[] = [];
    for (let i = 0; i < count; i++) {
      const padded = String(i).padStart(5, "0");
      syntheticPool.push({
        id: `record-${padded}`,
        slug: `record-${padded}`,
        title: `Tarihsel Kayıt ${padded}`,
        type: i % 2 === 0 ? "document" : "photograph",
        typeLabel: i % 2 === 0 ? "Belge" : "Fotoğraf",
        date: {
          start: `19${20 + (i % 18)}-01-01`,
          end: null,
          display: `19${20 + (i % 18)}`,
        },
        source: {
          institution: i % 3 === 0 ? "TBMM Arşivi" : "Türk Tarih Kurumu",
          title: `Belge Kaydı ${padded}`,
          url: "https://ttk.gov.tr",
        },
        rights: { status: "public_domain", label: "Kamu Malı" },
        verification: { status: "published", label: "Kaynak denetimli · uzman onayı bekliyor" },
        categories: i % 2 === 0 ? ["Cumhuriyet"] : ["Eğitim"],
        tags: i % 4 === 0 ? ["TBMM", "Hukuk"] : ["Kültür"],
        topics: ["Cumhuriyet"],
        people: i % 5 === 0 ? [{ name: "İsmet İnönü", role: "official" }] : [],
        locations: i % 6 === 0 ? [{ name: "Ankara", city: "Ankara" }] : [],
        summary: `Sentetik özet metni ${padded}`,
        relatedIds: i === 5 ? ["seed-record-001"] : [],
        hasImage: false,
      });
    }

    const t0 = performance.now();
    const run1 = getRecommendationsForRecord(baseSeed, syntheticPool, 5);
    const durationMs = Math.round((performance.now() - t0) * 100) / 100;

    // Determinizm doğrulaması: Karıştırılmış havuzla aynı sonucu vermeli
    const shuffledPool = [...syntheticPool].reverse();
    const run2 = getRecommendationsForRecord(baseSeed, shuffledPool, 5);

    const deterministic =
      run1.length === run2.length &&
      run1.every((rec, idx) => rec.record.id === run2[idx].record.id && rec.score === run2[idx].score);

    results[count] = {
      durationMs,
      deterministic,
      topId: run1[0]?.record.id ?? "",
    };
  }

  return results;
}
