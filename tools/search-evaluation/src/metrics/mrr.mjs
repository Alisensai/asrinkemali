/**
 * Mean Reciprocal Rank (MRR) Metriği
 * Formül: İlk ilgili dokümanın sırasının çarpmaya göre tersi (1 / rank)
 */

export function reciprocalRank(retrievedIds, relevantSet, k = Infinity) {
  if (!Array.isArray(retrievedIds) || retrievedIds.length === 0) {
    return 0.0;
  }

  const relSet = relevantSet instanceof Set ? relevantSet : new Set(relevantSet || []);
  if (relSet.size === 0) {
    return 0.0;
  }

  const cutoff = retrievedIds.slice(0, k);
  for (let i = 0; i < cutoff.length; i++) {
    const id = cutoff[i];
    if (relSet.has(id)) {
      return 1.0 / (i + 1);
    }
  }

  return 0.0;
}

export function meanReciprocalRank(runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return 0.0;
  }

  let total = 0;
  let count = 0;

  for (const run of runs) {
    const rr = reciprocalRank(run.retrievedIds, run.relevantSet, run.k);
    total += rr;
    count++;
  }

  return count > 0 ? total / count : 0.0;
}
