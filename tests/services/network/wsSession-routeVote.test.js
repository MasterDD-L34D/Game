// GAP-C fase-3 -- co-op route-vote smoke (2 sockets). Mirror of
// wsSession-matingVote.test.js, extended end-to-end through the campaign:
//
//   1. campaign /advance returns choice_required + route_choice.candidates (>1)
//   2. host POST /api/coop/route/open broadcasts route_choice to phones
//   3. two phone WS sockets each send a route_vote {node_id} intent
//   4. server drains -> coopOrchestrator.voteRoute -> broadcasts route_tally
//   5. host reads route_tally.leading_node_id (tie-break = highest weight,
//      master-dd Q2) and resolves it via POST /api/campaign/choose {id, node_id}
//
// Flag-gated: META_NETWORK_ROUTING=true so /advance returns choice_required.
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const WebSocket = require('ws');

const {
  LobbyService,
  createWsServer,
} = require('../../../apps/backend/services/network/wsSession');
const { createCoopStore } = require('../../../apps/backend/services/coop/coopStore');
const { createCoopRouter } = require('../../../apps/backend/routes/coop');
const { createCampaignRouter } = require('../../../apps/backend/routes/campaign');

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

function post(baseUrl, path, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(baseUrl + path);
    const payload = JSON.stringify(body);
    const r = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }),
        );
      },
    );
    r.on('error', reject);
    r.end(payload);
  });
}

test('co-op smoke: 2 phones vote route node_ids -> host resolves leader to /choose', async () => {
  process.env.META_NETWORK_ROUTING = 'true';

  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const wsPort = wsHandle.wss.address().port;

  // REST app (campaign + coop) sharing the same lobby + coopStore as the WS server.
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  const httpServer = app.listen(0);
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  let p1Ws;
  let p2Ws;
  try {
    // 1. Campaign reaches a multi-candidate route choice.
    const started = await post(baseUrl, '/api/campaign/start', { player_id: 'coop_route_smoke' });
    const campaignId = started.body.campaign.id;
    const adv = await post(baseUrl, '/api/campaign/advance', {
      id: campaignId,
      outcome: 'victory',
    });
    assert.equal(adv.body.choice_required, true, 'graph mode returns a route choice');
    const candidates = adv.body.route_choice.candidates;
    assert.ok(candidates.length > 1, 'a genuine multi-candidate choice');

    // 2. Co-op room + 2 players + a started run.
    const created = lobby.createRoom({ hostName: 'TV' });
    const code = created.code;
    const hostToken = created.host_token;
    const p1 = lobby.joinRoom({ code, playerName: 'Ann' });
    const p2 = lobby.joinRoom({ code, playerName: 'Bob' });
    await post(baseUrl, '/api/coop/run/start', {
      code,
      host_token: hostToken,
      scenario_stack: ['enc_demo_01'],
    });

    // 3. Host opens the route choice -> route_choice broadcast to phones.
    const opened = await post(baseUrl, '/api/coop/route/open', {
      code,
      host_token: hostToken,
      candidates,
    });
    assert.equal(opened.status, 200);

    // 4. Two phone sockets connect + each votes a (different) node -> a 1-1 tie.
    p1Ws = openWs(wsPort, { code, player_id: p1.player_id, token: p1.player_token });
    p2Ws = openWs(wsPort, { code, player_id: p2.player_id, token: p2.player_token });
    await waitOpen(p1Ws);
    await waitOpen(p2Ws);
    await waitForMessage(p1Ws, (m) => m.type === 'hello');
    await waitForMessage(p2Ws, (m) => m.type === 'hello');
    // Both phones should have received the route_choice candidates broadcast.
    const rcMsg = await waitForMessage(p1Ws, (m) => m.type === 'route_choice', 2000);
    assert.equal(rcMsg.payload.candidates.length, candidates.length);

    const nodeA = candidates[0].node_id;
    const nodeB = candidates[1].node_id;
    p1Ws.send(
      JSON.stringify({ type: 'intent', payload: { action: 'route_vote', node_id: nodeA } }),
    );
    p2Ws.send(
      JSON.stringify({ type: 'intent', payload: { action: 'route_vote', node_id: nodeB } }),
    );

    // 5. A route_tally broadcast carrying both votes (2 distinct nodes, 1 each).
    const tallyMsg = await waitForMessage(
      p1Ws,
      (m) =>
        m.type === 'route_tally' &&
        (m.payload?.tallies || []).reduce((s, t) => s + t.votes, 0) === 2,
      3000,
    );
    const tally = tallyMsg.payload;
    assert.equal(tally.connected_voted, 2, 'both connected phones voted');

    // master-dd Q2 tie-break: 1-1 vote tie -> highest candidate.weight wins,
    // node_id asc as the deterministic final fallback.
    const expectedLeader = [candidates[0], candidates[1]]
      .slice()
      .sort(
        (a, b) =>
          Number(b.weight || 0) - Number(a.weight || 0) ||
          String(a.node_id).localeCompare(String(b.node_id)),
      )[0].node_id;
    assert.equal(tally.leading_node_id, expectedLeader, 'tie broken by weight then node_id');

    // 6. Host resolves the winner to the campaign /choose -> it advances.
    const chosen = await post(baseUrl, '/api/campaign/choose', {
      id: campaignId,
      node_id: tally.leading_node_id,
    });
    assert.equal(chosen.status, 200, 'choose accepted');
    assert.equal(
      chosen.body.campaign.currentNode,
      tally.leading_node_id,
      'campaign routed to winner',
    );
    assert.ok(chosen.body.next_encounter_id, 'the chosen node serves its encounter');
  } finally {
    if (p1Ws) p1Ws.close();
    if (p2Ws) p2Ws.close();
    await new Promise((r) => httpServer.close(r));
    await wsHandle.close();
    delete process.env.META_NETWORK_ROUTING;
  }
});

