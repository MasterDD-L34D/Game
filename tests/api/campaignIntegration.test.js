// M10 Phase E — end-to-end campaign lifecycle integration tests.
//
// Exercise full campaign playthrough via HTTP API:
// - start → 5×victory Act 0 → 1 Act 1 → choose cave_path → 1 victory → boss → completed
// - Variante ruins_path parallel
// - Defeat retry multi-attempt
// - Concurrent campaigns non interferiscono
//
// Valida end-to-end ADR-2026-04-21 flow senza UI.

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
        } catch {
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

async function victory(url, id, pe = 3) {
  return request('POST', `${url}/api/campaign/advance`, { id, outcome: 'victory', pe_earned: pe });
}

test('E2E: full campaign playthrough cave_path → completed', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'e2e_cave' });
  assert.equal(create.status, 201);
  const id = create.body.campaign.id;

  // Act 0: tutorial 01-05 (5 victory)
  const expected = [
    'enc_tutorial_01',
    'enc_tutorial_02',
    'enc_tutorial_03',
    'enc_tutorial_04',
    'enc_tutorial_05',
  ];
  for (let i = 0; i < expected.length; i++) {
    const summary = await request('GET', `${url}/api/campaign/summary?id=${id}`);
    assert.equal(summary.body.current_encounter.encounter_id, expected[i]);
    const adv = await victory(url, id);
    assert.equal(adv.status, 200);
  }

  // Now Act 1: enc_savana_01
  const afterAct0 = await request('GET', `${url}/api/campaign/summary?id=${id}`);
  assert.equal(afterAct0.body.campaign.currentAct, 1);
  assert.equal(afterAct0.body.current_encounter.encounter_id, 'enc_savana_01');

  // Act 1 ch 6 victory → choice node
  const afterSavana = await victory(url, id);
  assert.equal(afterSavana.body.choice_required, true);

  // Choose cave_path
  const chose = await request('POST', `${url}/api/campaign/choose`, {
    id,
    branch_key: 'cave_path',
  });
  assert.equal(chose.status, 200);
  assert.equal(chose.body.next_encounter_id, 'enc_caverna_02');

  // Victory cave → boss
  const afterCave = await victory(url, id);
  assert.equal(afterCave.body.next_encounter_id, 'enc_tutorial_06_hardcore');

  // Victory boss → campaign completed
  const afterBoss = await victory(url, id);
  assert.equal(afterBoss.body.campaign_completed, true);
  assert.equal(afterBoss.body.campaign.finalState, 'completed');
  assert.equal(afterBoss.body.campaign.completionPct, 1.0);

  // Final state check
  const finalSummary = await request('GET', `${url}/api/campaign/summary?id=${id}`);
  assert.equal(finalSummary.body.completion_status, 'completed');
  assert.equal(finalSummary.body.progress, 1.0);
  assert.equal(finalSummary.body.can_advance, false);
});

test('E2E: full campaign ruins_path variant', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'e2e_ruins' });
  const id = create.body.campaign.id;

  // Fast-forward Act 0 + first Act 1 encounter
  for (let i = 0; i < 6; i++) await victory(url, id);

  // Choose ruins_path
  const chose = await request('POST', `${url}/api/campaign/choose`, {
    id,
    branch_key: 'ruins_path',
  });
  assert.equal(chose.body.next_encounter_id, 'enc_capture_01');

  // Victory ruins → boss
  const afterRuins = await victory(url, id);
  assert.equal(afterRuins.body.next_encounter_id, 'enc_tutorial_06_hardcore');

  // Victory boss → completed
  const afterBoss = await victory(url, id);
  assert.equal(afterBoss.body.campaign_completed, true);
  assert.deepEqual(afterBoss.body.campaign.branchChoices, ['ruins_path']);
});

test('E2E: defeat loops retry fino victory', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'e2e_retry' });
  const id = create.body.campaign.id;

  // 3 defeat on first encounter
  for (let i = 0; i < 3; i++) {
    const res = await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'defeat' });
    assert.equal(res.body.retry, true);
    assert.equal(res.body.next_encounter_id, 'enc_tutorial_01');
    assert.equal(res.body.campaign.currentChapter, 1);
  }

  // Chapter logs = 3 defeat attempts
  const summary = await request('GET', `${url}/api/campaign/summary?id=${id}`);
  assert.equal(summary.body.campaign.chapters.length, 3);
  assert.ok(summary.body.campaign.chapters.every((c) => c.outcome === 'defeat'));

  // Finally victory advances
  const vict = await victory(url, id);
  assert.equal(vict.body.campaign.currentChapter, 2);
  // chapters now 4 total (3 defeat + 1 victory)
  assert.equal(vict.body.campaign.chapters.length, 4);
});

test('E2E: concurrent campaigns same player non interfere', async (t) => {
  const { url } = startTestServer(t);
  const c1 = await request('POST', `${url}/api/campaign/start`, { player_id: 'concurrent' });
  const c2 = await request('POST', `${url}/api/campaign/start`, { player_id: 'concurrent' });
  assert.notEqual(c1.body.campaign.id, c2.body.campaign.id);

  // Advance c1 only
  await victory(url, c1.body.campaign.id);
  await victory(url, c1.body.campaign.id);

  const s1 = await request('GET', `${url}/api/campaign/summary?id=${c1.body.campaign.id}`);
  const s2 = await request('GET', `${url}/api/campaign/summary?id=${c2.body.campaign.id}`);
  assert.equal(s1.body.campaign.currentChapter, 3);
  assert.equal(s2.body.campaign.currentChapter, 1);
});

test('E2E: timeout outcome also counts as retry (non-victory)', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'timeout_test' });
  const id = create.body.campaign.id;

  const res = await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'timeout' });
  assert.equal(res.status, 200);
  assert.equal(res.body.retry, true);
  assert.equal(res.body.campaign.currentChapter, 1);
  assert.equal(res.body.campaign.chapters[0].outcome, 'timeout');
});

test('E2E: campaign abandonment preserves chapters history', async (t) => {
  const { url } = startTestServer(t);
  const create = await request('POST', `${url}/api/campaign/start`, { player_id: 'abandon_test' });
  const id = create.body.campaign.id;

  await victory(url, id, 3);
  await victory(url, id, 3);

  const abandon = await request('POST', `${url}/api/campaign/end`, {
    id,
    final_state: 'abandoned',
  });
  assert.equal(abandon.status, 200);
  assert.equal(abandon.body.campaign.finalState, 'abandoned');
  assert.equal(abandon.body.campaign.chapters.length, 2);
  // No attempt to advance after abandon
  const retry = await request('POST', `${url}/api/campaign/advance`, { id, outcome: 'victory' });
  assert.equal(retry.status, 409);
});
