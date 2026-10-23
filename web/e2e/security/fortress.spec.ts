import { expect, test } from "@playwright/test";

// MKA FORTRESS güvenlik e2e testleri. YALNIZ yerel test sunucusuna karşı çalışır (playwright.prod.config.ts).
const primary = (name: string) => name === "desktop-1536x1024" || name.endsWith("-desktop-1536x1024");
const LEAK = /node_modules|[A-Za-z]:\\Users|\/home\/runner|\/Users\/[a-z]|at Object\.|at async|webpack-internal|ENOENT|Error: /;
const PAGES = ["/", "/ataturk", "/arsiv", "/arsiv/anitkabir", "/kronoloji", "/yayinlar", "/tarihte-bugun", "/hakkimizda", "/olmayan-sayfa", "/api/health", "/api/ready", "/api/health-integration", "/sitemap.xml", "/robots.txt"];

test.describe("MKA FORTRESS", () => {
  test.beforeEach(({}, testInfo) => {
    // Geliştirme sunucusu bilinçli olarak 'unsafe-eval' (HMR) ve geliştirme paket adları içerir; bu testler
    // yalnız üretim derlemesine karşı anlamlıdır (playwright.prod.config.ts ve CI'daki security.yml).
    test.skip(process.env.ASRIN_E2E_TARGET !== "production", "MKA FORTRESS güvenlik testleri yalnız üretim sunucusunda çalışır");
    test.skip(!primary(testInfo.project.name), "güvenlik testleri görünümden bağımsızdır; tek projede çalışır");
  });

  test("güvenlik başlıkları tüm rota türlerinde tutarlı; X-Powered-By yok", async ({ request }) => {
    for (const route of PAGES) {
      const headers = (await request.get(route)).headers();
      expect(headers["content-security-policy"], route).toContain("object-src 'none'");
      expect(headers["content-security-policy"], route).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"], route).not.toContain("unsafe-eval");
      expect(headers["x-content-type-options"], route).toBe("nosniff");
      expect(headers["x-frame-options"], route).toBe("DENY");
      expect(headers["referrer-policy"], route).toBe("strict-origin-when-cross-origin");
      expect(headers["cross-origin-opener-policy"], route).toBe("same-origin");
      expect(headers["x-powered-by"], route).toBeUndefined();
      if (!process.env.ASRIN_ENABLE_HSTS) expect(headers["strict-transport-security"], route).toBeUndefined();
    }
  });

  test("CSP gerçekten uygulanır: dış kökenli betik ve satır içi nesne engellenir (pozitif kontrol)", async ({ page }) => {
    await page.goto("/hakkimizda");
    const result = await page.evaluate(async () => {
      const violations: string[] = [];
      document.addEventListener("securitypolicyviolation", (event) => violations.push(event.violatedDirective));
      const script = document.createElement("script"); script.src = "https://example.org/kotu.js"; document.head.appendChild(script);
      const frame = document.createElement("iframe"); frame.src = "https://example.org/"; document.body.appendChild(frame);
      await new Promise((resolve) => setTimeout(resolve, 600));
      return violations;
    });
    expect(result.some((directive) => directive.startsWith("script-src"))).toBe(true);
    expect(result.some((directive) => directive.startsWith("frame-src"))).toBe(true);
  });

  test("sayfalarda CSP ihlali ve konsol hatası yok", async ({ page }) => {
    const problems: string[] = [];
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (event) => console.error(`CSP-IHLAL ${event.violatedDirective} ${event.blockedURI}`)));
    page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource: the server responded with a status of 404/.test(message.text())) problems.push(message.text()); });
    page.on("pageerror", (error) => problems.push(error.message));
    for (const route of ["/", "/ataturk", "/arsiv", "/arsiv/anitkabir", "/kronoloji", "/tarihte-bugun"]) { await page.goto(route); await page.waitForLoadState("networkidle"); }
    expect(problems).toEqual([]);
  });

  test("hassas dosya ve yönetim yolları 404; içerik sızmaz", async ({ request }) => {
    // Kodlanmış yol geçişi sunucu türüne göre 400 (reddedildi) veya 404 alabilir; dosya asla sunulmamalıdır.
    const ENCODED_TRAVERSAL = new Set(["/%2e%2e/%2e%2e/package.json", "/arsiv/..%2f..%2fpackage.json"]);
    for (const route of ["/.env", "/.env.local", "/.git/config", "/package.json", "/next.config.ts", "/web/package.json", "/content/archive/records/anitkabir.json", "/data/archive/catalog/sevr-antlasmasi-1920.json", "/admin", "/admin/giris", "/yonetim", "/panel", "/api/admin/publish", "/editor", "/_next/../package.json", ...ENCODED_TRAVERSAL]) {
      const response = await request.get(route, { maxRedirects: 0 });
      if (ENCODED_TRAVERSAL.has(route)) expect([400, 404], route).toContain(response.status()); else expect(response.status(), route).toBe(404);
      const body = await response.text();
      expect(body, route).not.toMatch(LEAK);
      expect(body, route).not.toContain('"dependencies"');
      expect(body, route).not.toContain('"verification"');
    }
  });

  test("404 ve hata yanıtları yığın izi, dosya yolu veya sürüm bilgisi sızdırmaz", async ({ request }) => {
    for (const route of ["/olmayan-sayfa", "/arsiv/olmayan-kayit", "/yayinlar/olmayan", `/arsiv?q=${"%FF".repeat(10)}`, "/tarihte-bugun?ay=99&gun=-1"]) {
      const response = await request.get(route);
      expect(response.status(), route).toBeLessThan(500);
      expect(await response.text(), route).not.toMatch(LEAK);
    }
  });

  test("sağlık uç noktaları: canlılık minimal, hazırlık yalnız ad/boolean; önbelleğe alınmaz", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ status: "ok", service: "asrin-kemali-web" });
    expect(health.headers()["cache-control"]).toContain("no-store");
    const ready = await request.get("/api/ready");
    expect(ready.status()).toBe(200);
    const body = await ready.json();
    expect(body.status).toBe("ready");
    for (const [name, value] of Object.entries(body.checks)) { expect(name).toMatch(/^[a-z_.]+$/); expect(typeof value).toBe("boolean"); }
    expect(JSON.stringify(body)).not.toMatch(LEAK);
    expect(ready.headers()["cache-control"]).toContain("no-store");
    expect((await request.post("/api/health")).status()).toBe(405);
    expect((await request.delete("/api/ready")).status()).toBe(405);
  });

  test("açık yönlendirme yok: kullanıcı girdisi başka kökene yönlendirmez", async ({ request, baseURL }) => {
    for (const route of ["//example.org", "/\\example.org", "/?next=https://example.org", "/arsiv?redirect=https://example.org", "/%2F%2Fexample.org", "/https:/example.org"]) {
      const response = await request.get(route, { maxRedirects: 0 });
      const location = response.headers()["location"];
      if (location) expect(new URL(location, baseURL).origin, route).toBe(new URL(baseURL!).origin);
    }
  });

  test("yansıtılan girdiler kaçışlanır (XSS); sayfada betik çalışmaz", async ({ page }) => {
    const payload = `"><script>window.__xss=1</script><img src=x onerror="window.__xss=2">`;
    for (const route of [`/arsiv?q=${encodeURIComponent(payload)}`, `/arsiv?kategori=${encodeURIComponent(payload)}&sehir=${encodeURIComponent(payload)}`, `/kronoloji?yil=${encodeURIComponent(payload)}`, `/yayinlar?kategori=${encodeURIComponent(payload)}`, `/tarihte-bugun?ay=${encodeURIComponent(payload)}`]) {
      await page.goto(route);
      expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss), route).toBeUndefined();
      expect(await page.locator("img[src='x']").count(), route).toBe(0);
    }
  });

  test("aşırı büyük ve geçersiz Unicode girdiler sunucuyu düşürmez", async ({ request }) => {
    for (const route of [`/arsiv?q=${"a".repeat(6000)}`, `/arsiv?q=${encodeURIComponent("🏛️".repeat(500))}`, "/arsiv?q=%ED%A0%80", "/arsiv?q=%C0%AF", "/arsiv?sayfa=99999999999999999999", "/kronoloji?yil=1e999", "/tarihte-bugun?ay=0x10&gun=1"]) {
      const response = await request.get(route);
      expect(response.status(), route.slice(0, 60)).toBeLessThan(500);
    }
    expect((await request.get("/api/health")).status()).toBe(200);
  });

  test("önbellek politikası: operasyonel uç noktalar no-store, yayımlanmamış kayıt önbelleğe sızmaz", async ({ request }) => {
    expect((await request.get("/api/ready")).headers()["cache-control"]).toMatch(/no-store/);
    // Bilinmeyen slug önceden üretilmiş 404 sayfasıyla (önbellekten) yanıtlanabilir; önemli olan
    // yayımlanmamış kaydın İÇERİĞİNİN hiçbir yanıtta veya önbellekte bulunmamasıdır.
    for (const [slug, title] of [["selanikteki-ataturk-evi", "Selanik"], ["milli-kutuphane-inonu-diyor-ki-1933", "İnönü Diyor Ki"]]) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await request.get(`/arsiv/${slug}`);
        expect(response.status(), slug).toBe(404);
        const body = await response.text();
        expect(body, slug).not.toContain(title);
        expect(body, slug).not.toContain(slug.replace(/-/g, " "));
      }
    }
  });
});
