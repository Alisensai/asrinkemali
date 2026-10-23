import { expect, test } from "@playwright/test";
import { collectFailedRequests, isBenignNextPrefetchAbort, type FailedRequestInfo } from "./support/network";

// site.spec'teki ağ hatası istisnasının dar kapsamlı olduğunu kanıtlar: zararsız Next.js
// prefetch iptali hariç tutulur, gerçek ağ arızaları yakalanmaya devam eder.
const origin = "http://127.0.0.1:49273";
const prefetch: FailedRequestInfo = { url: `${origin}/kronoloji?_rsc=abc123`, method: "GET", resourceType: "fetch", isNavigationRequest: false, errorText: "net::ERR_ABORTED", headers: { rsc: "1", "next-router-prefetch": "1", "next-router-segment-prefetch": "/_tree" } };
const only = (name: string) => name === "desktop-1536x1024" || name.endsWith("-desktop-1536x1024");

test("sınıflandırıcı: yalnız tüm koşulları sağlayan prefetch iptali hariç tutulur", async ({}, testInfo) => {
  test.skip(!only(testInfo.project.name), "saf fonksiyon; tek projede yeterli");
  expect(isBenignNextPrefetchAbort(prefetch, origin)).toBe(true);
  expect(isBenignNextPrefetchAbort({ ...prefetch, headers: { rsc: "1", "next-router-prefetch": "1" } }, origin)).toBe(true);
  const negatives: Array<[string, FailedRequestInfo]> = [
    ["prefetch başlığı yok (gerçek RSC navigasyon verisi)", { ...prefetch, headers: { rsc: "1" } }],
    ["rsc başlığı yok", { ...prefetch, headers: { "next-router-prefetch": "1" } }],
    ["_rsc parametresi yok", { ...prefetch, url: `${origin}/kronoloji` }],
    ["ERR_FAILED", { ...prefetch, errorText: "net::ERR_FAILED" }],
    ["bağlantı reddedildi", { ...prefetch, errorText: "net::ERR_CONNECTION_REFUSED" }],
    ["DNS hatası", { ...prefetch, errorText: "net::ERR_NAME_NOT_RESOLVED" }],
    ["boş hata metni", { ...prefetch, errorText: "" }],
    ["belge navigasyonu", { ...prefetch, resourceType: "document", isNavigationRequest: true }],
    ["navigasyon isteği işaretli", { ...prefetch, isNavigationRequest: true }],
    ["betik", { ...prefetch, resourceType: "script" }],
    ["görsel", { ...prefetch, resourceType: "image" }],
    ["POST (server action)", { ...prefetch, method: "POST" }],
    ["farklı köken", { ...prefetch, url: "https://example.org/kronoloji?_rsc=abc123" }],
    ["geçersiz URL", { ...prefetch, url: "::" }],
  ];
  for (const [label, request] of negatives) expect(isBenignNextPrefetchAbort(request, origin), label).toBe(false);
});

test("gerçek tarayıcı: prefetch olmayan başarısız istek raporlanır", async ({ page, baseURL }, testInfo) => {
  test.skip(!only(testInfo.project.name), "tek projede yeterli");
  const network = collectFailedRequests(page, new URL(baseURL!).origin);
  await page.goto("/hakkimizda");
  await page.route("**/arizali-uc-nokta**", (route) => route.abort("failed"));
  await page.evaluate(async () => { await fetch("/arizali-uc-nokta?_rsc=x", { headers: { rsc: "1" } }).catch(() => undefined); });
  await page.evaluate(async () => { await fetch("/arizali-uc-nokta-2").catch(() => undefined); });
  await network.settle();
  expect(network.failures.length).toBe(2);
  expect(network.failures.join("\n")).toContain("net::ERR_FAILED");
  // Sayfanın kendi bağlantılarının gerçek prefetch iptalleri olabilir; yapay arızalar asla bu listeye düşmemeli.
  expect(network.ignoredPrefetchAborts.filter((item) => item.url.includes("arizali-uc-nokta"))).toEqual([]);
  for (const item of network.ignoredPrefetchAborts) expect(item.headers["next-router-prefetch"]).toBe("1");
});

test("gerçek tarayıcı: prefetch başlıklı olsa da ERR_ABORTED olmayan arıza raporlanır", async ({ page, baseURL }, testInfo) => {
  test.skip(!only(testInfo.project.name), "tek projede yeterli");
  const network = collectFailedRequests(page, new URL(baseURL!).origin);
  await page.goto("/hakkimizda");
  await page.route("**/sahte-prefetch**", (route) => route.abort("connectionrefused"));
  await page.evaluate(async () => { await fetch("/sahte-prefetch?_rsc=y", { headers: { rsc: "1", "next-router-prefetch": "1" } }).catch(() => undefined); });
  await network.settle();
  expect(network.failures).toHaveLength(1);
  expect(network.failures[0]).toContain("ERR_CONNECTION_REFUSED");
  expect(network.ignoredPrefetchAborts.filter((item) => item.url.includes("sahte-prefetch"))).toEqual([]);
});

test("gerçek tarayıcı: iptal edilen prefetch ayrı tutulur ve gizlenmez", async ({ page, baseURL }, testInfo) => {
  test.skip(!only(testInfo.project.name), "tek projede yeterli");
  const network = collectFailedRequests(page, new URL(baseURL!).origin);
  await page.goto("/hakkimizda");
  await page.route("**/iptal-prefetch**", (route) => route.abort("aborted"));
  await page.evaluate(async () => { await fetch("/iptal-prefetch?_rsc=z", { headers: { rsc: "1", "next-router-prefetch": "1" } }).catch(() => undefined); });
  await network.settle();
  expect(network.failures).toEqual([]);
  expect(network.ignoredPrefetchAborts.map((item) => new URL(item.url).pathname)).toContain("/iptal-prefetch");
});
