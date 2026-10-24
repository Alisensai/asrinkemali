/**
 * ASRIN KEMALİ — Otorite Eşleştirme, Aday Çözümleme ve Hard-Negative Güvenlik Modeli
 */

import { foldTurkish, slugify } from "./model.mjs";

export const KNOWN_ALIASES = Object.freeze({
  "mka:person:mustafa-kemal-ataturk": [
    "Mustafa Kemal",
    "Mustafa Kemal Paşa",
    "Gazi Mustafa Kemal",
    "Kemal Atatürk",
    "Gazi Paşa",
    "Atatürk",
    "Gazi Mustafa Kemal Paşa"
  ],
  "mka:person:ismet-inonu": [
    "İsmet Paşa",
    "İsmet İnönü",
    "Mustafa İsmet İnönü",
    "Garp Cephesi Kumandanı İsmet Paşa"
  ],
  "mka:person:fevzi-cakmak": [
    "Fevzi Paşa",
    "Mustafa Fevzi Çakmak",
    "Mareşal Fevzi Çakmak"
  ],
  "mka:person:kazim-karabekir": [
    "Kâzım Karabekir",
    "Kazım Paşa",
    "Kâzım Paşa",
    "Şark Cephesi Kumandanı Kazım Karabekir"
  ],
  "mka:person:halide-edib-adivar": [
    "Halide Edip",
    "Halide Edip Adıvar",
    "Halide Onbaşı"
  ],
  "mka:institution:turkiye-buyuk-millet-meclisi": [
    "TBMM",
    "T.B.M.M.",
    "Büyük Millet Meclisi",
    "Millet Meclisi"
  ],
  "mka:institution:ataturk-arastirma-merkezi": [
    "ATAM",
    "AYK",
    "Atatürk Araştırma Merkezi",
    "Atatürk Ansiklopedisi",
    "Atatürk Kültür, Dil ve Tarih Yüksek Kurumu"
  ],
  "mka:place:istanbul": [
    "Dersaadet",
    "Konstantiniyye",
    "İstanbul"
  ],
  "mka:place:ankara": [
    "Angora",
    "Ankara"
  ],
  "mka:place:selanik": [
    "Thessaloniki",
    "Selanik"
  ],
  "mka:place:manastir": [
    "Bitola",
    "Manastır"
  ]
});

/**
 * Hard Negative Tanımları: Adaş olan veya sıklıkla yanlış birleştirilen farklı tarihî şahsiyetler.
 * Bu çiftler KESİNLİKLE birleştirilemez (score = 0, isHardNegative = true).
 */
export const HARD_NEGATIVES = Object.freeze([
  {
    pair: ["mka:person:ali-riza-efendi", "mka:person:ali-riza-pasa"],
    reason: "Ali Rıza Efendi (Atatürk'ün babası) ile Sadrazam Ali Rıza Paşa farklı tarihî şahsiyetlerdir."
  },
  {
    pair: ["mka:person:ahmet-izzet-pasa", "mka:person:izzet-pasa"],
    reason: "Farklı dönem ve rütbelerdeki İzzet Paşalar otomatik birleştirilemez."
  },
  {
    pair: ["mka:place:selanik", "mka:place:thessaloniki-modern"],
    reason: "Osmanlı Selanik sancağı ile modern Yunanistan idari bölgesi doğrudan eşitlenemez."
  }
]);

export function isHardNegativePair(idA, idB) {
  if (!idA || !idB || idA === idB) return false;
  for (const hn of HARD_NEGATIVES) {
    if ((hn.pair[0] === idA && hn.pair[1] === idB) || (hn.pair[0] === idB && hn.pair[1] === idA)) {
      return { isHardNegative: true, reason: hn.reason };
    }
  }
  return { isHardNegative: false };
}

export function resolveAliasToAuthorityId(query, type = "person") {
  const folded = foldTurkish(query);
  if (!folded) return null;

  // Bilinen alias indeksinde ara
  for (const [authId, aliases] of Object.entries(KNOWN_ALIASES)) {
    if (type && !authId.startsWith(`mka:${type}:`) && !authId.startsWith(`auth:${type}:`)) {
      continue;
    }
    for (const a of aliases) {
      if (foldTurkish(a) === folded) {
        return authId;
      }
    }
  }

  // Doğrudan slug'a dönüştür
  const slug = slugify(query);
  return `mka:${type}:${slug}`;
}

