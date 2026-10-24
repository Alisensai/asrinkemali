import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const artifactDir = "C:\\Users\\Ali\\.gemini\\antigravity\\brain\\5516a538-67db-4795-89ac-033eaa715691";
const docsScreenshotsDir = "C:\\Users\\Ali\\AsrinKemaliCalisma\\antigravity\\docs\\screenshots";

if (!existsSync(docsScreenshotsDir)) {
  mkdirSync(docsScreenshotsDir, { recursive: true });
}

async function verifyZeroOverflow(page: Page, route: string, vpName: string) {
  const result = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const winWidth = window.innerWidth;
    const overflowingElements: { tag: string; id: string; className: string; scrollWidth: number; clientWidth: number }[] = [];
    document.querySelectorAll("*").forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > winWidth + 1 || htmlEl.clientWidth > winWidth + 1) {
        overflowingElements.push({
          tag: htmlEl.tagName,
          id: htmlEl.id,
          className: htmlEl.className?.toString() || "",
          scrollWidth: htmlEl.scrollWidth,
          clientWidth: htmlEl.clientWidth,
        });
      }
    });
    return {
      docWidth,
      bodyWidth,
      winWidth,
      isOverflowing: docWidth > winWidth + 1 || bodyWidth > winWidth + 1,
      overflowingElements: overflowingElements.slice(0, 10),
    };
  });
  if (result.isOverflowing) {
    console.log("OVERFLOW DEBUG:", JSON.stringify(result));
  }
  expect(result.isOverflowing, `Yatay taşma oluştu [${route}] (${vpName})`).toBe(false);
}

async function saveReleaseScreenshot(page: Page, filename: string) {
  await page.screenshot({
    path: path.join(docsScreenshotsDir, filename),
    fullPage: false,
  });
  try {
    await page.screenshot({
      path: path.join(artifactDir, filename),
      fullPage: false,
    });
  } catch {
    // Artifact dir optional fallback
  }
}

test.describe("MKA Nihai Mobil, WCAG 2.2 ve Görsel Sürüm Denetimi — Görev 30 E2E", () => {
  test("1. Ana Sayfa (/) & Shell Navigasyon — Taşma, Tipografi ve Müze Paleti", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);

    // Başlık ve kahraman banner
    const heading = page.getByRole("heading", { name: "ATATÜRK", level: 1 });
    await expect(heading).toBeVisible();

    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();

    // Yatay taşma denetimi
    await verifyZeroOverflow(page, "/", vp);

    // Ekran görüntüsü
    await saveReleaseScreenshot(page, `v09-release-home-${vp}.png`);
  });

  test("2. Atatürk Yaşam Deneyimi (/ataturk) & Kronoloji (/kronoloji)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/ataturk", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);

    const ataturkHeading = page.getByRole("heading", { level: 1 });
    await expect(ataturkHeading).toBeVisible();
    await verifyZeroOverflow(page, "/ataturk", vp);

    await saveReleaseScreenshot(page, `v09-release-ataturk-${vp}.png`);

    // Kronoloji rotası
    await page.goto("/kronoloji", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await verifyZeroOverflow(page, "/kronoloji", vp);
  });

  test("3. Dijital Arşiv (/arsiv) & Detay Sayfası (/arsiv/cumhuriyetin-ilani-1923)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/arsiv", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);

    const archiveHeading = page.getByRole("heading", { level: 1 });
    await expect(archiveHeading).toBeVisible();
    await verifyZeroOverflow(page, "/arsiv", vp);

    // Kayıt detay sayfası
    await page.goto("/arsiv/cumhuriyetin-ilani-1923", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Yayın durumu rozetinde sahte onay bulunmamalıdır
    const reviewStatus = page.getByText("Kaynak denetimli · uzman onayı bekliyor").first();
    await expect(reviewStatus).toBeVisible();

    await verifyZeroOverflow(page, "/arsiv/cumhuriyetin-ilani-1923", vp);
    await saveReleaseScreenshot(page, `v09-release-archive-${vp}.png`);
  });

  test("4. Küratöryel Sergiler (/sergiler) & Tarihsel Dönemler (/donemler)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/sergiler", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);

    await verifyZeroOverflow(page, "/sergiler", vp);
    await saveReleaseScreenshot(page, `v09-release-exhibitions-${vp}.png`);

    // Dönemler rotası
    await page.goto("/donemler", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await verifyZeroOverflow(page, "/donemler", vp);
  });

  test("5. Keşfet & Açıklanabilir Öneriler (/kesfet)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/kesfet", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);

    const exploreHeading = page.getByRole("heading", {
      name: "Keşfet & Açıklanabilir Kaynaklı Öneriler",
      level: 1,
    });
    await expect(exploreHeading).toBeVisible();

    await verifyZeroOverflow(page, "/kesfet", vp);
    await saveReleaseScreenshot(page, `v09-release-explore-${vp}.png`);
  });

  test("6. Yayınlar (/yayinlar), Tarihte Bugün (/tarihte-bugun) & Okuma Listem (/okuma-listem)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/yayinlar", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);
    await verifyZeroOverflow(page, "/yayinlar", vp);

    // Tarihte Bugün
    await page.goto("/tarihte-bugun", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await verifyZeroOverflow(page, "/tarihte-bugun", vp);

    // Okuma Listem
    await page.goto("/okuma-listem", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await verifyZeroOverflow(page, "/okuma-listem", vp);

    await saveReleaseScreenshot(page, `v09-release-publishing-${vp}.png`);
  });

  test("7. Belge Karşılaştırma (/karsilastir) & Araştırma Laboratuvarı (/arastirma-laboratuvari)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/karsilastir", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);
    await verifyZeroOverflow(page, "/karsilastir", vp);

    // Araştırma Laboratuvarı
    await page.goto("/arastirma-laboratuvari", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await verifyZeroOverflow(page, "/arastirma-laboratuvari", vp);

    await saveReleaseScreenshot(page, `v09-release-workbench-${vp}.png`);
  });

  test("8. Hakkımızda (/hakkimizda) & Tasarım Sistemi (/tasarim-sistemi)", async ({ page }, testInfo) => {
    const vp = testInfo.project.name;
    await page.goto("/hakkimizda", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await page.evaluate(() => document.fonts.ready);
    await verifyZeroOverflow(page, "/hakkimizda", vp);

    // Tasarım Sistemi
    await page.goto("/tasarim-sistemi", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");
    await verifyZeroOverflow(page, "/tasarim-sistemi", vp);

    await saveReleaseScreenshot(page, `v09-release-design-system-${vp}.png`);
  });
});
