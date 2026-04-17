import { defineConfig } from 'vite';

// Evo-Tactics Play — Vite config (MVP browser 2D).
// Proxy /api/* → backend locale (3334).
export default defineConfig({
  server: {
    port: 5180,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:3334',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
