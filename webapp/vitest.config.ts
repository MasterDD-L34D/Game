import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      '@vue/test-utils': resolve(__dirname, 'node_modules/@vue/test-utils'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.spec.ts', '../tests/webapp/**/*.spec.ts', '../tests/vfx/**/*.spec.ts', '../tests/analytics/**/*.test.ts'],
    root: __dirname,
  },
});
