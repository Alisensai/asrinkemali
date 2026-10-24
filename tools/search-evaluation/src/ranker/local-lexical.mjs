/**
 * Güvenli Yerel Sözlüksel Sıralayıcı (Local Lexical Ranker)
 * 
 * ReDoS Koruması:
 * - Kesinlikle ham kullanıcı sorgusunu RegExp içine enjekte etmez.
 * - Deterministik tokenizasyon ve Türkçe normalizasyon (tr-TR) kullanır.
 * - published olmayan kayıtları filtreler.
 */

export function normalizeTurkish(text) {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFC")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .trim();
}

export function tokenize(text) {
  const norm = normalizeTurkish(text);
  if (!norm) return [];
  return norm.split(/[^a-z0-9çğıöşü]+/i).filter((t) => t.length > 1);
}

export class LocalLexicalRanker {
  constructor(records = []) {
    this.records = records;
  }

  rank(query, options = {}) {
    const k = options.k || 10;
    const publishedOnly = options.publishedOnly !== false;
    const queryTokens = tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    const scored = [];

    for (const record of this.records) {
      // 1. Güvenlik: Yalnızca yayımlanmış kayıtlar (includeNonPublished yoksa)
      if (publishedOnly) {
        const status = record.verification?.status || record.status;
        if (status !== "published") continue;
      }

      const recId = record.id || record.slug;
      if (!recId) continue;

      let score = 0;
      const title = record.title || "";
      const summary = record.summary || "";
      const normTitle = normalizeTurkish(title);
      const normQuery = normalizeTurkish(query);

      // Exact title match bonus
      if (normTitle === normQuery) {
        score += 100;
      } else if (normTitle.includes(normQuery)) {
        score += 50;
      }

      const titleTokens = new Set(tokenize(title));
      const summaryTokens = new Set(tokenize(summary));

      // Token match scoring
      for (const token of queryTokens) {
        if (titleTokens.has(token)) {
          score += 10;
        } else if (summaryTokens.has(token)) {
          score += 3;
        }
      }

      // People / tags match
      if (Array.isArray(record.people)) {
        for (const p of record.people) {
          const name = typeof p === "string" ? p : p?.name;
          if (name && normalizeTurkish(name).includes(normQuery)) {
            score += 20;
          }
        }
      }

      if (score > 0) {
        scored.push({
          recordId: recId,
          score,
          title,
        });
      }
    }

    // Puanlara göre ve eşitlikte kararlı ID sırasına göre sırala
    scored.sort((a, b) => b.score - a.score || a.recordId.localeCompare(b.recordId, "tr"));
    return scored.slice(0, k).map((item) => item.recordId);
  }
}
