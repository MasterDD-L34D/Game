#!/usr/bin/env node
// 1-click demo launcher: pre-flight + backend + ngrok tunnel + auto-open.
//
// UX pattern (from commercial game launchers + LAN-party tools):
//   1. Splash + version
//   2. Pre-flight checks (✓/✗ per dep) — fail fast with fix hint
//   3. Build frontend (shown to user with progress feedback)
//   4. Start backend (stdout → logs/demo-<ts>.log, non pollute banner)
//   5. Health probe /api/health (wait backend ready)
//   6. Start ngrok + poll public URL
//   7. Clean banner: URL + QR link + "OPEN BROWSER NOW" CTA
//   8. Auto-open browser + auto-copy URL (Windows: start + clip.exe)
//
// Ctrl+C = stop all (backend + ngrok) pulito.

'use strict';

const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3334;
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const REPO_ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(REPO_ROOT, 'logs');
const VERSION = '0.9.0-demo'; // bump when demo UX changes

process.env.LOBBY_WS_SHARED = 'true';
process.env.LOBBY_WS_ENABLED = 'true';

// ── ANSI helpers (disabled on legacy Windows CMD without VT) ───────────
const supportsColor =
  process.stdout.isTTY && (process.platform !== 'win32' || process.env.WT_SESSION);
const c = (code) => (s) => (supportsColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c('1');
const dim = c('2');
const red = c('31');
const green = c('32');
const yellow = c('33');
const cyan = c('36');
const mag = c('35');

const ok = (m) => console.log(`  ${green('✓')} ${m}`);
const fail = (m, hint) => {
  console.log(`  ${red('✗')} ${m}`);
  if (hint) console.log(`    ${dim(`→ ${hint}`)}`);
};
const info = (m) => console.log(`  ${cyan('ℹ')} ${m}`);

// ── Splash ─────────────────────────────────────────────────────────────
console.log('');
console.log(bold(cyan('╔══════════════════════════════════════════════════════════════════╗')));
console.log(bold(cyan('║                                                                  ║')));
console.log(
  cyan('║') + bold('           🦴  E V O - T A C T I C S   D E M O  🦴             ') + cyan('║'),
);
console.log(
  cyan('║') + dim(`                      launcher v${VERSION}                       `) + cyan('║'),
);
console.log(bold(cyan('║                                                                  ║')));
console.log(bold(cyan('╚══════════════════════════════════════════════════════════════════╝')));
console.log('');

// ── Pre-flight ─────────────────────────────────────────────────────────
console.log(bold('▸ Pre-flight checks'));

let preflightFail = false;

// Node version
const [nodeMajor] = process.versions.node.split('.').map(Number);
if (nodeMajor >= 18) ok(`Node.js v${process.versions.node}`);
else {
  fail(`Node.js v${process.versions.node} troppo vecchio`, 'installa Node 18+ da nodejs.org');
  preflightFail = true;
}

// Port 3334 free
function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => {
      s.close(() => resolve(true));
    });
    s.listen(port, '127.0.0.1');
  });
}

// ngrok presence — priority: repo-local .tools/ngrok/ngrok.exe (official, fix MS Store bug)
// → fallback PATH-resolved ngrok.
// Bug ref: ngrok issue #505 "panic: disabled updater should never run" (Microsoft Store ngrok).
let ngrokPath = null;
const localNgrok = path.join(
  REPO_ROOT,
  '.tools',
  'ngrok',
  process.platform === 'win32' ? 'ngrok.exe' : 'ngrok',
);
if (fs.existsSync(localNgrok)) {
  ngrokPath = localNgrok;
  ok(`ngrok trovato local (${ngrokPath})`);
} else {
  const ngrokWhich = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ngrok'], {
    encoding: 'utf8',
  });
  ngrokPath = (ngrokWhich.stdout || '').split(/\r?\n/).filter(Boolean)[0];
  if (ngrokPath) {
    ok(`ngrok trovato PATH (${ngrokPath})`);
    if (process.platform === 'win32' && /WindowsApps/i.test(ngrokPath)) {
      info(
        'ngrok Microsoft Store rilevato (bug noto issue #505). Se Demo crash, run "Evo-Tactics-Install-Ngrok-Official" per official ZIP.',
      );
    }
  } else {
    fail(
      'ngrok non trovato',
      'doppio clic "Evo-Tactics-Install-Ngrok-Official" per setup automatic (raccomandato), OR install manuale da https://ngrok.com/download',
    );
    preflightFail = true;
  }
}

