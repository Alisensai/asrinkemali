import { expect, test, type Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// V0.6 entegrasyon sağlamlaştırma: rota sağlığı, API, güvenlik başlıkları ve arşiv regresyonu.
// Beklenen değerler diskteki veriden türetilir; sayı sabit yazılmaz.
type RawRecord = { id: string; slug: string; type: string; title: string; relatedIds?: string[]; date: { start: string | null; precision: string }; source: { url: string }; verification: { status: string } };
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const records: RawRecord[] = ["content/archive/records", "data/archive/catalog"].flatMap((directory) => { const full = path.join(repoRoot, directory); return existsSync(full) ? readdirSync(full).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(full, name), "utf8")) as RawRecord) : []; });
const published = records.filter((record) => record.verification.status === "published");
const unpublished = records.filter((record) => record.verification.status !== "published");
const count = (status: string) => records.filter((record) => record.verification.status === status).length;

const PAGES = ["/", "/ataturk", "/arsiv", "/arsiv?q=cumhuriyet&tur=belge", `/arsiv/${published[0]?.slug}`, "/kronoloji", "/kronoloji?yil=1923", "/yayinlar", "/tarihte-bugun", "/tarihte-bugun?ay=10&gun=29", "/hakkimizda"];
const primary = (name: string) => name === "desktop-1536x1024";

function watch(page: Page, origin: string) {
  const problems: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" || /hydrat/i.test(message.text())) problems.push(`console: ${message.text().slice(0, 200)}`); });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message.slice(0, 200)}`));
  page.on("response", (response) => { if (response.status() >= 400 && response.url().startsWith(origin)) problems.push(`${response.status()} ${response.url()}`); });
  return problems;
}

test("tüm sayfa rotaları hatasız, hidrasyon uyarısız ve yatay taşmasız açılır", async ({ page, baseURL }) => {
  const problems = watch(page, baseURL!);
  for (const route of PAGES) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(width, `${route} yatay taşma`).toBeLessThanOrEqual(0);
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("güvenlik başlıkları her yanıtta bulunur, çerçeve sızdırmaz", async ({ request }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "başlıklar görünümden bağımsızdır");
  for (const route of ["/", "/ataturk", "/arsiv", "/api/health-integration", "/sitemap.xml"]) {
    const response = await request.get(route);
    const headers = response.headers();
    expect(headers["x-content-type-options"], route).toBe("nosniff");
    expect(headers["referrer-policy"], route).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"], route).toBe("DENY");
    expect(headers["permissions-policy"], route).toContain("camera=()");
    expect(headers["x-powered-by"], route).toBeUndefined();
  }
});

test("sağlık API'si arşiv durumunu diskteki veriyle tutarlı ve insan onayını dürüst bildirir", async ({ request }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "API görünümden bağımsızdır");
  const response = await request.get("/api/health-integration");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const body = await response.json();
  expect(body.archive).toEqual({ total: records.length, published: count("published"), reviewed: count("reviewed"), draft: count("draft") });
  expect(body.humanExpertReviewComplete).toBe(false);
});

test("site haritası ve robots.txt yayın politikasına uyar", async ({ request }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "görünümden bağımsız");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const route of ["/ataturk", "/kronoloji", "/tarihte-bugun", "/arsiv", "/yayinlar", "/hakkimizda"]) expect(sitemap).toContain(`${route}</loc>`);
  for (const record of unpublished) expect(sitemap).not.toContain(record.slug);
  const robots = await (await request.get("/robots.txt")).text();
  if (!process.env.NEXT_PUBLIC_SITE_URL) expect(robots).toMatch(/Disallow: \//);
});

test("yayımlanmış her arşiv ayrıntısı açılır, kimliğini ve HTTPS kaynak bağlantısını taşır", async ({ request }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "tüm kayıt taraması tek projede çalışır");
  test.setTimeout(240_000);
  for (const record of published) {
    const response = await request.get(`/arsiv/${record.slug}`);
    expect(response.status(), record.slug).toBe(200);
    const html = await response.text();
    expect(html, record.slug).toContain(record.id);
    expect(record.source.url, record.slug).toMatch(/^https:\/\//);
    expect(html, record.slug).toContain(`href="${record.source.url.replace(/&/g, "&amp;")}"`);
  }
});