// Shared boot for the route-vote edge tests (PR #2597 review fixes P2-A + P1-A):
// campaign -> multi-candidate choice, room + N phones joined, run started, route opened.
async function bootRouteVote(phoneNames) {
  process.env.META_NETWORK_ROUTING = 'true';
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const wsHandle = createWsServer({ lobby, coopStore, port: 0 });
  await new Promise((resolve) => {
    if (wsHandle.wss.address()) return resolve();
    wsHandle.wss.on('listening', () => resolve());
  });
  const wsPort = wsHandle.wss.address().port;
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  const httpServer = app.listen(0);
  const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const started = await post(baseUrl, '/api/campaign/start', { player_id: 'route_edge_boot' });
  const campaignId = started.body.campaign.id;
  const adv = await post(baseUrl, '/api/campaign/advance', { id: campaignId, outcome: 'victory' });
  const candidates = adv.body.route_choice.candidates;
  assert.ok(candidates.length > 1, 'a genuine multi-candidate choice');

  const created = lobby.createRoom({ hostName: 'TV' });
  const code = created.code;
  const hostToken = created.host_token;
  const hostId = created.host_id;
  const phones = phoneNames.map((name) => ({ name, ...lobby.joinRoom({ code, playerName: name }) }));
  await post(baseUrl, '/api/coop/run/start', {
    code,
    host_token: hostToken,
    scenario_stack: ['enc_demo_01'],
  });
  await post(baseUrl, '/api/coop/route/open', { code, host_token: hostToken, candidates });

  async function cleanup() {
    await new Promise((r) => httpServer.close(r));
    await wsHandle.close();
    delete process.env.META_NETWORK_ROUTING;
  }
  return { wsPort, code, hostToken, hostId, candidates, phones, cleanup };
}

