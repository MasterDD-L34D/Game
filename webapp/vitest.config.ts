import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { PluginOption } from 'vite';

export default defineConfig(async () => {
  let vuePlugin: PluginOption | undefined;

  try {
    const { default: vue } = await import('@vitejs/plugin-vue');
    vuePlugin = typeof vue === 'function' ? vue() : undefined;
  } catch (error) {
    console.warn('[@vitest] @vitejs/plugin-vue not found; continuing without Vue plugin.');
    if (process.env.CI) {
      console.warn(error);
    }
  }

  const testUtilsLocalPath = resolve(__dirname, 'node_modules/@vue/test-utils');
  const testUtilsWorkspacePath = resolve(__dirname, '../node_modules/@vue/test-utils');
  const hasVueTestUtils = existsSync(testUtilsLocalPath) || existsSync(testUtilsWorkspacePath);

  const baseInclude = ['tests/config/**/*.spec.ts'];

  const includePatterns =
    vuePlugin && hasVueTestUtils
      ? [
          ...baseInclude,
          'tests/**/*.spec.ts',
          '../tests/webapp/**/*.spec.ts',
          '../tests/vfx/**/*.spec.ts',
          '../tests/analytics/**/*.test.ts',
        ]
      : [...baseInclude, '../tests/analytics/squadsync_responses.test.ts'];

  if (!vuePlugin || !hasVueTestUtils) {
    console.warn(
      '[@vitest] Skipping Vue component suites because the Vue test stack is unavailable.',
    );
  }

  return {
    plugins: vuePlugin ? [vuePlugin] : [],
    server: {
      fs: {
        allow: ['..'],
      },
    },
    resolve: {
      alias: {
        ...(hasVueTestUtils
          ? {
              '@vue/test-utils': existsSync(testUtilsLocalPath)
                ? testUtilsLocalPath
                : testUtilsWorkspacePath,
            }
          : {}),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: includePatterns,
      root: __dirname,
    },
  };
});
