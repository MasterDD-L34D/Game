// 2026-05-20 — Multi-player disconnect race WS e2e (BACKLOG coverage gap).
// Composes pattern P1 (spinUp coopStore) + P2 (attachBuffer/waitForMessage)
// + P5 (coopStore.getOrCreate seed world_setup) + P6 (terminate vs close)
// from museum card M-2026-05-20-001.
//
// Validates B-NEW-1 fix 2026-05-08 (wsSession.js:1524) end-to-end:
// connected-only quorum filter so phone smoke does not stall when a peer
// drops mid-vote. Unit coverage already in coopOrchestrator.test.js
// (worldTally pure function); this file exercises the full WS intent →
// orch.voteWorld → connectedPids filter → world_tally broadcast chain.
//
// Ref:
//  - museum card: docs/museum/cards/coop-ws-test-infra-patterns-2026-05-20.md
//  - wsSession.js:1512-1543 (world_vote intent handler)
//  - coopOrchestrator.js:511-551 (worldTally connected_* fields)

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { LobbyService, createWsServer } = require('../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');

// ---------------------------------------------------------------------------
// WS test harness (P1 + P2 from museum card, copied verbatim from
// coopWsRebroadcast.test.js to keep file standalone — refactor to shared
// helper deferred to future cleanup sprint).
// ---------------------------------------------------------------------------

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

async function spinUp(coopStore) {
  const lobby = new LobbyService();
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;
  return { lobby, port, wsHandle };
}

// Seed orchestrator into world_setup phase + roster so world_vote intent
// can be drained without simulating full character_creation onboarding.
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

function sendVote(ws, accept) {
  ws.send(
    JSON.stringify({
      type: 'intent',
      payload: { action: 'world_vote', accept: Boolean(accept) },
    }),
  );
}

// ---------------------------------------------------------------------------
// Test 1 — 3-player vote scenario: drop mid-tally must not satisfy quorum
// until remaining connected player votes.
// ---------------------------------------------------------------------------

test('disconnect race: 3 players, p_b drops after voting, quorum only fires when p_c votes', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    // Tight ghost timeout so we do not leave timers dangling past test end.
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 5000 });
    const roomObj = lobby.getRoom(room.code);
    roomObj.ghostTimeoutMs = 60;
    const pA = lobby.joinRoom({ code: room.code, playerName: 'A' });
    const pB = lobby.joinRoom({ code: room.code, playerName: 'B' });
    const pC = lobby.joinRoom({ code: room.code, playerName: 'C' });

    seedWorldSetup(coopStore, room.code, [pA.player_id, pB.player_id, pC.player_id]);

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const aWs = openWs(port, {
      code: room.code,
      player_id: pA.player_id,
      token: pA.player_token,
    });
    const bWs = openWs(port, {
      code: room.code,
      player_id: pB.player_id,
      token: pB.player_token,
    });
    const cWs = openWs(port, {
      code: room.code,
      player_id: pC.player_id,
      token: pC.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(aWs), waitOpen(bWs), waitOpen(cWs)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(aWs, (m) => m.type === 'hello'),
      waitForMessage(bWs, (m) => m.type === 'hello'),
      waitForMessage(cWs, (m) => m.type === 'hello'),
    ]);

    // Drop the initial world_tally snapshot emitted on hello (sendCoopStateSnapshot
    // at wsSession.js:997 calls worldTally WITHOUT connectedPlayerIds — payload
    // lacks connected_* fields). We only care about post-vote broadcasts here.
    hostWs.__buf = hostWs.__buf.filter((m) => m.type !== 'world_tally');

    // p_a votes accept.
    sendVote(aWs, true);
    const tallyAfterA = await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && typeof m.payload?.connected_total === 'number',
    );
    // Pre-drop: 3 non-host players all connected.
    assert.equal(tallyAfterA.payload.connected_total, 3);
    assert.equal(tallyAfterA.payload.connected_accept, 1);
    assert.equal(tallyAfterA.payload.connected_pending, 2);
    assert.equal(tallyAfterA.payload.all_connected_accepted, false);

    // p_b votes accept.
    sendVote(bWs, true);
    const tallyAfterB = await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && m.payload?.connected_accept === 2,
    );
    assert.equal(tallyAfterB.payload.connected_total, 3);
    assert.equal(tallyAfterB.payload.connected_pending, 1);
    assert.equal(tallyAfterB.payload.all_connected_accepted, false);

    // p_b crashes (abrupt drop, no CLOSE frame). Wait for host to observe.
    const hostSawDisconnect = waitForMessage(
      hostWs,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === pB.player_id,
    );
    bWs.terminate();
    await hostSawDisconnect;

    // Now p_a votes again (no-op; same accept) to trigger a fresh tally
    // broadcast that uses the post-drop connectedPids filter. Without this
    // re-vote, no automatic re-tally fires — connected_total stays stale in
    // the host's last cached snapshot. Pre-fix B-NEW-1: broadcast would
    // still show connected_total=3 (counts p_b) and pending=1 → phone smoke
    // stuck. Post-fix: connected_total=2 (drops p_b) and pending=1 (p_c).
    aWs.__buf = aWs.__buf.filter((m) => m.type !== 'world_tally');
    sendVote(aWs, true);
    const tallyPostDrop = await waitForMessage(
      aWs,
      (m) =>
        m.type === 'world_tally' &&
        typeof m.payload?.connected_total === 'number' &&
        m.payload.connected_total === 2,
      2000,
    );
    assert.equal(tallyPostDrop.payload.connected_total, 2);
    // p_a is one of the 2 connected and voted accept; p_c connected pending.
    assert.equal(tallyPostDrop.payload.connected_accept, 1);
    assert.equal(tallyPostDrop.payload.connected_pending, 1);
    assert.equal(tallyPostDrop.payload.all_connected_accepted, false);
    // Global counts still see p_b's persisted vote.
    assert.equal(tallyPostDrop.payload.accept, 2);

    // p_c votes accept → quorum of remaining connected fires.
    sendVote(cWs, true);
    const tallyFinal = await waitForMessage(
      cWs,
      (m) => m.type === 'world_tally' && m.payload?.all_connected_accepted === true,
      2000,
    );
    assert.equal(tallyFinal.payload.connected_total, 2);
    assert.equal(tallyFinal.payload.connected_accept, 2);
    assert.equal(tallyFinal.payload.connected_pending, 0);

    hostWs.close();
    aWs.close();
    cWs.close();
  } finally {
    await wsHandle.close();
  }
});