/**
 * Aday eşleştirme ve açıklanabilir puanlama fonksiyonu
 */
export function matchCandidate(query, targetEntity) {
  const queryFolded = foldTurkish(query);
  const targetPrefFolded = foldTurkish(targetEntity.preferredLabel || targetEntity.preferredName);
  const targetId = targetEntity.authorityId || targetEntity.id;

  const result = {
    targetId,
    score: 0,
    reasonCodes: [],
    requiresHumanReview: true,
    isHardNegative: false,
    explanation: ""
  };

  // 1. Hard Negative kontrolü
  const queryCandidateId = `mka:${targetEntity.kind || targetEntity.type}:${slugify(query)}`;
  const hnCheck = isHardNegativePair(queryCandidateId, targetId);
  if (hnCheck.isHardNegative) {
    result.score = 0;
    result.isHardNegative = true;
    result.reasonCodes.push("HARD_NEGATIVE_DISTINCT_ENTITY");
    result.explanation = hnCheck.reason;
    return result;
  }

  // 2. Tam metin eşleşmesi
  if (query === (targetEntity.preferredLabel || targetEntity.preferredName)) {
    result.score = 100;
    result.reasonCodes.push("EXACT_STRING_MATCH");
    result.requiresHumanReview = false;
    result.explanation = "Tam metin ve harf eşleşmesi sağlandı.";
    return result;
  }

  // 3. Türkçe normalize eşleşme
  if (queryFolded === targetPrefFolded) {
    result.score = 95;
    result.reasonCodes.push("TURKISH_FOLD_MATCH");
    result.requiresHumanReview = false;
    result.explanation = "Türkçe harf (İ/I, Ş/S vb.) normalizasyonu ile tam eşleşti.";
    return result;
  }

  // 4. Bilinen Alias eşleşmesi
  if (Array.isArray(targetEntity.aliases)) {
    for (const alias of targetEntity.aliases) {
      if (foldTurkish(alias) === queryFolded) {
        result.score = 90;
        result.reasonCodes.push("KNOWN_ALIAS_MATCH");
        result.requiresHumanReview = false;
        result.explanation = `Kayıtlı tarihî takma ad/ünvan ('${alias}') ile eşleşti.`;
        return result;
      }
    }
  }

  // 5. Parçalı / Token benzerliği
  const queryTokens = new Set(queryFolded.split(/[\s-]+/).filter((t) => t.length > 2));
  const targetTokens = new Set(targetPrefFolded.split(/[\s-]+/).filter((t) => t.length > 2));
  let common = 0;
  for (const t of queryTokens) {
    if (targetTokens.has(t)) common++;
  }

  if (common > 0) {
    const similarity = Math.round((common / Math.max(queryTokens.size, targetTokens.size)) * 80);
    result.score = similarity;
    result.reasonCodes.push("TOKEN_OVERLAP_MATCH");
    result.requiresHumanReview = true;
    result.explanation = `Ortak sözcükler bulundu (${common}/${queryTokens.size}). İnsan onayı gerektirir.`;
    return result;
  }

  result.reasonCodes.push("NO_SIGNIFICANT_MATCH");
  result.explanation = "Anlamlı bir eşleşme bulunamadı.";
  return result;
}

export function enhanceEntitiesWithAliases(entities) {
  for (const entity of entities) {
    const id = entity.authorityId || entity.id;
    // Hem mka hem auth önekini destekle
    const canonicalKey = id.replace(/^auth:/, "mka:");
    if (KNOWN_ALIASES[canonicalKey]) {
      const existing = new Set(entity.aliases || []);
      for (const a of KNOWN_ALIASES[canonicalKey]) {
        if (foldTurkish(a) !== foldTurkish(entity.preferredLabel || entity.preferredName)) {
          existing.add(a);
        }
      }
      entity.aliases = Array.from(existing);
    }
  }
  return entities;
}
