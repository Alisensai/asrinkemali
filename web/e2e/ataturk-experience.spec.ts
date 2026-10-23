import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

async function openExperience(page: Page) {
  await page.goto("/ataturk");
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; return document.fonts.ready; });
}

function screenshotPath(rootDir: string, name: string) { return path.resolve(rootDir, "..", "..", "docs", "screenshots", name); }

test("sinematik giriş, dürüst görsel etiketi ve taşmasız yerleşim", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const notFound: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400 && response.url().startsWith(new URL(page.url() || "http://127.0.0.1").origin)) notFound.push(`${response.status()} ${response.url()}`); });

  await openExperience(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ATATÜRK");
  await expect(page.getByText("Kapak görseli: yapay zekâ ile hazırlanmış temsilî canlandırma; tarihî fotoğraf değildir.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Dönemlere geç" }).getByRole("link")).toHaveCount(6);
  await expect(page.getByRole("figure").getByText("Onuncu Yıl Nutku", { exact: false }).first()).toBeVisible();
  await expectNoOverflow(page);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-hero-${testInfo.project.name}.png`) });

  await page.locator("#yolculuk").evaluate((element) => element.scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-journey-${testInfo.project.name}.png`) });
  await expectNoOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
  expect(notFound, notFound.join("\n")).toEqual([]);
});

test("320px en dar genişlikte taşma yok ve denetimler ekranda kalır", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-360x800", "320px denetimi tek projede çalışır");
  await page.setViewportSize({ width: 320, height: 720 });
  await openExperience(page);
  await expectNoOverflow(page);
  for (const selector of ["#sergi-tema", "h1", "#yolculuk h2", "#kapsam h2"]) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box, selector).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? 0), selector).toBeLessThanOrEqual(320);
  }
  await page.waitForTimeout(2200);
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, "v06-ataturk-hero-mobile-320x720.png") });
});

test("yıl rayı fare ve klavyeyle yıllar arasında gezdirir", async ({ page }) => {
  await openExperience(page);
  const rail = page.getByRole("navigation", { name: "Yıllar arasında gezin" });
  await rail.getByRole("button", { name: "1923 8 kayıt" }).click();
  await expect(page.locator("#yil-1923")).toBeFocused();
  await expect(rail.getByRole("button", { name: /^1923 / })).toHaveAttribute("aria-current", "true");

  const first = rail.getByRole("button", { name: /^1919 / });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rail.getByRole("button", { name: /^1920 / })).toBeFocused();
  await page.keyboard.press("End");
  await expect(rail.getByRole("button").last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#yil-1919")).toBeFocused();
  await expect(rail.getByText("1929: yayımlanmış kayıt yok")).toHaveCount(1);
  await expect(rail.getByText("1929", { exact: true })).toBeVisible();
});

