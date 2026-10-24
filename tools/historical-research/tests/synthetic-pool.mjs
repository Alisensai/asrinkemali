/**
 * Sentetik aday havuzu üreticisi (yalnız bellek; gerçek tarihî bilgi değildir).
 * Her 97. adayın URL'si bir öncekinin aynısıdır (kesin tekrar); her 101. adayın
 * arşiv kimliği bir öncekinin aynısıdır.
 */
import { makeCandidate } from "./helpers.mjs";

export function syntheticPool(n) {
  const pool = [];
  for (let i = 0; i < n; i += 1) {
    pool.push(makeCandidate({
      id: `src-2099-${String(i).padStart(6, "0")}`,
      synthetic: true,
      url: `https://example.org/sentetik/${i % 97 === 0 && i > 0 ? i - 1 : i}`,
      institution: `Sentetik Kurum ${i % 13}`,
      archiveIdentifier: i % 101 === 0 && i > 0 ? `SYN-${i - 1}` : `SYN-${i}`,
      eventYear: 1881 + (i % 38),
      title: `Sentetik belge ${i} ${["Selanik", "Manastır", "Harbiye", "Çanakkale"][i % 4]}`,
    }));
  }
  return pool;
}
