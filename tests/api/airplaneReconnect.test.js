// 2026-05-06 phone smoke retry harness — B2 host-transfer grace + airplane mode reconnect.
//
// Validates host-transfer grace window allows mobile cross-device flow without
// premature room close. Catches regression to old 30s default which broke
// Android+iOS smoke (B2 in 2026-05-05 phone smoke results).
//
// Coverage:
//   B2-1: default DEFAULT_HOST_TRANSFER_GRACE_MS = 90_000 (90s) on createRoom()
//   B2-2: createRoom({hostTransferGraceMs}) per-room override applied
//   Airplane-1: host drop + reconnect WITHIN grace → no host_transferred fires
//   Airplane-2: host drop + grace expires → host_transferred fires, oldest player promoted
//   Airplane-3: solo host (no candidates) drop + grace expires → room closed
//
// Ref: docs/playtest/2026-05-05-phone-smoke-results.md §B2
//      apps/backend/services/network/wsSession.js:56 DEFAULT 30→90s bump

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { LobbyService, createWsServer } = require('../../apps/backend/services/network/wsSession');

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
  const port = wsHandle.wss.address().port;
  return { lobby, port, wsHandle };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('B2-1: default grace = 90_000ms (90s) — bumped from 30s for mobile cross-device', () => {
  const lobby = new LobbyService();
  const meta = lobby.createRoom({ hostName: 'Alice' });
  const room = lobby.getRoom(meta.code);
  // 90_000ms = 90s. Old default 30_000 caused Android/iOS smoke break.
  assert.equal(room.hostTransferGraceMs, 90_000, 'DEFAULT must be 90s post-FU4 fix');
});

test('B2-2: per-room hostTransferGraceMs override applied', () => {
  const lobby = new LobbyService();
  const meta = lobby.createRoom({ hostName: 'Alice', hostTransferGraceMs: 12_345 });
  const room = lobby.getRoom(meta.code);
  assert.equal(room.hostTransferGraceMs, 12_345);
});

test('Airplane-1: host drop + reconnect WITHIN grace window → host preserved, no transfer', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    // Tight grace 250ms so test finishes fast. Reconnect after 50ms (well within).
    const meta = lobby.createRoom({ hostName: 'Alice', hostTransferGraceMs: 250 });
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

    // Sniff host_transferred on p1 — must NOT fire.
    let p1SawHostTransferred = false;
    p1Ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === 'host_transferred') p1SawHostTransferred = true;
      } catch {}
    });

    // p1 sees disconnect notification.
    const p1SawDisconnect = waitForMessage(
      p1Ws,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === meta.host_id,
    );

    // Drop host (airplane mode → silent close).
    hostWs.terminate();
    await p1SawDisconnect;

    // Wait 50ms — well within 250ms grace window.
    await sleep(50);

    // Reconnect host with same token (mid-grace).
    const hostWs2 = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    await waitOpen(hostWs2);
    const hello2 = await waitForMessage(hostWs2, (m) => m.type === 'hello');
    assert.equal(hello2.payload.player_id, meta.host_id, 'reconnect preserves player_id');

    // Drain rest of grace + buffer to confirm timer was cancelled.
    await sleep(300);

    assert.equal(p1SawHostTransferred, false, 'reconnect within grace must cancel host transfer');
    const room = lobby.getRoom(meta.code);
    assert.equal(room.hostId, meta.host_id, 'host preserved post-reconnect');
    assert.equal(room.closed, false, 'room must not close');

    hostWs2.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('Airplane-2: host drop + grace expires → host_transferred fires, oldest player promoted', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice', hostTransferGraceMs: 100 });
    const p1 = lobby.joinRoom({ code: meta.code, playerName: 'Bob' });
    const p2 = lobby.joinRoom({ code: meta.code, playerName: 'Carol' });

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
    const p2Ws = openWs(port, {
      code: meta.code,
      player_id: p2.player_id,
      token: p2.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws), waitOpen(p2Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
    ]);

    // Both peers wait for host_transferred broadcast.
    const p1SawTransfer = waitForMessage(p1Ws, (m) => m.type === 'host_transferred');
    const p2SawTransfer = waitForMessage(p2Ws, (m) => m.type === 'host_transferred');

    hostWs.terminate();

    const [t1, t2] = await Promise.all([p1SawTransfer, p2SawTransfer]);
    // p1 (Bob) joined before p2 (Carol) → FIFO promotion, p1 wins.
    assert.equal(t1.payload.new_host_id, p1.player_id, 'oldest non-host promoted');
    assert.equal(t2.payload.new_host_id, p1.player_id, 'all peers see same promotion');

    const room = lobby.getRoom(meta.code);
    assert.equal(room.hostId, p1.player_id, 'lobby state updated to new host');

    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('Airplane-3: solo host (no candidates) drop + grace expires → room closed fallback', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice', hostTransferGraceMs: 100 });

    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    await waitOpen(hostWs);
    await waitForMessage(hostWs, (m) => m.type === 'hello');

    // Capture room close event by polling lobby state post-grace.
    hostWs.terminate();

    // Wait grace + small buffer.
    await sleep(200);

    const room = lobby.getRoom(meta.code);
    assert.ok(room, 'room object retained for forensics');
    assert.equal(room.closed, true, 'room closed when no transfer candidate');
  } finally {
    await wsHandle.close();
  }
});
