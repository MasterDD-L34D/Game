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

// ─── V1 Onboarding Phase B ──────────────────────────────────────────────

test('POST /api/campaign/start: onboarding exposed in campaign_def', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  assert.equal(res.status, 201);
  assert.ok(res.body.campaign_def.onboarding, 'onboarding section surfaced');
  assert.equal(res.body.campaign_def.onboarding.timing_seconds, 60);
  assert.equal(res.body.campaign_def.onboarding.choices.length, 3);
});

test('POST /api/campaign/start: default_choice_on_timeout applied when no initial_trait_choice', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  assert.equal(res.status, 201);
  assert.ok(res.body.campaign.onboardingChoice, 'choice applied');
  assert.equal(res.body.campaign.onboardingChoice.option_key, 'option_a');
  assert.equal(res.body.campaign.onboardingChoice.trait_id, 'zampe_a_molla');
  assert.deepEqual(res.body.campaign.acquiredTraits, ['zampe_a_molla']);
});

test('POST /api/campaign/start: initial_trait_choice option_b → pelle_elastomera', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, {
    player_id: 'p1',
    initial_trait_choice: 'option_b',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.campaign.onboardingChoice.option_key, 'option_b');
  assert.equal(res.body.campaign.onboardingChoice.trait_id, 'pelle_elastomera');
  assert.deepEqual(res.body.campaign.acquiredTraits, ['pelle_elastomera']);
});

test('POST /api/campaign/start: initial_trait_choice option_c → denti_seghettati', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, {
    player_id: 'p1',
    initial_trait_choice: 'option_c',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.campaign.onboardingChoice.trait_id, 'denti_seghettati');
});

test('POST /api/campaign/start: invalid initial_trait_choice fallback su default', async (t) => {
  const { url } = startTestServer(t);
  const res = await request('POST', `${url}/api/campaign/start`, {
    player_id: 'p1',
    initial_trait_choice: 'option_z_invalid',
  });
  assert.equal(res.status, 201);
  // Fallback su default_choice_on_timeout (option_a)
  assert.equal(res.body.campaign.onboardingChoice.option_key, 'option_a');
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

// M13 P3 Phase B — XP grant hook on victory.

test('advance: victory + survivors array grants XP to each', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 5,
    survivors: [
      { id: 'u_a', job: 'skirmisher' },
      { id: 'u_b', job: 'vanguard' },
    ],
    xp_per_unit: 15,
  });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.xp_grants));
  assert.equal(res.body.xp_grants.length, 2);
  const byId = Object.fromEntries(res.body.xp_grants.map((g) => [g.unit_id, g]));
  assert.equal(byId.u_a.amount, 15);
  assert.equal(byId.u_a.level_after, 2);
  assert.equal(byId.u_a.leveled_up, true);
});

test('advance: victory without survivors → xp_grants empty', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 3,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.xp_grants, []);
});

// Sprint Spore Moderate (ADR-2026-04-26 §S3) — MP grant hook on victory.

test('advance: victory + survivors + encounter_meta tier=2 → mp_grants emitted', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 5,
    survivors: [
      { id: 'u_a', job: 'skirmisher', mp: 0 },
      { id: 'u_b', job: 'vanguard', mp: 5 },
    ],
    encounter_meta: { tier: 2, kill_with_status: true, biome_match: false },
  });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.mp_grants), 'mp_grants array present');
  assert.equal(res.body.mp_grants.length, 2);
  const byId = Object.fromEntries(res.body.mp_grants.map((g) => [g.unit_id, g]));
  // tier_2 (+2) + status_kill (+1) = +3 each
  assert.equal(byId.u_a.earned, 3);
  assert.equal(byId.u_b.earned, 3);
});

test('advance: victory tier=1 no bonus → mp_grants empty', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 5,
    survivors: [{ id: 'u_a', job: 'skirmisher', mp: 0 }],
    encounter_meta: { tier: 1 },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.mp_grants, []);
});

test('advance: defeat never grants MP even with survivors', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'defeat',
    survivors: [{ id: 'u_x', job: 'skirmisher' }],
    encounter_meta: { tier: 3, kill_with_status: true, biome_match: true },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.mp_grants, []);
});

test('advance: defeat never grants XP even with survivors', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'defeat',
    survivors: [{ id: 'u_x', job: 'skirmisher' }],
    xp_per_unit: 100,
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.xp_grants, []);
});

test('advance: xp_per_unit defaults to xp_curve.yaml mission_victory', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'p1' });
  const id = create.body.campaign.id;
  const res = await request('POST', `${url}/api/campaign/advance`, {
    id,
    outcome: 'victory',
    pe_earned: 5,
    survivors: [{ id: 'u_default', job: 'ranger' }],
    // no xp_per_unit → default 12
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.xp_grants[0].amount, 12);
  assert.equal(res.body.xp_grants[0].level_after, 2); // 12 XP = level 2 (10 ≤ xp < 25)
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
