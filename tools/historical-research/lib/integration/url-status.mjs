/**
 * URL erişim durumu sınıflandırması (Görev 07). Varsayılan CLI bunu ÇAĞIRMAZ.
 *
 * Erişim denetimi yalnız açıkça enjekte edilen `fetchImpl` ve `resolver` ile çalışır;
 * testler sahte uygulamalar kullanır, ağ trafiği yoktur. Her yönlendirme adımı yeniden
 * yapısal + DNS denetiminden geçer. Sonuç tarihî doğruluk DEĞİLDİR:
 * HTTP 200 → `reachable`; asla `historical_verified` üretilmez.
 */

import { assertPublicDnsResolution, validateExternalUrl } from "../url-security.mjs";

export const LINK_STATES = Object.freeze(["reachable", "restricted", "missing", "temporary", "unchecked", "blocked"]);

export function classifyHttpOutcome(outcome) {
  if (outcome === null || outcome === undefined) return "unchecked";
  if (outcome.error === "timeout" || outcome.error === "dns_failure" || outcome.error === "network") return "temporary";
  const status = outcome.status;
  if (!Number.isInteger(status)) return "unchecked";
  if (status >= 200 && status < 300) return "reachable";
  if (status === 401 || status === 403 || status === 451) return "restricted";
  if (status === 404 || status === 410) return "missing";
  if (status === 429 || status >= 500) return "temporary";
  return "unchecked";
}

/**
 * @param {string} rawUrl
 * @param {{fetchImpl: Function, resolver: {resolve4: Function, resolve6: Function}, maxRedirects?: number, now: string}} deps
 */
export async function checkUrlReachability(rawUrl, deps) {
  if (!deps || typeof deps.fetchImpl !== "function" || !deps.resolver) {
    return { state: "unchecked", checkedAt: null, chain: [], reason: "Ağ denetimi etkin değil (varsayılan çevrimdışı)." };
  }
  const maxRedirects = deps.maxRedirects ?? 3;
  const chain = [];
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const structural = validateExternalUrl(current);
    if (!structural.ok) return { state: "blocked", checkedAt: deps.now, chain, reason: structural.errors.map((error) => error.code).join(",") };
    const dnsCheck = await assertPublicDnsResolution(current, deps.resolver);
    if (!dnsCheck.ok) {
      const code = dnsCheck.errors?.[0]?.code ?? "DNS";
      return { state: code === "DNS_UNRESOLVABLE" ? "temporary" : "blocked", checkedAt: deps.now, chain, reason: code };
    }
    let response;
    try {
      // Kimlik bilgisi/çerez gönderilmez; yönlendirme elle izlenir.
      response = await deps.fetchImpl(current, { method: "HEAD", redirect: "manual", credentials: "omit", headers: { "user-agent": "MKA-Evidence-Engine/0.7 (offline-default)" } });
    } catch (error) {
      const kind = error?.name === "TimeoutError" || error?.code === "ETIMEDOUT" ? "timeout" : "network";
      return { state: classifyHttpOutcome({ error: kind }), checkedAt: deps.now, chain, reason: kind };
    }
    chain.push({ url: current, status: response.status });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.get?.("location");
      if (!location) return { state: "unchecked", checkedAt: deps.now, chain, reason: "Yönlendirme hedefi yok." };
      current = new URL(location, current).toString();
      continue;
    }
    return { state: classifyHttpOutcome({ status: response.status }), checkedAt: deps.now, chain, reason: null, historicalVerification: "not_applicable" };
  }
  return { state: "blocked", checkedAt: deps.now, chain, reason: "REDIRECT_LIMIT" };
}
