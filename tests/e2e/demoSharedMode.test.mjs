// E2E smoke: demo one-tunnel shared-mode (HTTP+WS on same port).
// Boots backend with LOBBY_WS_SHARED=true, verifies:
//   - /play/runtime-config.js → window.LOBBY_WS_SAME_ORIGIN=true;
//   - /api/lobby/create → 200 + code
//   - WS upgrade on /ws accepts auth + hello round-trip
//   - static /play/dist served (if built)
//
// Skippable: requires `apps/play/dist` present (built by npm run demo:build)
// — skips those assertions if absent, runs the WS + REST checks regardless.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const playDist = path.resolve(repoRoot, 'apps', 'play', 'dist');
const backendEntry = path.resolve(repoRoot, 'apps', 'backend', 'index.js');
const PORT = 3390 + Math.floor(Math.random() * 50);

let child;

async function waitForApi(port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/api/lobby/state`, (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    http
      .get(urlStr, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      })
      .on('error', reject);
  });
}

function httpPostJson(urlStr, payload) {
  const url = new URL(urlStr);
  const data = JSON.stringify(payload);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body, parseError: e.message });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

test.before(async () => {
  child = spawn(process.execPath, [backendEntry], {
    env: {
      ...process.env,
      PORT: String(PORT),
      LOBBY_WS_SHARED: 'true',
      LOBBY_WS_ENABLED: 'true',
      IDEA_ENGINE_DISABLE_STATUS_REFRESH: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', () => {});

  const ready = await waitForApi(PORT);
  assert.ok(ready, `backend did not start on :${PORT}`);
});

test.after(async () => {
  if (child && !child.killed) {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    if (!child.killed) child.kill('SIGKILL');
  }
});

test('demo shared: /api/lobby/create returns 200 + code', async () => {
  const res = await httpPostJson(`http://127.0.0.1:${PORT}/api/lobby/create`, {
    host_name: 'SmokeHost',
    max_players: 4,
  });
  assert.ok(res.status === 200 || res.status === 201, `unexpected status ${res.status}`);
  assert.ok(res.body?.code && /^[A-Z]{4}$/.test(res.body.code), `bad code: ${res.body?.code}`);
  assert.ok(res.body?.host_id);
  assert.ok(res.body?.host_token);
});

test('demo shared: WS /ws accepts auth + hello round-trip', async (t) => {
  const create = await httpPostJson(`http://127.0.0.1:${PORT}/api/lobby/create`, {
    host_name: 'WsHost',
    max_players: 4,
  });
  assert.ok(create.status === 200 || create.status === 201);
  const { code, host_id, host_token } = create.body;

  const url = `ws://127.0.0.1:${PORT}/ws?code=${code}&player_id=${host_id}&token=${host_token}`;
  const ws = new WebSocket(url);
  t.after(() => ws.close());

  const hello = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('hello timeout')), 4000);
    ws.once('open', () => {
      // attach listener after open so we don't miss any early frames
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'hello') {
          clearTimeout(timer);
          resolve(msg);
        }
      } catch {
        // noop
      }
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
  assert.equal(hello.type, 'hello');
  assert.equal(hello.payload.role, 'host');
});

test('demo shared: /play/runtime-config.js advertises same-origin flag', async (t) => {
  if (!existsSync(playDist)) {
    t.skip('apps/play/dist not built (run npm run demo:build)');
    return;
  }
  const res = await httpGet(`http://127.0.0.1:${PORT}/play/runtime-config.js`);
  assert.equal(res.status, 200);
  assert.match(res.body, /window\.LOBBY_WS_SAME_ORIGIN\s*=\s*true/);
});

test('demo shared: /play/lobby.html served when dist present', async (t) => {
  if (!existsSync(playDist)) {
    t.skip('apps/play/dist not built');
    return;
  }
  const res = await httpGet(`http://127.0.0.1:${PORT}/play/lobby.html`);
  assert.equal(res.status, 200);
  assert.match(res.body, /Evo-Tactics — Lobby/);
  assert.match(res.body, /runtime-config\.js/);
});
