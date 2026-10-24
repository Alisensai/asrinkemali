import { test, expect } from "@playwright/test";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const artifactDir = "C:\\Users\\Ali\\.gemini\\antigravity\\brain\\5516a538-67db-4795-89ac-033eaa715691";
const docsScreenshotsDir = "C:\\Users\\Ali\\AsrinKemaliCalisma\\antigravity\\docs\\screenshots";

if (!existsSync(docsScreenshotsDir)) {
  mkdirSync(docsScreenshotsDir, { recursive: true });
}

test.describe("MKA Keşfet & Açıklanabilir Kaynaklı Öneriler — Görev 29 E2E", () => {
  test("1. /kesfet genel keşif, tematik kümeler ve 9 viewport yatay taşma kontrolü", async ({ page }, testInfo) => {
    await page.goto("/kesfet", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // H1 Başlık ve yönlendirme
    const heading = page.getByRole("heading", {
      name: "Keşfet & Açıklanabilir Kaynaklı Öneriler",
      level: 1,
    });
    await expect(heading).toBeVisible();

    // Üst rozet ve açıklanabilirlik bildirimi
    const eyebrow = page.getByText("MKA AKILLI KEŞİF & AÇIKLANABİLİR ÖNERİ MOTORU");
    await expect(eyebrow).toBeVisible();

    const notice = page.getByText("Açıklanabilirlik Güvencesi:");
    await expect(notice).toBeVisible();

    // Filtre çubuğu sekmeleri
    const filterNav = page.getByRole("navigation", { name: "Keşif filtreleri" });
    await expect(filterNav).toBeVisible();

    // Tematik kümeler başlığı
    const clustersHeading = page.getByRole("heading", {
      name: "Tematik ve Dönemsel Kümeler",
      level: 2,
    });
    await expect(clustersHeading).toBeVisible();

    // Yatay taşma denetimi (scrollWidth <= innerWidth + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow, `Yatay taşma oluştu (${testInfo.project.name})`).toBe(false);

    // 1. Ekran görüntüsü: Overview (Genel Keşif)
    const overviewScreenshot = `v08-explore-overview-${testInfo.project.name}.png`;
    await page.screenshot({
      path: path.join(docsScreenshotsDir, overviewScreenshot),
      fullPage: false,
    });
    try {
      await page.screenshot({
        path: path.join(artifactDir, overviewScreenshot),
        fullPage: false,
      });
    } catch {
      // Artifact dir optional fallback
    }

    // Arama ve Filtre Denetimi: ?q=cumhuriyet
    await page.goto("/kesfet?q=cumhuriyet", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const searchHeading = page.getByRole("heading", {
      name: /"cumhuriyet" Arama Sonuçları/i,
      level: 2,
    });
    await expect(searchHeading).toBeVisible();

    // Yatay taşma denetimi arama sayfasında
    const searchOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(searchOverflow, `Arama sonuçlarında yatay taşma oluştu (${testInfo.project.name})`).toBe(false);

    // 2. Ekran görüntüsü: Search (Arama Sonuçları)
    const searchScreenshot = `v08-explore-search-${testInfo.project.name}.png`;
    await page.screenshot({
      path: path.join(docsScreenshotsDir, searchScreenshot),
      fullPage: false,
    });
    try {
      await page.screenshot({
        path: path.join(artifactDir, searchScreenshot),
        fullPage: false,
      });
    } catch {
      // Artifact dir optional fallback
    }
  });

  test("2. Açıklanabilir öneri akışı, tohum kayıt odağı ve boş durum doğrulaması", async ({ page }) => {
    // Tohum kayıt odaklı öneriler: cumhuriyetin-ilani-1923
    await page.goto("/kesfet?kayit=cumhuriyetin-ilani-1923", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("load");

    // Odak kayıt banner'ı
    const seedBanner = page.getByRole("status").filter({ hasText: "Odak Kayıt:" });
    await expect(seedBanner).toBeVisible();

    // Açıklanabilir öneri kartları
    const explainBadge = page.getByText(/Tarihsel Alaka/i).first();
    await expect(explainBadge).toBeVisible();

    // Genel keşfe dönüş linki
    const backLink = page.getByRole("link", { name: "Genel Keşfe Dön" });
    await expect(backLink).toBeVisible();

    // Boş durum doğrulaması: bulunmayan arama
    await page.goto("/kesfet?q=kesinlikle-olmayan-kayit-xyz-999", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("load");

    const emptyHeading = page.getByRole("heading", {
      name: "Eşleşen Kaynak Bulunamadı",
      level: 2,
    });
    await expect(emptyHeading).toBeVisible();

    const resetButton = page.getByRole("link", {
      name: "Filtreleri Sıfırla ve Tüm Kataloğu Gör",
    });
    await expect(resetButton).toBeVisible();
  });
});
