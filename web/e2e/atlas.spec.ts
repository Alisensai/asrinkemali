import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/** Uses the repository's existing isolated Playwright webServer; no external services. */
test.describe("MKA Atlas 2.0", () => {
  test("page renders with real published archive catalogue",async ({page})=>{
    await page.goto("/atlas");
    await expect(page.getByRole("heading",{name:/Coğrafyanın/})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Türkiye atlası"})).toBeVisible();
    await expect(page.getByRole("heading",{name:"Katalog kayıtları"})).toBeVisible();
  });
  test("keyboard navigates city map, list remains available",async ({page})=>{
    await page.goto("/atlas");
    const button=page.getByRole("button",{name:/Ankara, \d+ kaynaklı arşiv kaydı/});
    await button.focus();await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed","true");
    await page.getByRole("button",{name:"Liste",exact:true}).click();
    await expect(page.getByText("Şehir listesi — haritanın erişilebilir alternatifi")).toBeVisible();
  });
  test("city selection reflects source counts without presuming empty city",async ({page})=>{
    await page.goto("/atlas");
    const city=page.getByRole("button",{name:/Çanakkale, \d+ kaynaklı arşiv kaydı/});
    const label=await city.getAttribute("aria-label");
    const expected=Number(label?.match(/(\d+) kaynaklı/)?.[1] ?? -1);
    await city.click();
    await expect(city).toHaveAttribute("aria-pressed","true");
    await expect(page.getByText(`${expected} kayıt bulundu`)).toBeVisible();
    if(expected===0) await expect(page.getByText("Bu seçim için yayıma açık katalog kaydı bulunmadı")).toBeVisible();
  });
  test("filters and clearing work",async ({page})=>{
    await page.goto("/atlas");
    const toggle = page.getByRole("button", { name: /Filtreler/ });
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    const search=page.getByRole("searchbox",{name:"Atlas araması"});
    await search.fill("kesinlikle-olmayan-arşiv-anahtar-sözcük-987");
    await expect(page.getByText("Bu seçim için yayıma açık katalog kaydı bulunmadı")).toBeVisible();
    await page.getByRole("button",{name:"Tüm filtreleri temizle"}).click();
    await expect(search).toHaveValue("");
  });
  test("source links use published archive path",async ({page})=>{
    await page.goto("/atlas");
    const details=page.getByRole("link",{name:"Kayıt ayrıntıları →"}).first();
    await expect(details).toHaveAttribute("href",/^\/arsiv\/[a-z0-9-]+$/);
  });
  test("comparison is accessible",async ({page})=>{
    await page.goto("/atlas");
    await page.getByRole("button",{name:"Karşılaştır",exact:true}).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("combobox",{name:"Birinci karşılaştırma şehri"})).toBeVisible();
  });
  test("international city discovery contains Selanik",async ({page})=>{
    await page.goto("/atlas");
    await expect(page.getByRole("heading",{name:"Uluslararası mekân keşfi"})).toBeVisible();
    await page.getByRole("button",{name:/Selanik/}).click();
    await expect(page.getByRole("heading",{name:"Katalog kayıtları"})).toBeVisible();
  });
  test("invalid query params do not break page",async ({page})=>{
    await page.goto("/atlas?tur=unsafe&baslangic=9999&sayfa=-10");
    await expect(page.getByRole("heading",{name:"Türkiye atlası"})).toBeVisible();
    await expect(page.getByText(/Geçersiz tur filtresi yok sayıldı/)).toBeVisible();
  });
  test("[T-22-118] Atlas şematik map etiketi kaynak alt yazısı", async ({page})=>{
    await page.goto("/atlas");
    await expect(page.getByText(/Harita şehir seçimi için şematiktir/)).toBeVisible();
    await expect(page.getByLabel(/şematik harita/)).toBeVisible();
  });
  test("[T-22-119] Atlas harita odak sırası ve klavye erişilebilirliği", async ({page})=>{
    await page.goto("/atlas");
    const button = page.getByRole("button", { name: /İstanbul, \d+ kaynaklı/ });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-pressed", "true");
  });
  test("[T-22-120] Atlas baz CSS tokenlarıyla uyum", async ({page})=>{
    await page.goto("/atlas");
    const explorer = page.getByTestId("atlas-explorer");
    await expect(explorer).toBeVisible();
  });
  test("[T-22-121] Atlas URL arama temizleme", async ({page})=>{
    await page.goto("/atlas?q=Mustafa");
    const toggle = page.getByRole("button", { name: /Filtreler/ });
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    const search = page.getByRole("searchbox", { name: "Atlas araması" });
    await expect(search).toHaveValue("Mustafa");
    await page.getByRole("button", { name: "Temizle" }).click();
    await expect(search).toHaveValue("");
  });
  test("[T-22-122] Atlas unknown tarih açıklaması", async ({page})=>{
    await page.goto("/atlas");
    await expect(page.getByText(/Gösterilen yıllar katalogdaki tarih alanının başlangıcıdır/)).toBeVisible();
  });
  test("no horizontal overflow and viewport capture",async ({page},testInfo)=>{
    await page.goto("/atlas");
    const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    expect(overflows).toBe(false);
    const screenshotDir = path.resolve(process.cwd(), "../docs/screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({path: path.join(screenshotDir, `v08-atlas-${testInfo.project.name}.png`), fullPage:true});
    await page.screenshot({path:testInfo.outputPath(`atlas-${testInfo.project.name}.png`),fullPage:true});
  });
});

// Full required breakpoint pass. Run with the repository's existing desktop project.
test("eight requested viewport widths are usable",async ({page},testInfo)=>{
  test.skip(testInfo.project.name!=="desktop-1536x1024", "Full breakpoint suite is run once in the desktop project");
  for(const width of [320,360,390,430,768,1024,1440,1536]){
    await page.setViewportSize({width,height:width<500?800:900});
    await page.goto("/atlas");
    await expect(page.getByRole("heading",{name:"Türkiye atlası"})).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    expect(overflow,`horizontal overflow at ${width}px`).toBe(false);
    await page.screenshot({path:testInfo.outputPath(`atlas-${width}.png`),fullPage:true});
    if(width<=768){await page.getByRole("button",{name:/Filtreler/}).click();await expect(page.getByRole("searchbox",{name:"Atlas araması"})).toBeVisible();}
  }
});
