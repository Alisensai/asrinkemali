/**
 * Dış kaynak sağlayıcı adaptör altyapısı.
 *
 * Amaç: farklı kurum kataloglarını/URL listelerini aday havuzuna taşıyan
 * MODÜLER adaptör kaydı. Bu sürümde ağ çağrısı YOKTUR; adaptörler veriyi
 * çağıranın sağladığı metinden (JSON katalog dosyası, CSV) okur. Ağ
 * adaptörleri eklenirse URL güvenliği ve istek limitleri zorunlu olur.
 */

import { importCandidatesFromJson, importCandidatesFromCsv } from "./importers.mjs";
import { addCandidate } from "./candidates.mjs";

/** Kayıtlı sağlayıcılar. */
const providers = new Map();

/**
 * Sağlayıcı kaydı. Her sağlayıcı:
 *  - `id`: benzersiz kimlik
 *  - `description`: ne sağladığı
 *  - `importFrom({json?: string, csv?: string})`: aday taslakları döner.
 */
export function registerSourceProvider(provider) {
  if (!provider || typeof provider !== "object" || !provider.id) {
    throw new Error("Sağlayıcı kimliği (id) zorunludur.");
  }
  if (typeof provider.importFrom !== "function") {
    throw new Error("Sağlayıcı `importFrom` işlevi tanımlamalıdır.");
  }
  // Görev 07: aynı kimlikle ikinci kayıt mevcut sağlayıcıyı sessizce EZMEZ.
  if (providers.has(provider.id)) {
    throw new Error(`Sağlayıcı kimliği zaten kayıtlı: ${provider.id}. Değiştirmek için önce ayrı bir sürüm kimliği kullanın.`);
  }
  if (provider.network === true) {
    throw new Error("Ağ erişimli sağlayıcı bu sürümde kabul edilmez; ayrı güvenlik değerlendirmesi gerekir.");
  }
  providers.set(provider.id, Object.freeze({ ...provider }));
}

export function listSourceProviders() {
  return [...providers.values()].map((provider) => ({ id: provider.id, description: provider.description ?? "" }));
}

export function getSourceProvider(id) {
  return providers.get(id) ?? null;
}

/** El ile URL/katalog içe aktarması (ücretsiz, ağ gerektirmez). */
registerSourceProvider({
  id: "manual-catalog",
  description: "El ile hazırlanmış JSON katalog veya CSV listesi içe aktarır; ağ erişimi gerektirmez.",
  importFrom({ json, csv } = {}) {
    if (json) return importCandidatesFromJson(json);
    if (csv) return importCandidatesFromCsv(csv);
    return { candidates: [], issues: [{ code: "NO_INPUT", message: "json veya csv girdisi verilmelidir." }] };
  },
});

/**
 * Sağlayıcı çıktısını havuza uygular (tekrar denetimli).
 * @param {Array} pool
 * @param {Array} candidates
 * @returns {{added: number, rejected: Array<{id: string, code: string, message: string}>}}
 */
export function mergeIntoPool(pool, candidates) {
  const rejected = [];
  let added = 0;
  for (const candidate of candidates) {
    const result = addCandidate(pool, candidate);
    if (result.ok) added += 1;
    else rejected.push({ id: candidate.id ?? "?", code: result.issues[0]?.code ?? "UNKNOWN", message: result.issues.map((i) => i.message).join(" ") });
  }
  return { added, rejected };
}

/**
 * Adayları dönem/kişi/konuya göre düzenler (keşif görünümü için).
 * @param {Array} candidates
 * @param {{periodStart?: number|null, periodEnd?: number|null, person?: string|null, theme?: string|null}} query
 */
export function organizeCandidates(candidates, query = {}) {
  const { periodStart = null, periodEnd = null, person = null, theme = null } = query;
  return candidates.filter((candidate) => {
    if (periodStart !== null || periodEnd !== null) {
      const start = candidate.periodStart ?? candidate.eventYear;
      const end = candidate.periodEnd ?? candidate.eventYear;
      if (start === null) return false;
      if (periodStart !== null && (end ?? start) < periodStart) return false;
      if (periodEnd !== null && start > periodEnd) return false;
    }
    if (person) {
      const needle = person.toLocaleLowerCase("tr-TR");
      const peopleText = (candidate.people ?? []).map((p) => typeof p === "string" ? p : p.name).join(" ").toLocaleLowerCase("tr-TR");
      if (!peopleText.includes(needle)) return false;
    }
    if (theme && !(candidate.researchThemes ?? []).includes(theme)) return false;
    return true;
  });
}