// ---------------------------------------------------------------------------
// Test 2 — 2-player reject + drop: disconnected REJECT vote excluded from
// connected_reject quorum so connected_accept becomes unanimous.
// ---------------------------------------------------------------------------

test('disconnect race: p_b reject + drop → connected_reject=0 + all_connected_accepted=true (p_a unanime)', async () => {
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
    roomObj.ghostTimeoutMs = 60;
    const pA = lobby.joinRoom({ code: room.code, playerName: 'A' });
    const pB = lobby.joinRoom({ code: room.code, playerName: 'B' });

    seedWorldSetup(coopStore, room.code, [pA.player_id, pB.player_id]);

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const aWs = openWs(port, {
      code: room.code,
      player_id: pA.player_id,
      token: pA.player_token,
    });
    const bWs = openWs(port, {
      code: room.code,
      player_id: pB.player_id,
      token: pB.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(aWs), waitOpen(bWs)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(aWs, (m) => m.type === 'hello'),
      waitForMessage(bWs, (m) => m.type === 'hello'),
    ]);

    // Drop hello-snapshot world_tally (no connected_* fields).
    hostWs.__buf = hostWs.__buf.filter((m) => m.type !== 'world_tally');

    // p_a accept; p_b reject. Pre-drop both connected → all_connected_accepted=false.
    sendVote(aWs, true);
    await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && typeof m.payload?.connected_total === 'number',
    );
    sendVote(bWs, false);
    const tallyBothVoted = await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && m.payload?.connected_reject === 1,
    );
    assert.equal(tallyBothVoted.payload.connected_total, 2);
    assert.equal(tallyBothVoted.payload.connected_accept, 1);
    assert.equal(tallyBothVoted.payload.connected_reject, 1);
    assert.equal(tallyBothVoted.payload.all_connected_accepted, false);

    // p_b drops (abrupt). Host observes disconnect.
    const hostSawDisconnect = waitForMessage(
      hostWs,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === pB.player_id,
    );
    bWs.terminate();
    await hostSawDisconnect;

    // p_a re-submits accept to trigger fresh tally with post-drop filter.
    aWs.__buf = aWs.__buf.filter((m) => m.type !== 'world_tally');
    sendVote(aWs, true);
    const tallyPostDrop = await waitForMessage(
      aWs,
      (m) => m.type === 'world_tally' && m.payload?.connected_total === 1,
      2000,
    );
    assert.equal(tallyPostDrop.payload.connected_total, 1);
    assert.equal(tallyPostDrop.payload.connected_accept, 1);
    assert.equal(tallyPostDrop.payload.connected_reject, 0); // p_b's reject excluded
    assert.equal(tallyPostDrop.payload.all_connected_accepted, true);
    // Global reject still visible to caller wanting persistent record.
    assert.equal(tallyPostDrop.payload.reject, 1);
    assert.equal(tallyPostDrop.payload.accept, 1);

    hostWs.close();
    aWs.close();
  } finally {
    await wsHandle.close();
  }
});