// P2-A (review #2597): host is arbiter-only for route vote -- a host route_vote
// must be rejected (host_cannot_intent) and must NOT land in the tally.
test('route-vote P2-A: host cannot cast a route vote (arbiter-only)', async () => {
  const ctx = await bootRouteVote(['Ann']);
  const hostWs = openWs(ctx.wsPort, { code: ctx.code, player_id: ctx.hostId, token: ctx.hostToken });
  const annWs = openWs(ctx.wsPort, {
    code: ctx.code,
    player_id: ctx.phones[0].player_id,
    token: ctx.phones[0].player_token,
  });
  try {
    await waitOpen(hostWs);
    await waitOpen(annWs);
    await waitForMessage(hostWs, (m) => m.type === 'hello');
    await waitForMessage(annWs, (m) => m.type === 'hello');

    // Host attempts a route vote -> must be rejected, not accepted.
    hostWs.send(
      JSON.stringify({ type: 'intent', payload: { action: 'route_vote', node_id: ctx.candidates[0].node_id } }),
    );
    const err = await waitForMessage(hostWs, (m) => m.type === 'error', 2000);
    assert.equal(err.payload.code, 'host_cannot_intent', 'host route_vote rejected');

    // A real phone votes -> its route_vote_accepted tally counts exactly 1 (the host
    // vote was rejected, so it never landed in routeVotes; otherwise total would be 2).
    annWs.send(
      JSON.stringify({ type: 'intent', payload: { action: 'route_vote', node_id: ctx.candidates[1].node_id } }),
    );
    const acc = await waitForMessage(annWs, (m) => m.type === 'route_vote_accepted', 2000);
    const totalVotes = (acc.payload.tally.tallies || []).reduce((s, t) => s + t.votes, 0);
    assert.equal(totalVotes, 1, 'only the phone vote counted; host vote rejected, not in tally');
  } finally {
    hostWs.close();
    annWs.close();
    await ctx.cleanup();
  }
});

// P1-A (review #2597): a non-voter disconnect during an open route choice must
// re-broadcast route_tally with the departed player dropped from connected_total
// (otherwise the host waits forever for a gone voter).
test('route-vote P1-A: non-voter disconnect re-broadcasts route_tally with reduced connected_total', async () => {
  const ctx = await bootRouteVote(['Ann', 'Bob', 'Cara']);
  const [ann, bob, cara] = ctx.phones;
  const annWs = openWs(ctx.wsPort, { code: ctx.code, player_id: ann.player_id, token: ann.player_token });
  const bobWs = openWs(ctx.wsPort, { code: ctx.code, player_id: bob.player_id, token: bob.player_token });
  const caraWs = openWs(ctx.wsPort, { code: ctx.code, player_id: cara.player_id, token: cara.player_token });
  try {
    await waitOpen(annWs);
    await waitOpen(bobWs);
    await waitOpen(caraWs);
    await waitForMessage(annWs, (m) => m.type === 'hello');
    await waitForMessage(bobWs, (m) => m.type === 'hello');
    await waitForMessage(caraWs, (m) => m.type === 'hello');

    // Ann + Bob vote; Cara (3rd connected) does NOT vote -> total 3, voted 2, pending 1.
    annWs.send(
      JSON.stringify({ type: 'intent', payload: { action: 'route_vote', node_id: ctx.candidates[0].node_id } }),
    );
    bobWs.send(
      JSON.stringify({ type: 'intent', payload: { action: 'route_vote', node_id: ctx.candidates[0].node_id } }),
    );
    await waitForMessage(
      annWs,
      (m) => m.type === 'route_tally' && m.payload.connected_total === 3 && m.payload.connected_voted === 2,
      2000,
    );

    // Cara disconnects without voting -> P1-A must re-broadcast a tally with connected_total = 2.
    caraWs.close();
    const reTally = await waitForMessage(
      annWs,
      (m) => m.type === 'route_tally' && m.payload.connected_total === 2,
      3000,
    );
    assert.equal(reTally.payload.connected_voted, 2, 'the remaining 2 connected both voted');
    assert.equal(reTally.payload.all_connected_voted, true, 'quorum reached once the non-voter left');
  } finally {
    annWs.close();
    bobWs.close();
    caraWs.close();
    await ctx.cleanup();
  }
});
