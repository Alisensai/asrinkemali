import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Üretim derlemesine karşı doğrulama (`npm run build` sonrası `next start`).
 * Geliştirme sunucusu hidrasyon, önbellek ve başlık davranışını üretimle birebir yansıtmaz.
 * Sunucu asla yeniden kullanılmaz; port doluysa başlamadan hata verir (başka ajanın sunucusuna bağlanmaz).
 * Kullanım: npm run build && npx playwright test -c playwright.prod.config.ts
 */
const port = Number(process.env.ASRIN_PROD_E2E_PORT ?? 49273);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 120_000 },
});
