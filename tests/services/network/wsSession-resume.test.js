// Sprint R.2 — Resume token + state version cursor tests.
//
// Coverage:
//   - Room ledger appends on publishState only (intent does NOT bump version)
//   - Ledger capped at MAX_LEDGER_SIZE (oldest evicted)
//   - Room.ledgerSince(N) filters strictly > N
//   - Room.needsFullSnapshot heuristic (pre-ledger, up-to-date, in-window)
//   - WS reconnect with last_version=current emits up_to_date replay
//   - WS reconnect with last_version=N receives entries > N (incremental)
//   - WS reconnect with stale last_version triggers snapshot_required
//   - WS connect without last_version skips replay (back-compat)
//   - replay arrives AFTER hello (ordering invariant)

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

// --- Room ledger unit-level ---

test('Room: publishState appends ledger entry with type=state and current version', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  assert.equal(room.ledgerSize(), 0);
  room.publishState({ scene: 'briefing' });
  assert.equal(room.ledgerSize(), 1);
  const e1 = room.ledgerSince(0)[0];
  assert.equal(e1.type, 'state');
  assert.equal(e1.version, 1);
  assert.deepEqual(e1.payload, { scene: 'briefing' });

  room.publishState({ scene: 'combat' });
  assert.equal(room.ledgerSize(), 2);
  const all = room.ledgerSince(0);
  assert.equal(all[1].version, 2);
  assert.equal(all[1].payload.scene, 'combat');
});

test('Room: ledger capped at 100 — oldest evicted', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  for (let i = 0; i < 150; i += 1) {
    room.publishState({ tick: i });
  }
  assert.equal(room.ledgerSize(), 100);
  const all = room.ledgerSince(0);
  assert.equal(all[0].version, 51);
  assert.equal(all[99].version, 150);
});

test('Room: ledgerSince(N) returns entries strictly > N', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  for (let i = 0; i < 5; i += 1) room.publishState({ tick: i });
  const since3 = room.ledgerSince(3);
  assert.equal(since3.length, 2);
  assert.equal(since3[0].version, 4);
  assert.equal(since3[1].version, 5);
});

test('Room: needsFullSnapshot heuristic', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  assert.equal(room.needsFullSnapshot(undefined), true);
  assert.equal(room.needsFullSnapshot(-1), true);
  room.publishState({ tick: 1 });
  assert.equal(room.needsFullSnapshot(0), false);
  assert.equal(room.needsFullSnapshot(1), false);
  assert.equal(room.needsFullSnapshot(2), false);
  for (let i = 0; i < 200; i += 1) room.publishState({ tick: i });
  assert.equal(room.needsFullSnapshot(50), true);
  assert.equal(room.needsFullSnapshot(150), false);
});

test('Room: pushIntent does NOT bump stateVersion (R.1 invariant preserved)', () => {
  const room = new Room({ code: 'ABCD', hostId: 'p_h', hostName: 'Alice' });
  for (let i = 0; i < 5; i += 1) room.publishState({ tick: i });
  assert.equal(room.stateVersion, 5);
  room.players.set('p_x', {
    id: 'p_x',
    name: 'Bob',
    role: 'player',
    token: 't',
    socket: null,
    connected: false,
    joinedAt: Date.now(),
  });
  room.pushIntent({ from: 'p_x', payload: { action: 'attack' } });
  assert.equal(room.stateVersion, 5);
  assert.equal(room.ledgerSize(), 5);
});

// --- WS reconnect integration ---

test('WS-resume: connect without last_version skips replay (back-compat)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    await waitOpen(hostWs);
    await waitForMessage(hostWs, (m) => m.type === 'hello');
    let gotReplay = false;
    hostWs.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'replay') gotReplay = true;
      } catch {
        // noop
      }
    });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(gotReplay, false);
    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-resume: reconnect with last_version=current emits up_to_date replay', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.publishState({ scene: 'briefing' });
    room.publishState({ scene: 'combat' });
    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
      last_version: room.stateVersion,
    });
    await waitOpen(hostWs);
    const replay = await waitForMessage(hostWs, (m) => m.type === 'replay');
    assert.equal(replay.payload.reason, 'up_to_date');
    assert.deepEqual(replay.payload.entries, []);
    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-resume: reconnect with last_version=N receives entries > N (incremental)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.publishState({ tick: 1 });
    room.publishState({ tick: 2 });
    room.publishState({ tick: 3 });
    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
      last_version: 1,
    });
    await waitOpen(hostWs);
    const replay = await waitForMessage(hostWs, (m) => m.type === 'replay');
    assert.equal(replay.payload.reason, 'incremental');
    assert.equal(replay.payload.entries.length, 2);
    assert.equal(replay.payload.entries[0].version, 2);
    assert.equal(replay.payload.entries[1].version, 3);
    assert.equal(replay.payload.entries[0].type, 'state');
    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-resume: stale last_version triggers snapshot_required', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    for (let i = 0; i < 200; i += 1) {
      room.publishState({ tick: i });
    }
    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
      last_version: 5,
    });
    await waitOpen(hostWs);
    const replay = await waitForMessage(hostWs, (m) => m.type === 'replay');
    assert.equal(replay.payload.reason, 'snapshot_required');
    assert.deepEqual(replay.payload.entries, []);
    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-resume: replay arrives AFTER hello (ordering invariant)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const meta = lobby.createRoom({ hostName: 'Alice' });
    const room = lobby.getRoom(meta.code);
    room.publishState({ tick: 1 });
    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
      last_version: 0,
    });
    await waitOpen(hostWs);
    await waitForMessage(hostWs, (m) => m.type === 'replay');
    const helloIdx = hostWs.__buf.findIndex((m) => m.type === 'hello');
    const replayIdx = hostWs.__buf.findIndex((m) => m.type === 'replay');
    assert.ok(helloIdx >= 0 && replayIdx >= 0);
    assert.ok(helloIdx < replayIdx, 'hello must precede replay');
    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});
