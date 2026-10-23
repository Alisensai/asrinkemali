/**
 * Tekrar tespiti ve kaynak ilişkilendirme.
 *
 * İlkeler:
 *  - URL normalizasyonu: şema, host, path, izleme parametreleri, fragment.
 *  - Kurum arşiv kimliği (ör. AYK-166) aynıysa aynı özgün belge sayılır.
 *  - Farklı siteler aynı özgün belgeyi aktarıyorsa bunlar bağımsız iki kanıt
 *    DEĞİLDİR; "aynı kök türetme" olarak işaretlenir.
 *  - Başlık + yıl benzerliği ikincil sinyal olarak kullanılır; tek başına
 *    tekrar kararı vermez.
 */

/** URL'yi karşılaştırılabilir normal forma indirger. */
export function normalizeUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.length === 0) return null;
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.username = "";
  url.password = "";
  // İzleme parametreleri
  const TRACKING_PARAMS = new Set([
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "ref", "referrer", "mc_cid", "mc_eid",
  ]);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  // Sıralama: parametre sırası farklıysa aynı sayılmamalı ama izleme
  // temizliğinden sonra sıralama tutarlı hale getirilir.
  const params = [...url.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  url.search = "";
  for (const [key, value] of params) url.searchParams.append(key, value);
  // Son eğik çizgi normalizasyonu (path boş değilse)
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  url.pathname = pathname;
  return url.toString();
}

/** İki URL aynı özgün kaynağa mı işaret ediyor? */
export function sameSource(urlA, urlB) {
  const normalizedA = normalizeUrl(urlA);
  const normalizedB = normalizeUrl(urlB);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA === normalizedB;
}

/**
 * Aynı kurum arşiv kimliğine sahip iki kaynak aynı özgün belgedir.
 */
export function sameArchiveIdentifier(candidateA, candidateB) {
  const idA = candidateA?.archiveIdentifier?.trim().toUpperCase();
  const idB = candidateB?.archiveIdentifier?.trim().toUpperCase();
  if (!idA || !idB) return false;
  if (candidateA?.institution !== candidateB?.institution) return false;
  return idA === idB;
}

/** Türkçe karakterleri katlayarak karşılaştırılabilir metin üretir. */
export function foldTr(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Başlık benzerliği (kelime kümesi kesişimi, 0–1).
 */
export function titleSimilarity(titleA, titleB) {
  const wordsA = new Set(foldTr(titleA).split(" ").filter((word) => word.length > 2));
  const wordsB = new Set(foldTr(titleB).split(" ").filter((word) => word.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const word of wordsA) if (wordsB.has(word)) intersection += 1;
  return intersection / Math.max(wordsA.size, wordsB.size);
}

/**
 * Adaylar arasında tekrar ilişkilerini bulur.
 * @param {Array} candidates
 * @param {Array} archiveRecords
 * @returns {{duplicatePairs: Array, archiveMatches: Array, derivedPairs: Array}}
 */
export function findDuplicates(candidates, archiveRecords = []) {
  const duplicatePairs = [];
  const archiveMatches = [];
  const derivedPairs = [];

  // Havuz içi tekrarlar
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (sameSource(a.url, b.url)) {
        duplicatePairs.push({ a: a.id, b: b.id, reason: "aynı normalleştirilmiş URL" });
      } else if (sameArchiveIdentifier(a, b)) {
        duplicatePairs.push({ a: a.id, b: b.id, reason: "aynı kurum arşiv kimliği" });
      } else if (
        a.institution === b.institution &&
        a.eventYear != null && b.eventYear != null &&
        a.eventYear === b.eventYear &&
        titleSimilarity(a.title, b.title) >= 0.75
      ) {
        // aynı kurum + aynı olay yılı + benzer başlık: muhtemel aynı madde
        duplicatePairs.push({
          a: a.id, b: b.id,
          reason: `aynı kurum/olay yılı/başlık benzerliği (skor ${(titleSimilarity(a.title, b.title)).toFixed(2)})`,
        });
      }
    }
  }

  // Arşivle eşleşme
  const archiveIndex = new Map();
  for (const record of archiveRecords) {
    const normalized = normalizeUrl(record?.source?.url);
    if (normalized) archiveIndex.set(normalized, record);
  }
  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate.url);
    if (normalized && archiveIndex.has(normalized)) {
      archiveMatches.push({ candidateId: candidate.id, archiveId: archiveIndex.get(normalized).id, reason: "aynı URL mevcut arşivde" });
      continue;
    }
    for (const record of archiveRecords) {
      if (
        candidate.institution === record?.source?.institution &&
        candidate.archiveIdentifier &&
        String(record?.source?.archiveIdentifier ?? "").toUpperCase() === candidate.archiveIdentifier.toUpperCase()
      ) {
        archiveMatches.push({ candidateId: candidate.id, archiveId: record.id, reason: "aynı kurum arşiv kimliği" });
        break;
      }
    }
  }

  // Aynı kök türetme: farklı kurum/alan adı ama aynı özgün belge künyesi
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.institution === b.institution) continue;
      if (
        a.eventYear != null && a.eventYear === b.eventYear &&
        titleSimilarity(a.title, b.title) >= 0.8
      ) {
        derivedPairs.push({
          a: a.id, b: b.id,
          note: "Farklı sitelerde benzer künye: aynı özgün belgeden türemiş olabilir; bağımsız iki kanıt sayılmaz.",
        });
      }
    }
  }

  return { duplicatePairs, archiveMatches, derivedPairs };
}
