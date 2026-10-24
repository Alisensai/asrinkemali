import type { Page, Request } from "@playwright/test";

/** Başarısız bir isteğin sınıflandırma için gereken kanıtları. */
export type FailedRequestInfo = { url: string; method: string; resourceType: string; isNavigationRequest: boolean; errorText: string; headers: Record<string, string> };

/**
 * Next.js istemci yönlendiricisinin kendi iptal ettiği RSC prefetch isteği mi?
 *
 * Üretim sunucusunda `<Link>` görünür olduğunda rota önceden yüklenir; bağlantı DOM'dan
 * kalkarsa (ör. hero slaytı değişince, menü kapanınca) yönlendirici bu isteği iptal eder ve
 * tarayıcı `net::ERR_ABORTED` raporlar. Bu bir uygulama hatası değildir.
 *
 * Hariç tutma için koşulların HEPSİ gerekir: aynı köken, GET, `fetch` türü, navigasyon isteği
 * değil, `_rsc` parametresi, `rsc: 1` ve `next-router-prefetch: 1` başlıkları, `net::ERR_ABORTED`.
 * Başka her ağ hatası (ERR_FAILED, DNS, bağlantı reddi, prefetch olmayan RSC, belge, betik,
 * görsel, farklı köken) raporlanmaya devam eder.
 */
export function isBenignNextPrefetchAbort(request: FailedRequestInfo, appOrigin: string) {
  let url: URL;
  try { url = new URL(request.url); } catch { return false; }
  return url.origin === appOrigin
    && request.method === "GET"
    && request.resourceType === "fetch"
    && !request.isNavigationRequest
    && request.errorText === "net::ERR_ABORTED"
    && url.searchParams.has("_rsc")
    && request.headers["rsc"] === "1"
    && request.headers["next-router-prefetch"] === "1";
}

export async function describeFailedRequest(request: Request): Promise<FailedRequestInfo> {
  return { url: request.url(), method: request.method(), resourceType: request.resourceType(), isNavigationRequest: request.isNavigationRequest(), errorText: request.failure()?.errorText ?? "", headers: await request.allHeaders().catch(() => request.headers()) };
}

/**
 * Sayfadaki başarısız istekleri toplar. Zararsız prefetch iptalleri ayrı tutulur (gizlenmez);
 * `assertPrefetchTargetsReachable` ile hedef rotaların gerçekten yüklenebildiği kanıtlanır.
 */
export function collectFailedRequests(page: Page, appOrigin: string) {
  const pending: Promise<void>[] = []; const failures: string[] = []; const ignoredPrefetchAborts: FailedRequestInfo[] = [];
  page.on("requestfailed", (request) => { pending.push(describeFailedRequest(request).then((info) => { if (isBenignNextPrefetchAbort(info, appOrigin)) ignoredPrefetchAborts.push(info); else failures.push(`${info.method} ${info.url} ${info.errorText} [${info.resourceType}]`); })); });
  return { failures, ignoredPrefetchAborts, settle: async () => { await Promise.all(pending); } };
}

/** İptal edilen prefetch hedeflerinin her biri gerçekten 200 ile yüklenebiliyor mu? (veri yükleme hatası olmadığının kanıtı) */
export async function unreachablePrefetchTargets(page: Page, aborted: readonly FailedRequestInfo[]) {
  const unreachable: string[] = [];
  const paths = [...new Set(aborted.map((item) => { const url = new URL(item.url); url.searchParams.delete("_rsc"); return url.pathname + url.search; }))];
  for (const route of paths) { const response = await page.request.get(route); if (response.status() !== 200) unreachable.push(`${response.status()} ${route}`); }
  return unreachable;
}
