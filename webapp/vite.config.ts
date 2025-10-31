import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseFromEnv = env.VITE_BASE_PATH ?? env.BASE_PATH;

  return {
    plugins: [vue()],
    base: command === 'serve' ? '/' : baseFromEnv ?? './',
    server: {
      fs: {
        allow: ['..'],
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
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
