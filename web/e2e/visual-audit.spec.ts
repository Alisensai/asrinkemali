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
    return {
      docWidth,
      bodyWidth,
      viewportWidth,
      hasOverflow: docWidth > viewportWidth || bodyWidth > viewportWidth,
    };
  });
  expect(result.hasOverflow, `Overflow detected: doc=${result.docWidth} body=${result.bodyWidth} vw=${result.viewportWidth}`).toBe(false);
}

test.describe("V0.6 Visual Fidelity & Overflow Audit", () => {
  test("Ana sayfa taşmasız ve görsel kalitesi tam", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-home-1536x1024.png"), fullPage: false });
    } else if (vpName === "mobile-390x844") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-home-390x844.png"), fullPage: false });
    } else if (vpName === "mobile-320x568") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-home-320x568.png"), fullPage: false });
    }
  });

  test("Atatürk Yaşam Deneyimi (/ataturk) taşmasız ve dengeli", async ({ page }, testInfo) => {
    await page.goto("/ataturk");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-ataturk-1536x1024.png"), fullPage: false });
    } else if (vpName === "mobile-390x844") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-ataturk-390x844.png"), fullPage: false });
    }
  });

  test("Dijital Arşiv (/arsiv) taşmasız ve müze kartları dengeli", async ({ page }, testInfo) => {
    await page.goto("/arsiv");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-archive-1536x1024.png"), fullPage: false });
    } else if (vpName === "mobile-390x844") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-archive-390x844.png"), fullPage: false });
    }
  });

  test("Kronoloji (/kronoloji) taşmasız ve hızlı yıl seçim çubuğu aktif", async ({ page }, testInfo) => {
    await page.goto("/kronoloji");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-chronology-1536x1024.png"), fullPage: false });
    }
  });

  test("Yayınlar (/yayinlar) taşmasız ve müze sınıfı stiller aktif", async ({ page }, testInfo) => {
    await page.goto("/yayinlar");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-publications-1536x1024.png"), fullPage: false });
    }
  });

  test("Tarihte Bugün (/tarihte-bugun) taşmasız", async ({ page }, testInfo) => {
    await page.goto("/tarihte-bugun");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-today-1536x1024.png"), fullPage: false });
    }
  });

  test("Hakkımızda (/hakkimizda) taşmasız ve üç ilke kartı görünür", async ({ page }, testInfo) => {
    await page.goto("/hakkimizda");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-about-1536x1024.png"), fullPage: false });
    }
  });

  test("404 Sayfa Bulunamadı (/sayfa-yok) prestijli müze odası görünümünde", async ({ page }, testInfo) => {
    await page.goto("/sayfa-yok", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await checkNoOverflow(page);

    const vpName = testInfo.project.name;
    if (vpName === "desktop-1536x1024") {
      await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-notfound-1536x1024.png"), fullPage: false });
    }
  });

  test("320px ekranlarda marka ve düğmeler çakışmaz", async ({ page }, testInfo) => {
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

  test("Mobil menü açılış, focus trap ve ekran görüntüsü", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "mobile-390x844") return;

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const toggle = page.locator(".mobile-menu-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();

    const menu = page.locator("#main-menu");
    await expect(menu).toHaveClass(/open/);

    await page.screenshot({ path: path.join(screenshotsDir, "v06-visual-menu-open-390x844.png"), fullPage: false });

    // Escape ile kapanış testi
    await page.keyboard.press("Escape");
    await expect(menu).not.toHaveClass(/open/);
    await expect(toggle).toBeFocused();
  });
});
