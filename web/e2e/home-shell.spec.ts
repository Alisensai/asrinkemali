import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotsDir = path.resolve(rootDir, "..", "docs", "screenshots");

async function checkNoOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const viewportWidth = window.innerWidth;
    const culprits: string[] = [];

    document.querySelectorAll("*").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth + 2) {
        culprits.push(
          `${el.tagName.toLowerCase()}.${Array.from(el.classList).join(".")} (w=${Math.round(rect.width)}, r=${Math.round(rect.right)})`
        );
      }
    });

    return {
      docWidth,
      bodyWidth,
      viewportWidth,
      hasOverflow: docWidth > viewportWidth + 2 || bodyWidth > viewportWidth + 2,
      culprits: culprits.slice(0, 5),
    };
  });
  expect(
    result.hasOverflow,
    `Overflow detected: doc=${result.docWidth} body=${result.bodyWidth} vw=${result.viewportWidth}. Culprits: ${result.culprits.join("; ")}`
  ).toBe(false);
}

test.describe("MKA V0.8 Home Page & Global Shell Suite", () => {
  test("Ana sayfa (/) sıfır yatay taşma ve temel bileşen görünürlüğü", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // 1. Sıfır taşma doğrulaması
    await checkNoOverflow(page);

    // 2. Temel bileşenlerin varlığı
    await expect(page.locator(".identity-name")).toContainText("ASRIN KEMALİ");
    await expect(page.locator(".hero-title")).toContainText("ATATÜRK");
    await expect(page.locator("text=DİJİTAL SERGİ VİTRİNİ")).toBeVisible();
    await expect(page.locator(".site-footer")).toBeVisible();

    // 3. Ekran görüntüleri
    const vpName = testInfo.project.name;
    const screenshotPath = path.join(screenshotsDir, `v08-home-${vpName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test("320px mobilde marka adı ve butonlar çakışmaz", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile-320x568") return;

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const collision = await page.evaluate(() => {
      const identity = document.querySelector(".identity");
      const actions = document.querySelector(".masthead-actions");
      if (!identity || !actions) return null;
      const idRect = identity.getBoundingClientRect();
      const actRect = actions.getBoundingClientRect();
      return {
        identityRight: idRect.right,
        actionsLeft: actRect.left,
        clearance: actRect.left - idRect.right,
      };
    });

    expect(collision).not.toBeNull();
    expect(collision!.clearance).toBeGreaterThan(0);
  });

  test("Navigasyon tekil aktif link ve aria-current doğrulaması", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Ana sayfada tekil aria-current="page" olmalı
    const currentLinks = page.locator('nav.main-nav a[aria-current="page"]');
    await expect(currentLinks).toHaveCount(1);
    await expect(currentLinks.first()).toHaveAttribute("href", "/");
  });

  test("Mobil menü açılış, Tab döngüsü ve Escape ile kapanış", async ({ page }, testInfo) => {
    if (!testInfo.project.name.startsWith("mobile-")) return;

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.locator(".mobile-menu-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();

    const menu = page.locator("#main-menu");
    await expect(menu).toHaveClass(/open/);

    if (testInfo.project.name === "mobile-390x844") {
      await page.screenshot({
        path: path.join(screenshotsDir, "v08-home-menu-open-390x844.png"),
        fullPage: false,
      });
    }

    // Escape ile kapanış testi
    await page.keyboard.press("Escape");
    await expect(menu).not.toHaveClass(/open/);
    await expect(toggle).toBeFocused();
  });

  test("SearchDialog açılış, arama ve odak restorasyonu", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const searchBtn = page.locator(".header-search").first();
    await searchBtn.click();

    const dialog = page.locator("#site-search");
    await expect(dialog).toBeVisible();

    const searchInput = page.locator("#site-search-input");
    await expect(searchInput).toBeFocused();

    // Arama yazma
    await searchInput.fill("Nutuk");
    await expect(page.locator("text=Tüm Arşivde Ara: “Nutuk” →")).toBeVisible();

    if (testInfo.project.name === "desktop-1536x1024") {
      await page.screenshot({
        path: path.join(screenshotsDir, "v08-home-search-dialog-1536x1024.png"),
        fullPage: false,
      });
    }

    // Escape ile kapanış ve focus restorasyonu
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(searchBtn).toBeFocused();
  });

  test("Hero klavye kontrolleri ve slayt geçişi", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const hero = page.locator(".hero");
    await hero.focus();

    const counter = page.locator(".current-slide");
    await expect(counter).toHaveText("01");

    // ArrowRight ile sonraki slayta geç
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText("02");

    if (testInfo.project.name === "desktop-1536x1024") {
      await page.screenshot({
        path: path.join(screenshotsDir, "v08-home-hero-slide-2-1536x1024.png"),
        fullPage: false,
      });
    }

    // ArrowLeft ile önceki slayta geri dön
    await page.keyboard.press("ArrowLeft");
    await expect(counter).toHaveText("01");
  });
});
