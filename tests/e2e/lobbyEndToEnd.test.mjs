// M11 Phase B — end-to-end integration test for LobbyClient (network.js).
// ADR-2026-04-20.
//
// Spins a real LobbyService + WS server (from apps/backend/services/network/wsSession)
// and drives it from the browser-oriented client wrapper (apps/play/src/network.js),
// passing the `ws` package as wsImpl so the ESM module runs in Node.
//
// Coverage:
//   1. Host + 3 players connect; all receive `hello` with roster.
//   2. Host `publishWorld` broadcasts a `state` with version monotonic; all 3
//      players receive identical payload.
//   3. Player intent via LobbyClient is relayed to host only (peers silent).
//   4. Player reconnect survives one drop (LobbyClient auto-reconnect) — the
//      same token resumes the room.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

import { LobbyService, createWsServer } from '../../apps/backend/services/network/wsSession.js';
import { LobbyClient } from '../../apps/play/src/network.js';

async function spinUp() {
  const lobby = new LobbyService();
  const wsHandle = createWsServer({ lobby, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const port = wsHandle.wss.address().port;
  return { lobby, port, wsHandle, wsUrl: `ws://127.0.0.1:${port}/ws` };
}

function openClient({ wsUrl, code, playerId, token, role, reconnect = false }) {
  return new LobbyClient({
    wsUrl,
    code,
    playerId,
    token,
    role,
    wsImpl: WebSocket,
    reconnect,
  });
}

test('e2e: host + 3 players connect via LobbyClient, host broadcasts world, all receive identical state', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV', campaignId: 'c1' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Phone2' });
    const p3 = lobby.joinRoom({ code: room.code, playerName: 'Phone3' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
    });
    const c2 = openClient({
      wsUrl,
      code: room.code,
      playerId: p2.player_id,
      token: p2.player_token,
      role: 'player',
    });
    const c3 = openClient({
      wsUrl,
      code: room.code,
      playerId: p3.player_id,
      token: p3.player_token,
      role: 'player',
    });

    const hostHello = await host.connect();
    const p1Hello = await c1.connect();
    const p2Hello = await c2.connect();
    const p3Hello = await c3.connect();
    assert.equal(hostHello.role, 'host');
    assert.equal(p1Hello.role, 'player');
    assert.equal(p2Hello.role, 'player');
    assert.equal(p3Hello.role, 'player');
    assert.equal(hostHello.room.code, room.code);

    // All three players wait for the state broadcast.
    const received = Promise.all([
      new Promise((resolve) => c1.once('state', resolve)),
      new Promise((resolve) => c2.once('state', resolve)),
      new Promise((resolve) => c3.once('state', resolve)),
    ]);

    const world = { turn: 1, units: [{ id: 'u1', hp: 10 }], scene: 'briefing' };
    host.sendState(world);
    const states = await received;
    for (const s of states) {
      assert.equal(s.version, 1);
      assert.deepEqual(s.payload, world);
    }
    // LobbyClient tracks version on receiver side.
    assert.equal(c1.stateVersion, 1);
    assert.equal(c2.stateVersion, 1);
    assert.equal(c3.stateVersion, 1);

    host.close();
    c1.close();
    c2.close();
    c3.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: non-host LobbyClient.sendState emits error locally and is rejected by server', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
    });
    await c1.connect();

    // Local guard fires.
    let localErr = null;
    c1.on('error', (e) => {
      if (!localErr) localErr = e;
    });
    const sendOk = c1.sendState({ cheat: true });
    assert.equal(sendOk, false);
    assert.equal(localErr?.code, 'not_host');

    c1.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: LobbyClient.sendIntent relayed to host only — peers do not receive it', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Phone2' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
    });
    const c2 = openClient({
      wsUrl,
      code: room.code,
      playerId: p2.player_id,
      token: p2.player_token,
      role: 'player',
    });
    await Promise.all([host.connect(), c1.connect(), c2.connect()]);

    const hostGotIntent = new Promise((resolve) => host.once('intent', resolve));
    let c2GotIntent = false;
    c2.on('intent', () => {
      c2GotIntent = true;
    });

    c1.sendIntent({ action: 'attack', target: 'e1' });
    const relayed = await hostGotIntent;
    assert.equal(relayed.from, p1.player_id);
    assert.deepEqual(relayed.payload, { action: 'attack', target: 'e1' });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(c2GotIntent, false);

    host.close();
    c1.close();
    c2.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: LobbyClient auto-reconnect resumes session with same token after forced socket drop', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
      reconnect: false,
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
      reconnect: true,
    });
    await Promise.all([host.connect(), c1.connect()]);

    const hostSawDisconnect = new Promise((resolve) => host.once('player_disconnected', resolve));
    const reconnectedHello = new Promise((resolve) => {
      // Skip the first hello (resolved by connect()). Listen for the one
      // triggered by auto-reconnect.
      let seen = 0;
      c1.on('hello', (payload) => {
        seen += 1;
        if (seen >= 1) resolve(payload); // first hello after reconnect
      });
    });

    // Force-terminate the client socket (simulates network drop).
    c1.socket.terminate();
    const disconnect = await hostSawDisconnect;
    assert.equal(disconnect.player_id, p1.player_id);

    const hello2 = await reconnectedHello;
    assert.equal(hello2.player_id, p1.player_id);

    host.close();
    c1.close();
  } finally {
    await wsHandle.close();
  }
});

