import { expect, test, type Locator, type Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Beklenen sayılar sabit yazılmaz; diskteki arşiv verisinden türetilir (68 ve 168 kayıtlık veriyle çalışır).
type RawRecord = { slug: string; type: string; date: { start: string | null }; verification: { status: string } };
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const allRecords: RawRecord[] = ["content/archive/records", "data/archive/catalog"].flatMap((directory) => { const full = path.join(repoRoot, directory); return existsSync(full) ? readdirSync(full).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(full, name), "utf8")) as RawRecord) : []; });
const published = allRecords.filter((record) => record.verification.status === "published");
const unpublished = allRecords.filter((record) => record.verification.status !== "published");

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

/**
 * Sayfayı açar ve iki istemci bileşeninin hidrasyonunu bekler. React'in sahip olduğu
 * DOM'a (ör. <html style>) yazılmaz: CI'daki ilk hata, hidrasyondan önce <html>'e stil
 * eklenmesinin hidrasyon uyuşmazlığı üretmesiydi.
 */
async function openExperience(page: Page) {
  await page.goto("/ataturk");
  await expect(page.locator("[data-ready='true']")).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
}

async function scrollToTop(locator: Locator) { await locator.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" })); }
async function countFrom(locator: Locator) { return Number((await locator.innerText()).match(/\d+/)?.[0] ?? Number.NaN); }
function screenshotPath(rootDir: string, name: string) { return path.resolve(rootDir, "..", "..", "docs", "screenshots", name); }

test("sinematik giriş, dürüst görsel etiketi, hidrasyon hatasız ve taşmasız yerleşim", async ({ page }, testInfo) => {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" || /hydrat/i.test(message.text())) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { const url = new URL(response.url()); if (response.status() >= 400 && url.origin === new URL(testInfo.project.use.baseURL ?? "http://127.0.0.1").origin) failures.push(`${response.status()} ${response.url()}`); });

  await openExperience(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ATATÜRK");
  await expect(page.getByText("Kapak görseli: yapay zekâ ile hazırlanmış temsilî canlandırma; tarihî fotoğraf değildir.")).toBeVisible();
  const periodSections = await page.locator("#yolculuk section[id^='donem-']").count();
  await expect(page.getByRole("navigation", { name: "Dönemlere geç" }).getByRole("link")).toHaveCount(periodSections);
  await expect(page.locator("dl").filter({ hasText: "Kaynaklı kayıt" }).locator("dd").first()).toHaveText(String(published.length));
  await expectNoOverflow(page);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-hero-${testInfo.project.name}.png`) });

  await scrollToTop(page.locator("#yolculuk"));
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-journey-${testInfo.project.name}.png`) });
  await expectNoOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
  expect(failures, failures.join("\n")).toEqual([]);
});

test("kaynaklı alıntı kurumsal doğrulama etiketini ve kaynak bağlantısını taşır", async ({ page }) => {
  await openExperience(page);
  const figure = page.getByRole("figure");
  await expect(figure.locator("blockquote")).toBeVisible();
  await expect(figure.getByText(/Metin doğrulaması: /)).toBeVisible();
  await expect(figure.getByText(/Metin doğrulaması: [^·]*yapay zek/i)).toHaveCount(0);
  await expect(figure.getByRole("link", { name: /Atatürk Ansiklopedisi/ })).toHaveAttribute("href", /^https:\/\//);
  await expect(figure.getByRole("link", { name: "Arşiv kaydı" })).toHaveAttribute("href", /^\/arsiv\//);
});

test("320px en dar genişlikte taşma yok ve denetimler ekranda kalır", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-360x800", "320px denetimi tek projede çalışır");
  await page.setViewportSize({ width: 320, height: 720 });
  await openExperience(page);
  await expectNoOverflow(page);
  for (const selector of ["#sergi-tema", "h1", "#yolculuk h2", "#kapsam h2", "[aria-label='Yıllar arasında gezin']"]) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box, selector).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? 0), selector).toBeLessThanOrEqual(320);
  }
  await page.waitForTimeout(2200);
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, "v06-ataturk-hero-mobile-320x720.png") });
});

