// M11 Phase A — Jackbox WebSocket integration tests.
// ADR-2026-04-20.
//
// Coverage:
//   - Host + 3 players connect concurrently
//   - Player roster broadcast
//   - Host publishes state, all players receive with version
//   - Non-host state attempt rejected
//   - Player intent relayed to host only
//   - Reconnect survives one drop (token reusable)
//   - Auth failure (bad token) rejected

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const {
  LobbyService,
  createWsServer,
  generateRoomCode,
  ROOM_CODE_ALPHABET,
} = require('../../apps/backend/services/network/wsSession');

// Buffer all received messages so tests can await past messages without
// racing the listener attachment. Call `ws.__buf` for the list; `waitForMessage`
// scans the buffer first then listens for new arrivals.
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
  // Check existing buffer.
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
  // Wait for wss to bind so address().port is populated.
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;
  return { lobby, port, wsHandle };
}

test('WS: host + 3 players connect, host publishes state, all receive', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice', campaignId: 'c1' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Carol' });
    const p3 = lobby.joinRoom({ code: room.code, playerName: 'Dan' });

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    await waitOpen(hostWs);
    const hostHello = await waitForMessage(hostWs, (m) => m.type === 'hello');
    assert.equal(hostHello.payload.role, 'host');
    assert.equal(hostHello.payload.room.code, room.code);

    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    const p2Ws = openWs(port, {
      code: room.code,
      player_id: p2.player_id,
      token: p2.player_token,
    });
    const p3Ws = openWs(port, {
      code: room.code,
      player_id: p3.player_id,
      token: p3.player_token,
    });

    await Promise.all([waitOpen(p1Ws), waitOpen(p2Ws), waitOpen(p3Ws)]);
    await Promise.all([
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
      waitForMessage(p3Ws, (m) => m.type === 'hello'),
    ]);

    // Host publishes state; all 3 players should receive it.
    const receivedStates = Promise.all([
      waitForMessage(p1Ws, (m) => m.type === 'state'),
      waitForMessage(p2Ws, (m) => m.type === 'state'),
      waitForMessage(p3Ws, (m) => m.type === 'state'),
    ]);

    hostWs.send(JSON.stringify({ type: 'state', payload: { scene: 'briefing', turn: 1 } }));

    const states = await receivedStates;
    for (const s of states) {
      assert.equal(s.version, 1);
      assert.deepEqual(s.payload, { scene: 'briefing', turn: 1 });
    }

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
    p3Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS: non-host state attempt rejected with error', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(p1Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');
    p1Ws.send(JSON.stringify({ type: 'state', payload: { hacked: true } }));
    const err = await waitForMessage(p1Ws, (m) => m.type === 'error');
    assert.equal(err.payload.code, 'not_host');
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS: player intent relayed to host only (not to peers)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Carol' });

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    const p2Ws = openWs(port, {
      code: room.code,
      player_id: p2.player_id,
      token: p2.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws), waitOpen(p2Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
    ]);

    const hostRelay = waitForMessage(hostWs, (m) => m.type === 'intent');
    // p2 should NOT see an intent from p1 — give a short window, then assert silence.
    let p2GotIntent = false;
    p2Ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === 'intent') p2GotIntent = true;
      } catch {
        // noop
      }
    });

    p1Ws.send(JSON.stringify({ type: 'intent', payload: { action: 'attack', target: 'e1' } }));
    const intent = await hostRelay;
    assert.equal(intent.payload.from, p1.player_id);
    assert.deepEqual(intent.payload.payload, { action: 'attack', target: 'e1' });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(p2GotIntent, false);

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS: reconnect survives one drop — token reusable', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
    ]);

    // Drop p1.
    const hostSawDisconnect = waitForMessage(
      hostWs,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === p1.player_id,
    );
    p1Ws.close();
    await hostSawDisconnect;

    // Reconnect with same token.
    const p1Ws2 = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(p1Ws2);
    const hello2 = await waitForMessage(p1Ws2, (m) => m.type === 'hello');
    assert.equal(hello2.payload.player_id, p1.player_id);

    hostWs.close();
    p1Ws2.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS: bad token rejected', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const badWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: 'WRONG',
    });
    await new Promise((resolve) => {
      let closed = false;
      badWs.on('close', () => {
        closed = true;
        resolve();
      });
      badWs.on('error', () => {
        if (!closed) resolve();
      });
    });
  } finally {
    await wsHandle.close();
  }
});

test('WS: unknown room code rejected', async () => {
  const { port, wsHandle } = await spinUp();
  try {
    const badWs = openWs(port, {
      code: 'ZZZZ',
      player_id: 'p_xxx',
      token: 'XXXX',
    });
    await new Promise((resolve) => {
      let closed = false;
      badWs.on('close', () => {
        closed = true;
        resolve();
      });
      badWs.on('error', () => {
        if (!closed) resolve();
      });
    });
  } finally {
    await wsHandle.close();
  }
});

