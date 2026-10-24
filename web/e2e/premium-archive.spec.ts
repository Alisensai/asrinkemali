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

test.describe("MKA V0.8 Premium Digital Archive Suite", () => {
  test("Arşiv kataloğu (/arsiv) sıfır yatay taşma ve temel vitrin görünürlüğü", async ({ page }, testInfo) => {
    await page.goto("/arsiv");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // 1. Sıfır taşma doğrulaması
    await checkNoOverflow(page);

    // 2. Temel bileşenlerin varlığı
    await expect(page.locator("h1")).toContainText("ARŞİV");
    await expect(page.locator('main form[action="/arsiv"]')).toBeVisible();
    await expect(page.locator('main input[name="q"]')).toBeVisible();
    await expect(page.locator('main button[type="submit"]')).toContainText("Arşivde ara");

    // 3. Arşiv kartları listesi
    const cards = page.locator("ul li a");
    await expect(cards.first()).toBeVisible();

    // 4. Ekran görüntüleri
    const vpName = testInfo.project.name;
    const screenshotPath = path.join(screenshotsDir, `v08-archive-${vpName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test("Türkçe arama ve filtreleme çalışır", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-1536x1024") return;

    await page.goto("/arsiv?q=Nutuk");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // Sonuç kontrolü
    await expect(page.locator("text=sonuç")).toBeVisible();
    const nutukCards = page.locator("text=Nutuk");
    await expect(nutukCards.first()).toBeVisible();
  });

  test("Boş sonuç durumunda EmptyState ve filtre sıfırlama görünür", async ({ page }, testInfo) => {
    await page.goto("/arsiv?q=gecersiz-kayit-kelimesi-xyz-12345");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // Boş durum başlığı ve sıfırla butonu
    await expect(page.locator("text=Aramanızla eşleşen yayımlanabilir kayıt bulunmuyor.")).toBeVisible();
    await expect(page.locator("text=Filtreleri temizle").first()).toBeVisible();

    if (testInfo.project.name === "desktop-1536x1024") {
      const screenshotPath = path.join(screenshotsDir, "v08-archive-empty-state-1536x1024.png");
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }
  });

  test("Kayıt detayı (/arsiv/[slug]) sıfır yatay taşma ve künye görünürlüğü", async ({ page }, testInfo) => {
    await page.goto("/arsiv/1924-anayasasi");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // Sıfır taşma kontrolü
    await checkNoOverflow(page);

    // Geriye dön linki ve başlık
    await expect(page.locator("text=Dijital Arşive Dön")).toBeVisible();
    await expect(page.locator("h1")).toContainText("1924 Anayasası");

    // Dossier künyesi
    await expect(page.locator("text=Katalog Künyesi")).toBeVisible();
    await expect(page.locator("text=Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)").first()).toBeVisible();

    // Medyasız kayıtta MuseumPlaque görünürlüğü
    await expect(page.locator("text=Mustafa Kemal Atatürk Dijital Miras Envanteri")).toBeVisible();

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({
        path: path.join(screenshotsDir, "v08-archive-detail-1536x1024.png"),
        fullPage: false,
      });
      await page.screenshot({
        path: path.join(screenshotsDir, "v08-archive-plaque-1536x1024.png"),
        fullPage: false,
      });
    } else if (vpName === "mobile-390x844") {
      await page.screenshot({
        path: path.join(screenshotsDir, "v08-archive-detail-mobile-390x844.png"),
        fullPage: false,
      });
    }
  });
});
