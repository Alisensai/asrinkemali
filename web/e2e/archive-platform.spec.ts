import { expect, test, type Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "..");
const archiveRecords = ["content/archive/records", "data/archive/catalog"].flatMap((relative) => { const directory = path.join(repositoryRoot, relative); return existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8"))) : []; });
const archiveTotal = archiveRecords.length;
const archivePublished = archiveRecords.filter((record) => record.verification.status === "published").length;

async function expectNoOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
}

test("katalog sayaçları gerçek veriden hesaplanır ve yayın kapısı korunur", async ({ page }, testInfo) => {
  await page.goto("/arsiv");
  await expect(page.getByText(`${archiveTotal} kayıt bağlı; ${archivePublished} kayıt katalogda görüntülenebilir.`)).toBeVisible();
  await expect(page.getByText(`${archivePublished} sonuç`)).toBeVisible();
  await expect(page.getByText("uzman tarihçi incelemesi bekler")).toBeVisible();
  await expect(page.getByRole("link", { name: /Sonraki/ })).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({ path: path.resolve(testInfo.config.rootDir, "..", "..", "docs", "screenshots", `v05-archive-${testInfo.project.name}.png`), fullPage: false });
});

test("Türkçe arama ve paylaşılabilir filtreler gerçek sonuç döndürür", async ({ page }) => {
  await page.goto("/arsiv");
  const form = page.getByRole("form", { name: "Arşiv arama ve filtreleri" });
  await form.getByLabel("Başlık veya anahtar kelime").fill("İZMİR");
  await form.getByLabel("Kayıt türü").selectOption("olay");
  await form.getByRole("button", { name: "Arşivde ara" }).click();
  await expect(page).toHaveURL(/q=%C4%B0ZM%C4%B0R/);
  await expect(page).toHaveURL(/tur=olay/);
  await expect(page.getByRole("link", { name: /İzmir'in İşgali/ })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expectNoOverflow(page);
});

test("detay kaynak, hak ve inceleme durumunu gösterir; kapalı kayıtlar 404 olur", async ({ page }) => {
  await page.goto("/arsiv/cumhuriyetin-ilani-1923");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cumhuriyet");
  await expect(page.getByText("Orijinal kaynak")).toBeVisible();
  await expect(page.getByRole("link", { name: "Kurumsal kaynak sayfasını aç" })).toHaveAttribute("rel", /noopener/);
  await expect(page.getByText("uzman onayı bekliyor", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("dosya indirme hizmeti sunmaz")).toBeVisible();
  await expect(page.getByRole("link", { name: /indir/i })).toHaveCount(0);
  const reviewed = await page.goto("/arsiv/ii-inonu-zaferi-fotografi-1921");
  expect(reviewed?.status()).toBe(404);
  const draft = await page.goto("/arsiv/selanikteki-ataturk-evi");
  expect(draft?.status()).toBe(404);
});

test("kronoloji tarih filtreleri ve hatalı girdiler güvenli çalışır", async ({ page }) => {
  await page.goto("/kronoloji?yil=1923&ay=10&gun=29");
  await expect(page.getByText("Cumhuriyet'in İlanı")).toBeVisible();
  await page.goto("/kronoloji?yil=9999&ay=13&gun=0");
  const status = page.getByRole("status");
  await expect(status).toContainText("Yıl 1800–2100");
  await expect(status).toContainText("Ay 1–12");
  await expect(status).toContainText("Gün 1–31");
  await expectNoOverflow(page);
});