test("taslak, incelemedeki ve bilinmeyen kayıtların ayrıntıları 404 döner", async ({ request }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "görünümden bağımsız");
  expect(unpublished.length).toBeGreaterThan(0);
  for (const slug of [...unpublished.map((record) => record.slug), "olmayan-kayit", "..%2F..%2Fpackage.json", "a".repeat(200), "BUYUK-HARF"]) expect((await request.get(`/arsiv/${slug}`)).status(), slug).toBe(404);
  for (const slug of ["olmayan-yayin", "../x", "taslak-yazi"]) expect((await request.get(`/yayinlar/${slug}`)).status(), slug).toBe(404);
});

test("ilişkili arşiv kayıtları yalnız var olan kimliklere işaret eder", () => {
  const ids = new Set(records.map((record) => record.id));
  const publishedIds = new Set(published.map((record) => record.id));
  for (const record of records) for (const related of record.relatedIds ?? []) expect(ids.has(related), `${record.id} → ${related}`).toBe(true);
  for (const record of published) for (const related of record.relatedIds ?? []) expect(publishedIds.has(related), `yayımlanmış ${record.id} yayımlanmamış ${related} kaydına bağlı`).toBe(true);
  expect(new Set(records.map((record) => record.slug)).size).toBe(records.length);
});

test("Tarihte Bugün takvimde olmayan günü reddeder, seçilen günün kaynaklı olaylarını listeler", async ({ page }, testInfo) => {
  test.skip(!primary(testInfo.project.name) && !testInfo.project.name.startsWith("mobile-390"), "iki görünümde yeterli");
  await page.goto("/tarihte-bugun?ay=2&gun=31");
  await expect(page.getByRole("alert").filter({ hasText: "Geçersiz tarih" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: "31.2" })).toHaveCount(0);

  await page.goto("/tarihte-bugun?ay=10&gun=29");
  const expected = published.filter((record) => record.type === "event" && record.date.precision === "day" && record.date.start?.slice(5) === "10-29").map((record) => `/arsiv/${record.slug}`).sort();
  const links = (await page.locator("main ol a").evaluateAll((items) => items.map((item) => item.getAttribute("href") ?? ""))).sort();
  expect(links).toEqual(expected);
  await expect(page.getByText(`${expected.length} sonuç`)).toBeVisible();
});

test("1881–1918 mekân kayıtlarının kuruluş tarihleri yaşam olayı gibi sunulmaz", async ({ page }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "veri mantığı görünümden bağımsız");
  await page.goto("/ataturk");
  await expect(page.locator("[data-ready='true']")).toHaveCount(2);
  const places = published.filter((record) => record.type === "place" && record.date.start && record.date.start < "1919");
  for (const record of places) await expect(page.locator(`#olay-${record.slug}`).getByText("Mekân tarihi"), record.slug).toBeVisible();
  const eventYears = published.filter((record) => record.type !== "place" && record.date.start && record.date.start >= "1881" && record.date.start <= "1938-11-10").map((record) => Number(record.date.start!.slice(0, 4)));
  const range = `${Math.min(...eventYears)}–${Math.max(...eventYears)}`;
  await expect(page.locator("dl").filter({ hasText: "Yaşam çizelgesi" }).locator("dd").nth(2)).toHaveText(range);
});

test("yayın bölümü insan onaylı içerik yokken taslak göstermez", async ({ page }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "görünümden bağımsız");
  await page.goto("/yayinlar");
  const published = readdirSync(path.join(repoRoot, "content", "publications", "records")).filter((name) => name.endsWith(".json")).length;
  if (published === 0) await expect(page.getByText("Henüz doğrulanmış yayın bulunmuyor.")).toBeVisible();
  await page.goto("/yayinlar?tur=%3Cscript%3E&kategori=%22%3E%3Cimg%20src%3Dx%3E");
  await expect(page.locator("main img[src='x']")).toHaveCount(0);
});

test("dış bağlantılar HTTPS ve yeni sekmede güvenli açılır", async ({ page }, testInfo) => {
  test.skip(!primary(testInfo.project.name), "görünümden bağımsız");
  for (const route of ["/", "/ataturk", `/arsiv/${published[0]?.slug}`]) {
    await page.goto(route);
    const external = await page.locator("a[href^='http']").evaluateAll((links) => links.map((link) => ({ href: link.getAttribute("href") ?? "", target: link.getAttribute("target"), rel: link.getAttribute("rel") ?? "" })));
    for (const link of external) {
      expect(link.href, route).toMatch(/^https:\/\/[^/\s]+\.[a-z]{2,}/i);
      expect(link.href, route).not.toContain("dijitalkutuphane.mkutup.gov.tr");
      if (link.target === "_blank") expect(link.rel, `${route} ${link.href}`).toContain("noopener");
    }
  }
});
