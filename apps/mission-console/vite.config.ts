import { defineConfig, loadEnv, type PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseFromEnv = env.VITE_BASE_PATH ?? env.BASE_PATH;
  const normalizedBase = baseFromEnv
    ? baseFromEnv.endsWith('/')
      ? baseFromEnv
      : `${baseFromEnv}/`
    : undefined;

  const isAnalyzeMode = mode === 'analyze';
  const analyzePlugins: PluginOption[] = isAnalyzeMode
    ? [
        visualizer({
          filename: 'dist/analyze.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
        }),
      ]
    : [];

  return {
    plugins: [vue(), react()],
    base: command === 'serve' ? '/' : (normalizedBase ?? './'),
    server: {
      fs: {
        allow: ['..'],
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');
            const isNebulaProgressModule =
              normalized.includes('/src/components/flow/NebulaProgress') ||
              normalized.includes('/src/modules/useNebulaProgressModule');

            if (isNebulaProgressModule) {
              return 'atlas';
            }
            if (
              normalized.includes('/src/views/atlas/') ||
              normalized.includes('/src/layouts/AtlasLayout.vue') ||
              normalized.includes('/src/components/atlas/') ||
              normalized.includes('/src/state/atlasDataset') ||
              normalized.includes('/src/data/atlasDemoDataset')
            ) {
              return 'atlas';
            }
            if (
              normalized.includes('/src/views/ConsoleHubView.vue') ||
              normalized.includes('/src/views/traits/') ||
              normalized.includes('/src/features/nebula/')
            ) {
              return 'nebula';
            }
            return undefined;
          },
        },
        plugins: analyzePlugins,
      },
    },
  };
});
