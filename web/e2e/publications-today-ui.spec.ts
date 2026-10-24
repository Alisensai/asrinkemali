import { test, expect } from "@playwright/test";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const artifactDir = "C:\\Users\\Ali\\.gemini\\antigravity\\brain\\5516a538-67db-4795-89ac-033eaa715691";
const docsScreenshotsDir = "C:\\Users\\Ali\\AsrinKemaliCalisma\\antigravity\\docs\\screenshots";

if (!existsSync(docsScreenshotsDir)) {
  mkdirSync(docsScreenshotsDir, { recursive: true });
}

test.describe("MKA Publications & Today Platform V0.8 — Görev 27 E2E", () => {
  test("1. /yayinlar dizin sayfası, filtreler, boş durum ve taşma kontrolü", async ({ page }, testInfo) => {
    await page.goto("/yayinlar", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Başlık doğrulaması
    const heading = page.getByRole("heading", { name: "YAYINLAR", level: 1 });
    await expect(heading).toBeVisible();

    // Yatay taşma denetimi (scrollWidth <= innerWidth + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow, `Yatay taşma oluştu (${testInfo.project.name})`).toBe(false);

    // Boş durum veya kart varlığı denetimi
    const emptyStateHeading = page.getByRole("heading", { name: "Henüz doğrulanmış yayın bulunmuyor." });
    const articles = page.locator("article");
    const count = await articles.count();
    if (count === 0) {
      await expect(emptyStateHeading).toBeVisible();
      const archiveLink = page.getByRole("link", { name: /Dijital Arşivi İncele/i });
      await expect(archiveLink).toBeVisible();
    }

    // Ekran görüntüsü kaydet
    const screenshotName = `v08-publishing-directory-${testInfo.project.name}.png`;
    await page.screenshot({
      path: path.join(docsScreenshotsDir, screenshotName),
      fullPage: false,
    });
    try {
      await page.screenshot({
        path: path.join(artifactDir, screenshotName),
        fullPage: false,
      });
    } catch {
      // Artifact dir fallback
    }

    // Filtreleme ve temizleme denetimi
    await page.goto("/yayinlar?kategori=Cumhuriyet", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    const clearLink = page.getByRole("link", { name: "Temizle" });
    await expect(clearLink).toBeVisible();
    await clearLink.click();
    await expect(page).toHaveURL(/\/yayinlar$/);
  });

  test("2. /tarihte-bugun tarih seçici, 29 Ekim olayı, boş gün, geçersiz tarih ve taşma", async ({ page }, testInfo) => {
    // 29 Ekim Cumhuriyet'in İlanı sorgusu
    await page.goto("/tarihte-bugun?ay=10&gun=29", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Başlık
    const heading = page.getByRole("heading", { name: "TARİHTE BUGÜN", level: 1 });
    await expect(heading).toBeVisible();

    // 29 Ekim Cumhuriyet'in İlanı kartı ve arşiv linki
    const eventHeading = page.getByRole("heading", { name: "Cumhuriyet'in İlanı" });
    await expect(eventHeading).toBeVisible();
    const archiveLink = page.getByRole("link", { name: /Cumhuriyet'in İlanı/i });
    await expect(archiveLink).toBeVisible();
    expect(await archiveLink.getAttribute("href")).toBe("/arsiv/cumhuriyetin-ilani-1923");

    // Yatay taşma denetimi (scrollWidth <= innerWidth + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow, `Yatay taşma oluştu (${testInfo.project.name})`).toBe(false);

    // Ekran görüntüsü kaydet
    const screenshotName = `v08-publishing-today-${testInfo.project.name}.png`;
    await page.screenshot({
      path: path.join(docsScreenshotsDir, screenshotName),
      fullPage: false,
    });
    try {
      await page.screenshot({
        path: path.join(artifactDir, screenshotName),
        fullPage: false,
      });
    } catch {
      // Artifact dir fallback
    }

    // Geçersiz tarih girdisi testi (erişilebilir alert)
    await page.goto("/tarihte-bugun?ay=99&gun=x", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    const alert = page.getByRole("alert").filter({ hasText: "Geçersiz tarih girdisi" });
    await expect(alert).toBeVisible();

    // Boş gün dürüst gösterim testi
    await page.goto("/tarihte-bugun?ay=1&gun=1", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    const emptyDayHeading = page.getByRole("heading", { name: /kaynaklı olay bulunmuyor/i });
    await expect(emptyDayHeading).toBeVisible();

    // Bilinmeyen yayın 404 testi
    const response = await page.goto("/yayinlar/olmayan-yayin", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(404);
  });
});
