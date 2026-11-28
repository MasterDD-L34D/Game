// Unit tests for resolveWsUrl runtime priority (demo one-tunnel support).
import test from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_WINDOW = globalThis.window;

function setWindow({
  protocol = 'https:',
  host = 'demo.ngrok-free.app',
  search = '',
  extra = {},
} = {}) {
  globalThis.window = {
    location: { protocol, host, hostname: host.split(':')[0], search },
    ...extra,
  };
}

async function importFresh() {
  const url = new URL('../../apps/play/src/network.js', import.meta.url);
  return import(`${url.href}?t=${Date.now()}_${Math.random()}`);
}

test.afterEach(() => {
  globalThis.window = ORIGINAL_WINDOW;
});

test('resolveWsUrl: query ?ws= overrides everything', async () => {
  setWindow({
    search: '?ws=wss://override.example/ws',
    extra: { LOBBY_WS_URL: 'wss://ignored/ws' },
  });
  const { resolveWsUrl } = await importFresh();
  assert.equal(resolveWsUrl(), 'wss://override.example/ws');
});

test('resolveWsUrl: window.LOBBY_WS_URL beats same-origin flag', async () => {
  setWindow({ extra: { LOBBY_WS_URL: 'wss://runtime/ws', LOBBY_WS_SAME_ORIGIN: true } });
  const { resolveWsUrl } = await importFresh();
  assert.equal(resolveWsUrl(), 'wss://runtime/ws');
});

test('resolveWsUrl: same-origin flag → wss://<host>/ws (no port 3341)', async () => {
  setWindow({
    protocol: 'https:',
    host: 'demo.ngrok-free.app',
    extra: { LOBBY_WS_SAME_ORIGIN: true },
  });
  const { resolveWsUrl } = await importFresh();
  assert.equal(resolveWsUrl(), 'wss://demo.ngrok-free.app/ws');
});

test('resolveWsUrl: default → same hostname with port 3341', async () => {
  setWindow({ protocol: 'http:', host: 'localhost:5180' });
  const { resolveWsUrl } = await importFresh();
  assert.equal(resolveWsUrl(), 'ws://localhost:3341/ws');
});
