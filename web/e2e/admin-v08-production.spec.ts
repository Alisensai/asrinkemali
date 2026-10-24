import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/yonetim",
  "/yonetim/arsiv",
  "/yonetim/arsiv/1924-anayasasi",
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

test("production admin routes return a non-disclosing 404 without a trusted provider", async ({ request }) => {
  for (const route of protectedRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
    const body = await response.text();
    expect(body, route).toContain("Sayfa bulunamadı");
    expect(body, route).not.toContain("Arşiv Yönetimi");
    expect(body, route).not.toContain("1924 Anayasası");
    expect(body, route).not.toContain("system_admin");
  }
});

test("production admin route ignores role headers, browser storage, query parameters and Basic auth", async ({ page }) => {
  await page.setExtraHTTPHeaders({
    "x-admin-role": "system_admin",
    authorization: "Basic ZGVtbzpkZW1v",
  });
  await page.addInitScript(() => {
    localStorage.setItem("role", "system_admin");
    localStorage.setItem("admin", "true");
  });
  const response = await page.goto("/yonetim?role=system_admin&token=demo");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  await expect(page.getByText("Arşiv Yönetimi")).toHaveCount(0);
});
