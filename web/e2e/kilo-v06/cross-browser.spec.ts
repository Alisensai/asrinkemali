import { expect, test, devices } from "@playwright/test";

const routes = [
  { path: "/", name: "anasayfa" },
  { path: "/arsiv", name: "arsiv" },
  { path: "/arsiv/cumhuriyetin-ilani-1923", name: "arsiv-detay" },
  { path: "/kronoloji", name: "kronoloji" },
  { path: "/yayinlar", name: "yayinlar" },
  { path: "/hakkimizda", name: "hakkimizda" },
];

for (const route of routes) {
  test(`cross-browser: ${route.name} yukleme ve temel kontroller`, async ({ page, browserName }) => {
    const errors = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(err.message));
    
    const resp = await page.goto(route.path);
    expect(resp?.ok(), `${route.path} on ${browserName}`).toBeTruthy();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    
    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth, `overflow on ${route.path} ${browserName}`).toBeLessThanOrEqual(viewportWidth + 2);
    
    expect(errors, `errors on ${route.path} ${browserName}: ${errors.join("\n")}`).toEqual([]);
  });
}
