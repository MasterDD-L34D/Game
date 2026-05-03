// Sprint R.5 — Generic event publisher + phase_change + action_resolved.

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

// --- Room.publishEvent unit-level ---

test('Room.publishEvent: bumps stateVersion + appends ledger entry', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  const v = room.publishEvent('action_resolved', { actor_id: 'a', result: 'hit' });
  assert.equal(v, 1);
  assert.equal(room.stateVersion, 1);
  const entries = room.ledgerSince(0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'action_resolved');
  assert.deepEqual(entries[0].payload, { actor_id: 'a', result: 'hit' });
});

test('Room.publishEvent: rejects empty/missing type', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  assert.throws(() => room.publishEvent('', { x: 1 }));
  assert.throws(() => room.publishEvent(null, { x: 1 }));
});

test('Room.publishEvent: rejects reserved type names (collision guard)', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  for (const reserved of ['state', 'state_patch', 'intent', 'replay', 'hello', 'error']) {
    assert.throws(
      () => room.publishEvent(reserved, {}),
      (e) => /reserved_event_type/.test(e.message),
    );
  }
});

test('Room.publishEvent: null payload allowed (broadcast carries null)', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  room.publishEvent('status_apply', null);
  const entries = room.ledgerSince(0);
  assert.equal(entries[0].payload, null);
});

test('Room.publishPhaseChange: sets phase + ledger-records as phase_change', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  const v = room.publishPhaseChange('combat');
  assert.equal(v, 1);
  assert.equal(room.phase, 'combat');
  const entries = room.ledgerSince(0);
  assert.equal(entries[0].type, 'phase_change');
  assert.deepEqual(entries[0].payload, { phase: 'combat' });
});

test('Room.publishPhaseChange: rejects empty phase', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  assert.throws(() => room.publishPhaseChange(''));
  assert.throws(() => room.publishPhaseChange(null));
});

test('Room.publishActionResolved: rejects non-object payload', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  assert.throws(() => room.publishActionResolved(null));
  assert.throws(() => room.publishActionResolved('bad'));
});

// --- WS broadcast integration ---

test('WS-event: phase_change broadcast carries version + payload', async () => {
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

    room.publishPhaseChange('combat');
    const [hostMsg, p1Msg] = await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'phase_change'),
      waitForMessage(p1Ws, (m) => m.type === 'phase_change'),
    ]);
    assert.equal(hostMsg.version, 1);
    assert.deepEqual(hostMsg.payload, { phase: 'combat' });
    assert.deepEqual(p1Msg.payload, { phase: 'combat' });

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-event: replay batch includes phase_change + action_resolved entries', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.publishState({ scene: 'lobby' });
    room.publishPhaseChange('combat');
    room.publishActionResolved({ actor_id: 'a', result: 'hit' });
    // stateVersion = 3.

    const ws = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
      last_version: 1,
    });
    await waitOpen(ws);
    const replay = await waitForMessage(ws, (m) => m.type === 'replay');
    assert.equal(replay.payload.reason, 'incremental');
    assert.equal(replay.payload.entries.length, 2);
    assert.equal(replay.payload.entries[0].type, 'phase_change');
    assert.equal(replay.payload.entries[1].type, 'action_resolved');
    ws.close();
  } finally {
    await wsHandle.close();
  }
});
