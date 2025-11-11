import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const defaultPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 4173);
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${defaultPort}`;
const shouldStartLocalServer = !process.env.BASE_URL;

if (shouldStartLocalServer && !process.env.CONSOLE_BASE_PATH) {
  process.env.CONSOLE_BASE_PATH = '/index.html#';
}

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  expect: { timeout: 5000 },
  projects: [
    { name: 'evo', testDir: path.resolve(repoRoot, 'tests/playwright/evo') },
    { name: 'console', testDir: './console' },
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  ...(shouldStartLocalServer
    ? {
        webServer: {
          command: `node ${JSON.stringify(
            path.resolve(repoRoot, 'tests/playwright/serve-mission-console.mjs'),
          )}`,
          url: `${baseURL}/index.html`,
          reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: 30000,
        },
      }
    : {}),
});
