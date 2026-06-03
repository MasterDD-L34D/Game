// TKT-WORLDGEN-GAPC slice A+C — live campaign routing via the meta-network graph.
// Flag-gated behind META_NETWORK_ROUTING: ON -> /advance + /choose walk the graph
// (each node serves an encounter; >1 eligible -> the players choose); OFF (default) ->
// the static act.encounters chain, byte-identical. Owner-gated (data + live flow).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter } = require('../../apps/backend/routes/campaign');

function startTestServer(t) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return `http://127.0.0.1:${port}`;
}

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body != null ? JSON.stringify(body) : null;
    const r = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers: payload
          ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsedBody = null;
          try {
            parsedBody = data ? JSON.parse(data) : null;
          } catch {
            parsedBody = data;
          }
          resolve({ status: res.statusCode, body: parsedBody });
        });
      },
    );
    r.on('error', reject);
    if (payload) r.end(payload);
    else r.end();
  });
}

const post = (url, body) => req('POST', url, body);

function enableFlag(t) {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
}

async function startCampaign(url) {
  return post(`${url}/api/campaign/start`, { player_id: 'meta_route_p' });
}

// --- flag OFF: byte-identical to the static chain (regression lock) ------------------

test('advance: flag OFF -> static chain, no graph fields (regression lock)', async (t) => {
  delete process.env.META_NETWORK_ROUTING;
  const url = startTestServer(t);
  const s = await startCampaign(url);
  assert.equal(s.status, 201);
  // Static start: the first non-choice encounter of the def; NO graph position written.
  assert.ok(typeof s.body.next_encounter_id === 'string' && s.body.next_encounter_id.length > 0);
  assert.equal(s.body.campaign.currentNode, undefined, 'no graph currentNode in static mode');
  const adv = await post(`${url}/api/campaign/advance`, {
    id: s.body.campaign.id,
    outcome: 'victory',
  });
  assert.equal(adv.status, 200);
  assert.equal(adv.body.choice_required ?? false, false, 'no graph choice in static mode');
  assert.equal(adv.body.route_choice, undefined, 'no route_choice in static mode');
});

// --- flag ON: graph-routed start + advance ------------------------------------------

test('start: flag ON -> begins at the authored start_node, serves its encounter', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  assert.equal(s.status, 201);
  assert.equal(s.body.campaign.currentNode, 'DESERTO_CALDO', 'starts at start_node');
  assert.deepEqual(s.body.campaign.clearedNodes, []);
  assert.equal(s.body.next_encounter_id, 'enc_savana_01', 'serves the start node encounter');
});

test('advance: flag ON multi-candidate node -> choice_required + candidates, currentNode unchanged', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const adv = await post(`${url}/api/campaign/advance`, {
    id: s.body.campaign.id,
    outcome: 'victory',
  });
  assert.equal(adv.status, 200);
  assert.equal(adv.body.choice_required, true);
  assert.ok(adv.body.route_choice && Array.isArray(adv.body.route_choice.candidates));
  const ids = adv.body.route_choice.candidates.map((c) => c.node_id);
  // Topology tuning: DESERTO_CALDO -> BADLANDS (corridor) + FORESTA_TEMPERATA (trophic, 1A).
  // ROVINE_PLANARI is NOT a start candidate -- its direct edge is gated prior_node_cleared
  // [BADLANDS, FORESTA_TEMPERATA] (2B) so the 2-node shortcut to the terminal is closed.
  assert.equal(ids.length, 2, 'DESERTO_CALDO -> BADLANDS + FORESTA_TEMPERATA');
  assert.ok(ids.includes('BADLANDS') && ids.includes('FORESTA_TEMPERATA'));
  assert.ok(!ids.includes('ROVINE_PLANARI'), 'terminal shortcut gated (2B)');
  assert.equal(adv.body.campaign.currentNode, 'DESERTO_CALDO', 'does not advance until /choose');
  assert.deepEqual(
    adv.body.campaign.clearedNodes,
    ['DESERTO_CALDO'],
    'current node marked cleared',
  );
});

test('advance: flag ON single-candidate node -> auto-advances + serves the next encounter', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const id = s.body.campaign.id;
  await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' }); // -> choice
  await post(`${url}/api/campaign/choose`, { id, node_id: 'BADLANDS' }); // -> BADLANDS
  // BADLANDS -> { FORESTA_TEMPERATA (eligible), DESERTO_CALDO (cleared) } = ONE candidate.
  const adv = await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' });
  assert.equal(adv.status, 200);
  assert.equal(adv.body.choice_required ?? false, false, 'single candidate -> no choice');
  assert.equal(adv.body.campaign.currentNode, 'FORESTA_TEMPERATA', 'auto-advanced');
  assert.equal(adv.body.next_encounter_id, 'enc_caverna_02');
});

