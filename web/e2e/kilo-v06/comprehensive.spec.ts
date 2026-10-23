import { expect, test } from "@playwright/test";

async function expectNoOverflow(page: import("@playwright/test").Page) {
  const d = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(d.scrollWidth).toBeLessThanOrEqual(d.viewportWidth + 3);
}

const routes = ["/", "/ataturk", "/kronoloji", "/arsiv", "/yayinlar", "/hakkimizda"];
for (const route of routes) {
  test(`rota ${route} yükleniyor ve yatay taşma yok`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    page.on("pageerror", (err) => errors.push(err.message));
    const resp = await page.goto(route);
    expect(resp?.ok()).toBeTruthy();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
    await expectNoOverflow(page);
    expect(errors, `console/page errors on ${route}: ${errors.join("\n")}`).toEqual([]);
  });
}

test("arsiv arama filtreler sayfalama", async ({ page }) => {
  await page.goto("/arsiv");
  await expect(page.getByText(/kayıt bağlı/)).toBeVisible();
  const form = page.getByRole("form", { name: "Arşiv arama ve filtreleri" });
  await form.getByLabel("Başlık veya anahtar kelime").fill("İZMİR");
  await form.getByLabel("Kayıt türü").selectOption("olay");
  await form.getByRole("button", { name: "Arşivde ara" }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(page).toHaveURL(/tur=olay/);
  await expect(page.getByRole("link", { name: /İzmir/ })).toBeVisible();
});

test("arsiv detay kaynak hak inceleme", async ({ page }) => {
  await page.goto("/arsiv/cumhuriyetin-ilani-1923");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/Orijinal kaynak|kaynak/i).first()).toBeVisible();
  await expect(page.getByText(/uzman onayı bekliyor/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /indir/i })).toHaveCount(0);
  const r = await page.goto("/arsiv/ii-inonu-zaferi-fotografi-1921");
  expect(r?.status()).toBe(404);
});

test("kronoloji filtreleri ve hatalar", async ({ page }) => {
  await page.goto("/kronoloji?yil=1923&ay=10&gun=29");
  await expect(page.getByText(/Cumhuriyet/)).toBeVisible();
  await page.goto("/kronoloji?yil=9999");
  await expect(page.getByRole("status")).toBeVisible();
});

test("mobil menu ve arama modal klavye", async ({ page }) => {
  const vp = page.viewportSize();
  if ((vp?.width ?? 0) > 960) test.skip();
  const menuButton = page.getByRole("button", { name: "MENÜ" });
  await expect(menuButton).toBeVisible();
  await page.keyboard.press("Tab");
  await menuButton.focus();
  await page.keyboard.press("Enter");
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  
  await page.goto("/");
  await page.getByRole("button", { name: "Arşivde Ara" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
