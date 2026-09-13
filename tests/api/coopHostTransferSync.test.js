// 2026-05-20 — Host-transfer + coop-state sync e2e (BACKLOG coverage gap closure).
// Extends F-1 coverage (coopWsRebroadcast.test.js: phase_change + character_ready_list)
// with WS-level assertions for world_tally + debrief_ready_list rebroadcast plus
// orchestrator.hostId sync across sequential transfers (PR #2337 setHostId foundation).
// Ref museum: docs/museum/cards/coop-ws-test-infra-patterns-2026-05-20.md (P1-P6).
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

async function helloAll(sockets) {
  await Promise.all(sockets.map((ws) => waitOpen(ws)));
  await Promise.all(sockets.map((ws) => waitForMessage(ws, (m) => m.type === 'hello')));
}

test('host transfer in world_setup phase rebroadcasts world_tally + syncs orch.hostId', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const meta = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 80 });
    const room = lobby.getRoom(meta.code);
    const p1 = lobby.joinRoom({ code: meta.code, playerName: 'Alice' });
    const p2 = lobby.joinRoom({ code: meta.code, playerName: 'Bob' });

    // Seed orchestrator: drive to world_setup, then register p1 vote.
    const orch = coopStore.getOrCreate(meta.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    const allIds = [p1.player_id, p2.player_id];
    orch.submitCharacter(
      p1.player_id,
      { name: 'Alpha', form_id: 'istj_custode' },
      { allPlayerIds: allIds },
    );
    orch.submitCharacter(
      p2.player_id,
      { name: 'Beta', form_id: 'enfp_esploratore' },
      { allPlayerIds: allIds },
    );
    assert.equal(orch.phase, 'world_setup');
    orch.voteWorld(p1.player_id, { accept: true, allPlayerIds: allIds });

    // Sanity baseline: orch.hostId matches room.hostId pre-drop.
    assert.equal(orch.hostId, room.hostId);
    const originalHostId = room.hostId;

    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    const p1Ws = openWs(port, {
      code: meta.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    const p2Ws = openWs(port, {
      code: meta.code,
      player_id: p2.player_id,
      token: p2.player_token,
    });
    await helloAll([hostWs, p1Ws, p2Ws]);

    // Drain any pre-existing setup-phase chatter so assertions only see
    // messages emitted after host drop.
    p1Ws.__buf = [];
    p2Ws.__buf = [];

    // Abrupt drop simulates network crash (no graceful CLOSE frame).
    hostWs.terminate();

    // First promoted candidate is the oldest non-host connected player → p1.
    const transferMsg = await waitForMessage(p1Ws, (m) => m.type === 'host_transferred', 2000);
    assert.equal(transferMsg.payload.new_host_id, p1.player_id);
    assert.equal(transferMsg.payload.previous_host_id, originalHostId);

    // F-1 baseline contract.
    const phaseMsg = await waitForMessage(
      p1Ws,
      (m) => m.type === 'phase_change' && m.payload?.reason === 'host_transferred',
      2000,
    );
    assert.equal(phaseMsg.payload.phase, 'world_setup');
    await waitForMessage(p1Ws, (m) => m.type === 'character_ready_list', 2000);

    // Gap closure: world_tally MUST be rebroadcast in world_setup phase.
    const tallyMsg = await waitForMessage(p1Ws, (m) => m.type === 'world_tally', 2000);
    assert.ok(tallyMsg.payload, 'world_tally payload present');
    assert.equal(tallyMsg.payload.accept, 1, 'p1 accept vote preserved');
    assert.equal(tallyMsg.payload.reject, 0);
    assert.ok(tallyMsg.payload.per_player?.[p1.player_id]?.accept, 'per_player records p1 accept');
    assert.equal(tallyMsg.payload.scenario_id, 'enc_tutorial_01');

    // Survivor (p2) must also receive the rebroadcast.
    await waitForMessage(p2Ws, (m) => m.type === 'world_tally', 2000);

    // Orchestrator hostId synced (PR #2337 setHostId path).
    assert.equal(
      coopStore.get(meta.code).hostId,
      p1.player_id,
      'orch.hostId synced to promoted host',
    );
    assert.equal(lobby.getRoom(meta.code).hostId, p1.player_id);

    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('host transfer in debrief phase rebroadcasts debrief_ready_list + debrief_payload', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const meta = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 80 });
    const room = lobby.getRoom(meta.code);
    const p1 = lobby.joinRoom({ code: meta.code, playerName: 'Alice' });
    const p2 = lobby.joinRoom({ code: meta.code, playerName: 'Bob' });

    // Drive orchestrator through onboarding → world_setup → combat → debrief
    // with a debriefPayload seeded so debrief_payload broadcast is exercised.
    const orch = coopStore.getOrCreate(meta.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    const allIds = [p1.player_id, p2.player_id];
    orch.submitCharacter(
      p1.player_id,
      { name: 'Alpha', form_id: 'istj_custode' },
      { allPlayerIds: allIds },
    );
    orch.submitCharacter(
      p2.player_id,
      { name: 'Beta', form_id: 'enfp_esploratore' },
      { allPlayerIds: allIds },
    );
    assert.equal(orch.phase, 'world_setup');
    orch.confirmWorld({ scenarioId: 'enc_tutorial_01' });
    assert.equal(orch.phase, 'combat');
    orch.endCombat({
      outcome: 'victory',
      survivors: [p1.player_id, p2.player_id],
      xpEarned: 10,
      debriefPayload: {
        per_actor: {
          [p1.player_id]: {
            sentience_tier: 'T2',
            conviction_axis: { utility: 0.5, liberty: 0.3, morality: 0.2 },
            ennea_archetype: 'investigator',
          },
        },
      },
    });
    assert.equal(orch.phase, 'debrief');
    // Register one debrief choice so debrief_ready_list snapshot has signal.
    orch.submitDebriefChoice(p1.player_id, { action: 'advance' }, { allPlayerIds: allIds });

    const originalHostId = room.hostId;

    const hostWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    const p1Ws = openWs(port, {
      code: meta.code,
      player_id: p1.player_id,
      token: p1.player_token,
    });
    const p2Ws = openWs(port, {
      code: meta.code,
      player_id: p2.player_id,
      token: p2.player_token,
    });
    await helloAll([hostWs, p1Ws, p2Ws]);

    p1Ws.__buf = [];
    p2Ws.__buf = [];

    hostWs.terminate();

    await waitForMessage(
      p1Ws,
      (m) => m.type === 'host_transferred' && m.payload?.previous_host_id === originalHostId,
      2000,
    );
    const phaseMsg = await waitForMessage(
      p1Ws,
      (m) => m.type === 'phase_change' && m.payload?.reason === 'host_transferred',
      2000,
    );
    assert.equal(phaseMsg.payload.phase, 'debrief');

    // Gap closure: debrief_ready_list MUST be rebroadcast.
    const readyMsg = await waitForMessage(p1Ws, (m) => m.type === 'debrief_ready_list', 2000);
    assert.equal(readyMsg.payload.outcome, 'victory');
    assert.ok(Array.isArray(readyMsg.payload.ready_list));

    // Bundle C follow-up: when orch.run.debrief present, debrief_payload also fires.
    const payloadMsg = await waitForMessage(p1Ws, (m) => m.type === 'debrief_payload', 2000);
    assert.ok(payloadMsg.payload.per_actor, 'per_actor block present');
    assert.equal(
      payloadMsg.payload.per_actor[p1.player_id]?.sentience_tier,
      'T2',
      'seeded sentience tier propagated through rebroadcast',
    );

    // Survivor (p2) receives the same payload set.
    await waitForMessage(p2Ws, (m) => m.type === 'debrief_ready_list', 2000);
    await waitForMessage(p2Ws, (m) => m.type === 'debrief_payload', 2000);

    assert.equal(coopStore.get(meta.code).hostId, p1.player_id);

    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('setHostId sync survives sequential host transfers (A → B → C)', async () => {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;

  try {
    const meta = lobby.createRoom({ hostName: 'HostA', hostTransferGraceMs: 80 });
    const room = lobby.getRoom(meta.code);
    const pB = lobby.joinRoom({ code: meta.code, playerName: 'HostB' });
    const pC = lobby.joinRoom({ code: meta.code, playerName: 'HostC' });
    const originalHostId = room.hostId;

    // Seed orchestrator in world_setup so every rebroadcast carries a tally.
    const orch = coopStore.getOrCreate(meta.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    const allIds = [pB.player_id, pC.player_id];
    orch.submitCharacter(
      pB.player_id,
      { name: 'B', form_id: 'istj_custode' },
      { allPlayerIds: allIds },
    );
    orch.submitCharacter(
      pC.player_id,
      { name: 'C', form_id: 'enfp_esploratore' },
      { allPlayerIds: allIds },
    );
    assert.equal(orch.phase, 'world_setup');
    assert.equal(orch.hostId, originalHostId);

    const hostAWs = openWs(port, {
      code: meta.code,
      player_id: meta.host_id,
      token: meta.host_token,
    });
    const pBWs = openWs(port, {
      code: meta.code,
      player_id: pB.player_id,
      token: pB.player_token,
    });
    const pCWs = openWs(port, {
      code: meta.code,
      player_id: pC.player_id,
      token: pC.player_token,
    });
    await helloAll([hostAWs, pBWs, pCWs]);

    pBWs.__buf = [];
    pCWs.__buf = [];

    // Transfer #1: HostA drop → HostB promoted (oldest joined non-host).
    hostAWs.terminate();
    await waitForMessage(
      pBWs,
      (m) => m.type === 'host_transferred' && m.payload?.new_host_id === pB.player_id,
      2000,
    );
    // Wait for phase rebroadcast so the setHostId() inside rebroadcastCoopState
    // has executed before we read orch.hostId.
    await waitForMessage(
      pBWs,
      (m) => m.type === 'phase_change' && m.payload?.reason === 'host_transferred',
      2000,
    );
    assert.equal(
      coopStore.get(meta.code).hostId,
      pB.player_id,
      'orch.hostId synced after first transfer',
    );
    assert.equal(lobby.getRoom(meta.code).hostId, pB.player_id);

    // Drain before second transfer so we assert only fresh messages.
    pBWs.__buf = [];
    pCWs.__buf = [];

    // Transfer #2: HostB drop → HostC promoted (sole remaining candidate).
    pBWs.terminate();
    await waitForMessage(
      pCWs,
      (m) => m.type === 'host_transferred' && m.payload?.new_host_id === pC.player_id,
      2000,
    );
    const phaseMsg = await waitForMessage(
      pCWs,
      (m) => m.type === 'phase_change' && m.payload?.reason === 'host_transferred',
      2000,
    );
    assert.equal(phaseMsg.payload.phase, 'world_setup');

    // HostC must receive current state snapshot via rebroadcast.
    await waitForMessage(pCWs, (m) => m.type === 'character_ready_list', 2000);
    await waitForMessage(pCWs, (m) => m.type === 'world_tally', 2000);

    assert.equal(
      coopStore.get(meta.code).hostId,
      pC.player_id,
      'orch.hostId synced after second transfer',
    );
    assert.equal(lobby.getRoom(meta.code).hostId, pC.player_id);

    pCWs.close();
  } finally {
    await wsHandle.close();
  }
});
