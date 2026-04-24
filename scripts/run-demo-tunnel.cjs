#!/usr/bin/env node
// 1-click demo launcher: backend shared HTTP+WS + ngrok tunnel.
// Print big banner con share URL pronto per gli amici.

const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const PORT = 3334;
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';

process.env.LOBBY_WS_SHARED = 'true';
process.env.LOBBY_WS_ENABLED = 'true';

const backendEntry = path.resolve(__dirname, '..', 'apps', 'backend', 'index.js');

const banner = (msg) => {
  const line = '='.repeat(72);
  console.log(`\n${line}\n${msg}\n${line}\n`);
};

console.log('[launcher] avvio backend demo (shared HTTP+WS)...');
const backend = spawn(process.execPath, [backendEntry], {
  stdio: 'inherit',
  env: process.env,
});

console.log('[launcher] avvio ngrok tunnel su porta ' + PORT + '...');
const ngrok = spawn('ngrok', ['http', String(PORT), '--log=stdout'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  shell: process.platform === 'win32',
});

ngrok.on('error', (err) => {
  console.error('\n[launcher] ERRORE: ngrok non trovato. Installa da https://ngrok.com/download');
  console.error('         Dopo installazione: ngrok config add-authtoken <TUO-TOKEN>');
  console.error('         Error:', err.message);
  backend.kill();
  process.exit(1);
});

// ngrok log buffer per debug
ngrok.stdout?.on('data', () => {});
ngrok.stderr?.on('data', () => {});

let printed = false;
async function pollTunnel() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const url = await new Promise((resolve, reject) => {
        const req = http.get(NGROK_API, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              const tunnels = data.tunnels || [];
              const https = tunnels.find((t) => t.public_url?.startsWith('https'));
              resolve(https?.public_url || null);
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(null);
        });
      });
      if (url) return url;
    } catch {
      // noop, ritenta
    }
  }
  return null;
}

pollTunnel().then((url) => {
  if (!url) {
    console.error('\n[launcher] Impossibile recuperare URL ngrok dopo 90s.');
    console.error('          Controlla dashboard ngrok: http://localhost:4040');
    return;
  }
  printed = true;
  const shareUrl = `${url}/play/lobby.html`;
  banner(
    `  🦴 EVO-TACTICS DEMO LIVE\n\n` +
      `  Host (tu): ${shareUrl}\n` +
      `  Share amici: ${shareUrl}\n\n` +
      `  Dashboard ngrok: http://localhost:4040\n` +
      `  Ctrl+C per fermare tutto`,
  );
});

const shutdown = () => {
  console.log('\n[launcher] stop...');
  try {
    backend.kill();
  } catch {}
  try {
    ngrok.kill();
  } catch {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backend.on('exit', (code) => {
  console.log(`[launcher] backend exit ${code}`);
  try {
    ngrok.kill();
  } catch {}
  process.exit(code ?? 0);
});

ngrok.on('exit', (code) => {
  if (!printed) {
    console.error(`[launcher] ngrok exit ${code} prima di stampare URL.`);
  }
  try {
    backend.kill();
  } catch {}
  process.exit(code ?? 0);
});
