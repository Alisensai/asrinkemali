import { expect, test, type Page } from "@playwright/test";

const viewports = [
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1536, 1024],
];

async function expectNoOverflow(page: Page) {
  const d = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(d.scrollWidth).toBeLessThanOrEqual(d.viewportWidth + 2);
}

for (const [w, h] of viewports) {
  test(`mobil-kalite: ${w}x${h} ana sayfa kontrolleri`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 768 ? 2 : 1 });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(err.message));
    
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 2);
    
    if (w <= 960) {
      const menuBtn = page.getByRole("button", { name: "MENÜ" });
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();
      await expect(menuBtn).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(menuBtn).toHaveAttribute("aria-expanded", "false");
    }
    
    const searchBtn = page.getByRole("button", { name: /Arşivde Ara/i }).first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
    
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test("mobil-kalite: arşiv filtreler ve sayfalama", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/arsiv");
  const form = page.getByRole("form", { name: "Arşiv arama ve filtreleri" });
  await expect(form).toBeVisible();
  await form.getByLabel("Başlık veya anahtar kelime").fill("Cumhuriyet");
  await form.getByRole("button", { name: "Arşivde ara" }).click();
  await expect(page).toHaveURL(/q=/);
  // Arama tam sayfa gezinmedir; URL commit anında değişir, yeni belge henüz stil
  // uygulanmadan ayrıştırılıyor olabilir. Taşmayı yüklenmiş ve çizilebilir sayfada ölç.
  await page.waitForLoadState("load");
  await expect(page.getByRole("form", { name: "Arşiv arama ve filtreleri" })).toBeVisible();
  await expectNoOverflow(page);
});
