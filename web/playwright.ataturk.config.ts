import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Ana Playwright yapılandırmasını ayrı ve yalıtılmış bir sunucuyla çalıştırır.
 *
 * Ana yapılandırma yerelde 4173 portundaki mevcut sunucuyu yeniden kullanır
 * (reuseExistingServer: !CI); aynı makinede başka bir ajanın sunucusu çalışıyorsa
 * testler yanlış uygulamaya bağlanabilir. Burada sunucu asla yeniden kullanılmaz:
 * port doluysa Playwright başlamadan hata verir, yabancı bir sunucuya bağlanmaz.
 * Kullanım: npx playwright test -c playwright.ataturk.config.ts [dosya]
 */
const port = Number(process.env.E2E_PORT ?? 4319);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  webServer: { command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 180_000 },
});
