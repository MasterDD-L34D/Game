// Unit tests lobbyOnboarding — pure logic (storage gating + share URL).
// DOM render tested via Playwright E2E (see tests/e2e/).
import test from 'node:test';
import assert from 'node:assert/strict';

class FakeStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(k) {
    return this.store.has(k) ? this.store.get(k) : null;
  }
  setItem(k, v) {
    this.store.set(k, String(v));
  }
  removeItem(k) {
    this.store.delete(k);
  }
}

function setupEnv() {
  globalThis.window = {
    location: {
      origin: 'https://demo.ngrok-free.app',
      pathname: '/play/lobby.html',
    },
  };
  globalThis.localStorage = new FakeStorage();
}

async function importFresh() {
  const url = new URL('../../apps/play/src/lobbyOnboarding.js', import.meta.url);
  return import(`${url.href}?t=${Date.now()}_${Math.random()}`);
}

test.afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
});

test('seen flag default false when storage empty', async () => {
  setupEnv();
  const { __testing } = await importFresh();
  assert.equal(__testing.seen(), false);
});

test('markSeen persists flag + seen returns true', async () => {
  setupEnv();
  const { __testing } = await importFresh();
  __testing.markSeen();
  assert.equal(globalThis.localStorage.getItem(__testing.STORAGE_KEY), '1');
  assert.equal(__testing.seen(), true);
});

test('buildShareUrl preserves dir + encodes code', async () => {
  setupEnv();
  const { __testing } = await importFresh();
  const url = __testing.buildShareUrl('ABCD');
  assert.equal(url, 'https://demo.ngrok-free.app/play/lobby.html?code=ABCD');
});

test('buildShareUrl preserves root path when no dir', async () => {
  globalThis.window = {
    location: { origin: 'https://x.ngrok-free.app', pathname: '/lobby.html' },
  };
  globalThis.localStorage = new FakeStorage();
  const { __testing } = await importFresh();
  assert.equal(__testing.buildShareUrl('WXYZ'), 'https://x.ngrok-free.app/lobby.html?code=WXYZ');
});

test('buildShareUrl fallback when no window', async () => {
  delete globalThis.window;
  globalThis.localStorage = new FakeStorage();
  const { __testing } = await importFresh();
  assert.equal(__testing.buildShareUrl('ABCD'), '?code=ABCD');
});

test('renderPlayerOnboarding returns null without document', async () => {
  setupEnv();
  const { renderPlayerOnboarding } = await importFresh();
  assert.equal(renderPlayerOnboarding(), null);
});

test('renderHostShareHint returns null without document', async () => {
  setupEnv();
  const { renderHostShareHint } = await importFresh();
  assert.equal(renderHostShareHint({ session: { code: 'ABCD' } }), null);
});

test('renderHostShareHint returns null without session code', async () => {
  setupEnv();
  globalThis.document = { body: {}, getElementById: () => null };
  const { renderHostShareHint } = await importFresh();
  assert.equal(renderHostShareHint({ session: {} }), null);
  delete globalThis.document;
});
