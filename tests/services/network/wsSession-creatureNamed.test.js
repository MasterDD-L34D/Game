// Item-3 follow-up (#2679 / M-2 #2697) -- `creature_named` deve raggiungere
// TUTTO il branco, non solo l'ultimo submitter. Pre-fix: l'array ADDITIVO
// advance.creature_named (advanceScenarioOrEnd) viaggiava SOLO dentro
// lineage_choice_accepted (socket.send ack al solo ultimo submitter) e
// next_macro_committed.advance; nido_start_mission_accepted lo droppava.
// Fix: room.broadcast({type:'creature_named', payload:{named}}) in tutti i
// drain che producono un advance (lineage_choice, next_macro,
// nido_start_mission). Il client Godot dedupa per transizione, quindi la
// doppia delivery sul path next_macro e' innocua.
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

async function startServer() {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  return { lobby, coopStore, wsHandle, port: wsHandle.wss.address().port };
}

test('M-2: lineage auto-advance -> creature_named broadcast reaches the NON-last submitter', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    const orch = coopStore.getOrCreate(room.code);
    // Two scenarios so advanceScenarioOrEnd lands on world_setup (juvenile
    // naming transition), not ended.
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    orch.namePool = ['Vesh', 'Korr'];
    orch.submitCharacter(
      p1.player_id,
      { name: 'Heron', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [p1.player_id] },
    );
    // Force debrief so submitDebriefChoice is accepted.
    orch.phase = 'debrief';

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

    // p1 submits FIRST (will NOT be the last submitter).
    p1Ws.send(
      JSON.stringify({
        type: 'intent',
        payload: { action: 'lineage_choice', mutations_to_leave: [] },
      }),
    );
    await waitForMessage(p1Ws, (m) => m.type === 'lineage_choice_accepted', 2000);
    // Host submits LAST -> triggers advanceScenarioOrEnd + name emergence.
    hostWs.send(
      JSON.stringify({
        type: 'intent',
        payload: { action: 'lineage_choice', mutations_to_leave: [] },
      }),
    );

    // THE regression: p1 (non-last submitter) must receive the broadcast.
    const evt = await waitForMessage(p1Ws, (m) => m.type === 'creature_named', 2000);
    assert.ok(Array.isArray(evt.payload.named), 'payload.named is an array');
    assert.equal(evt.payload.named.length, 1);
    const entry = evt.payload.named[0];
    assert.equal(entry.player_id, p1.player_id);
    assert.equal(entry.stage, 'juvenile');
    assert.equal(entry.mbti_reveal, false);
    assert.ok(['Vesh', 'Korr'].includes(entry.name), 'name picked from pool');

    // Host (last submitter) receives it too.
    await waitForMessage(hostWs, (m) => m.type === 'creature_named', 2000);

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('M-2: nido_start_mission -> creature_named broadcast to all clients', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    orch.namePool = ['Vesh'];
    orch.submitCharacter(
      p1.player_id,
      { name: 'Heron', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [p1.player_id] },
    );
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

    // Pre-fix nido_start_mission_accepted carried {phase} only and nothing
    // else: the naming transition was dropped for everyone.
    const [hostEvt, p1Evt] = await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'creature_named', 2000),
      waitForMessage(p1Ws, (m) => m.type === 'creature_named', 2000),
    ]);
    assert.equal(hostEvt.payload.named[0].name, 'Vesh');
    assert.equal(p1Evt.payload.named[0].stage, 'juvenile');

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('M-2: advance without emergence (no characters) -> NO creature_named broadcast', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    orch.phase = 'nido';

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    await waitOpen(hostWs);
    await waitForMessage(hostWs, (m) => m.type === 'hello');

    hostWs.send(JSON.stringify({ type: 'intent', payload: { action: 'nido_start_mission' } }));
    await waitForMessage(hostWs, (m) => m.type === 'nido_start_mission_accepted', 2000);

    // No characters -> _applyNameEmergence emitted nothing -> no broadcast.
    await assert.rejects(
      waitForMessage(hostWs, (m) => m.type === 'creature_named', 400),
      /timeout/,
      'no creature_named expected',
    );

    hostWs.close();
  } finally {
    await wsHandle.close();
  }
});
