import { defineConfig } from "@playwright/test";

const viewports = [
  { name: "desktop-1536x1024", width: 1536, height: 1024 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "tablet-1024x768", width: 1024, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-320x720", width: 320, height: 720 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
];
const port = Number(process.env.ASRIN_E2E_PORT ?? process.env.E2E_PORT ?? 49173);
const baseURL = `http://127.0.0.1:${port}`;
const browsers = process.env.ASRIN_CROSS_BROWSER === "1" ? (["chromium", "firefox", "webkit"] as const) : (["chromium"] as const);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: browsers.flatMap((browserName) => viewports.map((viewport) => ({ name: browserName === "chromium" ? viewport.name : `${browserName}-${viewport.name}`, use: { browserName, viewport: { width: viewport.width, height: viewport.height } }))),
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
