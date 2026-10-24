/** Public search uses folding only for matching; titles and source text remain unchanged. */
export function foldTurkish(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("tr-TR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ş/g, "s")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[\u200b-\u200d\ufeff]/g, " ").replace(/\s+/g, " ").trim();
}

export function queryTokens(value: string): readonly string[] {
  const folded = foldTurkish(value);
  if (!folded || folded.length > 120) return [];
  return [...new Set(folded.split(/[^a-z0-9]+/).filter((token) => token.length >= 2).slice(0, 8))];
}
