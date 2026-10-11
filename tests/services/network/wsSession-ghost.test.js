// Sprint R.4 — Phantom-disconnect cleanup (ghost timeout).
//
// Coverage:
//   - Non-host detach schedules ghost timer
//   - Reconnect within window cancels timer
//   - Timer firing removes player + broadcasts player_left{ghost_timeout}
//   - Host detach does NOT trigger ghost path (host_transfer_grace owns it)
//   - ghostTimeoutMs=0 disables cleanup
//   - close() clears all pending timers

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');

process.env.AUTH_SECRET = 'test-secret-must-be-at-least-16-chars-long';

const {
  LobbyService,
  Room,
  createWsServer,
} = require('../../../apps/backend/services/network/wsSession');

function attachBuffer(ws) {
  ws.__buf = [];
  ws.__waiters = [];
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    ws.__buf.push(msg);
    for (const w of ws.__waiters.slice()) {
      if (w.predicate(msg)) {
        ws.__waiters = ws.__waiters.filter((x) => x !== w);
        w.resolve(msg);
      }
    }
  });
  return ws;
}

function waitForMessage(ws, predicate, timeoutMs = 3000) {
  for (const msg of ws.__buf) {
    if (predicate(msg)) return Promise.resolve(msg);
  }
  return new Promise((resolve, reject) => {
    const waiter = { predicate, resolve, reject };
    const timer = setTimeout(() => {
      ws.__waiters = ws.__waiters.filter((x) => x !== waiter);
      reject(new Error('timeout waiting for ws message'));
    }, timeoutMs);
    waiter.resolve = (msg) => {
      clearTimeout(timer);
      resolve(msg);
    };
    ws.__waiters.push(waiter);
  });
}

function openWs(port, { code, player_id, token }) {
  const url = `ws://127.0.0.1:${port}/ws?code=${encodeURIComponent(code)}&player_id=${encodeURIComponent(player_id)}&token=${encodeURIComponent(token)}`;
  return attachBuffer(new WebSocket(url));
}

async function waitOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

async function spinUp() {
  const lobby = new LobbyService();
  const wsHandle = createWsServer({ lobby, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  return { lobby, port: wsHandle.wss.address().port, wsHandle };
}

// --- Room unit-level ---

test('Room: non-host detach schedules ghost timer', () => {
  const room = new Room({
    code: 'ABCD',
    hostId: 'p_h',
    hostName: 'Alice',
    ghostTimeoutMs: 60_000,
  });
  room.addPlayer({ name: 'Bob' });
  const bobId = Array.from(room.players.keys()).find((k) => k !== 'p_h');
  room.detachSocket(bobId);
  assert.equal(room._ghostTimers.has(bobId), true);
  // cleanup
  room._clearAllGhostTimers();
});

test('Room: host detach does NOT schedule ghost timer (host_transfer_grace owns it)', () => {
  const room = new Room({
    code: 'ABCD',
    hostId: 'p_h',
    hostName: 'Alice',
    ghostTimeoutMs: 60_000,
  });
  room.detachSocket('p_h');
  assert.equal(room._ghostTimers.has('p_h'), false);
});

test('Room: reconnect cancels pending ghost timer', () => {
  const room = new Room({
    code: 'ABCD',
    hostId: 'p_h',
    hostName: 'Alice',
    ghostTimeoutMs: 60_000,
  });
  room.addPlayer({ name: 'Bob' });
  const bobId = Array.from(room.players.keys()).find((k) => k !== 'p_h');
  room.detachSocket(bobId);
  assert.equal(room._ghostTimers.has(bobId), true);
  // Fake socket — attachSocket only checks readyState if previous exists.
  const fakeSocket = { readyState: 1 };
  room.attachSocket(bobId, fakeSocket);
  assert.equal(room._ghostTimers.has(bobId), false);
});

test('Room: ghostTimeoutMs=0 disables cleanup', () => {
  const room = new Room({
    code: 'ABCD',
    hostId: 'p_h',
    hostName: 'Alice',
    ghostTimeoutMs: 0,
  });
  room.addPlayer({ name: 'Bob' });
  const bobId = Array.from(room.players.keys()).find((k) => k !== 'p_h');
  room.detachSocket(bobId);
  assert.equal(room._ghostTimers.has(bobId), false);
});

test('Room: close() clears all pending ghost timers', () => {
  const room = new Room({
    code: 'ABCD',
    hostId: 'p_h',
    hostName: 'Alice',
    ghostTimeoutMs: 60_000,
  });
  room.addPlayer({ name: 'Bob' });
  room.addPlayer({ name: 'Carol' });
  for (const pid of Array.from(room.players.keys())) {
    if (pid !== 'p_h') room.detachSocket(pid);
  }
  assert.equal(room._ghostTimers.size, 2);
  room.close();
  assert.equal(room._ghostTimers.size, 0);
});

test('Room: ghost timer firing removes player + leaves host intact', async () => {
  const room = new Room({
    code: 'ABCD',
    hostId: 'p_h',
    hostName: 'Alice',
    ghostTimeoutMs: 50, // short for test
  });
  room.addPlayer({ name: 'Bob' });
  const bobId = Array.from(room.players.keys()).find((k) => k !== 'p_h');
  room.detachSocket(bobId);
  assert.equal(room.players.has(bobId), true);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(room.players.has(bobId), false);
  assert.equal(room.players.has('p_h'), true);
});

// --- WS integration ---

test('WS-ghost: timer fires + broadcasts player_left{ghost_timeout}', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    // Tight ghost window so test is fast.
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.ghostTimeoutMs = 80;
    const p1 = lobby.joinRoom({ code: meta.code, playerName: 'Bob' });

    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    const p1Ws = openWs(port, {
      code: meta.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
    ]);

    // p1 drops. Host should receive player_disconnected immediately,
    // then player_left{ghost_timeout} after grace.
    p1Ws.close();
    await waitForMessage(
      hostWs,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === p1.player_id,
    );
    const left = await waitForMessage(
      hostWs,
      (m) =>
        m.type === 'player_left' &&
        m.payload.player_id === p1.player_id &&
        m.payload.reason === 'ghost_timeout',
      2000,
    );
    assert.equal(left.payload.reason, 'ghost_timeout');
    // Player removed from room.
    assert.equal(room.players.has(p1.player_id), false);

    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-ghost: reconnect within window cancels removal', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.ghostTimeoutMs = 200; // longer so reconnect lands inside
    const p1 = lobby.joinRoom({ code: meta.code, playerName: 'Bob' });

    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    let p1Ws = openWs(port, {
      code: meta.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
    ]);

    p1Ws.close();
    await waitForMessage(
      hostWs,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === p1.player_id,
    );
    // Reconnect quickly.
    await new Promise((r) => setTimeout(r, 50));
    p1Ws = openWs(port, {
      code: meta.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(p1Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');
    // Wait past the ghost window — must NOT have been removed.
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(room.players.has(p1.player_id), true);

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});