// ngrok authtoken
function ngrokTokenConfigured() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'ngrok', 'ngrok.yml'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'ngrok', 'ngrok.yml'),
    path.join(process.env.HOME || '', '.config', 'ngrok', 'ngrok.yml'),
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'ngrok', 'ngrok.yml'),
  ];
  for (const p of candidates) {
    try {
      const body = fs.readFileSync(p, 'utf8');
      if (/authtoken:\s*\S+/i.test(body)) return p;
    } catch {
      /* file missing */
    }
  }
  return null;
}
const tokenPath = ngrokTokenConfigured();
if (tokenPath) ok('ngrok authtoken configurato');
else
  fail(
    'ngrok authtoken assente',
    'ngrok config add-authtoken <TOKEN> (https://dashboard.ngrok.com/get-started/your-authtoken)',
  );
// Missing token → warn but continue (ngrok shows clear error itself)

// dist freschezza (warn se mancante; sarà buildato dal .bat step precedente)
const distIndex = path.join(REPO_ROOT, 'apps', 'play', 'dist', 'index.html');
if (fs.existsSync(distIndex)) ok('frontend dist presente');
else {
  fail('apps/play/dist/index.html mancante', "lancia 'npm run play:build' prima");
  preflightFail = true;
}

// Check porta libera solo se pre-flight passa (altrimenti sbagliamo errore)
(async () => {
  if (preflightFail) {
    console.log('');
    console.log(red(bold('Pre-flight fallito. Risolvi sopra e riprova.')));
    process.exit(1);
  }

  const free = await portFree(PORT);
  if (free) ok(`porta ${PORT} libera`);
  else {
    fail(`porta ${PORT} occupata`, 'chiudi altra istanza backend o killa processo');
    process.exit(1);
  }

  console.log('');
  start();
})();

// ── Launch sequence ─────────────────────────────────────────────────────
function start() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const demoLogPath = path.join(LOGS_DIR, `demo-${ts}.log`);
  const demoLog = fs.createWriteStream(demoLogPath, { flags: 'a' });

  console.log(bold('▸ Avvio backend'));
  info(`log → ${path.relative(REPO_ROOT, demoLogPath)}`);

  const backendEntry = path.resolve(REPO_ROOT, 'apps', 'backend', 'index.js');
  const backend = spawn(process.execPath, [backendEntry], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  backend.stdout.pipe(demoLog);
  backend.stderr.pipe(demoLog);

  backend.on('error', (err) => {
    fail(`backend spawn error: ${err.message}`);
    process.exit(1);
  });

  // ── Health probe ───────────────────────────────────────────────────
  let backendReady = false;
  async function probeBackend() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await sleep(500);
      try {
        const r = await httpGet(`http://127.0.0.1:${PORT}/api/health`, 800);
        if (r && r.statusCode === 200) return true;
      } catch {
        /* retry */
      }
    }
    return false;
  }

  probeBackend().then((ready) => {
    if (!ready) {
      fail('backend non risponde dopo 20s', `controlla ${path.relative(REPO_ROOT, demoLogPath)}`);
      backend.kill();
      process.exit(1);
    }
    backendReady = true;
    ok(`backend live su http://127.0.0.1:${PORT}`);
    console.log('');
    startTunnel(demoLogPath);
  });

  // Shutdown handlers (installed subito per Ctrl+C durante probe)
  const shutdown = () => {
    console.log('');
    console.log(dim('[launcher] stop backend + ngrok...'));
    try {
      backend.kill();
    } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', () => {
    try {
      backend.kill();
    } catch {}
  });

  backend.on('exit', (code) => {
    if (!backendReady) return; // probe already exits
    console.log('');
    console.log(yellow(`[launcher] backend chiuso (code ${code}). Stop tunnel.`));
    process.exit(code ?? 0);
  });
}

