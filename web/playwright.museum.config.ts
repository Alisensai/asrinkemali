import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4416);

export const museumViewports = [
  { name: "desktop-1536x1024", width: 1536, height: 1024 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
  { name: "tablet-1024x768", width: 1024, height: 768 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-414x896", width: 414, height: 896 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "mobile-360x640", width: 360, height: 640 },
  { name: "mobile-320x568", width: 320, height: 568 },
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "exhibitions.spec.ts",
  outputDir: "./test-results-museum",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "museum-desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1536, height: 1024 },
      },
    },
    {
      name: "museum-mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
