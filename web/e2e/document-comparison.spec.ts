import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

test.describe("MKA Belge Karşılaştırma Merkezi (Task 23)", () => {
  test("renders empty comparison state with selection slots", async ({ page }) => {
    await page.goto("/karsilastir");
    await expect(page.getByRole("heading", { name: /Tarihsel Belgeleri/ })).toBeVisible();
    await expect(page.getByText("İlk belgeyi seçiniz")).toBeVisible();
    await expect(page.getByText("İkinci belgeyi seçiniz")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ 1. Belgeyi Seç" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ 2. Belgeyi Seç" })).toBeVisible();
  });

  test("opens modal, searches, and selects document for Slot A", async ({ page }) => {
    await page.goto("/karsilastir");
    await page.getByRole("button", { name: "+ 1. Belgeyi Seç" }).click();
    const modal = page.getByRole("dialog", { name: "1. Belgeyi Seçiniz" });
    await expect(modal).toBeVisible();

    const searchInput = page.getByRole("searchbox", { name: "Katalogda arama yap" });
    await searchInput.fill("anayasasi");
    const option = page.getByRole("option", { name: /1924 Anayasası/i }).first();
    await expect(option).toBeVisible();
    await option.getByRole("button", { name: "Seç →" }).click();

    await expect(modal).not.toBeVisible();
    await expect(page.getByRole("article", { name: "1. Karşılaştırma Belgesi" })).toBeVisible();
  });

  test("prevents selecting same document in both slots", async ({ page }) => {
    await page.goto("/karsilastir?a=1924-anayasasi");
    await expect(page.getByRole("article", { name: "1. Karşılaştırma Belgesi" })).toBeVisible();

    await page.getByRole("button", { name: "+ 2. Belgeyi Seç" }).click();
    const modal = page.getByRole("dialog", { name: "2. Belgeyi Seçiniz" });
    await expect(modal).toBeVisible();

    const searchInput = page.getByRole("searchbox", { name: "Katalogda arama yap" });
    await searchInput.fill("anayasasi");
    const option = page.getByRole("option", { name: /1924 Anayasası/i }).first();
    await expect(option.getByText("Diğer panelde seçili")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("preselected URL parameters render comparison table and common elements", async ({ page }) => {
    await page.goto("/karsilastir?a=1924-anayasasi&b=cumhuriyetin-ilani-1923");
    await expect(page.getByRole("article", { name: "1. Karşılaştırma Belgesi" })).toBeVisible();
    await expect(page.getByRole("article", { name: "2. Karşılaştırma Belgesi" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Karşılaştırma Bulguları" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Belge Karşılaştırma Tablosu" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Ortak Tarihsel Unsurlar" })).toBeVisible();

    // Verify fields in table
    await expect(page.getByRole("rowheader", { name: /Katalog Başlığı/ })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: /Kaynak Kurumu/ })).toBeVisible();
  });

  test("handles duplicate slug in URL query gracefully", async ({ page }) => {
    await page.goto("/karsilastir?a=1924-anayasasi&b=1924-anayasasi");
    await expect(page.getByText(/Aynı belge iki kez seçilemez/)).toBeVisible();
    await expect(page.getByRole("article", { name: "1. Karşılaştırma Belgesi" })).toBeVisible();
    await expect(page.getByText("İkinci belgeyi seçiniz")).toBeVisible();
  });

  test("handles invalid slug in URL query without breaking page", async ({ page }) => {
    await page.goto("/karsilastir?a=gecersiz-slug-999&b=safe-slug");
    await expect(page.getByRole("heading", { name: /Tarihsel Belgeleri/ })).toBeVisible();
    await expect(page.getByText("İlk belgeyi seçiniz")).toBeVisible();
  });

  test("share button works and gives user feedback", async ({ page, context }) => {
    try {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    } catch {
      // ignore if unsupported
    }
    await page.goto("/karsilastir?a=1924-anayasasi&b=cumhuriyetin-ilani-1923");
    const shareBtn = page.getByRole("button", { name: "Karşılaştırma bağlantısını paylaş" });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
    await expect(page.getByText("Bağlantı Kopyalandı!")).toBeVisible();
  });

  test("reset button clears selections and returns to empty state", async ({ page }) => {
    await page.goto("/karsilastir?a=1924-anayasasi&b=cumhuriyetin-ilani-1923");
    const resetBtn = page.getByRole("button", { name: "Karşılaştırmayı sıfırla" });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await expect(page.getByText("İlk belgeyi seçiniz")).toBeVisible();
    await expect(page.getByText("İkinci belgeyi seçiniz")).toBeVisible();
  });

  test("no horizontal overflow and viewport capture across viewports", async ({ page }, testInfo) => {
    await page.goto("/karsilastir?a=1924-anayasasi&b=cumhuriyetin-ilani-1923");
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflows, `Horizontal overflow detected in ${testInfo.project.name}`).toBe(false);

    const screenshotDir = path.resolve(process.cwd(), "../docs/screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, `v08-comparison-${testInfo.project.name}.png`),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`comparison-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
});
