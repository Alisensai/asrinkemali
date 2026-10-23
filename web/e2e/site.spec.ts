import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test("ana sayfa etkileşimleri, klavye ve ekran görüntüsü", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const unexpected404s: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`));
  page.on("response", (response) => { if (response.status() === 404) unexpected404s.push(response.url()); });

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ATATÜRK");
  await expect(page.getByText("Kapak görseli: Yapay zekâ ile hazırlanmış temsili canlandırma.")).toBeVisible();
  await expectNoOverflow(page);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();

  await page.getByRole("button", { name: "2. tanıtımı göster" }).click();
  await expect(page.locator(".hero-title")).toHaveText("ARŞİV");
  await page.locator(".hero").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".hero-title")).toHaveText("HAFIZA");

  await page.getByRole("button", { name: "Arşivde Ara" }).click();
  const dialog = page.getByRole("dialog", { name: "ARŞİVDE ARA" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Sayfa veya bölüm ara" })).toBeFocused();
  await page.getByRole("searchbox", { name: "Sayfa veya bölüm ara" }).fill("kronoloji");
  await expect(dialog.getByRole("link", { name: "Tarih kronolojisi" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  if ((page.viewportSize()?.width ?? 0) <= 960) {
    const menuButton = page.getByRole("button", { name: "MENÜ" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", { name: "HAKKIMIZDA", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  }

  await page.getByRole("button", { name: "1. tanıtımı göster" }).click();
  const screenshotPath = path.resolve(testInfo.config.rootDir, "..", "..", "docs", "screenshots", `nextjs-${testInfo.project.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  expect(consoleErrors, `console errors: ${consoleErrors.join("\n")}`).toEqual([]);
  expect(pageErrors, `page errors: ${pageErrors.join("\n")}`).toEqual([]);
  expect(failedRequests, `failed requests: ${failedRequests.join("\n")}`).toEqual([]);
  expect(unexpected404s, `network 404: ${unexpected404s.join("\n")}`).toEqual([]);
});

test("rotalar dürüst boş durum ve 404 döndürür", async ({ page }) => {
  for (const route of ["/ataturk", "/kronoloji", "/arsiv", "/yayinlar", "/hakkimizda"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expectNoOverflow(page);
  }
  await page.goto("/yayinlar");
  await expect(page.getByText("Henüz doğrulanmış yayın bulunmuyor.")).toBeVisible();
  const missing = await page.goto("/arsiv/yayinda-olmayan-kayit");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
});
