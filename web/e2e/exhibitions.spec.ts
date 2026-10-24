import { test, expect } from "@playwright/test";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const artifactDir = "C:\\Users\\Ali\\.gemini\\antigravity\\brain\\5516a538-67db-4795-89ac-033eaa715691";
const docsScreenshotsDir = "C:\\Users\\Ali\\AsrinKemaliCalisma\\antigravity\\docs\\screenshots";

if (!existsSync(docsScreenshotsDir)) {
  mkdirSync(docsScreenshotsDir, { recursive: true });
}

test.describe("MKA Immersive Museum Platform V0.8 — Görev 26 Hardening & E2E", () => {
  test("1. /sergiler dizin sayfası, kartlar ve tema filtreleme", async ({ page }, testInfo) => {
    await page.goto("/sergiler", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Sayfa başlığı ve hero
    const heading = page.getByRole("heading", { name: "KÜRATÖRYEL SERGİLER", level: 1 });
    await expect(heading).toBeVisible();

    // En az 2 sergi kartı görüntülenmeli
    const cards = page.locator("article");
    await expect(cards).toHaveCount(2);

    // Yatay taşma denetimi (scrollWidth <= innerWidth + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow, `Yatay taşma oluştu (${testInfo.project.name})`).toBe(false);

    // Ekran görüntüsü kaydet
    const screenshotName = `v08-museum-directory-${testInfo.project.name}.png`;
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
      // Artifact dir optional fallback
    }

    // Tema filtresi seçimi denetimi
    const themeSelect = page.getByRole("combobox", { name: "Tema filtresi" });
    if (await themeSelect.isVisible()) {
      await themeSelect.selectOption("cumhuriyetin_ilani");
      await expect(page.locator("article")).toHaveCount(1);
      await themeSelect.selectOption("all");
      await expect(page.locator("article")).toHaveCount(2);
    }
  });

  test("2. /sergiler/cumhuriyetin-ilani 3D Galeri, Kaynak Denetçisi ve Liste Modu", async ({ page }, testInfo) => {
    await page.goto("/sergiler/cumhuriyetin-ilani", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Hero başlığı ve görünüm değiştirici
    await expect(page.locator("h1")).toContainText("Cumhuriyet'in İlanı");
    await expect(page.getByRole("button", { name: "Sanal Galeri Odası" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Belge / Liste Modu" })).toBeVisible();

    // Taslak uyarı banner'ı görünür olmalı (staging draft)
    await expect(page.locator("text=TASLAK — İNSAN İNCELEMESİ YOK")).toBeVisible();

    // Ekran görüntüsü kaydet
    const screenshotName = `v08-museum-${testInfo.project.name}.png`;
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

    // Bölüm 2 (Vitrin) butonuna tıkla
    const vitrineSlideBtn = page.getByRole("button", { name: /Bölüm 2:/i });
    if (await vitrineSlideBtn.isVisible()) {
      await vitrineSlideBtn.click();
      await page.waitForTimeout(300);
    } else {
      const nextBtn = page.getByRole("button", { name: /Sonraki vitrin bölümüne geç/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Vitrin başlığı ve kartı kontrolü
    await expect(page.getByRole("heading", { name: /Cumhuriyet'in İlanı Kaydı/i }).first()).toBeVisible();

    // Kaynak Detayı butonuna tıkla
    const inspectBtn = page.getByRole("button", { name: /belgesinin kaynak detayını aç|Kaynak Detayı/i }).first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();
    await page.waitForTimeout(400);

    // Çekmece (SourceInspector) görünür olmalı
    const drawer = page.locator('aside[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Doğrulanmış dürüst rozetler denetimi: KATALOG KAYDI ve DOĞRULANMIŞ KAYNAK
    await expect(page.locator("text=KATALOG KAYDI")).toBeVisible();
    await expect(page.locator("text=DOĞRULANMIŞ KAYNAK")).toBeVisible();

    // Escape ile çekmeceyi kapat
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(drawer).not.toBeVisible();

    // Klavye ile gezinme: Sağ Ok
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

    // Yatay taşma denetimi (scrollWidth <= innerWidth + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow, `Yatay taşma oluştu (${testInfo.project.name})`).toBe(false);
  });
});
