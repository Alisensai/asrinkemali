/**
 * Recall@K Metriği
 * Formül: (İlk K sonuçta bulunan ilgili doküman sayısı) / (Külliyattaki toplam ilgili doküman sayısı)
 */

export function recallAtK(retrievedIds, relevantSet, k, options = {}) {
  if (typeof k !== "number" || k <= 0 || !Number.isInteger(k)) {
    throw new Error(`Geçersiz K değeri: ${k}. Pozitif bir tam sayı olmalıdır.`);
  }

  const relSet = relevantSet instanceof Set ? relevantSet : new Set(relevantSet || []);
  if (relSet.size === 0) {
    return options.emptyRelevantPolicy === "null" ? null : 0.0;
  }

  if (!Array.isArray(retrievedIds) || retrievedIds.length === 0) {
    return 0.0;
  }

  const cutoff = retrievedIds.slice(0, k);
  const uniqueRetrieved = Array.from(new Set(cutoff));

  let relevantMatches = 0;
  for (const id of uniqueRetrieved) {
    if (relSet.has(id)) {
      relevantMatches++;
    }
  }

  const score = relevantMatches / relSet.size;
  return Math.min(1.0, Math.max(0.0, score));
}
