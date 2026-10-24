/**
 * ASRIN KEMALİ — Arama Değerlendirici (Search Evaluator)
 */

import { precisionAtK } from "./metrics/precision.mjs";
import { recallAtK } from "./metrics/recall.mjs";
import { reciprocalRank } from "./metrics/mrr.mjs";
import { ndcgAtK } from "./metrics/ndcg.mjs";
import { EVALUATION_QUERIES, buildQrelsMap } from "./queries/queries.mjs";

export function evaluateRanker(ranker, options = {}) {
  const queries = options.queries || EVALUATION_QUERIES;
  const qrels = options.qrels || buildQrelsMap();
  const kList = options.kList || [1, 3, 5, 10];

  const resultsByQuery = [];
  let totalMrr = 0;
  let judgedQueriesCount = 0;
  let zeroResultsCount = 0;
  let negativeQueriesPassed = 0;
  let totalNegativeQueries = 0;

  const precisionSums = { 1: 0, 3: 0, 5: 0, 10: 0 };
  const recallSums = { 1: 0, 3: 0, 5: 0, 10: 0 };
  const ndcgSums = { 1: 0, 3: 0, 5: 0, 10: 0 };

  for (const q of queries) {
    const isNegative = q.category === "negatif" || q.expectedRelevant.length === 0;
    if (isNegative) totalNegativeQueries++;

    const retrievedIds = ranker.rank(q.text, { k: Math.max(...kList) });

    if (retrievedIds.length === 0) {
      zeroResultsCount++;
      if (isNegative) negativeQueriesPassed++;
    }

    const queryQrels = qrels.get(q.id) || new Map();
    const relevantSet = new Set(queryQrels.keys());

    const pScores = {};
    const rScores = {};
    const nScores = {};

    for (const k of kList) {
      pScores[k] = precisionAtK(retrievedIds, relevantSet, k);
      rScores[k] = recallAtK(retrievedIds, relevantSet, k);
      nScores[k] = ndcgAtK(retrievedIds, queryQrels, k);

      if (!isNegative) {
        precisionSums[k] += pScores[k];
        recallSums[k] += rScores[k];
        ndcgSums[k] += nScores[k];
      }
    }

    const rr = reciprocalRank(retrievedIds, relevantSet);
    if (!isNegative) {
      totalMrr += rr;
      judgedQueriesCount++;
    }

    resultsByQuery.push({
      queryId: q.id,
      queryText: q.text,
      isNegative,
      retrievedCount: retrievedIds.length,
      topRetrieved: retrievedIds.slice(0, 3),
      precision: pScores,
      recall: rScores,
      ndcg: nScores,
      reciprocalRank: rr,
    });
  }

  const denominator = Math.max(1, judgedQueriesCount);
  const meanPrecision = {};
  const meanRecall = {};
  const meanNdcg = {};

  for (const k of kList) {
    meanPrecision[k] = Number((precisionSums[k] / denominator).toFixed(4));
    meanRecall[k] = Number((recallSums[k] / denominator).toFixed(4));
    meanNdcg[k] = Number((ndcgSums[k] / denominator).toFixed(4));
  }

  return {
    evaluatedAt: "2026-10-24T00:00:00.000Z",
    totalQueries: queries.length,
    judgedQueriesCount,
    zeroResultsCount,
    negativeQueryAccuracy:
      totalNegativeQueries > 0
        ? Number((negativeQueriesPassed / totalNegativeQueries).toFixed(2))
        : 1.0,
    mrr: Number((totalMrr / denominator).toFixed(4)),
    precisionAtK: meanPrecision,
    recallAtK: meanRecall,
    ndcgAtK: meanNdcg,
    queryDetails: resultsByQuery,
  };
}
