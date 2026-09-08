import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  workers: 1,
  use: { trace: "off", video: "off", screenshot: "off" },
  reporter: "list",
});
