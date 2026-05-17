// Sprint R.3 — Room.publishStatePatch + WS broadcast + ledger integration.

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

function openWs(port, { code, player_id, token, last_version }) {
  let url = `ws://127.0.0.1:${port}/ws?code=${encodeURIComponent(code)}&player_id=${encodeURIComponent(player_id)}&token=${encodeURIComponent(token)}`;
  if (last_version !== undefined && last_version !== null) {
    url += `&last_version=${last_version}`;
  }
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

// --- Room.publishStatePatch unit-level ---

test('Room.publishStatePatch: bumps stateVersion + applies ops to state', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  room.publishState({ party: [{ hp: 10 }, { hp: 5 }] });
  assert.equal(room.stateVersion, 1);

  room.publishStatePatch([{ op: 'replace', path: '/party/0/hp', value: 8 }]);
  assert.equal(room.stateVersion, 2);
  assert.equal(room.state.party[0].hp, 8);
  assert.equal(room.state.party[1].hp, 5);
});

test('Room.publishStatePatch: appends state_patch ledger entry', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  room.publishState({ a: 1 });
  room.publishStatePatch([{ op: 'replace', path: '/a', value: 2 }]);
  const entries = room.ledgerSince(0);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].type, 'state');
  assert.equal(entries[1].type, 'state_patch');
  assert.deepEqual(entries[1].payload.ops, [{ op: 'replace', path: '/a', value: 2 }]);
});

test('Room.publishStatePatch: empty ops array throws', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  assert.throws(() => room.publishStatePatch([]));
  assert.throws(() => room.publishStatePatch(null));
});

test('Room.publishStatePatch: works on null baseline (treated as {})', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  // No prior publishState — state still null.
  room.publishStatePatch([{ op: 'add', path: '/a', value: 1 }]);
  assert.deepEqual(room.state, { a: 1 });
});

// --- WS broadcast integration ---

test('WS-state_patch: broadcast carries ops + version to all peers', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
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

    room.publishState({ party: [{ hp: 10 }] });
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'state'),
      waitForMessage(p1Ws, (m) => m.type === 'state'),
    ]);

    const ops = [{ op: 'replace', path: '/party/0/hp', value: 7 }];
    room.publishStatePatch(ops);
    const [hostPatch, p1Patch] = await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'state_patch'),
      waitForMessage(p1Ws, (m) => m.type === 'state_patch'),
    ]);
    assert.equal(hostPatch.version, 2);
    assert.deepEqual(hostPatch.ops, ops);
    assert.deepEqual(p1Patch.ops, ops);

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-state_patch: replay since pre-patch version includes patch entry', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.publishState({ a: 1 });
    room.publishStatePatch([{ op: 'replace', path: '/a', value: 99 }]);

    const ws = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
      last_version: 1,
    });
    await waitOpen(ws);
    const replay = await waitForMessage(ws, (m) => m.type === 'replay');
    assert.equal(replay.payload.reason, 'incremental');
    assert.equal(replay.payload.entries.length, 1);
    assert.equal(replay.payload.entries[0].type, 'state_patch');
    assert.equal(replay.payload.entries[0].version, 2);
    ws.close();
  } finally {
    await wsHandle.close();
  }
});
