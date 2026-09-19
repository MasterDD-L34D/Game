import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Evo-Tactics Play — Vite config (MVP browser 2D).
// Proxy /api/* → backend locale (3334).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  // base relativa: asset path risolvibili sotto qualsiasi mount (/play/ o /).
  // Fix: HTML bundled referenzia /assets/... absolute ma backend serve
  // sotto /play/assets/... → 404. Con './' diventa assets/ relativi.
  base: './',
  server: {
    port: 5180,
    host: '127.0.0.1',
    // Allow import da data/art/ (M3.9-M3.10 assets) fuori apps/play/.
    // M4 step A integration: render.js può import faction SVG + tileset PNG.
    fs: { allow: [repoRoot] },
    // M7 demo ngrok: allow tunnel host. `true` = skip DNS rebinding check.
    // Solo per demo playtest — no auth gate, non-production.
    allowedHosts: true,
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
    // M11 Phase B — multi-entry: game shell + lobby picker.
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        lobby: path.resolve(__dirname, 'lobby.html'),
      },
    },
  },
});
