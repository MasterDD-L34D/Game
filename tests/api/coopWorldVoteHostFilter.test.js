// G5 #2746 — world_vote drain must not count the TV-mirror host in the tally.
//
// The WS world_vote handler passed UNFILTERED room player ids (host included)
// as allPlayerIds to orch.voteWorld -> worldTally.total counted the host TV,
// so 2 players showed "2 waiting / 3 total". The connected_* path already
// filtered the host (all_connected_accepted was correct), so this was a
// display-only inflation. Fix mirrors the role-aware lifecycle quorum
// (lifecycleQuorumPids, #2707/#2708) used by character_create / lineage_choice.
//
// Ref: MasterDD-L34D/Game#2746 voce G5.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { LobbyService, createWsServer } = require('../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');

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

test('G5 #2746: world_vote tally total excludes the TV-mirror host', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Cat' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    orch._setPhase('world_setup');

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    const p2Ws = openWs(port, { code: room.code, player_id: p2.player_id, token: p2.player_token });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws), waitOpen(p2Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
    ]);

    // One player votes; the broadcast tally must count only the 2 players.
    p1Ws.send(
      JSON.stringify({
        type: 'intent',
        payload: { action: 'world_vote', scenario_id: 'enc_tutorial_01', choice: 'accept' },
      }),
    );

    // Skip the connect-snapshot world_tally (accept 0); assert on the tally
    // produced by p1's vote.
    const tallyMsg = await waitForMessage(
      p2Ws,
      (m) => m.type === 'world_tally' && m.payload?.accept >= 1,
      2000,
    );
    const tally = tallyMsg.payload;
    assert.equal(tally.total, 2, `total must exclude the host TV (got ${tally.total})`);
    assert.equal(tally.accept, 1);
    assert.equal(
      tally.pending,
      1,
      `pending = players not yet voted, host excluded (got ${tally.pending})`,
    );

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('G5 #2746 (Codex P2): non-playing host world_vote rejected, tally stays consistent', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Cat' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    orch._setPhase('world_setup');

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    const p2Ws = openWs(port, { code: room.code, player_id: p2.player_id, token: p2.player_token });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws), waitOpen(p2Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
    ]);

    // The TV-mirror host (no character) sends a world_vote: must be rejected,
    // NOT persisted (else it pollutes the tally numerator while the denominator
    // recomputes without the host -> accept > total).
    hostWs.send(
      JSON.stringify({
        type: 'intent',
        payload: { action: 'world_vote', scenario_id: 'enc_tutorial_01', choice: 'accept' },
      }),
    );
    const hostErr = await waitForMessage(hostWs, (m) => m.type === 'error', 2000);
    assert.equal(hostErr.payload.code, 'not_a_player', 'non-playing host vote rejected');

    // Now a real player votes; the tally must reflect only the 2 players.
    p1Ws.send(
      JSON.stringify({
        type: 'intent',
        payload: { action: 'world_vote', scenario_id: 'enc_tutorial_01', choice: 'accept' },
      }),
    );
    const tallyMsg = await waitForMessage(
      p2Ws,
      (m) => m.type === 'world_tally' && m.payload?.accept >= 1,
      2000,
    );
    const tally = tallyMsg.payload;
    assert.equal(tally.total, 2, `total must be 2 players (got ${tally.total})`);
    assert.equal(tally.accept, 1, `only p1 counted, host vote not persisted (got ${tally.accept})`);
    assert.ok(tally.accept <= tally.total, 'accept must never exceed total');
    assert.equal(tally.pending, 1, `p2 still pending (got ${tally.pending})`);

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});
