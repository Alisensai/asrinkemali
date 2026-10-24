import { defineConfig } from "@playwright/test";

const outputDir = process.env.ASRIN_QA_OUTPUT;
const baseURL = process.env.ASRIN_QA_BASE_URL;
const browserNames = ["chromium", "firefox", "webkit"] as const;
type BrowserName = (typeof browserNames)[number];
function isBrowserName(value: string): value is BrowserName {
  return browserNames.some((browserName) => browserName === value);
}
const requestedBrowser = process.env.ASRIN_QA_BROWSER ?? "chromium";

if (!outputDir || !baseURL) {
  throw new Error("Unified QA must provide an isolated output directory and server URL.");
}
if (!isBrowserName(requestedBrowser)) {
  throw new Error(`Unsupported unified QA browser: ${requestedBrowser}`);
}
const browserName: BrowserName = requestedBrowser;

export default defineConfig({
  testDir: "./e2e/qa-unified",
  testMatch: process.env.ASRIN_QA_TEST_FILE ?? "**/*.spec.ts",
  outputDir,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.ASRIN_QA_JSON_REPORT
    ? [["list"], ["json", { outputFile: process.env.ASRIN_QA_JSON_REPORT }]]
    : "list",
  projects: [{ name: browserName, use: { browserName } }],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
