import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { join } from "node:path";

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function waitForServerReady(proc, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Next.js server failed to start within ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      if (text.includes("Ready") || text.includes("Local:") || text.includes("localhost")) {
        clearTimeout(timer);
        resolve();
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        reject(new Error(`Next.js server exited unexpectedly with code ${code}`));
      }
    });
  });
}

describe("ASRIN KEMALİ — İzole Üretim Build Gerçek HTTP Erişim ve Güvenlik Testleri", () => {
  describe("A. Korumalı Preview Sunucusu (Kimlik Yapılandırılmış)", () => {
    let serverProcess;
    let baseUrl;
    const testUser = "onizleme-tester";
    const testPassword = `TestSecret_${randomUUID()}`;
    const testPasswordHash = createHash("sha256").update(testPassword).digest("hex");
    const validAuthHeader = `Basic ${Buffer.from(`${testUser}:${testPassword}`).toString("base64")}`;
    const invalidAuthHeader = `Basic ${Buffer.from(`${testUser}:YanlisParola123`).toString("base64")}`;

    before(async () => {
      const port = await getFreePort();
      baseUrl = `http://127.0.0.1:${port}`;
      const webDir = join(process.cwd(), "web");

      serverProcess = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
        cwd: webDir,
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(port),
          VERCEL_ENV: "preview",
          ASRIN_DEPLOY_ENV: "preview",
          NEXT_PUBLIC_SITE_URL: "https://preview.asrinkemali.com.tr",
          ASRIN_PREVIEW_USER: testUser,
          ASRIN_PREVIEW_PASSWORD_SHA256: testPasswordHash,
          ASRIN_CSP_MODE: "enforce",
          ASRIN_ENABLE_HSTS: "1"
        }
      });

      await waitForServerReady(serverProcess);
      // Sunucunun ilk istekleri alması için kısa bekleme
      await new Promise((r) => setTimeout(r, 600));
    });

    after(() => {
      if (serverProcess) {
        serverProcess.kill();
      }
    });

    test("1. Kimlik doğrulaması olmadan ana sayfaya erişim: 401 Unauthorized ve noindex dönmeli", async () => {
      const res = await fetch(`${baseUrl}/`, { redirect: "manual" });
      assert.equal(res.status, 401);
      assert.ok(res.headers.get("www-authenticate")?.includes("Basic"), "WWW-Authenticate Basic başlığı bulunmalı");
      assert.ok(res.headers.get("x-robots-tag")?.includes("noindex"), "Arama motoru engeli noindex olmalı");
      assert.ok(res.headers.get("cache-control")?.includes("no-store"), "Önbellekleme no-store olmalı");
    });

    test("2. Kimlik doğrulaması olmadan arşiv sayfasına erişim: 401 dönmeli", async () => {
      const res = await fetch(`${baseUrl}/arsiv`, { redirect: "manual" });
      assert.equal(res.status, 401);
      assert.ok(res.headers.get("www-authenticate")?.includes("Basic"));
    });

    test("3. Yanlış kimlik bilgisi gönderildiğinde: 401 Unauthorized dönmeli", async () => {
      const res = await fetch(`${baseUrl}/arsiv`, {
        headers: { Authorization: invalidAuthHeader }
      });
      assert.equal(res.status, 401);
    });

    test("4. Doğru sentetik kimlik bilgisi gönderildiğinde: 200 OK ve noindex dönmeli", async () => {
      const res = await fetch(`${baseUrl}/`, {
        headers: { Authorization: validAuthHeader }
      });
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("x-robots-tag")?.includes("noindex"), "Giriş yapılmış olsa dahi preview noindex kalmalı");
      const html = await res.text();
      assert.ok(html.includes("ASRIN KEMALİ") || html.includes("Mustafa Kemal"), "Doğru sayfa içeriği gelmeli");
    });

    test("5. API rotası (/api/ready): Kimliksiz 401, kimlikli 200 dönmeli", async () => {
      const unauth = await fetch(`${baseUrl}/api/ready`);
      assert.equal(unauth.status, 401);

      const auth = await fetch(`${baseUrl}/api/ready`, {
        headers: { Authorization: validAuthHeader }
      });
      assert.equal(auth.status, 200);
    });

    test("6. Platform canlılık denetimi (/api/health): Kimlik bilgisi olmadan HER ZAMAN 200 dönmeli", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      assert.ok(res.headers.get("x-robots-tag")?.includes("noindex"));
      const json = await res.json();
      assert.equal(json.status, "ok");
    });

    test("7. Statik varlıklar ve görüntüler: matcher istisnası gereği doğrudan yüklenmeli", async () => {
      // web/proxy.ts matcher kuralı _next/static, favicon ve assets yollarını middleware kapsamı dışında tutar
      const res = await fetch(`${baseUrl}/favicon.ico`);
      // Dosya mevcutsa 200, yoksa 404; ASLA 401 ile durdurulmamalı (tarayıcı stil/ikon yüklemesini bozmaz)
      assert.ok(res.status === 200 || res.status === 404, "Statik dosya 401 almamalı");
      assert.notEqual(res.status, 401);
    });

    test("8. HTTP Güvenlik Başlıkları: CSP, nosniff, X-Frame-Options DENY ve x-powered-by gizlenmeli", async () => {
      const res = await fetch(`${baseUrl}/`, {
        headers: { Authorization: validAuthHeader }
      });
      assert.equal(res.headers.get("x-frame-options"), "DENY");
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("cross-origin-opener-policy"), "same-origin");
      assert.ok(res.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
      assert.equal(res.headers.get("x-powered-by"), null, "x-powered-by başlığı kaldırılmış olmalı");
    });
  });

  describe("B. Yapılandırılmamış Preview Sunucusu (Eksik Environment Variables)", () => {
    let unconfiguredServer;
    let unconfiguredBaseUrl;

    before(async () => {
      const port = await getFreePort();
      unconfiguredBaseUrl = `http://127.0.0.1:${port}`;
      const webDir = join(process.cwd(), "web");

      // VERCEL_ENV=preview tanımlı ama parola/kullanıcı yok
      unconfiguredServer = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
        cwd: webDir,
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: String(port),
          VERCEL: "1",
          VERCEL_ENV: "preview",
          ASRIN_PREVIEW_USER: "",
          ASRIN_PREVIEW_PASSWORD_SHA256: ""
        }
      });

      await waitForServerReady(unconfiguredServer);
      await new Promise((r) => setTimeout(r, 600));
    });

    after(() => {
      if (unconfiguredServer) {
        unconfiguredServer.kill();
      }
    });

    test("1. Ortam değişkeni eksikse site FAIL-CLOSED (503 Service Unavailable) dönmeli ve açılmamalı", async () => {
      const res = await fetch(`${unconfiguredBaseUrl}/`, { redirect: "manual" });
      assert.equal(res.status, 503, "Yapılandırılmamış preview kesinlikle 503 ile kapalı kalmalı");
      assert.ok(res.headers.get("x-robots-tag")?.includes("noindex"));
      assert.ok(res.headers.get("cache-control")?.includes("no-store"));
      const body = await res.text();
      assert.ok(body.includes("Hizmet erişim denetimi yapılandırılmamış"));
    });

    test("2. 503 durumunda bile /api/health canlılık denetimi 200 dönmeli", async () => {
      const res = await fetch(`${unconfiguredBaseUrl}/api/health`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.status, "ok");
    });
  });
});
