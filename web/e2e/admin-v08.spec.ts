import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const protectedRoutes = [
  "/yonetim",
  "/yonetim/arsiv",
  "/yonetim/incelemeler",
  "/yonetim/yayinlar",
  "/yonetim/makaleler",
  "/yonetim/takvim",
  "/yonetim/tarihte-bugun",
  "/yonetim/kaynaklar",
  "/yonetim/kullanicilar",
  "/yonetim/denetim",
  "/yonetim/sistem",
];

test("admin routes remain fail-closed without a trusted identity provider", async ({ page }) => {
  for (const route of protectedRoutes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading", { name: "Yönetim paneli erişime kapalı" })).toBeVisible();
    await expect(page.getByText(/güvenilir bir sunucu tarafı kimlik sağlayıcısı/)).toBeVisible();
    await expect(page.getByText(/onay işlemi üretim ortamında etkin değildir/)).toBeVisible();
  }
});

test("admin access-denied page fits the requested mobile and desktop widths", async ({ page }, testInfo) => {
  const screenshotDirectory = path.resolve(process.cwd(), "..", "docs", "admin-v08", "screenshots");
  if (testInfo.project.name === "desktop-1536x1024") mkdirSync(screenshotDirectory, { recursive: true });
  for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/yonetim");
    await expect(page.getByRole("heading", { name: "Yönetim paneli erişime kapalı" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${width}px horizontal overflow`).toBeLessThanOrEqual(2);
    if (testInfo.project.name === "desktop-1536x1024" && [360, 1536].includes(width)) {
      await page.screenshot({ path: path.join(screenshotDirectory, `access-denied-${width}px.png`), fullPage: true });
    }
  }
});