test("olay paneli kaynak kurumu, belge bağlantısını ve tarihi gösterir", async ({ page }) => {
  await openExperience(page);
  const event = page.locator("#olay-tbmm-acilisi-1920");
  const toggle = event.getByRole("button", { name: "Kaynak ve ayrıntılar" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(event.getByRole("button", { name: "Bilgi panelini kapat" })).toHaveAttribute("aria-expanded", "true");
  const panel = event.locator("#panel-tbmm-acilisi-1920");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Kaynak kurum", { exact: true })).toBeVisible();
  await expect(panel.locator("time")).toHaveAttribute("datetime", "1920-04-23");
  const external = panel.getByRole("link", { name: /Kurumsal kaynağa git/ });
  await expect(external).toHaveAttribute("href", /^https:\/\//);
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", /noopener/);
  await expect(panel.getByRole("link", { name: "Arşiv kaydını aç" })).toHaveAttribute("href", "/arsiv/tbmm-acilisi-1920");
  await expect(panel.getByText(/insan tarihçi onayı değildir|İnsan tarih editörü onayı/).first()).toBeVisible();

  const related = panel.getByRole("button", { name: /TBMM'nin Açılış Fotoğrafı/ });
  await related.click();
  await expect(page.locator("#panel-tbmm-acilis-fotografi-1920")).toBeVisible();
  await expect(page.locator("#panel-tbmm-acilis-fotografi-1920").getByText(/gösterilmez/)).toBeVisible();
});

test("tema kartı sergiyi süzer; kaydı olmayan tema kapalıdır", async ({ page }) => {
  await openExperience(page);
  await expect(page.getByRole("button", { name: /Çocukluğu ve öğrenim hayatı/ })).toBeDisabled();
  await page.getByRole("button", { name: /^Millî Mücadele/ }).click();
  await expect(page.locator("#sergi").getByRole("heading", { name: "Millî Mücadele", level: 3 })).toBeFocused();
  await expect(page.locator("#sergi-tema")).toHaveValue("milli-mucadele");
  await expect(page.getByRole("status").filter({ hasText: "kayıt bulundu" })).toContainText("17 kayıt bulundu");
});

test("sergi türe göre süzülür, künye diyaloğu klavyeyle kapanır", async ({ page }, testInfo) => {
  await openExperience(page);
  const filters = page.getByRole("group", { name: "Kayıt türüne göre süz" });
  await filters.getByRole("button", { name: /^Fotoğraf/ }).click();
  await expect(filters.getByRole("button", { name: /^Fotoğraf/ })).toHaveAttribute("aria-pressed", "true");
  const cards = page.locator("#sergi article");
  await expect(cards).toHaveCount(8);
  for (const badge of await cards.locator("[data-type]").filter({ hasText: /^(Fotoğraf|Belge|Olay|Yayın|Konuşma|Mekân)$/ }).allTextContents()) expect(badge).toBe("Fotoğraf");
  await expect(page.locator("#sergi img")).toHaveCount(0);

  await page.locator("#sergi").evaluate((element) => element.scrollIntoView());
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-exhibit-${testInfo.project.name}.png`) });

  const trigger = cards.first().getByRole("button", { name: /Künye ve kaynak/ });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  await expect(dialog.getByText("Kullanım hakkı", { exact: true })).toBeVisible();
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-dialog-${testInfo.project.name}.png`) });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await filters.getByRole("button", { name: /^Tümü/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "kayıt bulundu" })).toContainText("62 kayıt bulundu, 12 tanesi gösteriliyor");
  await page.getByRole("button", { name: /Daha fazla kayıt göster/ }).click();
  await expect(cards).toHaveCount(24);
});

test("taslak ve incelemedeki kayıtlar görünmez", async ({ page }) => {
  await openExperience(page);
  await expect(page.locator("#olay-selanikteki-ataturk-evi")).toHaveCount(0);
  await expect(page.locator("#olay-ii-inonu-zaferi-fotografi-1921")).toHaveCount(0);
  await expect(page.locator("#olay-vatandas-icin-medeni-bilgiler-1930")).toHaveCount(0);
});

test("iç bağlantılar kırık değil, dış bağlantılar güvenli", async ({ page, request }) => {
  await openExperience(page);
  const hrefs = await page.locator("main a[href]").evaluateAll((links) => links.map((link) => ({ href: link.getAttribute("href") ?? "", target: link.getAttribute("target"), rel: link.getAttribute("rel") ?? "" })));
  const internal = [...new Set(hrefs.map((link) => link.href).filter((href) => href.startsWith("/")))];
  expect(internal.length).toBeGreaterThan(0);
  for (const href of internal) expect((await request.get(href)).status(), href).toBe(200);
  const anchors = [...new Set(hrefs.map((link) => link.href).filter((href) => href.startsWith("#")))];
  for (const anchor of anchors) await expect(page.locator(anchor), anchor).toHaveCount(1);
  for (const link of hrefs.filter((item) => /^https?:/.test(item.href))) {
    expect(link.href).toMatch(/^https:\/\//);
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
  }
});

test("hareket azaltma tercihinde animasyonlar kapanır", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExperience(page);
  const animation = await page.locator("h1 span").last().evaluate((element) => getComputedStyle(element).animationName);
  expect(animation).toBe("none");
  const transition = await page.locator("#sergi button").first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transition).toMatch(/^0s/);
});

test("erişilebilirlik: axe ciddi/kritik ihlal yok", async ({ page }) => {
  // Kök pakette (Kilo QA) kurulu; web paketi bağımlılığı değildir. Yoksa test atlanır.
  const specifier = "@axe-core/playwright";
  const axe = await import(specifier).catch(() => null);
  test.skip(!axe, "@axe-core/playwright kurulu değil");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExperience(page);
  await page.locator("#olay-samsun-cikarmasi-1919").getByRole("button", { name: "Kaynak ve ayrıntılar" }).click();
  const results = await new axe.default({ page }).include("main").analyze();
  const serious = results.violations.filter((violation: { impact?: string }) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious.map((violation: { id: string; nodes: { target: unknown }[] }) => `${violation.id}: ${JSON.stringify(violation.nodes.slice(0, 3).map((node) => node.target))}`)).toEqual([]);
});
