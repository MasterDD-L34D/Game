import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = resolveRepoRoot(__dirname, process.cwd());
const consoleTestsDir = path.resolve(repoRoot, 'webapp', 'tests', 'playwright', 'console');
const defaultPort = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${defaultPort}`;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

function resolveRepoRoot(...seeds: string[]): string {
  const markers = ["data", "docs", "tools"] as const;

  for (const seed of seeds) {
    if (!seed) continue;

    let current = path.resolve(seed);
    for (let depth = 0; depth < 6; depth += 1) {
      const hasMarkers = markers.every((marker) =>
        fs.existsSync(path.join(current, marker)),
      );
      if (hasMarkers) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  // Fallback to the historical layout (ts -> .. -> .. -> repo root).
  return path.resolve(__dirname, "..", "..", "..");
}

export default defineConfig({
  testDir: consoleTestsDir,
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
