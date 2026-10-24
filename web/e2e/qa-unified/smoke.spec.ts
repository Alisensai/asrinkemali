import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type ManifestRoute = { path: string; source: string; moduleId: string };
const manifestPath = path.resolve(process.cwd(), "..", "tools", "qa-unified", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { routes: ManifestRoute[] };
const rootPath = path.resolve(process.cwd(), "..");
const routes = manifest.routes.filter((route) => fs.existsSync(path.join(rootPath, route.source)));

for (const route of routes) {
  test(`route ${route.path} returns a public response`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto(route.path, { waitUntil: "load" });
    expect(response?.status(), `${route.path} response`).toBe(200);
    expect(errors, `${route.path} browser errors`).toEqual([]);

    if (route.path === "/api/health-integration") {
      const body = await response?.json();
      expect(body).toMatchObject({ humanExpertReviewComplete: false });
      expect(JSON.stringify(body)).not.toMatch(/(?:token|secret|password|api[_-]?key)/i);
    }
  });
}

for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440, 1536]) {
  test(`responsive overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    const response = await page.goto("/", { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowingElements: Array.from(document.querySelectorAll("body *"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.right > window.innerWidth + 2 || rect.left < -2);
        })
        .slice(0, 10)
        .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}.${Array.from(element.classList).slice(0, 2).join(".")}`),
    }));
    expect(dimensions.scrollWidth, `overflowing elements: ${dimensions.overflowingElements.join(", ")}`)
      .toBeLessThanOrEqual(dimensions.viewportWidth + 2);
    if ([360, 1440].includes(width) && process.env.ASRIN_QA_SCREENSHOTS) {
      const screenshot = path.join(process.env.ASRIN_QA_SCREENSHOTS, `home-${process.env.ASRIN_QA_EXECUTION_ID}-${process.env.ASRIN_QA_BROWSER}-${width}px.png`);
      fs.mkdirSync(path.dirname(screenshot), { recursive: true });
      await page.screenshot({ path: screenshot, fullPage: true });
    }
  });
}
