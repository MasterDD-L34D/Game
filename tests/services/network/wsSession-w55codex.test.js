// Sprint R codex bundle — fixes for PR #2031 + #2033 + #2034 + #98
// (Godot paired snapshot_required state attach).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LobbyService } = require('../../../apps/backend/services/network/wsSession');
const jsonPatch = require('../../../apps/backend/services/network/jsonPatch');

// --- Codex PR #2033 P2: jsonPatch reject missing/non-string path ---

test('jsonPatch decodePointer throws on missing path field', () => {
  assert.throws(
    () => jsonPatch.applyOp({ foo: 1 }, { op: 'replace', value: 99 }),
    /invalid_pointer/,
  );
});

test('jsonPatch decodePointer throws on non-string path', () => {
  assert.throws(
    () => jsonPatch.applyOp({}, { op: 'replace', path: 123, value: 'x' }),
    /invalid_pointer/,
  );
});

test('jsonPatch decodePointer throws on null path', () => {
  assert.throws(() => jsonPatch.applyOp({}, { op: 'remove', path: null }), /invalid_pointer/);
});

test('jsonPatch empty-string path still legitimate root op (RFC 6901)', () => {
  // Empty-string IS a valid root pointer; only missing/non-string is invalid.
  const result = jsonPatch.applyOp({ a: 1 }, { op: 'replace', path: '', value: { b: 2 } });
  assert.deepEqual(result, { b: 2 });
});

test('jsonPatch malformed op without path does NOT silently replace state', () => {
  // Pre-fix: { op: 'remove' } would clear entire state. Post-fix: throws.
  assert.throws(() => jsonPatch.applyOp({ critical: 'data' }, { op: 'remove' }), /invalid_pointer/);
});

// --- Codex PR #2034 P1: ghost cleanup gated on active socket ---

test('detachSocket with stale socket arg is no-op (superseded reconnect race)', () => {
  const lobby = new LobbyService({ ghostTimeoutMs: 1000 });
  const { code } = lobby.createRoom({ hostName: 'Host' });
  const room = lobby.getRoom(code);
  const join = lobby.joinRoom({ code, playerName: 'Guest' });
  const playerId = join.player_id;
  // Simulate first socket attach.
  const oldSocket = { readyState: 1, close: () => {} };
  room.attachSocket(playerId, oldSocket);
  // Simulate reconnect — new socket attaches, old gets superseded.
  const newSocket = { readyState: 1, close: () => {} };
  room.attachSocket(playerId, newSocket);
  // Old socket's deferred close event fires → detachSocket(playerId, oldSocket).
  // With socket arg, must NOT clear new socket nor schedule ghost.
  const result = room.detachSocket(playerId, oldSocket);
  assert.equal(result, false, 'stale close returns false');
  const p = room.getPlayer(playerId);
  assert.equal(p.socket, newSocket, 'new socket preserved');
  assert.equal(p.connected, true, 'still connected');
});

test('detachSocket with current socket arg clears + schedules ghost', () => {
  const lobby = new LobbyService({ ghostTimeoutMs: 1000 });
  const { code } = lobby.createRoom({ hostName: 'Host' });
  const room = lobby.getRoom(code);
  const join = lobby.joinRoom({ code, playerName: 'Guest' });
  const playerId = join.player_id;
  const sock = { readyState: 1, close: () => {} };
  room.attachSocket(playerId, sock);
  const ok = room.detachSocket(playerId, sock);
  assert.equal(ok, true);
  const p = room.getPlayer(playerId);
  assert.equal(p.socket, null);
  assert.equal(p.connected, false);
});

test('detachSocket without socket arg keeps legacy behavior', () => {
  const lobby = new LobbyService({ ghostTimeoutMs: 1000 });
  const { code } = lobby.createRoom({ hostName: 'Host' });
  const room = lobby.getRoom(code);
  const join = lobby.joinRoom({ code, playerName: 'Guest' });
  const playerId = join.player_id;
  const sock = { readyState: 1, close: () => {} };
  room.attachSocket(playerId, sock);
  // Legacy call without socket — clears unconditionally.
  const ok = room.detachSocket(playerId);
  assert.equal(ok, true);
  assert.equal(room.getPlayer(playerId).connected, false);
});

// --- Codex PR #2031 P1: legacy raw-token fallback for hydrated rooms ---
// Note: full WS integration test would require live ws server + JWT signing.
// Verified at unit level via Room.authenticate accepting raw tokens.

test('Room.authenticate accepts legacy raw token (back-compat for hydrated rooms)', () => {
  const lobby = new LobbyService();
  const { code } = lobby.createRoom({ hostName: 'Host' });
  const room = lobby.getRoom(code);
  const join = lobby.joinRoom({ code, playerName: 'Guest' });
  // Room.authenticate compares raw token field; this is what the JWT
  // fallback path calls when JWT verify fails on legacy tokens.
  const p = room.authenticate(join.player_id, join.player_token);
  assert.ok(p, 'raw token authenticated');
});
