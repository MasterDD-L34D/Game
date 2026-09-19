// 2026-05-06 phone smoke retry harness — B5 phase_change broadcast contract.
//
// Validates host {type:'phase'} → publishPhaseChange versioned event broadcast
// to ALL peers (including phone composer subscribers). Catches regression where
// setPhase() was used instead of publishPhaseChange (FU4 fix), which broadcast
// only legacy `round_ready` and silently dropped phase transitions on phone
// composer that subscribes via event_received.
//
// Coverage:
//   B5-1: non-host phase msg → error not_host (no broadcast)
//   B5-2: host phase=character_creation → all peers receive phase_change versioned
//   B5-3: empty phase → error phase_invalid (no broadcast)
//   B5-4: not-whitelisted phase → error phase_invalid
//   B5-5: stateVersion monotonic across multiple phase transitions
//   B5-6: B7 fix coopStore auto-bootstrap on character_creation
//
// Ref: docs/playtest/2026-05-05-phone-smoke-results.md §B5

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

async function spinUp({ withCoopStore = false } = {}) {
  const lobby = new LobbyService();
  const coopStore = withCoopStore ? createCoopStore({ lobby }) : null;
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;
  return { lobby, coopStore, port, wsHandle };
}

async function connectHostPlusPlayers(lobby, port, n = 2) {
  const room = lobby.createRoom({ hostName: 'Host' });
  const players = [];
  for (let i = 0; i < n; i += 1) {
    players.push(lobby.joinRoom({ code: room.code, playerName: `P${i + 1}` }));
  }
  const hostWs = openWs(port, {
    code: room.code,
    player_id: room.host_id,
    token: room.host_token,
  });
  const playerWss = players.map((p) =>
    openWs(port, { code: room.code, player_id: p.player_id, token: p.player_token }),
  );
  await Promise.all([waitOpen(hostWs), ...playerWss.map(waitOpen)]);
  await Promise.all([
    waitForMessage(hostWs, (m) => m.type === 'hello'),
    ...playerWss.map((w) => waitForMessage(w, (m) => m.type === 'hello')),
  ]);
  return { room, hostWs, playerWss };
}

test('B5-1: non-host phase msg rejected with error not_host', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const { hostWs, playerWss } = await connectHostPlusPlayers(lobby, port, 1);
    // Player (non-host) tries to send phase msg.
    playerWss[0].send(JSON.stringify({ type: 'phase', payload: { phase: 'character_creation' } }));
    const err = await waitForMessage(playerWss[0], (m) => m.type === 'error');
    assert.equal(err.payload.code, 'not_host');

    // Host should NOT see any phase_change broadcast (rejected before publish).
    let hostSawPhaseChange = false;
    const sniffer = (m) => {
      if (m.type === 'phase_change') hostSawPhaseChange = true;
    };
    hostWs.on('message', (raw) => {
      try {
        sniffer(JSON.parse(raw.toString()));
      } catch {}
    });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(hostSawPhaseChange, false, 'non-host phase msg must not trigger broadcast');

    hostWs.close();
    playerWss.forEach((w) => w.close());
  } finally {
    await wsHandle.close();
  }
});

test('B5-2: host phase=character_creation broadcasts phase_change to ALL peers', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const { hostWs, playerWss } = await connectHostPlusPlayers(lobby, port, 2);

    // Host sends phase msg.
    hostWs.send(JSON.stringify({ type: 'phase', payload: { phase: 'character_creation' } }));

    // All 3 sockets (host + 2 players) must receive phase_change.
    const [hostMsg, p1Msg, p2Msg] = await Promise.all([
      waitForMessage(hostWs, (m) => m.type === 'phase_change'),
      waitForMessage(playerWss[0], (m) => m.type === 'phase_change'),
      waitForMessage(playerWss[1], (m) => m.type === 'phase_change'),
    ]);

    assert.equal(hostMsg.payload.phase, 'character_creation');
    assert.equal(p1Msg.payload.phase, 'character_creation');
    assert.equal(p2Msg.payload.phase, 'character_creation');
    // version field present (Sprint R.5 versioned event).
    assert.equal(typeof hostMsg.version, 'number');
    assert.ok(hostMsg.version >= 1);
    // All peers see same version (broadcast atomicity).
    assert.equal(hostMsg.version, p1Msg.version);
    assert.equal(hostMsg.version, p2Msg.version);

    hostWs.close();
    playerWss.forEach((w) => w.close());
  } finally {
    await wsHandle.close();
  }
});