// ---------------------------------------------------------------------------
// Test 3 — Reconnect within ghost timeout: vote preserved, tally reconciled.
// ---------------------------------------------------------------------------

test('disconnect race: p_a reconnects within ghost timeout → vote preserved + tally reconciled', async () => {
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
    // Long enough that the close → reconnect handshake completes before
    // ghost cleanup fires. Test reconnects as fast as WS allows.
    roomObj.ghostTimeoutMs = 1500;
    const pA = lobby.joinRoom({ code: room.code, playerName: 'A' });
    const pB = lobby.joinRoom({ code: room.code, playerName: 'B' });

    seedWorldSetup(coopStore, room.code, [pA.player_id, pB.player_id]);

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const aWs = openWs(port, {
      code: room.code,
      player_id: pA.player_id,
      token: pA.player_token,
    });
    const bWs = openWs(port, {
      code: room.code,
      player_id: pB.player_id,
      token: pB.player_token,
    });
    await Promise.all([waitOpen(hostWs), waitOpen(aWs), waitOpen(bWs)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(aWs, (m) => m.type === 'hello'),
      waitForMessage(bWs, (m) => m.type === 'hello'),
    ]);

    // Drop hello-snapshot world_tally (no connected_* fields).
    hostWs.__buf = hostWs.__buf.filter((m) => m.type !== 'world_tally');

    // p_a votes accept first.
    sendVote(aWs, true);
    const tallyAfterA = await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && typeof m.payload?.connected_total === 'number',
    );
    assert.equal(tallyAfterA.payload.connected_accept, 1);
    assert.equal(tallyAfterA.payload.connected_total, 2);

    // p_a drops (graceful close to simulate brief network hiccup).
    const hostSawDisconnect = waitForMessage(
      hostWs,
      (m) => m.type === 'player_disconnected' && m.payload.player_id === pA.player_id,
    );
    aWs.close();
    await hostSawDisconnect;

    // p_a reconnects with SAME token before ghost timer fires. The vote
    // record in orch.worldVotes is independent of the WS lifecycle — it
    // persists across socket drop/reconnect.
    const aWs2 = openWs(port, {
      code: room.code,
      player_id: pA.player_id,
      token: pA.player_token,
    });
    await waitOpen(aWs2);
    const hello2 = await waitForMessage(aWs2, (m) => m.type === 'hello');
    assert.equal(hello2.payload.player_id, pA.player_id);

    // Confirm room.players still has p_a marked connected post reattach.
    const reRoom = lobby.getRoom(room.code);
    assert.equal(reRoom.players.get(pA.player_id).connected, true);
    // Vote persisted across drop.
    const orch = coopStore.get(room.code);
    assert.equal(orch.worldVotes.get(pA.player_id).accept, true);

    // p_b now votes accept → quorum across both reconnected players fires.
    hostWs.__buf = hostWs.__buf.filter((m) => m.type !== 'world_tally');
    sendVote(bWs, true);
    const tallyReconciled = await waitForMessage(
      hostWs,
      (m) => m.type === 'world_tally' && m.payload?.all_connected_accepted === true,
      2000,
    );
    // Both connected → connected_total === 2, both voted accept.
    assert.equal(tallyReconciled.payload.connected_total, 2);
    assert.equal(tallyReconciled.payload.connected_accept, 2);
    assert.equal(tallyReconciled.payload.connected_reject, 0);
    assert.equal(tallyReconciled.payload.connected_pending, 0);
    assert.equal(tallyReconciled.payload.all_connected_accepted, true);

    hostWs.close();
    aWs2.close();
    bWs.close();
  } finally {
    await wsHandle.close();
  }
});
