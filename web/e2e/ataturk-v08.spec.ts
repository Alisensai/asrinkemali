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

test.describe("MKA V0.8 Atatürk Life Experience Suite", () => {
  test("Atatürk yaşam deneyimi (/ataturk) sıfır yatay taşma ve temel vitrin görünürlüğü", async ({ page }, testInfo) => {
    await page.goto("/ataturk");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // 1. Sıfır taşma doğrulaması
    await checkNoOverflow(page);

    // 2. Temel başlık ve yapay zekâ şeffaflık açıklaması
    await expect(page.locator("h1")).toContainText("ATATÜRK");
    await expect(
      page.locator("text=Kapak görseli: yapay zekâ ile hazırlanmış temsilî canlandırma; tarihî fotoğraf değildir.")
    ).toBeVisible();

    // 3. Bölüm navigasyonu ve alıntı
    await expect(page.locator('nav[aria-label="Atatürk deneyimi bölümleri"]')).toBeVisible();

    // 4. Yaşam yolculuğu ve yıl rayı
    await expect(page.locator("#yolculuk")).toBeVisible();
    await expect(page.locator('nav[aria-label="Yıllar arasında gezin"]')).toBeVisible();

    // 5. Ekran görüntüleri
    const vpName = testInfo.project.name;
    const screenshotPath = path.join(screenshotsDir, `v08-ataturk-${vpName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test("320px mobilde denetimler ekranda kalır ve taşma olmaz", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile-320x568") return;

    await page.goto("/ataturk");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    await checkNoOverflow(page);

    // Başlıkların ve rayın ekranda kaldığını doğrula
    const rail = page.locator('nav[aria-label="Yıllar arasında gezin"]');
    await expect(rail).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, "v08-ataturk-mobile-320x568-detail.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test("Yıl rayı gezinimi ve odaklanma", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-1536x1024") return;

    await page.goto("/ataturk");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    const rail = page.locator('nav[aria-label="Yıllar arasında gezin"]');
    const buttons = rail.locator("button");
    await expect(buttons.first()).toBeVisible();

    // Klavye gezintisi testi
    await buttons.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(buttons.nth(1)).toBeFocused();

    const screenshotPath = path.join(screenshotsDir, "v08-ataturk-rail-1536x1024.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test("Temalar ve dijital sergi salonu", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-1536x1024") return;

    await page.goto("/ataturk");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator("#temalar")).toBeVisible();
    await expect(page.locator("#sergi")).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, "v08-ataturk-exhibit-1536x1024.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });
});
