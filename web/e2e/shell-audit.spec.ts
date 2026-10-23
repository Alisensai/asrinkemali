import { expect, test } from "@playwright/test";
import path from "node:path";

test("site kabuğu, 15px taşma olmaması ve sıfır taşma denetimi", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const dimensions = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.bodyScrollWidth, "Body scrollWidth viewport'tan büyük olamaz (15px taşma kontrolü)").toBeLessThanOrEqual(
    dimensions.viewportWidth
  );
  expect(dimensions.docScrollWidth, "Document scrollWidth viewport'tan büyük olamaz").toBeLessThanOrEqual(
    dimensions.viewportWidth
  );
});

test("320px ekranda marka logosu, metni ve başlık düğmeleri çakışmaz", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const rects = await page.evaluate(() => {
    const identity = document.querySelector(".identity");
    const actions = document.querySelector(".masthead-actions");
    const crest = document.querySelector(".identity-crest");
    const name = document.querySelector(".identity-name");
    const searchBtn = document.querySelector(".header-search");
    const museumBtn = document.querySelector(".museum-button");

    if (!identity || !actions) return null;

    const iRect = identity.getBoundingClientRect();
    const aRect = actions.getBoundingClientRect();
    const cRect = crest ? crest.getBoundingClientRect() : null;
    const nRect = name ? name.getBoundingClientRect() : null;
    const sRect = searchBtn ? searchBtn.getBoundingClientRect() : null;
    const mRect = museumBtn ? museumBtn.getBoundingClientRect() : null;

    return {
      identityRight: iRect.right,
      actionsLeft: aRect.left,
      clearance: aRect.left - iRect.right,
      crestWidth: cRect?.width ?? 0,
      nameWidth: nRect?.width ?? 0,
      searchHeight: sRect?.height ?? 0,
      museumHeight: mRect?.height ?? 0,
    };
  });

  expect(rects, "Masthead öğeleri bulunamadı").not.toBeNull();
  if (rects) {
    expect(rects.clearance, `Marka metni ve butonlar çakışmamalıdır (Aralık: ${rects.clearance}px)`).toBeGreaterThanOrEqual(2);
    expect(rects.searchHeight, "Arama butonu dokunma hedefi en az 40px olmalıdır").toBeGreaterThanOrEqual(40);
    expect(rects.museumHeight, "Müze butonu dokunma hedefi en az 40px olmalıdır").toBeGreaterThanOrEqual(40);
  }
});

test("mobil menü açılışında odak tuzağı ve Escape ile butona dönüş", async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0;
  if (width > 960) return;

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const menuButton = page.getByRole("button", { name: "MENÜ" });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");

  // Menüyü aç
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", { name: "HAKKIMIZDA", exact: true })).toBeVisible();

  // Escape tuşuna basıldığında menü kapanmalı ve odak toggle butonuna geri dönmeli
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();

  // Menüyü tekrar aç ve Tab tuşu ile odak döngüsünü sına
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  const firstLink = page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", { name: "ANA SAYFA", exact: true });
  await expect(firstLink).toBeFocused();

  // Escape ile kapat
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});

test("yüksek kontrast ve tam sayfa kabuk ekran görüntüsü", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const width = page.viewportSize()?.width ?? 0;
  if (width > 620) {
    const a11yButton = page.getByRole("button", { name: /Erişilebilirlik/ });
    await expect(a11yButton).toBeVisible();
    await a11yButton.click();
    const hasClass = await page.evaluate(() => document.body.classList.contains("high-contrast"));
    expect(hasClass).toBe(true);
    await a11yButton.click();
  }

  const screenshotPath = path.resolve(
    testInfo.config.rootDir,
    "..",
    "..",
    "docs",
    "screenshots",
    `v06-shell-${testInfo.project.name}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
});
