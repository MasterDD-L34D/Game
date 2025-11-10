import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './evo',
  timeout: 60000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
});
