import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phone HTML5 multi-context smoke config (Tier 1 adoption post 2026-05-07).
//
// Validates B5/B6/B7/B8 regression via N-context single-browser simulation.
// Replaces ad-hoc 2-tab Chrome MCP dance from sessione 2026-05-07 with
// structured Playwright fixtures (deterministic CI gate, replay support
// via `--debug`, parallel scaling 4-8 phone simultanei).
//
// Usage:
//   npm run test:phone:smoke -- --project=chromium  (local)
//   PHONE_BASE_URL=https://<tunnel>.trycloudflare.com npm run test:phone:smoke
//
// Default baseURL = http://localhost:3334 (assumes `npm run start:api`
// already running with phone HTML5 mounted at /phone/). Override via
// PHONE_BASE_URL for tunnel/CI runs.
//
// Cross-ref:
//   - docs/playtest/AGENT_DRIVEN_WORKFLOW.md Pattern B
//   - tests/playwright/phone/phone-multi.spec.ts

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const phoneTestsDir = path.resolve(__dirname, 'tests', 'playwright', 'phone');

const baseURL = process.env.PHONE_BASE_URL || 'http://localhost:3334';
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: phoneTestsDir,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'playwright-phone-report.json' }]],
  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    launchOptions: chromiumExecutable
      ? {
          executablePath: chromiumExecutable,
        }
      : undefined,
  },
  // No webServer — phone HTML5 served by Game/ Express backend on port 3334.
  // Run `npm run start:api` separately or set PHONE_BASE_URL to tunnel.
});
