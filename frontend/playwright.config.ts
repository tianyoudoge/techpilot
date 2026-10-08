import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.UI_PORT || 5173);
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["iPhone 13"],
    reducedMotion: "reduce",
    browserName: process.env.UI_BROWSER === "webkit" ? "webkit" : "chromium",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
  },
  reporter: "list",
});
