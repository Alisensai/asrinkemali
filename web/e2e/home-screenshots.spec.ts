import { test } from "@playwright/test";
import path from "node:path";

test("v06 tam sayfa ekran goruntusu", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const screenshotPath = path.resolve(testInfo.config.rootDir, "..", "..", "docs", "screenshots", `v06-home-${testInfo.project.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
});
