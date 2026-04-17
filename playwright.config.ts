import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["dot"], ["html", { open: "never" }]]
    : "html",
  use: {
    trace: "off",
    ignoreHTTPSErrors: true,
    headless: true,
  },
  projects: [
    {
      name: "unit",
      testDir: "./tests/unit",
      testMatch: "**/*.test.ts",
    },
    {
      name: "integration",
      testDir: "./tests/integration",
      testMatch: "**/*.test.ts",
    },
    {
      name: "browser",
      testDir: "./tests/browser",
      testMatch: "**/*.test.ts",
    },
    {
      name: "playground",
      testDir: "./tests/playground",
      testMatch: "**/*.test.ts",
      use: {
        baseURL: "http://localhost:3000",
        headless: true,
      },
    },
  ],
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: "node scripts/serve-examples.mjs",
        port: 3000,
        reuseExistingServer: !process.env.CI,
      },
});