// ---------------------------------------------------------------------------
// Phase B+ (TKT-M11B-01/02/03) — structured intent payload + campaign mirror.
// ---------------------------------------------------------------------------

test('e2e: Phase B+ structured intent payload { actor_id, action } survives relay intact', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
    });
    await Promise.all([host.connect(), c1.connect()]);

    const hostGotIntent = new Promise((resolve) => host.once('intent', resolve));

    // Simulate exactly what lobbyBridge.sendPlayerIntent(payload) transmits
    // when the spectator-overlay composer submits an attack intent.
    const phoneComposerPayload = {
      actor_id: 'u_player_1',
      action: {
        type: 'attack',
        actor_id: 'u_player_1',
        target_id: 'e_enemy_1',
        ap_cost: 1,
      },
    };
    c1.sendIntent(phoneComposerPayload);
    const relayed = await hostGotIntent;

    // Bridge expects entry { id, from, payload, ts } with payload echoing the phone composer.
    assert.equal(typeof relayed.id, 'string');
    assert.equal(relayed.from, p1.player_id);
    assert.ok(relayed.ts > 0);
    assert.deepEqual(relayed.payload, phoneComposerPayload);
    // Bridge normalization path (done inside lobbyBridge.js): main.js extracts
    // actor_id + action for api.declareIntent.
    assert.equal(relayed.payload.actor_id, 'u_player_1');
    assert.equal(relayed.payload.action.type, 'attack');
    assert.equal(relayed.payload.action.target_id, 'e_enemy_1');

    host.close();
    c1.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: Phase B+ host publishes state with campaign_summary merged — all players receive it', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV', campaignId: 'apex_arc_mvp' });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Phone2' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
    });
    const c2 = openClient({
      wsUrl,
      code: room.code,
      playerId: p2.player_id,
      token: p2.player_token,
      role: 'player',
    });
    await Promise.all([host.connect(), c1.connect(), c2.connect()]);

    // Shape produced by lobbyBridge.publishWorld(world) when
    // setCampaignSummary(summary) has been called on the host bridge.
    const world = { turn: 2, round: 3, active_id: 'u_player_1', units: [] };
    const campaign_summary = {
      id: 'apex_arc_mvp',
      current_node_id: 'node_02',
      pe: 4,
      pi: 1,
    };
    const enriched = { ...world, campaign_summary };

    const received = Promise.all([
      new Promise((resolve) => c1.once('state', resolve)),
      new Promise((resolve) => c2.once('state', resolve)),
    ]);
    host.sendState(enriched);
    const states = await received;
    for (const s of states) {
      assert.equal(s.version, 1);
      assert.deepEqual(s.payload.campaign_summary, campaign_summary);
      assert.equal(s.payload.turn, 2);
    }

    host.close();
    c1.close();
    c2.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: Phase C roster — player_joined + player_connected + player_disconnected signals propagate in order', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
    });
    await host.connect();

    const joinEvents = [];
    const connectEvents = [];
    const disconnectEvents = [];
    host.on('player_joined', (e) => joinEvents.push(e));
    host.on('player_connected', (e) => connectEvents.push(e));
    host.on('player_disconnected', (e) => disconnectEvents.push(e));

    // REST join triggers player_joined broadcast to already-connected host.
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(joinEvents.length, 1);
    assert.equal(joinEvents[0].player_id, p1.player_id);
    assert.equal(joinEvents[0].name, 'Phone1');
    assert.equal(joinEvents[0].role, 'player');

    // WS attach triggers player_connected broadcast.
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
      reconnect: false,
    });
    await c1.connect();
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(connectEvents.length, 1);
    assert.equal(connectEvents[0].player_id, p1.player_id);

    // Drop triggers player_disconnected.
    const disconnectReceived = new Promise((resolve) => host.once('player_disconnected', resolve));
    c1.socket.terminate();
    await disconnectReceived;
    assert.equal(disconnectEvents.length, 1);
    assert.equal(disconnectEvents[0].player_id, p1.player_id);

    host.close();
  } finally {
    await wsHandle.close();
  }
});

