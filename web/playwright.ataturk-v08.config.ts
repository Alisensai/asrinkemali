import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4430);

export const viewports = [
  { name: "desktop-1536x1024", width: 1536, height: 1024 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "tablet-1024x768", width: 1024, height: 768 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-320x568", width: 320, height: 568 },
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "ataturk-v08.spec.ts",
  outputDir: "./test-results-ataturk",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: viewports.map((viewport) => ({
    name: viewport.name,
    use: {
      browserName: "chromium",
      viewport: { width: viewport.width, height: viewport.height },
    },
  })),
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
