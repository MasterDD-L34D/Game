// N1 Nido-hub — nido_start_mission WS intent routes to
// orchestrator.startMissionFromNido (host-only) and broadcasts
// phase_change -> world_setup. Mirror of next_macro handler shape.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const {
  LobbyService,
  createWsServer,
} = require('../../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');

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
  const url = `ws://127.0.0.1:${port}/ws?code=${encodeURIComponent(code)}&player_id=${encodeURIComponent(player_id)}&token=${encodeURIComponent(token)}`;
  return attachBuffer(new WebSocket(url));
}

async function waitOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

test('N1: nido_start_mission intent -> startMissionFromNido -> phase_change world_setup broadcast', async () => {
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

    const orch = coopStore.getOrCreate(room.code);
    // Two scenarios so advanceScenarioOrEnd lands on world_setup not ended.
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    // Force orchestrator to nido phase so startMissionFromNido is accepted.
    orch.phase = 'nido';

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

    hostWs.send(JSON.stringify({ type: 'intent', payload: { action: 'nido_start_mission' } }));

    // Host receives nido_start_mission_accepted ack.
    const ack = await waitForMessage(hostWs, (m) => m.type === 'nido_start_mission_accepted', 2000);
    assert.equal(ack.payload.phase, 'world_setup');

    // All connected clients receive phase_change -> world_setup.
    const [hostPc, p1Pc] = await Promise.all([
      waitForMessage(
        hostWs,
        (m) => m.type === 'phase_change' && m.payload?.phase === 'world_setup',
        2000,
      ),
      waitForMessage(
        p1Ws,
        (m) => m.type === 'phase_change' && m.payload?.phase === 'world_setup',
        2000,
      ),
    ]);
    assert.equal(hostPc.payload.phase, 'world_setup');
    assert.equal(p1Pc.payload.phase, 'world_setup');

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('G3 #2746: next_macro -> nido phase broadcasts phase_change(nido) to phones', async () => {
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

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    // Post-combat debrief + Nido unlocked: next_macro must route to the nido
    // hub. Pre-fix the drain only published world_setup/ended -> phones never
    // saw phase_change(nido) and could not enter MODE_NIDO (gap G3).
    orch.phase = 'debrief';
    orch._nidoUnlocked = true;

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

    hostWs.send(
      JSON.stringify({ type: 'intent', payload: { action: 'next_macro', choice: 'advance' } }),
    );

    // Host ack confirms the orch advanced into the nido phase.
    const ack = await waitForMessage(hostWs, (m) => m.type === 'next_macro_accepted', 2000);
    assert.equal(ack.payload.phase, 'nido');

    // Both phones must receive a versioned phase_change(nido).
    const [hostPc, p1Pc] = await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'phase_change' && m.payload?.phase === 'nido', 2000),
      waitForMessage(p1Ws, (m) => m.type === 'phase_change' && m.payload?.phase === 'nido', 2000),
    ]);
    assert.equal(hostPc.payload.phase, 'nido');
    assert.equal(p1Pc.payload.phase, 'nido');
    assert.equal(typeof hostPc.version, 'number');

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('N1: nido_start_mission by non-host returns error not_host', async () => {
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

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    orch.phase = 'nido';

    const p1Ws = openWs(port, {
      code: room.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    await waitOpen(p1Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');

    p1Ws.send(JSON.stringify({ type: 'intent', payload: { action: 'nido_start_mission' } }));

    const errMsg = await waitForMessage(p1Ws, (m) => m.type === 'error', 2000);
    assert.ok(errMsg.payload.code, 'error code present');

    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('N1: nido_start_mission when no orchestrator returns run_not_started error', async () => {
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

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    await waitOpen(hostWs);
    await waitForMessage(hostWs, (m) => m.type === 'hello');

    hostWs.send(JSON.stringify({ type: 'intent', payload: { action: 'nido_start_mission' } }));

    const errMsg = await waitForMessage(hostWs, (m) => m.type === 'error', 2000);
    assert.equal(errMsg.payload.code, 'run_not_started');

    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});