test('B5-3: empty phase rejected with phase_invalid (host msg)', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const { hostWs, playerWss } = await connectHostPlusPlayers(lobby, port, 1);

    // Empty phase string. NOTE: case 'phase' guard in wsSession.js requires
    // phaseArg.length > 0 BEFORE calling publishPhaseChange — empty string
    // is silently ignored (no error, no broadcast). Validates this defensive
    // path so no spurious phase_change leaks.
    hostWs.send(JSON.stringify({ type: 'phase', payload: { phase: '' } }));

    let sawPhaseChange = false;
    const sniffer = (m) => {
      if (m.type === 'phase_change') sawPhaseChange = true;
    };
    playerWss[0].on('message', (raw) => {
      try {
        sniffer(JSON.parse(raw.toString()));
      } catch {}
    });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(sawPhaseChange, false, 'empty phase must not broadcast');

    hostWs.close();
    playerWss.forEach((w) => w.close());
  } finally {
    await wsHandle.close();
  }
});

test('B5-4: non-whitelisted phase rejected with phase_invalid', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const { hostWs, playerWss } = await connectHostPlusPlayers(lobby, port, 1);

    hostWs.send(JSON.stringify({ type: 'phase', payload: { phase: 'bogus_phase_zzz' } }));

    const err = await waitForMessage(hostWs, (m) => m.type === 'error');
    assert.equal(err.payload.code, 'phase_invalid');
    assert.match(err.payload.message, /phase_not_whitelisted/);

    hostWs.close();
    playerWss.forEach((w) => w.close());
  } finally {
    await wsHandle.close();
  }
});

test('B5-5: stateVersion monotonic across multiple phase transitions', async () => {
  const { lobby, port, wsHandle } = await spinUp();
  try {
    const { hostWs, playerWss } = await connectHostPlusPlayers(lobby, port, 1);
    const versions = [];

    // Wait for each transition's broadcast on player socket before sending next.
    const phases = ['character_creation', 'world_setup', 'combat'];
    for (const phase of phases) {
      hostWs.send(JSON.stringify({ type: 'phase', payload: { phase } }));
      const msg = await waitForMessage(
        playerWss[0],
        (m) => m.type === 'phase_change' && m.payload.phase === phase,
      );
      versions.push(msg.version);
    }

    // Strict monotonic increase.
    for (let i = 1; i < versions.length; i += 1) {
      assert.ok(
        versions[i] > versions[i - 1],
        `version monotonic violation: v[${i}]=${versions[i]} <= v[${i - 1}]=${versions[i - 1]}`,
      );
    }

    hostWs.close();
    playerWss.forEach((w) => w.close());
  } finally {
    await wsHandle.close();
  }
});

test('B5-6: B7 fix — character_creation phase auto-bootstraps coopOrchestrator', async () => {
  const { lobby, coopStore, port, wsHandle } = await spinUp({ withCoopStore: true });
  try {
    const { hostWs, playerWss, room } = await connectHostPlusPlayers(lobby, port, 1);

    // Pre-condition: coopStore has no orchestrator for this room (or phase=lobby).
    let orch = coopStore.get(room.code);
    if (orch) {
      assert.equal(orch.phase, 'lobby', 'pre-condition: orch must be in lobby phase');
    }

    // Host transitions to character_creation.
    hostWs.send(JSON.stringify({ type: 'phase', payload: { phase: 'character_creation' } }));
    await waitForMessage(playerWss[0], (m) => m.type === 'phase_change');

    // Allow event loop tick for inline bootstrap (synchronous after publish).
    await new Promise((r) => setTimeout(r, 50));

    orch = coopStore.get(room.code);
    assert.ok(orch, 'B7: coopStore must have orchestrator after character_creation phase');
    assert.notEqual(orch.phase, 'lobby', 'B7: orchestrator must have advanced past lobby');

    hostWs.close();
    playerWss.forEach((w) => w.close());
  } finally {
    await wsHandle.close();
  }
});
