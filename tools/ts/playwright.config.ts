import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const defaultPort = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${defaultPort}`;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: path.join(__dirname, "tests", "web"),
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "playwright-report.json" }],
  ],
  use: {
    baseURL,
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    launchOptions: chromiumExecutable
      ? {
          executablePath: chromiumExecutable,
        }
      : undefined,
  },
  webServer: {
    command: `python3 -m http.server ${defaultPort} --bind 127.0.0.1 --directory ${JSON.stringify(repoRoot)}`,
    url: `${baseURL}/docs/test-interface/index.html`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  },
});
