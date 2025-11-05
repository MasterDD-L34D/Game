import { defineConfig, loadEnv } from 'vite';
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

  return {
    base: command === 'serve' ? '/' : (normalizedBase ?? './'),
    plugins: isAnalyzeMode
      ? [
          visualizer({
            filename: 'dist/analyze.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : [],
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
        },
      },
    },
  };
});
