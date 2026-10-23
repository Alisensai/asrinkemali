import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Ana Playwright yapılandırmasını ayrı bir portta çalıştırır. Aynı makinede başka bir
 * ajanın 4173 portundaki sunucusuna yanlışlıkla bağlanmayı (reuseExistingServer) önler.
 * Kullanım: npx playwright test -c playwright.ataturk.config.ts [dosya]
 */
const port = Number(process.env.E2E_PORT ?? 4319);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  webServer: { command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
