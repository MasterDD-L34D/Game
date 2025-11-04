import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/docs-generator/**/*.{test,spec}.ts'],
    environment: 'node',
    environmentMatchGlobs: [['tests/docs-generator/integration/**', 'jsdom']],
    setupFiles: [],
    hookTimeout: 20000,
  },
});