// ---------------------------------------------------------------------------
// TKT-M11B-05 — host transfer on host socket drop.
// ---------------------------------------------------------------------------

test('e2e: TKT-05 host drops → oldest connected player promoted → can sendState', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 80 });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });
    const p2 = lobby.joinRoom({ code: room.code, playerName: 'Phone2' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
      reconnect: false,
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
      reconnect: false,
    });
    const c2 = openClient({
      wsUrl,
      code: room.code,
      playerId: p2.player_id,
      token: p2.player_token,
      role: 'player',
      reconnect: false,
    });
    await Promise.all([host.connect(), c1.connect(), c2.connect()]);

    const c1Transfer = new Promise((resolve) => c1.once('host_transferred', resolve));
    const c2Transfer = new Promise((resolve) => c2.once('host_transferred', resolve));

    // Host drops (no reconnect). Grace window is 80ms; wait > grace + safety.
    host.socket.terminate();
    const [t1, t2] = await Promise.all([c1Transfer, c2Transfer]);

    // Oldest connected non-host candidate (p1 joined before p2) is promoted.
    assert.equal(t1.new_host_id, p1.player_id);
    assert.equal(t2.new_host_id, p1.player_id);
    assert.equal(t1.previous_host_id, room.host_id);
    assert.equal(t1.reason, 'host_dropped');

    // Client-side role flipped on promoted LobbyClient.
    assert.equal(c1.role, 'host');
    assert.equal(c2.role, 'player');

    // New host can publish state; peers receive it.
    const c2StateReceived = new Promise((resolve) => c2.once('state', resolve));
    c1.sendState({ promoted: true, turn: 0 });
    const state = await c2StateReceived;
    assert.deepEqual(state.payload, { promoted: true, turn: 0 });
    assert.equal(state.version, 1);

    c1.close();
    c2.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: TKT-05 host reconnects within grace window → no transfer', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 300 });
    const p1 = lobby.joinRoom({ code: room.code, playerName: 'Phone1' });

    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
      reconnect: false,
    });
    const c1 = openClient({
      wsUrl,
      code: room.code,
      playerId: p1.player_id,
      token: p1.player_token,
      role: 'player',
      reconnect: false,
    });
    await Promise.all([host.connect(), c1.connect()]);

    let transferFired = false;
    c1.on('host_transferred', () => {
      transferFired = true;
    });

    host.socket.terminate();
    // Reconnect host immediately (well within grace of 300ms).
    await new Promise((r) => setTimeout(r, 50));
    const hostAgain = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
      reconnect: false,
    });
    await hostAgain.connect();
    // Wait past original grace window to confirm the transfer did NOT fire.
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(transferFired, false);
    assert.equal(c1.role, 'player');

    hostAgain.close();
    c1.close();
  } finally {
    await wsHandle.close();
  }
});

test('e2e: TKT-05 host drops with no connected peers → room closes (no eligible candidate)', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV', hostTransferGraceMs: 80 });
    const host = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: room.host_token,
      role: 'host',
      reconnect: false,
    });
    await host.connect();
    host.socket.terminate();
    // Wait past grace.
    await new Promise((r) => setTimeout(r, 200));
    const r = lobby.getRoom(room.code);
    assert.equal(r.closed, true);
  } finally {
    await wsHandle.close();
  }
});

test('e2e: LobbyClient auth failure rejects with connect() promise reject', async () => {
  const { lobby, wsHandle, wsUrl } = await spinUp();
  try {
    const room = lobby.createRoom({ hostName: 'TV' });
    const bad = openClient({
      wsUrl,
      code: room.code,
      playerId: room.host_id,
      token: 'WRONG_TOKEN',
      role: 'host',
      reconnect: false,
    });
    await assert.rejects(() => bad.connect(), /closed before hello/);
  } finally {
    await wsHandle.close();
  }
});