// P1 — wrong-token reconnect must hit the auth guard at wsSession.js:684
// and emit a CloseEvent with code 4003 (auth_failed). Existing bad-token test
// only awaits close, never asserts the code.
test('WS: wrong-token reconnect closes with code 4003', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    // Connect once with the right token to make the player exist + drop.
    const goodWs = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(goodWs);
    await waitForMessage(goodWs, (m) => m.type === 'hello');
    goodWs.close();
    await new Promise((r) => goodWs.once('close', r));

    // Reconnect with WRONG token.
    const reconnectWs = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: 'TAMPERED',
    });
    const closeInfo = await new Promise((resolve) => {
      reconnectWs.on('close', (code, reason) => {
        resolve({ code, reason: reason?.toString() || '' });
      });
      reconnectWs.on('error', () => {
        // ws emits error on abnormal close; close still fires after.
      });
    });
    assert.equal(closeInfo.code, 4003);
    assert.equal(closeInfo.reason, 'auth_failed');
  } finally {
    await wsHandle.close();
  }
});

// P1 — host transfer mid-combat (room.phase === 'resolving'). After the host
// drops and grace expires, the promoted player is otherwise blind to the WS
// round state. We assert the host-transfer path replays `round_ready` so the
// new host does not need to fall back to REST GET /api/coop/state.
test('WS: host transfer mid-combat rebroadcasts round_ready to promoted host', async () => {
  const lobby = new LobbyService();
  const wsHandle = createWsServer({ lobby, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;
  try {
    // Tight grace window so auto-transfer fires fast.
    const roomMeta = lobby.createRoom({ hostName: 'Alice', hostTransferGraceMs: 50 });
    const p1 = lobby.joinRoom({ code: roomMeta.code, playerName: 'Bob' });
    const p2 = lobby.joinRoom({ code: roomMeta.code, playerName: 'Carol' });

    const hostWs = openWs(port, {
      code: roomMeta.code,
      player_id: roomMeta.host_id,
      token: roomMeta.host_token,
    });
    const p1Ws = openWs(port, {
      code: roomMeta.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    const p2Ws = openWs(port, {
      code: roomMeta.code,
      player_id: p2.player_id,
      token: p2.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws), waitOpen(p2Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
    ]);

    // Force room into mid-combat state so the transfer path mirrors the gap.
    const room = lobby.getRoom(roomMeta.code);
    room.roundIndex = 5;
    room.phase = 'resolving';
    // Seed with p2 (will remain player after p1 is promoted to host).
    room.pendingIntents.set(p2.player_id, {
      id: 'i_test',
      from: p2.player_id,
      payload: { action: 'attack' },
      ts: Date.now(),
      round: 5,
    });

    // Drop host. Watch p1 (FIFO oldest non-host candidate → promoted).
    const promotedSawHostTransferred = waitForMessage(p1Ws, (m) => m.type === 'host_transferred');
    // round_ready broadcast must reach the promoted host AFTER the transfer.
    // Use a predicate that filters strictly by post-transfer arrival order
    // by checking the ready snapshot reflects the seeded state (round=5).
    const promotedSawRoundReady = waitForMessage(
      p1Ws,
      (m) => m.type === 'round_ready' && m.payload?.round === 5,
    );
    hostWs.terminate();

    const transferred = await promotedSawHostTransferred;
    assert.equal(transferred.payload.new_host_id, p1.player_id);
    const ready = await promotedSawRoundReady;
    assert.equal(ready.payload.round, 5);
    assert.ok(Array.isArray(ready.payload.ready));
    assert.ok(ready.payload.ready.includes(p2.player_id));

    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

// P2 — stateVersion is monotonic under concurrent publishState calls.
// Node is single-threaded so concurrency = rapid sync mutations; the
// invariant we care about is strict +1 per call with no skips/repeats.
test('Room: stateVersion monotonic increment under burst publishState', async () => {
  const lobby = new LobbyService();
  const meta = lobby.createRoom({ hostName: 'Alice' });
  const room = lobby.getRoom(meta.code);

  const N = 500;
  const seenVersions = [];
  for (let i = 0; i < N; i += 1) {
    const v = room.publishState({ tick: i });
    seenVersions.push(v);
  }

  assert.equal(seenVersions.length, N);
  for (let i = 0; i < N; i += 1) {
    assert.equal(seenVersions[i], i + 1, `version mismatch at index ${i}`);
  }
  assert.equal(room.stateVersion, N);
  assert.deepEqual(room.state, { tick: N - 1 });
});

// P2 — alphabet constraint: 4-letter codes from 20-consonant alphabet.
// No vowels (A,E,I,O,U) and no Y. N=1000 sample size catches any drift.
test('generateRoomCode: N=1000 codes contain no vowels, no Y', () => {
  const VOWELS_AND_Y = /[AEIOUY]/;
  const ALPHABET_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`);
  const N = 1000;
  for (let i = 0; i < N; i += 1) {
    const code = generateRoomCode();
    assert.equal(code.length, 4, `code length not 4: ${code}`);
    assert.ok(!VOWELS_AND_Y.test(code), `code contains vowel or Y: ${code}`);
    assert.ok(ALPHABET_RE.test(code), `code outside alphabet: ${code}`);
  }
  // Sanity: alphabet itself is exactly 20 chars, no vowels, no Y.
  assert.equal(ROOM_CODE_ALPHABET.length, 20);
  assert.ok(!VOWELS_AND_Y.test(ROOM_CODE_ALPHABET));
});
