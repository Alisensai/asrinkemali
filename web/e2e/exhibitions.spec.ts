import { test, expect } from "@playwright/test";
import path from "node:path";

const artifactDir = "C:\\Users\\Ali\\.gemini\\antigravity\\brain\\5516a538-67db-4795-89ac-033eaa715691";

test.describe("MKA Immersive Museum Platform V0.7", () => {
  test("1. /sergiler dizin sayfası ve tema filtreleme denetimi", async ({ page }, testInfo) => {
    const isDesktop = testInfo.project.name === "museum-desktop";
    await page.goto("/sergiler", { waitUntil: "networkidle" });

    // Sayfa başlığı ve hero
    const heading = page.getByRole("heading", { name: "KÜRATÖRYEL SERGİLER", level: 1 });
    await expect(heading).toBeVisible();

    // En az 2 sergi kartı görüntülenmeli
    const cards = page.locator("article");
    await expect(cards).toHaveCount(2);

    // Yatay taşma denetimi
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    // Ekran görüntüleri
    if (isDesktop) {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-directory-1536x1024.png"),
        fullPage: false,
      });
    } else {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-directory-390x844.png"),
        fullPage: false,
      });
    }

    // Arama ve filtreleme
    const searchInput = page.getByRole("searchbox", { name: "Sergi arama" });
    await searchInput.fill("Cumhuriyet");
    await expect(page.locator("article")).toHaveCount(1);
    await searchInput.fill("");
    await expect(page.locator("article")).toHaveCount(2);
  });

  test("2. /sergiler/cumhuriyetin-ilani 3D Sanal Galeri ve Gezinme", async ({ page }, testInfo) => {
    const isDesktop = testInfo.project.name === "museum-desktop";
    await page.goto("/sergiler/cumhuriyetin-ilani", { waitUntil: "networkidle" });

    // Hero başlığı ve görünüm değiştirici
    await expect(page.locator("h1")).toContainText("Cumhuriyet'in İlanı");
    await expect(page.getByRole("button", { name: "Sanal Galeri Odası" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Belge / Liste Modu" })).toBeVisible();

    if (isDesktop) {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-hero-1536x1024.png"),
        fullPage: false,
      });
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-virtual-room-1536x1024.png"),
        fullPage: false,
      });
    } else {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-mobile-room-390x844.png"),
        fullPage: false,
      });
    }

    // Bölüm 2 (Vitrin) butonuna tıkla
    const vitrineSlideBtn = page.getByRole("button", { name: /Bölüm 2:/i });
    if (await vitrineSlideBtn.isVisible()) {
      await vitrineSlideBtn.click();
      await page.waitForTimeout(300);
    } else {
      // Alternatif: Sonraki butonu
      const nextBtn = page.getByRole("button", { name: /Sonraki vitrin bölümüne geç/i });
      await nextBtn.click();
      await page.waitForTimeout(300);
    }

    // Vitrin başlığı ve kartı kontrolü
    await expect(page.getByRole("heading", { name: /Cumhuriyet'in İlanı Kaydı/i }).first()).toBeVisible();

    if (isDesktop) {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-vitrine-1536x1024.png"),
        fullPage: false,
      });
    }

    // Kaynak Detayı butonuna tıkla
    const inspectBtn = page.getByRole("button", { name: /belgesinin kaynak detayını aç|Kaynak Detayı/i }).first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();
    await page.waitForTimeout(400);

    // Çekmece (SourceInspector) görünür olmalı
    const drawer = page.locator('aside[role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(page.locator("text=BİRİNCİL TARİHÎ KAYNAK")).toBeVisible();

    if (isDesktop) {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-source-drawer-1536x1024.png"),
        fullPage: false,
      });
    }

    // Escape ile çekmeceyi kapat
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(drawer).not.toBeVisible();

    // Klavye ile gezinme: Sağ Ok -> Bölüm 3
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);

    // Görünüm Modunu Değiştir: Belge / Liste Modu
    const listModeBtn = page.getByRole("button", { name: "Belge / Liste Modu" });
    await listModeBtn.scrollIntoViewIfNeeded();
    await listModeBtn.click();
    await page.waitForTimeout(400);

    // Liste modunda vitrin ve zaman çizelgesi kontrolleri
    await expect(page.getByRole("heading", { name: /Cumhuriyet'in İlanı Kaydı/i }).first()).toBeVisible();
    await expect(page.locator("text=Kuruluşun Anayasal Takvimi")).toBeVisible();

    if (isDesktop) {
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-list-mode-1536x1024.png"),
        fullPage: false,
      });

      // Zaman çizelgesini görünür yap ve ekran görüntüsü al
      const timelineElem = page.locator("text=Kuruluşun Anayasal Takvimi");
      await timelineElem.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(artifactDir, "v07-exhibitions-timeline-1536x1024.png"),
        fullPage: false,
      });
    }

    // Yatay taşma denetimi
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
  });

  test("3. Çoklu Viewport Taşma Denetimi (320px–1536px)", async ({ page }) => {
    const testSizes = [
      { w: 1536, h: 1024 },
      { w: 1440, h: 900 },
      { w: 1280, h: 800 },
      { w: 1024, h: 768 },
      { w: 768, h: 1024 },
      { w: 414, h: 896 },
      { w: 390, h: 844 },
      { w: 375, h: 667 },
      { w: 360, h: 640 },
      { w: 320, h: 568 },
    ];

    for (const size of testSizes) {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto("/sergiler/cumhuriyetin-ilani", { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Taşma tespit edildi: ${size.w}x${size.h}`).toBe(false);
    }
  });
});
