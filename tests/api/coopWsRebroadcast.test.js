// F-1 2026-04-25 — host transfer triggers coop state rebroadcast.
// Ref: docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md:95
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

test('F-1: host transfer after drop rebroadcasts coop phase_change to survivors', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });

  // createWsServer reads coopStore by reference; manual rewire after construction.
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    // Fast-fail grace so test finishes quickly.
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 80 });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    // Seed orchestrator: already in world_setup phase when host drops.
    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    orch.submitCharacter(
      p1.player_id,
      { name: 'Bobby', form_id: 'istj_custode' },
      { allPlayerIds: [p1.player_id] },
    );
    assert.equal(orch.phase, 'world_setup');

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

    // Clear any setup-phase messages emitted before host drop.
    p1Ws.__buf = [];

    // Host drops — schedules transfer after 80ms grace.
    hostWs.close();

    // p1 should receive phase_change with reason host_transferred.
    const phaseMsg = await waitForMessage(
      p1Ws,
      (m) => m.type === 'phase_change' && m.payload?.reason === 'host_transferred',
      2000,
    );
    assert.equal(phaseMsg.payload.phase, 'world_setup');
    // Also should receive character_ready_list snapshot.
    const readyMsg = await waitForMessage(p1Ws, (m) => m.type === 'character_ready_list', 2000);
    assert.ok(Array.isArray(readyMsg.payload));

    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('F-1: host transfer without coopStore is no-op (backward compat)', async () => {
  // Spinning up WITHOUT coopStore must not crash on host drop.
  const { lobby, port, wsHandle } = await spinUp(null);
  try {
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 60 });
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

    hostWs.close();

    // Wait past grace window and ensure room did not close unexpectedly.
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(lobby.getRoom(room.code)?.hostId, p1.player_id);

    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});
