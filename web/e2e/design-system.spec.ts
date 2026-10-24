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
        culprits.push(`${el.tagName.toLowerCase()}.${Array.from(el.classList).join(".")} (w=${Math.round(rect.width)}, r=${Math.round(rect.right)})`);
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

test.describe("MKA V0.8 Design System Visual & Responsive Suite", () => {
  test("Tasarım sistemi kataloğu (/tasarim-sistemi) sıfır yatay taşma ve görsel uyum", async ({ page }, testInfo) => {
    await page.goto("/tasarim-sistemi");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    // 1. Check zero horizontal overflow
    await checkNoOverflow(page);

    // 2. Check essential components are rendered
    await expect(page.locator("h1")).toContainText("Bileşen Sözlüğü ve Token Kataloğu");
    await expect(page.getByRole("button", { name: "Birincil Bordo Buton" })).toBeVisible();
    await expect(page.getByRole("button", { name: "İkincil Altın Kontur" })).toBeVisible();
    await expect(page.locator("text=KAYIT NO: DOC-1919-05-19")).toBeVisible();
    await expect(page.locator("text=Eşleşen Arşiv Kaydı Bulunamadı")).toBeVisible();

    // 3. Capture evidence screenshots for representative viewports
    const vpName = testInfo.project.name;
    const screenshotPath = path.join(screenshotsDir, `v08-16-design-system-${vpName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });

  test("Buton etkileşimleri ve klavye odağı", async ({ page }) => {
    await page.goto("/tasarim-sistemi");
    await page.waitForLoadState("domcontentloaded");

    const primaryBtn = page.getByRole("button", { name: "Birincil Bordo Buton" });
    await primaryBtn.focus();
    await expect(primaryBtn).toBeFocused();

    // Disabled button should not be clickable or focused
    const disabledBtn = page.getByRole("button", { name: "Devre Dışı" });
    await expect(disabledBtn).toBeDisabled();
  });

  test("Form kontrolleri label ve aria-describedby ilişkisi", async ({ page }) => {
    await page.goto("/tasarim-sistemi");
    await page.waitForLoadState("domcontentloaded");

    const queryInput = page.locator("#search-query");
    await expect(queryInput).toHaveAttribute("aria-describedby", "search-query-help");

    const invalidInput = page.locator("#invalid-field");
    await expect(invalidInput).toHaveAttribute("aria-invalid", "true");
    await expect(invalidInput).toHaveAttribute("aria-describedby", "invalid-field-error");
  });
});
