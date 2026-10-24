/**
 * İsteğe bağlı modül adaptörleri (Görev 07).
 *
 * PR #20 Source Reliability (OpenCode) ve Prompt 06 Authority Registry bu tabanda
 * YOKTUR. Bu yüzden ikisi de enjeksiyonla bağlanan portlardır: modül yoksa sonuç
 * `unavailable` olur, içe aktarma hatası motoru veya Next.js build'ini kırmaz.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** PR #20 kaynak sınıfı ≠ aday sourceNature; açık eşleme ve uyarı. */
export const RELIABILITY_CLASS_TO_SOURCE_NATURE = Object.freeze({
  primary: { sourceNature: "primary", warning: null },
  secondary: { sourceNature: "secondary", warning: null },
  reference: { sourceNature: "secondary", warning: "PR #20 'reference' sınıfı aday sözleşmesinde yok; 'secondary' önerisi insan kararı ister." },
  unknown: { sourceNature: "unknown", warning: null },
});

export function mapReliabilityClass(value) {
  return RELIABILITY_CLASS_TO_SOURCE_NATURE[value] ?? { sourceNature: "unknown", warning: `Bilinmeyen güvenilirlik sınıfı: ${String(value)}` };
}

/**
 * @param {{root: string, modulePath?: string, importer?: (url: string) => Promise<object>}} options
 */
export async function loadSourceReliabilityAdapter(options) {
  const relative = options.modulePath ?? "tools/archive-source-reliability/lib/index.mjs";
  const absolute = path.join(options.root, relative);
  if (!options.importer && !fs.existsSync(absolute)) {
    return { available: false, reason: "PR #20 Source Reliability bu tabanda yok; güvenli degrade.", classify: () => ({ state: "unavailable" }) };
  }
  try {
    const mod = await (options.importer ?? ((url) => import(url)))(pathToFileURL(absolute).href);
    if (typeof mod.classifySource !== "function") return { available: false, reason: "Beklenen classifySource arayüzü yok.", classify: () => ({ state: "unavailable" }) };
    return {
      available: true,
      reason: null,
      classify(candidate) {
        const result = mod.classifySource({ url: candidate.url, institution: candidate.institution, archiveIdentifier: candidate.archiveIdentifier ?? null });
        const mapped = mapReliabilityClass(result?.classification);
        // Kalite puanı tarihsel doğruluk puanı değildir; motorun güveniyle karıştırılmaz.
        return { state: "observed", reliabilityClass: result?.classification ?? null, suggestedSourceNature: mapped.sourceNature, warning: mapped.warning, qualityScoreIsNotHistoricalAccuracy: true };
      },
    };
  } catch {
    return { available: false, reason: "Source Reliability yüklenemedi; güvenli degrade.", classify: () => ({ state: "unavailable" }) };
  }
}

/** Authority Registry portu: yoksa her çözümleme `unresolved`. Ad eşleşmesi kesin kimlik değildir. */
export function createAuthorityResolver(registry = null) {
  const unresolved = { state: "unresolved", id: null, reason: "Authority Registry (Prompt 06) bu tabanda yok." };
  const wrap = (fn) => (name) => {
    if (!registry || typeof registry[fn] !== "function") return unresolved;
    const result = registry[fn](name);
    if (!result) return { state: "unresolved", id: null, reason: "Eşleşme yok." };
    if (Array.isArray(result)) return result.length === 1 ? { state: "resolved", id: result[0].id, reason: null } : { state: "ambiguous", id: null, candidates: result.map((item) => item.id).sort(), reason: "Birden fazla varlık; otomatik seçilmez." };
    return { state: "resolved", id: result.id, reason: null };
  };
  return { available: Boolean(registry), resolvePerson: wrap("resolvePerson"), resolveInstitution: wrap("resolveInstitution"), resolvePlace: wrap("resolvePlace"), resolveWork: wrap("resolveWork") };
}
