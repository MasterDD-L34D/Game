// S22-B Task 8 -- when a phone mating_vote reaches quorum, the WS handler
// rolls the offspring server-side via coopMatingResolver (metaStore.rollOffspring)
// and broadcasts { type: 'mating_resolved', payload: { pair_id, offspring, ok } }
// to the room. Mirror harness of wsSession-matingVote.test.js.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const {
  LobbyService,
  createWsServer,
} = require('../../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');

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

test('S22-B: phone mating_vote quorum rolls offspring + broadcasts mating_resolved', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const metaStoreFactory = () => ({
    rollOffspring: async () => ({ success: true, offspring: { lineage_id: 'L1' } }),
  });
  const wsHandle = createWsServer({ lobby, coopStore, metaStoreFactory, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    // Drive to debrief WITH survivors so the winning pair maps to units.
    orch.phase = 'combat';
    orch.endCombat({ outcome: 'victory', survivors: [{ id: 'u_a' }, { id: 'u_b' }] });

    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(p1Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');

    // Single connected non-host player votes -> connected-only quorum met.
    p1Ws.send(
      JSON.stringify({ type: 'intent', payload: { action: 'mating_vote', pair_id: 'u_a__u_b' } }),
    );

    const resolved = await waitForMessage(p1Ws, (m) => m.type === 'mating_resolved', 2500);
    assert.equal(resolved.payload.pair_id, 'u_a__u_b');
    assert.equal(resolved.payload.ok, true);
    assert.equal(resolved.payload.offspring.lineage_id, 'L1');

    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});