test('advance: flag ON reaches the terminal via the mid-arc -> campaign completes', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const id = s.body.campaign.id;
  // The terminal is gated (2B): a direct ROVINE choice from the start is rejected (not a
  // candidate of DESERTO_CALDO until BADLANDS + FORESTA are cleared).
  await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' }); // choice @ DESERTO
  const shortcut = await post(`${url}/api/campaign/choose`, { id, node_id: 'ROVINE_PLANARI' });
  assert.equal(shortcut.status, 400, 'terminal shortcut from start is gated');
  // Walk the arc: DESERTO -> FORESTA -> (choice BADLANDS|ROVINE) -> ROVINE (terminal).
  await post(`${url}/api/campaign/choose`, { id, node_id: 'FORESTA_TEMPERATA' });
  await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' }); // choice @ FORESTA
  await post(`${url}/api/campaign/choose`, { id, node_id: 'ROVINE_PLANARI' }); // now reachable
  const adv = await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' });
  assert.equal(adv.status, 200);
  assert.equal(adv.body.campaign_completed, true);
  assert.equal(adv.body.campaign.finalState, 'completed');
  assert.equal(adv.body.next_encounter_id, null);
});

// --- /choose node_id (slice C) ------------------------------------------------------

test('choose: flag ON node_id advances to the chosen node + serves its encounter', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const id = s.body.campaign.id;
  await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' }); // -> choice
  const ch = await post(`${url}/api/campaign/choose`, { id, node_id: 'BADLANDS' });
  assert.equal(ch.status, 200);
  assert.equal(ch.body.campaign.currentNode, 'BADLANDS');
  assert.equal(ch.body.node_id, 'BADLANDS');
  assert.equal(ch.body.next_encounter_id, 'enc_tutorial_03', 'serves the chosen node encounter');
  assert.deepEqual(ch.body.campaign.routeChoices, ['BADLANDS']);
});

test('choose: flag ON node_id that is not a current candidate -> 400', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const id = s.body.campaign.id;
  await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' }); // candidates: BADLANDS, ROVINE_PLANARI
  const ch = await post(`${url}/api/campaign/choose`, { id, node_id: 'CRYOSTEPPE' });
  assert.equal(ch.status, 400, 'CRYOSTEPPE is not reachable from DESERTO_CALDO');
});

test('choose: flag ON without node_id falls through to the branch_key contract (back-compat)', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  // node_id absent -> the legacy branch_key path runs; a bogus key 400s via resolveBranch
  // (NOT the node_id validator), proving the fall-through is byte-identical.
  const ch = await post(`${url}/api/campaign/choose`, {
    id: s.body.campaign.id,
    branch_key: 'bogus_key',
  });
  assert.equal(ch.status, 400);
  assert.match(ch.body.error || '', /branch_key/, 'branch_key path executed, not node_id');
});

// Codex P2 (#2582): /choose node_id must require a PENDING route choice (the current node
// just cleared), else a client could skip the start encounter and jump straight to the
// terminal -> a victory-gate bypass. Right after /start clearedNodes is [] -> reject.
test('choose: flag ON node_id with no pending choice (encounter not cleared) -> 409, no bypass', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const id = s.body.campaign.id;
  // No /advance victory yet -> DESERTO_CALDO not cleared -> a choice is NOT pending.
  const ch = await post(`${url}/api/campaign/choose`, { id, node_id: 'ROVINE_PLANARI' });
  assert.equal(ch.status, 409, 'no pending route choice -> rejected');
  // The campaign did NOT jump to the terminal route.
  const st = await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' });
  assert.equal(st.body.campaign.currentNode, 'DESERTO_CALDO', 'still at start, not bypassed');
});

// Codex P2 (#2582): /campaign/summary must reflect the GRAPH encounter in graph mode (not
// the static tutorial chapter the campaign record still carries) so a client polling the
// summary after /start sees what /advance actually serves.
test('summary: flag ON reflects the current graph node encounter (not the static chapter)', async (t) => {
  enableFlag(t);
  const url = startTestServer(t);
  const s = await startCampaign(url);
  const id = s.body.campaign.id;
  const sum = await req('GET', `${url}/api/campaign/summary?id=${id}`);
  assert.equal(sum.status, 200);
  assert.equal(
    sum.body.current_encounter.encounter_id,
    'enc_savana_01',
    'summary serves the start node encounter, not enc_tutorial_01',
  );
  assert.equal(sum.body.current_encounter.node_id, 'DESERTO_CALDO');
});