function startTunnel(demoLogPath) {
  console.log(bold('▸ Avvio ngrok tunnel'));
  const demoLog = fs.createWriteStream(demoLogPath, { flags: 'a' });
  // Use detected ngrokPath (repo-local .tools/ngrok preferred over MS Store bug).
  const ngrokBin = ngrokPath || 'ngrok';
  const ngrok = spawn(ngrokBin, ['http', String(PORT), '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    shell: false, // avoid shell escape + MS Store WindowsApps redirect
  });
  ngrok.stdout.pipe(demoLog);
  ngrok.stderr.pipe(demoLog);
  ngrok.on('error', (err) => {
    fail(`ngrok spawn error: ${err.message}`);
    process.exit(1);
  });
  ngrok.on('exit', (code) => {
    console.log('');
    console.log(yellow(`[launcher] ngrok chiuso (code ${code}).`));
    process.exit(code ?? 0);
  });

  (async () => {
    const url = await pollTunnel();
    if (!url) {
      fail(
        'impossibile recuperare URL ngrok dopo 90s',
        'controlla dashboard http://localhost:4040',
      );
      return;
    }
    ok(`tunnel pubblico attivo`);
    const shareUrl = `${url}/play/lobby.html`;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=220x220`;

    // Auto-copy URL to clipboard
    copyToClipboard(shareUrl).then((copied) => {
      if (copied) info('URL copiato negli appunti (Ctrl+V per incollare)');
    });

    printReadyBanner(shareUrl, qrImg);

    // Auto-open browser dopo 800ms (dá tempo banner di essere letto)
    setTimeout(() => {
      openInBrowser(shareUrl);
    }, 800);
  })();
}

// ── Banner ready ────────────────────────────────────────────────────────
function printReadyBanner(shareUrl, qrImg) {
  const w = 72;
  const line = (s) => {
    const pad = Math.max(0, w - stripAnsi(s).length - 4);
    return `${mag('║')}  ${s}${' '.repeat(pad)}  ${mag('║')}`;
  };
  console.log('');
  console.log(mag('╔' + '═'.repeat(w - 2) + '╗'));
  console.log(mag('║') + ' '.repeat(w - 2) + mag('║'));
  console.log(line(bold(green('🎮  DEMO LIVE — pronto per giocare!'))));
  console.log(mag('║') + ' '.repeat(w - 2) + mag('║'));
  console.log(line(bold('Share amici:')));
  console.log(line(cyan(shareUrl)));
  console.log(mag('║') + ' '.repeat(w - 2) + mag('║'));
  console.log(line(dim('QR mobile:')));
  console.log(line(dim(qrImg)));
  console.log(mag('║') + ' '.repeat(w - 2) + mag('║'));
  console.log(line(dim('Dashboard ngrok: http://localhost:4040')));
  console.log(line(dim('Ctrl+C per fermare tutto')));
  console.log(mag('║') + ' '.repeat(w - 2) + mag('║'));
  console.log(mag('╚' + '═'.repeat(w - 2) + '╝'));
  console.log('');
  console.log(bold(yellow('→ Apro browser host automaticamente...')));
  console.log('');
}

// ── Helpers ────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpGet(url, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function pollTunnel() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(1500);
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
      /* retry */
    }
  }
  return null;
}

function openInBrowser(url) {
  const cmd =
    process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['""', url] : [url];
  try {
    spawn(cmd, args, { shell: true, detached: true, stdio: 'ignore' }).unref();
  } catch {
    // ignore — user can click URL manually
  }
}

function copyToClipboard(text) {
  return new Promise((resolve) => {
    const cmd =
      process.platform === 'win32' ? 'clip' : process.platform === 'darwin' ? 'pbcopy' : 'xclip';
    const args = process.platform === 'linux' ? ['-selection', 'clipboard'] : [];
    try {
      const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
      p.on('error', () => resolve(false));
      p.on('exit', (code) => resolve(code === 0));
      p.stdin.write(text);
      p.stdin.end();
    } catch {
      resolve(false);
    }
  });
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}
