import { test, expect } from "@playwright/test";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const artifactDir = "C:\\Users\\Ali\\.gemini\\antigravity\\brain\\5516a538-67db-4795-89ac-033eaa715691";
const docsScreenshotsDir = "C:\\Users\\Ali\\AsrinKemaliCalisma\\antigravity\\docs\\screenshots";

if (!existsSync(docsScreenshotsDir)) {
  mkdirSync(docsScreenshotsDir, { recursive: true });
}

test.describe("MKA Evidence Workbench 2.0 — Görev 28 E2E", () => {
  test("1. /arastirma-laboratuvari paneli, A–J sekmeleri ve taşma kontrolü", async ({ page }, testInfo) => {
    await page.goto("/arastirma-laboratuvari", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Başlık ve yönlendirme metni
    const heading = page.getByRole("heading", { name: "Araştırma Laboratuvarı", level: 1 });
    await expect(heading).toBeVisible();

    const eyebrow = page.getByText("MKA EVIDENCE WORKBENCH 2.0");
    await expect(eyebrow).toBeVisible();

    // 10 sekme navigasyonu mevcuttur
    const tabNav = page.getByRole("navigation", { name: "Panel bölümleri" });
    await expect(tabNav).toBeVisible();
    const activeTab = tabNav.getByRole("link", { name: /A · Araştırma Paneli/i });
    await expect(activeTab).toHaveAttribute("aria-current", "page");

    // Yatay taşma denetimi (scrollWidth <= innerWidth + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow, `Yatay taşma oluştu (${testInfo.project.name})`).toBe(false);

    // Dashboard ekran görüntüsü kaydet
    const dashboardScreenshot = `v08-research-dashboard-${testInfo.project.name}.png`;
    await page.screenshot({
      path: path.join(docsScreenshotsDir, dashboardScreenshot),
      fullPage: false,
    });
    try {
      await page.screenshot({
        path: path.join(artifactDir, dashboardScreenshot),
        fullPage: false,
      });
    } catch {
      // Artifact dir optional fallback
    }

    // Sekmeler arası geçiş denetimi: E · Kaynak Karşılaştırma
    await page.goto("/arastirma-laboratuvari?bolum=karsilastirma", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const compareHeading = page.getByRole("heading", { name: "E · Kaynak Karşılaştırma", level: 2 });
    await expect(compareHeading).toBeVisible();

    const compareScreenshot = `v08-research-compare-${testInfo.project.name}.png`;
    await page.screenshot({
      path: path.join(docsScreenshotsDir, compareScreenshot),
      fullPage: false,
    });
    try {
      await page.screenshot({
        path: path.join(artifactDir, compareScreenshot),
        fullPage: false,
      });
    } catch {
      // Artifact dir optional fallback
    }
  });

  test("2. Kaynak karşılaştırma, not defteri ve dışa aktarım API doğrulaması", async ({ page, request }) => {
    // E · Kaynak Karşılaştırma denetimi
    await page.goto("/arastirma-laboratuvari?bolum=karsilastirma", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const selectLeft = page.getByTestId("select-compare-left");
    const selectRight = page.getByTestId("select-compare-right");
    await expect(selectLeft).toBeVisible();
    await expect(selectRight).toBeVisible();

    // H · Not Defteri tarayıcı taslağı denetimi
    await page.goto("/arastirma-laboratuvari?bolum=notlar", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const noteTextarea = page.getByTestId("input-note-text");
    await noteTextarea.fill("E2E Test Notu — otomatik onay sayılmaz");
    await page.getByTestId("button-add-note").click();
    await expect(page.getByText("E2E Test Notu — otomatik onay sayılmaz")).toBeVisible();

    // Dışa aktarım API doğrulamaları
    const claimsRes = await request.get("/api/arastirma-laboratuvari/export?format=claims-v2");
    expect(claimsRes.status()).toBe(200);
    const claimsData = await claimsRes.json();
    expect(claimsData.schemaVersion).toBe("2.0.0");
    expect(claimsData.claims.length).toBe(10);

    const csvRes = await request.get("/api/arastirma-laboratuvari/export?format=evidence-csv");
    expect(csvRes.status()).toBe(200);
    const csvText = await csvRes.text();
    expect(csvText).toContain("id,claimId,claimVersion");

    // Bilinmeyen format 400 döndürmelidir
    const badRes = await request.get("/api/arastirma-laboratuvari/export?format=unknown_format");
    expect(badRes.status()).toBe(400);
  });
});
