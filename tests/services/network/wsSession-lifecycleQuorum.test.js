// Finding P2 2026-06-10 (item-3 AI playtest, Game-Godot-v2
// docs/godot-v2/qa/2026-06-10-item3-ai-playtest.md finding 2) -- lifecycle
// ready-gate quorum vs TV-as-mirror host (ADR-2026-06-07: la TV e'
// splash/mirror, MAI input). Pre-fix the character_create and lineage_choice
// drains counted the host in allPids (`Array.from(room.players.values())`):
// a TV host never submits, so the orchestrator gates
// (expected.size === characters.size / debriefChoices.size >= expected.size)
// never fired -> run stalled forever in character_creation (and debrief).
// Back-compat: in the legacy phone-only flow the host phone PLAYS and
// submits its own PG -- a hard host filter would advance the phase before
// the host PG lands (or reject it via the F-3 player_not_in_room gate).
// Fix: role-aware self-selecting quorum -- the host counts only if it is
// the current submitter or already owns a character.
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

function characterCreateIntent(name) {
  return JSON.stringify({
    type: 'intent',
    payload: { action: 'character_create', name, species_id: 'dune_stalker' },
  });
}

const lineageIntent = JSON.stringify({
  type: 'intent',
  payload: { action: 'lineage_choice', mutations_to_leave: [] },
});

const isWorldSetup = (m) => m.type === 'phase_change' && m.payload?.phase === 'world_setup';

test('P2: TV-mirror host never submits -> character gate closes with players only', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Alice' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });

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

    p1Ws.send(characterCreateIntent('Alice'));
    await waitForMessage(p1Ws, (m) => m.type === 'character_accepted');
    p2Ws.send(characterCreateIntent('Bob'));
    const ack = await waitForMessage(p2Ws, (m) => m.type === 'character_accepted');

    // THE stall: pre-fix the host (never a submitter) kept the gate open
    // forever -> no world_setup, run stuck in character_creation.
    assert.equal(ack.payload.phase, 'world_setup');
    await Promise.all([
      waitForMessage(hostWs, isWorldSetup),
      waitForMessage(p1Ws, isWorldSetup),
      waitForMessage(p2Ws, isWorldSetup),
    ]);
    assert.equal(orch.phase, 'world_setup');

    // Ready-list broadcast must not surface a phantom host row.
    const list = await waitForMessage(
      p1Ws,
      (m) => m.type === 'character_ready_list' && m.payload.length === 2,
    );
    assert.ok(
      list.payload.every((e) => e.player_id !== room.host_id),
      'host must not appear in the ready list',
    );

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('P2 back-compat: legacy host-plays flow -> world_setup only after the host PG', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'HostPhone' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Alice' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
    ]);

    // Host phone PLAYS: submits its own PG (self-selects into the quorum).
    hostWs.send(characterCreateIntent('Capo'));
    const hostAck = await waitForMessage(hostWs, (m) => m.type === 'character_accepted');
    assert.equal(hostAck.payload.phase, 'character_creation', 'host PG accepted, gate still open');

    // Host now visible in the ready list, ready and counted.
    const list = await waitForMessage(
      hostWs,
      (m) =>
        m.type === 'character_ready_list' &&
        m.payload.some((e) => e.player_id === room.host_id && e.ready === true),
    );
    assert.equal(list.payload.length, 2);

    // Gate must NOT close before Alice (host alone is not the quorum).
    await assert.rejects(waitForMessage(hostWs, isWorldSetup, 400), /timeout/);

    p1Ws.send(characterCreateIntent('Alice'));
    const ack = await waitForMessage(p1Ws, (m) => m.type === 'character_accepted');
    assert.equal(ack.payload.phase, 'world_setup');
    await Promise.all([waitForMessage(hostWs, isWorldSetup), waitForMessage(p1Ws, isWorldSetup)]);

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('P2: TV-mirror host never chooses -> debrief gate closes with players only', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Alice' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    const orch = coopStore.getOrCreate(room.code);
    // Two scenarios so advanceScenarioOrEnd lands on world_setup, not ended.
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    orch.submitCharacter(
      p1.player_id,
      { name: 'Alice', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [p1.player_id, p2.player_id] },
    );
    orch.submitCharacter(
      p2.player_id,
      { name: 'Bob', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [p1.player_id, p2.player_id] },
    );
    // Force debrief so submitDebriefChoice is accepted.
    orch.phase = 'debrief';

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

    p1Ws.send(lineageIntent);
    const first = await waitForMessage(p1Ws, (m) => m.type === 'lineage_choice_accepted');
    assert.equal(first.payload.advance, null, 'gate still open after first player');

    p2Ws.send(lineageIntent);
    const last = await waitForMessage(p2Ws, (m) => m.type === 'lineage_choice_accepted');

    // THE stall: pre-fix the host (never a chooser) kept the debrief gate
    // open forever -> advance never fired.
    assert.equal(last.payload.advance?.action, 'next_scenario');
    await Promise.all([
      waitForMessage(hostWs, isWorldSetup),
      waitForMessage(p1Ws, isWorldSetup),
      waitForMessage(p2Ws, isWorldSetup),
    ]);

    // debrief_ready_list broadcast must not surface a phantom host row.
    const ready = await waitForMessage(p1Ws, (m) => m.type === 'debrief_ready_list');
    assert.ok(
      ready.payload.ready_list.every((e) => e.player_id !== room.host_id),
      'host must not appear in the debrief ready list',
    );

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('P2 back-compat: legacy host-plays debrief -> advance only after the host choice', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'HostPhone' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Alice' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01', 'enc_tutorial_02'] });
    // Host phone played the run: it owns a character -> stays in the quorum.
    orch.submitCharacter(
      room.host_id,
      { name: 'Capo', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [room.host_id, p1.player_id] },
    );
    orch.submitCharacter(
      p1.player_id,
      { name: 'Alice', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [room.host_id, p1.player_id] },
    );
    orch.phase = 'debrief';

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
    ]);

    p1Ws.send(lineageIntent);
    const first = await waitForMessage(p1Ws, (m) => m.type === 'lineage_choice_accepted');
    assert.equal(first.payload.advance, null, 'gate must wait for the playing host');
    await assert.rejects(waitForMessage(p1Ws, isWorldSetup, 400), /timeout/);

    hostWs.send(lineageIntent);
    const last = await waitForMessage(hostWs, (m) => m.type === 'lineage_choice_accepted');
    assert.equal(last.payload.advance?.action, 'next_scenario');
    await Promise.all([waitForMessage(hostWs, isWorldSetup), waitForMessage(p1Ws, isWorldSetup)]);

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});

