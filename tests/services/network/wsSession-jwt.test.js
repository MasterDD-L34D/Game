// Sprint R.1 — JWT auth tests for co-op WS multiplayer.
//
// Covers:
//   - Valid JWT accepted (player_joined broadcast fires)
//   - Expired JWT rejected with `auth_expired` error code
//   - Invalid signature rejected with `auth_failed`
//   - Missing token rejected with `auth_failed`
//   - Tampered claims (room_code mismatch) rejected
//   - jwtAuth helper unit-level: sign/verify/expired/malformed

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const {
  signPlayerToken,
  verifyPlayerToken,
  ALGORITHM,
} = require('../../../apps/backend/services/network/jwtAuth');
const {
  LobbyService,
  createWsServer,
} = require('../../../apps/backend/services/network/wsSession');

// Pin secret so signed tokens match what the server verifies.
process.env.AUTH_SECRET = 'test-secret-must-be-at-least-16-chars-long';

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
  const url = `ws://127.0.0.1:${port}/ws?code=${encodeURIComponent(code)}&player_id=${encodeURIComponent(player_id)}&token=${encodeURIComponent(token || '')}`;
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

function awaitClose(ws) {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (code, reason) => {
      if (resolved) return;
      resolved = true;
      resolve({ code, reason: reason ? reason.toString() : '' });
    };
    ws.on('close', done);
    ws.on('error', () => {
      // close still fires after error
    });
  });
}

// --- jwtAuth unit-level ---

test('jwtAuth: sign/verify roundtrip preserves canonical claims', () => {
  const token = signPlayerToken({ player_id: 'p_abc', room_code: 'WXYZ', role: 'host' });
  assert.equal(typeof token, 'string');
  const decoded = verifyPlayerToken(token);
  assert.equal(decoded.player_id, 'p_abc');
  assert.equal(decoded.room_code, 'WXYZ');
  assert.equal(decoded.role, 'host');
  assert.ok(Number.isFinite(decoded.iat));
  assert.ok(Number.isFinite(decoded.exp));
  assert.ok(decoded.exp > decoded.iat);
});

test('jwtAuth: expired token throws auth_expired', () => {
  // Use direct jwt.sign with negative expiresIn — the helper itself
  // refuses to mint pre-expired tokens (production safety) so we
  // simulate one for the verify-side assertion.
  const token = jwt.sign(
    { player_id: 'p_abc', room_code: 'WXYZ', role: 'player' },
    process.env.AUTH_SECRET,
    { algorithm: ALGORITHM, expiresIn: -10 },
  );
  assert.throws(
    () => verifyPlayerToken(token),
    (e) => e.code === 'auth_expired',
  );
});

test('jwtAuth: tampered signature throws auth_failed', () => {
  const token = signPlayerToken({ player_id: 'p_abc', room_code: 'WXYZ', role: 'player' });
  const tampered = token.slice(0, -3) + 'AAA';
  assert.throws(
    () => verifyPlayerToken(tampered),
    (e) => e.code === 'auth_failed',
  );
});

test('jwtAuth: malformed token throws auth_failed', () => {
  assert.throws(
    () => verifyPlayerToken('not-a-jwt'),
    (e) => e.code === 'auth_failed',
  );
  assert.throws(
    () => verifyPlayerToken(''),
    (e) => e.code === 'auth_failed',
  );
  assert.throws(
    () => verifyPlayerToken(null),
    (e) => e.code === 'auth_failed',
  );
});

test('jwtAuth: claim missing throws auth_failed', () => {
  // Token without required claims (signed with same secret).
  const malformed = jwt.sign({ stranger: true }, process.env.AUTH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: '1h',
  });
  assert.throws(
    () => verifyPlayerToken(malformed),
    (e) => e.code === 'auth_failed',
  );
});

test('jwtAuth: signPlayerToken validates required claims', () => {
  assert.throws(() => signPlayerToken(null));
  assert.throws(() => signPlayerToken({}));
  assert.throws(() => signPlayerToken({ player_id: 'p1' }));
  assert.throws(() => signPlayerToken({ player_id: 'p1', room_code: 'AB' }));
});

// --- WS integration ---

test('WS-JWT: valid JWT accepted, hello + player_joined broadcast', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    // host_token + player_token should be JWTs now.
    const hostClaims = verifyPlayerToken(room.host_token);
    assert.equal(hostClaims.role, 'host');
    assert.equal(hostClaims.room_code, room.code);
    const p1Claims = verifyPlayerToken(p1.player_token);
    assert.equal(p1Claims.role, 'player');
    assert.equal(p1Claims.player_id, p1.player_id);

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    await waitOpen(hostWs);
    const hostHello = await waitForMessage(hostWs, (m) => m.type === 'hello');
    assert.equal(hostHello.payload.role, 'host');

    const hostSawPlayerJoined = waitForMessage(
      hostWs,
      (m) => m.type === 'player_connected' && m.payload.player_id === p1.player_id,
    );
    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(p1Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');
    await hostSawPlayerJoined;

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS-JWT: expired token rejected with auth_expired (close 4002)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    // Mint an expired token for the same player. Helper refuses to mint
    // pre-expired tokens (production safety) so use jwt.sign directly.
    const expired = jwt.sign(
      { player_id: p1.player_id, room_code: room.code, role: 'player' },
      process.env.AUTH_SECRET,
      { algorithm: ALGORITHM, expiresIn: -10 },
    );

    const ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: expired,
    });
    let errPayload = null;
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'error') errPayload = msg.payload;
      } catch {
        // noop
      }
    });
    const closeInfo = await awaitClose(ws);
    assert.equal(closeInfo.code, 4002);
    assert.equal(closeInfo.reason, 'auth_expired');
    assert.ok(errPayload && errPayload.code === 'auth_expired');
  } finally {
    await wsHandle.close();
  }
});

test('WS-JWT: tampered signature rejected with auth_failed (close 4003)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const tampered = p1.player_token.slice(0, -3) + 'AAA';

    const ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: tampered,
    });
    const closeInfo = await awaitClose(ws);
    assert.equal(closeInfo.code, 4003);
    assert.equal(closeInfo.reason, 'auth_failed');
  } finally {
    await wsHandle.close();
  }
});

test('WS-JWT: missing token rejected with auth_failed (close 4003)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'Alice' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: '',
    });
    const closeInfo = await awaitClose(ws);
    assert.equal(closeInfo.code, 4003);
    assert.equal(closeInfo.reason, 'auth_failed');
  } finally {
    await wsHandle.close();
  }
});

test('WS-JWT: room_code claim mismatch rejected with auth_failed', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const roomA = lobby.createRoom({ hostName: 'Alice' });
    const roomB = lobby.createRoom({ hostName: 'Carol' });
    const p1 = lobby.joinRoom({ code: roomA.code, playerName: 'Bob' });
    // Token signed for roomA, attempt connect on roomB (cross-room replay).
    const ws = openWs(port, {
      code: roomB.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    const closeInfo = await awaitClose(ws);
    // Player_id is unknown in roomB; either auth_failed (room mismatch) or
    // auth_failed (player not found). Both close 4003.
    assert.equal(closeInfo.code, 4003);
    assert.equal(closeInfo.reason, 'auth_failed');
  } finally {
    await wsHandle.close();
  }
});
