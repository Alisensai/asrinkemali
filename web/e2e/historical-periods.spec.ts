import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const screenshotsDir = path.resolve(process.cwd(), "..", "docs", "screenshots");

test.describe("/donemler tarihî dönem modülü", () => {
  test.beforeAll(() => {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  });

  test("şerit tüm 8 dönemi gösterir, sıfır yatay taşma ve dürüst inceleme bildirimi", async ({ page }, testInfo) => {
    await page.goto("/donemler");
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(8);
    await expect(page.locator("main").getByText(/uzman onayı bekliyor|Kaynak denetimli/).first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(overflow).toBe(false);

    const shotPath = path.join(screenshotsDir, `v08-periods-${testInfo.project.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
  });

  test("geçersiz dönem parametresi uyarı üretir, sessizce kabul etmez", async ({ page }) => {
    await page.goto("/donemler?donem=sahte-donem");
    await expect(page.getByRole("status").filter({ hasText: "Geçersiz dönem" })).toBeVisible();
  });

  test("dönem detayı kayıt kartlarını tarih ve kaynak künyesiyle gösterir", async ({ page }, testInfo) => {
    await page.goto("/donemler?donem=tbmm-kurulusu");
    await expect(page.getByRole("heading", { name: "TBMM'nin Kuruluşu" })).toBeVisible();
    await expect(page.getByText(/yayımlanmış kayıt/).first()).toBeVisible();

    const cards = page.locator("ol li a");
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().getByText(/Kaynak:/)).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(overflow).toBe(false);

    if (testInfo.project.name === "desktop-1536x1024" || testInfo.project.name === "mobile-320x568") {
      const shotPath = path.join(screenshotsDir, `v08-periods-detail-${testInfo.project.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
    }
  });

  test("iki dönem yan yana karşılaştırılır, nedensellik uyarısı görünür", async ({ page }, testInfo) => {
    await page.goto("/donemler?karsilastir=milli-mucadele,tbmm-kurulusu");
    await expect(page.getByLabel("Dönem karşılaştırması")).toBeVisible();
    await expect(page.getByText(/nesnel sayımıdır; dönemler arası tarihsel nedensellik iddiası içermez/)).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(overflow).toBe(false);

    if (testInfo.project.name === "desktop-1536x1024" || testInfo.project.name === "mobile-320x568") {
      const shotPath = path.join(screenshotsDir, `v08-periods-compare-${testInfo.project.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
    }
  });

  test("tek dönemle karşılaştırma dürüst uyarı verir", async ({ page }) => {
    await page.goto("/donemler?karsilastir=milli-mucadele");
    await expect(page.getByRole("status").filter({ hasText: "ikinci bir dönem gerekli" })).toBeVisible();
  });

  test("erişilebilirlik: şerit klavyeyle gezilebilir", async ({ page }) => {
    await page.goto("/donemler");
    await page.getByRole("tab").first().focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tab").nth(1)).toBeFocused();
  });
});
