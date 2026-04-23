// M10 Phase B — /api/campaign routes integration tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { createCampaignRouter } = require('../../apps/backend/routes/campaign');
const { _resetStore } = require('../../apps/backend/services/campaign/campaignStore');
const { _resetCache } = require('../../apps/backend/services/campaign/campaignLoader');

function startTestServer(t) {
  _resetStore();
  _resetCache();
  const app = express();
  app.use(express.json());
  app.use('/api', createCampaignRouter());
  const server = app.listen(0);
  const port = server.address().port;
  t.after(() => server.close());
  return { port, url: `http://127.0.0.1:${port}` };
}

function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'content-type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsedBody = null;
        try {
          parsedBody = data ? JSON.parse(data) : null;
        } catch (e) {
          parsedBody = data;
        }
        resolve({ status: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('POST /api/campaign/start: creates new campaign', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  assert.equal(res.status, 201);
  assert.ok(res.body.campaign.id);
  assert.equal(res.body.campaign.playerId, 'p1');
  assert.equal(res.body.campaign.currentAct, 0);
  assert.equal(res.body.campaign.currentChapter, 1);
  assert.equal(res.body.next_encounter_id, 'enc_tutorial_01');
  assert.ok(res.body.campaign_def.narrative_hook);
});

test('POST /api/campaign/start: missing player_id = 400', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, {});
  assert.equal(res.status, 400);
});

test('POST /api/campaign/start: invalid campaign_def_id = 404', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, {
    player_id: 'p1',
    campaign_def_id: 'nonexistent',
  });
  assert.equal(res.status, 404);
});

test('GET /api/campaign/state: fetch campaign by id', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('GET', `${url}/api/campaign/state?id=${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.campaign.id, id);
});

test('GET /api/campaign/state: missing id = 400', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/state`);
  assert.equal(res.status, 400);
});

test('GET /api/campaign/list: player campaigns', async (t) => {
  const { url } = startTestServer(t);
  await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  await request('POST', `${url}/api/campaign/start`, { player_id: 'p2' });
  const res = await request('GET', `${url}/api/campaign/list?player_id=p1`);
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
});

test('POST /api/campaign/advance: victory advances chapter', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 3,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.campaign.currentChapter, 2);
  assert.equal(res.body.next_encounter_id, 'enc_tutorial_02');
  assert.equal(res.body.campaign.chapters.length, 1);
  assert.equal(res.body.campaign.chapters[0].outcome, 'victory');
  assert.equal(res.body.campaign.chapters[0].peEarned, 3);
});

test('POST /api/campaign/advance: defeat retries same encounter', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'defeat',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.retry, true);
  assert.equal(res.body.next_encounter_id, 'enc_tutorial_01'); // same
  // chapter not advanced
  assert.equal(res.body.campaign.currentChapter, 1);
});

test('POST /api/campaign/advance: invalid outcome = 400', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'invalid' });
  assert.equal(res.status, 400);
});

test('POST /api/campaign/choose: applies branch + advances', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;

  // Fast-forward: advance through Act 0 tutorial (5 encounters victory)
  for (let i = 0; i < 5; i++) {
    await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'victory' });
  }
  // Now should be at Act 1 chapter 6 (enc_savana_01)
  await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'victory' });
  // Now chapter 7 = choice_node

  const res = await request('POST', `${url}/api/campaign/choose`, {
    id,
    branch_key: 'cave_path',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.next_encounter_id, 'enc_caverna_02');
  assert.deepEqual(res.body.campaign.branchChoices, ['cave_path']);
});

test('POST /api/campaign/choose: invalid branch_key = 400', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/choose`, {
    id,
    branch_key: 'invalid_branch',
  });
  assert.equal(res.status, 400);
});

test('POST /api/campaign/end: finalize completed', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/end`, {
    id,
    final_state: 'completed',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.campaign.finalState, 'completed');
  assert.equal(res.body.campaign.completionPct, 1.0);
});

test('POST /api/campaign/end: already finalized = 409', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  await request('POST', `${url}/api/campaign/end`, { id, final_state: 'abandoned' });
  const res = await request('POST', `${url}/api/campaign/end`, { id, final_state: 'completed' });
  assert.equal(res.status, 409);
});

test('POST /api/campaign/advance: on finalized campaign = 409', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  await request('POST', `${url}/api/campaign/end`, { id, final_state: 'completed' });
  const res = await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'victory' });
  assert.equal(res.status, 409);
});

// M10 Phase C: summary endpoint

test('GET /api/campaign/summary: returns full UI snapshot', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('GET', `${url}/api/campaign/summary?id=${id}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.campaign);
  assert.ok(res.body.current_encounter);
  assert.equal(res.body.current_encounter.encounter_id, 'enc_tutorial_01');
  assert.equal(res.body.next_encounter.next_encounter_id, 'enc_tutorial_02');
  assert.equal(res.body.progress, 0);
  assert.equal(res.body.can_advance, true);
  assert.equal(res.body.can_choose, false);
  assert.deepEqual(res.body.branch_path, []);
  assert.equal(res.body.completion_status, 'in_progress');
});

test('GET /api/campaign/summary: missing id = 400', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/summary`);
  assert.equal(res.status, 400);
});

test('GET /api/campaign/summary: unknown id = 404', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('GET', `${url}/api/campaign/summary?id=nonexistent-uuid`);
  assert.equal(res.status, 404);
});

// M12 Phase D — evolve_opportunity flag (ADR-2026-04-23 addendum).

test('advance: victory + pe_earned >= 8 sets evolve_opportunity=true', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 8,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.evolve_opportunity, true);
  assert.equal(res.body.evolve_pe_threshold, 8);
  assert.equal(res.body.evolve_pe_earned, 8);
});

test('advance: victory + pe_earned < 8 sets evolve_opportunity=false', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 5,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.evolve_opportunity, false);
  assert.equal(res.body.evolve_pe_earned, 5);
});

test('advance: defeat never triggers evolve_opportunity', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'defeat',
    pe_earned: 20,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.retry, true);
  assert.equal(res.body.evolve_opportunity, false);
});

test('computeEvolveOpportunity exported pure helper', () => {
  const mod = require('../../apps/backend/routes/campaign');
  assert.equal(mod.PE_EVOLVE_TRIGGER_THRESHOLD, 8);
  assert.deepEqual(mod.computeEvolveOpportunity('victory', 8), {
    evolve_opportunity: true,
    evolve_pe_threshold: 8,
    evolve_pe_earned: 8,
  });
  assert.equal(mod.computeEvolveOpportunity('victory', 7).evolve_opportunity, false);
  assert.equal(mod.computeEvolveOpportunity('timeout', 50).evolve_opportunity, false);
});
