// C2-imprint STEP 1 -- WS transport for the imprint beat. Proves the mark drains
// server-side, broadcasts imprint_tally, and that submitter identity is SOCKET-BOUND
// (a player cannot mark an axis it does not own, even by sending it in the payload).
// Plan: docs/planning/2026-06-22-aa01-c2-imprint-build-spec.md

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

function waitOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function markIntent(axis, value) {
  return JSON.stringify({ type: 'intent', payload: { action: 'imprint_mark', axis, value } });
}

test('WS imprint_mark: device marks drain server-side -> hint on all 4 axes', async () => {
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
    // Host opens the beat (route does this via connectedQuorumPids; here the 2 players
    // are the connected device set -> a=[locomotion,defense], b=[offense,senses]).
    orch.openImprint({ connectedPlayerIds: [p1.player_id, p2.player_id] });

    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    const p2Ws = openWs(port, { code: room.code, player_id: p2.player_id, token: p2.player_token });
    await Promise.all([waitOpen(p1Ws), waitOpen(p2Ws)]);
    await Promise.all([
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
      waitForMessage(p2Ws, (m) => m.type === 'hello'),
    ]);

    // p1 owns locomotion + defense; p2 owns offense + senses. Mark the savana tuple.
    p1Ws.send(markIntent('locomotion', 'VELOCE'));
    p1Ws.send(markIntent('defense', 'DURA'));
    p2Ws.send(markIntent('offense', 'PROFONDA'));
    p2Ws.send(markIntent('senses', 'LONTANO'));

    const done = await waitForMessage(
      p2Ws,
      (m) => m.type === 'imprint_tally' && m.payload?.all_axes_marked === true,
      2500,
    );
    assert.equal(done.payload.branco_biome_hint.leans_toward, 'savana');
    assert.equal(done.payload.open, false, 'beat auto-closes on completion');

    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('WS imprint_mark: identity is socket-bound -> cannot mark an unowned axis', async () => {
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
    orch.openImprint({ connectedPlayerIds: [p1.player_id, p2.player_id] });

    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    await waitOpen(p1Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');

    // p1 owns [locomotion, defense]; offense belongs to p2. p1 tries to mark offense.
    p1Ws.send(markIntent('offense', 'PROFONDA'));
    const err = await waitForMessage(p1Ws, (m) => m.type === 'error', 2000);
    assert.equal(err.payload.code, 'axis_not_assigned');
    // offense stays unmarked on the orchestrator (not spoofed by the payload).
    assert.equal(orch.imprintTally().per_axis.offense, null);

    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});