test("yıl rayı fare ve klavyeyle gezdirir; boş yıllar aralık olarak gösterilir", async ({ page }) => {
  await openExperience(page);
  const rail = page.getByRole("navigation", { name: "Yıllar arasında gezin" });
  const buttons = rail.getByRole("button");
  const years = rail.locator("button[data-rail-target^='y-']");
  expect(await years.count()).toBeGreaterThan(1);

  const second = years.nth(1);
  const secondYear = (await second.getAttribute("data-rail-target"))!.slice(2);
  await second.click();
  await expect(page.locator(`#yil-${secondYear}`)).toBeFocused();
  await expect(second).toHaveAttribute("aria-current", "true");

  await buttons.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(buttons.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(buttons.first()).toBeFocused();
  const firstTarget = (await buttons.first().getAttribute("data-rail-target"))!;
  await page.keyboard.press("Enter");
  await expect(page.locator(firstTarget.startsWith("y-") ? `#yil-${firstTarget.slice(2)}` : `#donem-baslik-${firstTarget.slice(2)}`)).toBeFocused();

  // Kayıtsız yıllar odaklanamaz; ekran okuyucu için açıkça "kayıt yok" denir.
  const gaps = rail.locator("li").filter({ hasText: /yayımlanmış kayıt yok/ });
  for (const gap of await gaps.all()) await expect(gap.locator("button")).toHaveCount(0);
  for (const year of await years.allInnerTexts()) expect(year).toMatch(/^\d{4}\s+\d+/);
});

test("1881 öncesi kayıtlar yaşam çizelgesinin dışında ve mekân tarihi notuyla gösterilir", async ({ page }) => {
  await openExperience(page);
  const before = published.filter((record) => record.date.start && record.date.start < "1881");
  await expect(page.locator("#donem-oncesi")).toHaveCount(before.length ? 1 : 0);
  if (before.length) {
    await expect(page.locator("#donem-oncesi")).toContainText("yaşam çizelgesinin dışında");
    await page.getByRole("navigation", { name: "Yıllar arasında gezin" }).getByRole("button", { name: /^1881 öncesi/ }).click();
    await expect(page.locator("#donem-baslik-oncesi")).toBeFocused();
  }
  const place = page.locator("#olay-anitkabir");
  await expect(place.getByText("Mekân tarihi")).toBeVisible();
  await place.getByRole("button", { name: /^Kaynak ve ayrıntılar/ }).click();
  await expect(place.getByText(/Atatürk'ün o tarihte orada bulunduğunu göstermez/)).toBeVisible();
});

test("olay paneli kaynak kurumu, belge bağlantısını ve tarihi gösterir", async ({ page }) => {
  await openExperience(page);
  const event = page.locator("#olay-tbmm-acilisi-1920");
  const toggle = event.getByRole("button", { name: /^Kaynak ve ayrıntılar/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panel = event.locator("#panel-tbmm-acilisi-1920");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Kaynak kurum", { exact: true })).toBeVisible();
  await expect(panel.locator("time")).toHaveAttribute("datetime", "1920-04-23");
  const external = panel.getByRole("link", { name: /Kurumsal kaynağa git/ });
  await expect(external).toHaveAttribute("href", /^https:\/\//);
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", /noopener/);
  await expect(panel.getByRole("link", { name: "Arşiv kaydını aç" })).toHaveAttribute("href", "/arsiv/tbmm-acilisi-1920");
  await expect(panel.getByText("Kaynak denetimli · uzman onayı bekliyor")).toBeVisible();
  await expect(panel.getByText(/insan tarihçi onayı değildir|İnsan tarih editörü onayı/).first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();

  await toggle.click();
  await panel.getByRole("button", { name: /TBMM'nin Açılış Fotoğrafı/ }).click();
  const photoPanel = page.locator("#panel-tbmm-acilis-fotografi-1920");
  await expect(photoPanel).toBeVisible();
  await expect(photoPanel.getByText(/gösterilmez/)).toBeVisible();
  await expect(page.locator("#olay-tbmm-acilis-fotografi-1920 button[aria-expanded]")).toBeFocused();
});

test("tema kartları sergiyi süzer; kaydı olmayan tema kapalıdır", async ({ page }) => {
  await openExperience(page);
  for (const card of await page.locator("#temalar button").all()) {
    const count = await countFrom(card.locator("[id^='tema-sayi-']"));
    if (count === 0) await expect(card).toBeDisabled(); else await expect(card).toBeEnabled();
  }
  const expected = await countFrom(page.locator("#tema-sayi-milli-mucadele"));
  await page.locator("#temalar button").filter({ has: page.locator("#tema-baslik-milli-mucadele") }).click();
  await expect(page.locator("#sergi").getByRole("heading", { name: "Millî Mücadele", level: 3 })).toBeFocused();
  await expect(page.locator("#sergi-tema")).toHaveValue("milli-mucadele");
  await expect(page.getByRole("status").filter({ hasText: "kayıt bulundu" })).toContainText(`${expected} kayıt bulundu`);

  await page.locator("#sergi-tema").selectOption("konusmalar-eserler");
  const speeches = await countFrom(page.locator("#tema-sayi-konusmalar-eserler"));
  await expect(page.getByRole("status").filter({ hasText: "kayıt bulundu" })).toContainText(`${speeches} kayıt bulundu`);
});

test("sergi türe göre süzülür, künye diyaloğu klavyeyle kapanır", async ({ page }, testInfo) => {
  await openExperience(page);
  const filters = page.getByRole("group", { name: "Kayıt türüne göre süz" });
  const photoChip = filters.getByRole("button", { name: /^Fotoğraf/ });
  const photos = await countFrom(photoChip);
  expect(photos).toBe(published.filter((record) => record.type === "photograph").length);
  await photoChip.click();
  await expect(photoChip).toHaveAttribute("aria-pressed", "true");
  const cards = page.locator("#sergi article");
  await expect(cards).toHaveCount(Math.min(photos, 12));
  for (const badge of await cards.locator("[data-type]").filter({ hasText: /^(Fotoğraf|Belge|Olay|Yayın|Konuşma|Mekân)$/ }).allTextContents()) expect(badge).toBe("Fotoğraf");
  await expect(page.locator("#sergi img")).toHaveCount(0);

  await scrollToTop(page.locator("#sergi"));
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-exhibit-${testInfo.project.name}.png`) });

  const trigger = cards.first().getByRole("button", { name: /Künye ve kaynak/ });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  await expect(dialog.getByText("Kullanım hakkı", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Kaynak denetimli · uzman onayı bekliyor")).toBeVisible();
  await page.screenshot({ path: screenshotPath(testInfo.config.rootDir, `v06-ataturk-dialog-${testInfo.project.name}.png`) });
  const related = dialog.locator("button").filter({ hasText: "→" }).first();
  if (await related.count()) {
    const title = (await related.innerText()).replace("→", "").trim();
    await related.click();
    await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(title);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await filters.getByRole("button", { name: /^Tümü/ }).click();
  const total = published.length;
  await expect(page.getByRole("status").filter({ hasText: "kayıt bulundu" })).toContainText(`${total} kayıt bulundu${total > 12 ? ", 12 tanesi gösteriliyor" : ""}`);
  if (total > 12) {
    await page.getByRole("button", { name: /Daha fazla kayıt göster/ }).click();
    await expect(cards).toHaveCount(Math.min(24, total));
  }
});

test("taslak ve incelemedeki kayıtlar hiçbir bölümde görünmez", async ({ page }) => {
  await openExperience(page);
  expect(unpublished.length).toBeGreaterThan(0);
  const ids = await page.locator("#yolculuk [id^='olay-']").evaluateAll((items) => items.map((item) => item.id.slice(5)));
  expect(ids.length).toBe(published.length);
  for (const record of unpublished) expect(ids, record.slug).not.toContain(record.slug);
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
  const reveal = await page.locator("#yolculuk li[id^='olay-']").first().evaluate((element) => getComputedStyle(element).opacity);
  expect(reveal).toBe("1");
});

test("erişilebilirlik: axe ciddi/kritik ihlal yok", async ({ page }) => {
  // Kök pakette (Kilo QA) kurulu; web paketi bağımlılığı değildir. Yoksa test atlanır.
  const specifier = "@axe-core/playwright";
  const axe = await import(specifier).catch(() => null);
  test.skip(!axe, "@axe-core/playwright kurulu değil");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExperience(page);
  await page.locator("#olay-samsun-cikarmasi-1919").getByRole("button", { name: /^Kaynak ve ayrıntılar/ }).click();
  await page.locator("#olay-anitkabir").getByRole("button", { name: /^Kaynak ve ayrıntılar/ }).click();
  const results = await new axe.default({ page }).include("main").analyze();
  const serious = results.violations.filter((violation: { impact?: string }) => violation.impact === "serious" || violation.impact === "critical");
  expect(serious.map((violation: { id: string; nodes: { target: unknown }[] }) => `${violation.id}: ${JSON.stringify(violation.nodes.slice(0, 3).map((node) => node.target))}`)).toEqual([]);
});
