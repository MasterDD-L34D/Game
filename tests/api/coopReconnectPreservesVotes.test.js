// SPEC-K K-01 DC#5 (RATIFIED 2026-06-20, master-dd: persist + verify reconnect
// keeps a player's changes). A disconnected player's vote PERSISTS in the
// orchestrator vote maps (route/world/mission/mating are cleared ONLY on
// run-advance, never on disconnect) so that a reconnect with the same token
// brings the player back with their choice intact -- this is the documented
// #2597 P1-B invariant the route-vote `leading_node_id` relies on. These tests
// LOCK that contract so a future "prune on disconnect" change cannot silently
// break reconnect-preserves-changes.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { LobbyService, createWsServer } = require('../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

// ---- Part A: orchestrator-level (deterministic; the data contract) ----

test('route-vote: a disconnected voter PERSISTS and re-counts on reconnect (DC#5)', () => {
  const co = new CoopOrchestrator({ roomCode: 'RVR', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_x'] });
  co.openRouteChoice([
    { node_id: 'NODE_A', weight: 1 },
    { node_id: 'NODE_B', weight: 1 },
  ]);
  const all = ['p1', 'p2'];
  co.voteRoute('p1', 'NODE_A', { allPlayerIds: all, connectedPlayerIds: all });
  let t = co.voteRoute('p2', 'NODE_B', { allPlayerIds: all, connectedPlayerIds: all });
  assert.equal(t.all_connected_voted, true);
  assert.equal(t.per_player.p2.node_id, 'NODE_B');

  // p2 disconnects: the connected quorum self-heals (p2 excluded) BUT the vote
  // is NOT pruned -- it persists in per_player + the raw node tallies.
  t = co.routeTally(all, ['p1']);
  assert.equal(t.per_player.p2.node_id, 'NODE_B'); // preserved
  assert.equal(t.connected_voted, 1); // p2 out of connected quorum
  assert.ok(
    t.tallies.find((x) => x.node_id === 'NODE_B'),
    'departed voter still counts in raw leading tally (intentional, #2597)',
  );

  // p2 reconnects: same vote re-counts, nothing lost.
  t = co.routeTally(all, ['p1', 'p2']);
  assert.equal(t.per_player.p2.node_id, 'NODE_B'); // unchanged across reconnect
  assert.equal(t.connected_voted, 2);
  assert.equal(t.all_connected_voted, true);
});

test('world-vote: a disconnected voter PERSISTS and re-counts on reconnect', () => {
  const co = new CoopOrchestrator({ roomCode: 'WVR', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_x'] });
  co._setPhase('world_setup');
  const all = ['p1', 'p2'];
  co.voteWorld('p1', { accept: true, allPlayerIds: all, connectedPlayerIds: all });
  co.voteWorld('p2', { accept: true, allPlayerIds: all, connectedPlayerIds: all });

  // p2 disconnect: vote persists, connected count drops.
  let t = co.worldTally(all, ['p1']);
  assert.ok(t.per_player.p2);
  assert.equal(t.per_player.p2.accept, true);
  assert.equal(t.connected_accept, 1);

  // p2 reconnect: same vote re-counts.
  t = co.worldTally(all, ['p1', 'p2']);
  assert.ok(t.per_player.p2);
  assert.equal(t.connected_accept, 2);
  assert.equal(t.all_connected_accepted, true);
});

test('a disconnect NEVER deletes votes (only run-advance clears them)', () => {
  const co = new CoopOrchestrator({ roomCode: 'CLR', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_a', 'enc_b'] });
  co._setPhase('world_setup');
  co.voteWorld('p1', { accept: true, allPlayerIds: ['p1'] });
  assert.equal(co.worldVotes.size, 1);
  // nothing in the disconnect path mutates worldVotes; only advance clears it.
  co._setPhase('debrief');
  co.advanceScenarioOrEnd();
  assert.equal(co.worldVotes.size, 0); // cleared by run-advance, as designed
});

// ---- Part B: WS e2e (real disconnect + reconnect, same token) ----

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

function waitOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function seedWorldSetup(coopStore, roomCode, playerIds) {
  const orch = coopStore.getOrCreate(roomCode);
  orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
  for (const pid of playerIds) {
    orch.submitCharacter(
      pid,
      { name: `char_${pid}`, form_id: 'istj_custode' },
      { allPlayerIds: playerIds },
    );
  }
  assert.equal(orch.phase, 'world_setup');
  return orch;
}

test('WS e2e: world-vote survives a real disconnect + reconnect (same token)', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 5000 });
    const roomObj = lobby.getRoom(room.code);
    roomObj.ghostTimeoutMs = 60_000; // keep p2 record alive across the brief reconnect
    const pA = lobby.joinRoom({ code: room.code, playerName: 'A' });
    const pB = lobby.joinRoom({ code: room.code, playerName: 'B' });
    const orch = seedWorldSetup(coopStore, room.code, [pA.player_id, pB.player_id]);

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const aWs = openWs(port, { code: room.code, player_id: pA.player_id, token: pA.player_token });
    let bWs = openWs(port, { code: room.code, player_id: pB.player_id, token: pB.player_token });
    await Promise.all([waitOpen(hostWs), waitOpen(aWs), waitOpen(bWs)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(aWs, (m) => m.type === 'hello'),
      waitForMessage(bWs, (m) => m.type === 'hello'),
    ]);

    // Both players vote accept.
    aWs.send(JSON.stringify({ type: 'intent', payload: { action: 'world_vote', accept: true } }));
    bWs.send(JSON.stringify({ type: 'intent', payload: { action: 'world_vote', accept: true } }));
    await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && m.payload?.per_player?.[pB.player_id] != null,
    );
    assert.ok(orch.worldVotes.has(pB.player_id), 'p2 vote recorded');

    // p2 disconnects (close socket) -> player record drops connected.
    bWs.close();
    await waitForMessage(hostWs, (m) => m.type === 'player_disconnected');
    assert.equal(roomObj.players.get(pB.player_id).connected, false);
    // The vote is NOT pruned on disconnect.
    assert.ok(orch.worldVotes.has(pB.player_id), 'p2 vote persists through disconnect');

    // p2 reconnects with the SAME token.
    bWs = openWs(port, { code: room.code, player_id: pB.player_id, token: pB.player_token });
    await waitOpen(bWs);
    await waitForMessage(bWs, (m) => m.type === 'hello');
    assert.equal(roomObj.players.get(pB.player_id).connected, true, 'p2 reconnected');
    // The change is preserved once reconnected -- the user requirement.
    assert.ok(orch.worldVotes.has(pB.player_id), 'p2 vote preserved across reconnect');
    assert.equal(orch.worldVotes.get(pB.player_id).accept, true);

    hostWs.close();
    aWs.close();
    bWs.close();
  } finally {
    // Use the createWsServer wrapper (clears the heartbeat interval + terminates
    // any still-connected clients) -- a bare wss.close() leaks the heartbeat and
    // open sockets if an assertion above throws (Codex P2 #2884).
    await wsHandle.close();
  }
});
