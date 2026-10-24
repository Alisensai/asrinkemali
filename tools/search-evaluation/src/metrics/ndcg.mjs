/**
 * Normalized Discounted Cumulative Gain (nDCG@K) Metriği
 * Formül:
 *   Gain = 2^grade - 1
 *   Discount = log2(rank + 1) (rank 1-indexed, yani i=0 için log2(2) = 1)
 *   DCG@K = sum_{i=0}^{K-1} Gain / Discount
 *   nDCG@K = DCG@K / IDCG@K
 */

export function calculateDCG(grades, k) {
  const cutoff = grades.slice(0, k);
  let dcg = 0.0;
  for (let i = 0; i < cutoff.length; i++) {
    const grade = cutoff[i] || 0;
    if (grade <= 0) continue;
    const gain = Math.pow(2, grade) - 1;
    const discount = Math.log2(i + 2); // i=0 -> rank=1 -> log2(2)=1
    dcg += gain / discount;
  }
  return dcg;
}

export function ndcgAtK(retrievedIds, qrelsMap, k, options = {}) {
  if (typeof k !== "number" || k <= 0 || !Number.isInteger(k)) {
    throw new Error(`Geçersiz K değeri: ${k}. Pozitif bir tam sayı olmalıdır.`);
  }

  // qrelsMap: Map<string, number> veya Record<string, number> (grade 0..3)
  const getGrade = (id) => {
    if (qrelsMap instanceof Map) return qrelsMap.get(id) || 0;
    return qrelsMap?.[id] || 0;
  };

  // 1. Retrieved dokümanların derecelerini al
  const cutoff = (retrievedIds || []).slice(0, k);
  const retrievedGrades = cutoff.map((id) => getGrade(id));
  const dcg = calculateDCG(retrievedGrades, k);

  // 2. İdeal sıralamayı (IDCG) hesapla
  let allGrades = [];
  if (qrelsMap instanceof Map) {
    allGrades = Array.from(qrelsMap.values());
  } else if (qrelsMap && typeof qrelsMap === "object") {
    allGrades = Object.values(qrelsMap);
  }

  allGrades.sort((a, b) => b - a);
  const idcg = calculateDCG(allGrades, k);

  if (idcg === 0.0) {
    return 0.0;
  }

  const ndcg = dcg / idcg;
  return Math.min(1.0, Math.max(0.0, ndcg));
}