// P2 residue -- reveal_acknowledge drain (UI-only world_seed_reveal phase).
// Same stall class as finding 2: the drain counted the host in allPids and
// coopOrchestrator.acknowledgeReveal returns all_ready only when EVERY
// expected pid acked. Ground-truth (Game-Godot-v2): only the phone composer
// sends reveal_acknowledge (phone_composer_view.gd); the TV reveal view
// (world_seed_reveal_view.gd reveal_complete) is a local transition that
// sends NOTHING -> a TV-mirror host never acks and publishPhaseChange
// ('world_setup') never fires, phones stuck in MODE_WORLD_REVEAL (mode swap
// only happens on phase_change). Back-compat: the legacy host phone DOES
// render the reveal view and acks -> it must stay in the quorum when it
// owns a character.
const revealIntent = JSON.stringify({
  type: 'intent',
  payload: { action: 'reveal_acknowledge' },
});

test('P2 reveal: TV-mirror host never acks -> reveal gate closes with players only', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Alice' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Bob' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });

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

    p1Ws.send(revealIntent);
    const first = await waitForMessage(p1Ws, (m) => m.type === 'reveal_acknowledge_accepted');
    assert.equal(first.payload.status.all_ready, false, 'gate still open after first player');

    p2Ws.send(revealIntent);
    const last = await waitForMessage(p2Ws, (m) => m.type === 'reveal_acknowledge_accepted');

    // THE stall: pre-fix the host (never an acker) kept the reveal gate
    // open forever -> no world_setup, phones stuck on the reveal screen.
    assert.equal(last.payload.status.all_ready, true);
    await Promise.all([
      waitForMessage(hostWs, isWorldSetup),
      waitForMessage(p1Ws, isWorldSetup),
      waitForMessage(p2Ws, isWorldSetup),
    ]);

    // reveal_ack_list broadcast must not surface a phantom host row.
    const list = await waitForMessage(
      p1Ws,
      (m) => m.type === 'reveal_ack_list' && m.payload.length === 2,
    );
    assert.ok(
      list.payload.every((e) => e.player_id !== room.host_id),
      'host must not appear in the reveal ack list',
    );

    hostWs.close();
    p1Ws.close();
    p2Ws.close();
  } finally {
    await wsHandle.close();
  }
});

test('P2 reveal back-compat: legacy host-plays reveal -> world_setup only after the host ack', async () => {
  const { lobby, coopStore, wsHandle, port } = await startServer();
  try {
    const room = lobby.createRoom({ hostName: 'HostPhone' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Alice' });

    const orch = coopStore.getOrCreate(room.code);
    orch.startRun({ scenarioStack: ['enc_tutorial_01'] });
    // Host phone played the run: it owns a character -> stays in the quorum.
    // Only the host PG is seeded (gate stays open) so orch.phase does not
    // reach world_setup before the WS connects -- the connect-time coop
    // rebroadcast would emit a spurious phase_change world_setup and void
    // the "no early advance" assertion below.
    orch.submitCharacter(
      room.host_id,
      { name: 'Capo', form_id: 'form_dune_stalker', species_id: 'dune_stalker' },
      { allPlayerIds: [room.host_id, p1.player_id] },
    );

    const hostWs = openWs(port, {
      code: room.code,
      player_id: room.host_id,
      token: room.host_token,
    });
    const p1Ws = openWs(port, { code: room.code, player_id: p1.player_id, token: p1.player_token });
    await Promise.all([waitOpen(hostWs), waitOpen(p1Ws)]);
    await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'hello'),
      waitForMessage(p1Ws, (m) => m.type === 'hello'),
    ]);

    p1Ws.send(revealIntent);
    const first = await waitForMessage(p1Ws, (m) => m.type === 'reveal_acknowledge_accepted');
    assert.equal(first.payload.status.all_ready, false, 'gate must wait for the playing host');
    await assert.rejects(waitForMessage(p1Ws, isWorldSetup, 400), /timeout/);

    hostWs.send(revealIntent);
    const last = await waitForMessage(hostWs, (m) => m.type === 'reveal_acknowledge_accepted');
    assert.equal(last.payload.status.all_ready, true);
    await Promise.all([waitForMessage(hostWs, isWorldSetup), waitForMessage(p1Ws, isWorldSetup)]);

    hostWs.close();
    p1Ws.close();
  } finally {
    await wsHandle.close();
  }
});
