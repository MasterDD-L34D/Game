import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const defaultPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 4173);
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${defaultPort}`;

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
  webServer: {
    command: `python3 -m http.server ${defaultPort} --bind 127.0.0.1 --directory ${JSON.stringify(repoRoot)}`,
    url: `${baseURL}/docs/mission-console/index.html`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30000,
  },
});
