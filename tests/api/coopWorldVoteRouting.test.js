// TKT-WORLDGEN-GAPC slice C — co-op world_vote -> /campaign/choose route bridge.
// Proves the REUSE seam (no production change): the campaign emits route_choice
// candidates; the co-op layer runs its existing accept-vote over the proposed route
// node; the agreed winner (worldTally.scenario_id) is a valid candidate and, submitted
// to POST /campaign/choose { node_id }, advances the campaign. Campaign routing stays
// choice-agnostic (it never runs the tally) -> co-op + solo/sim share the same /choose.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter } = require('../../apps/backend/routes/campaign');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function startTestServer(t) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return `http://127.0.0.1:${port}`;
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
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

test('co-op world_vote winner resolves a graph route choice via /choose', async (t) => {
  process.env.META_NETWORK_ROUTING = 'true';
  t.after(() => {
    delete process.env.META_NETWORK_ROUTING;
  });
  const url = startTestServer(t);

  // 1. Campaign reaches a multi-candidate branch (DESERTO_CALDO -> BADLANDS + ROVINE_PLANARI).
  const s = await post(`${url}/api/campaign/start`, { player_id: 'coop_route_p' });
  const id = s.body.campaign.id;
  const adv = await post(`${url}/api/campaign/advance`, { id, outcome: 'victory' });
  assert.equal(adv.body.choice_required, true);
  const candidates = adv.body.route_choice.candidates.map((c) => c.node_id);
  assert.ok(candidates.length > 1, 'a genuine multi-candidate choice');

  // 2. The co-op party runs its EXISTING accept-vote over a proposed route node (the
  //    party's preferred candidate). Quorum accept -> the agreed scenario = that node.
  const chosen = candidates.includes('BADLANDS') ? 'BADLANDS' : candidates[0];
  const allPlayerIds = ['p_host', 'p_two'];
  const co = new CoopOrchestrator({ roomCode: 'ROUTE', hostId: 'p_host' });
  co.startRun({ scenarioStack: [chosen] }); // current run scenario = the proposed route node
  co._setPhase('world_setup');
  co.voteWorld('p_host', { scenarioId: chosen, accept: true, allPlayerIds });
  const tally = co.voteWorld('p_two', { scenarioId: chosen, accept: true, allPlayerIds });

  // 3. The vote reached quorum and the agreed node is a valid campaign candidate.
  assert.equal(tally.accept, 2, 'both players accepted (quorum)');
  assert.equal(tally.pending, 0);
  assert.equal(tally.scenario_id, chosen, 'tally surfaces the agreed route node');
  assert.ok(candidates.includes(tally.scenario_id), 'the winner is a valid route candidate');

  // 4. The bridge: submit the co-op winner to the campaign's /choose -> it advances.
  const ch = await post(`${url}/api/campaign/choose`, { id, node_id: tally.scenario_id });
  assert.equal(ch.status, 200);
  assert.equal(ch.body.campaign.currentNode, chosen, 'campaign routed to the voted node');
  assert.ok(ch.body.next_encounter_id, 'the chosen node serves its encounter');
});
