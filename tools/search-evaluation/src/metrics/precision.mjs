/**
 * Precision@K Metriği
 * Formül: (İlk K sonuçta dönen ilgili doküman sayısı) / K
 */

export function precisionAtK(retrievedIds, relevantSet, k, options = {}) {
  if (typeof k !== "number" || k <= 0 || !Number.isInteger(k)) {
    throw new Error(`Geçersiz K değeri: ${k}. Pozitif bir tam sayı olmalıdır.`);
  }

  if (!Array.isArray(retrievedIds) || retrievedIds.length === 0) {
    return 0.0;
  }

  const relSet = relevantSet instanceof Set ? relevantSet : new Set(relevantSet || []);
  const cutoff = retrievedIds.slice(0, k);

  // Tekrarlanan ID'leri ayıkla (deduplicate)
  const uniqueRetrieved = options.allowDuplicates ? cutoff : Array.from(new Set(cutoff));

  let relevantCount = 0;
  for (const id of uniqueRetrieved) {
    if (relSet.has(id)) {
      relevantCount++;
    }
  }

  const denominator = options.denominator === "retrieved_length" ? Math.max(1, uniqueRetrieved.length) : k;
  return Math.min(1.0, Math.max(0.0, relevantCount / denominator));
}
