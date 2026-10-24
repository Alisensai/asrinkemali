import { defineConfig } from "@playwright/test";

const port = Number(process.env.ASRIN_ADMIN_E2E_PORT ?? "49731");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "admin-v08-production.spec.ts",
  outputDir: "./test-results/admin-v08-production",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/admin-v08-production.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
