'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyNidoEconomy } = require('../../tools/sim/nido-economy');

// Fake http modelling the real meta seam (verified by _probe_3b against createApp):
// affinity bump -> still gated; trust bump -> can_recruit flips true; recruit
// (no bypass) -> recruited; mating/roll -> offspring spec.
function fakeHttp() {
  const calls = [];
  return {
    calls,
    post: async (path, body) => {
      calls.push({ path, body });
      if (path === '/api/meta/affinity') {
        return { status: 200, body: { npc: { affinity: 1 }, can_recruit: false } };
      }
      if (path === '/api/meta/trust') {
        return { status: 200, body: { npc: { trust: 2 }, can_recruit: true, can_mate: false } };
      }
      if (path === '/api/meta/recruit') {
        return { status: 200, body: { success: true, npc: { recruited: true } } };
      }
      if (path === '/api/meta/mating/roll') {
        return { status: 200, body: { success: true, offspring: { lineage_id: 'l1' } } };
      }
      return { status: 200, body: {} };
    },
  };
}

test('applyNidoEconomy: earns the canonical gate + recruits no-bypass (economy proven)', async () => {
  const http = fakeHttp();
  const out = await applyNidoEconomy(http, { step: 1, biomeId: 'badlands', runId: 'run_x' });
  assert.deepEqual(out.earnedRecruits, ['courtship_run_x_s1']);
  assert.equal(
    out.affinityProven,
    true,
    'trust response can_recruit flipped via earned affinity/trust',
  );
  assert.deepEqual(out.failures, []);
  // recruit went through the EARNED gate: no bypass, no campaign_id (default store).
  const rec = http.calls.find((c) => c.path === '/api/meta/recruit');
  assert.equal(rec.body.affinity_at_recruit, undefined, 'no affinity_at_recruit bypass');
  assert.equal(rec.body.campaign_id, undefined, 'default store (no campaign_id)');
  assert.equal(out.offspring, 0, 'step 1 has no mating pair yet');
});

test('applyNidoEconomy: rolls a mating from step 2 (offspring counted, correct parents)', async () => {
  const http = fakeHttp();
  const out = await applyNidoEconomy(http, { step: 2, biomeId: 'badlands', runId: 'run_x' });
  assert.equal(out.offspring, 1, 'one offspring rolled');
  const mating = http.calls.find((c) => c.path === '/api/meta/mating/roll');
  assert.deepEqual(mating.body.parent_a, { id: 'courtship_run_x_s1' });
  assert.deepEqual(mating.body.parent_b, { id: 'courtship_run_x_s2' });
  assert.equal(mating.body.biome_id, 'badlands');
});

test('applyNidoEconomy: a failed earned-recruit surfaces as a failure (no false green)', async () => {
  const http = {
    post: async (path) => {
      if (path === '/api/meta/recruit') {
        return { status: 200, body: { success: false, reason: 'gate_not_met' } };
      }
      return { status: 200, body: { can_recruit: false } };
    },
  };
  const out = await applyNidoEconomy(http, { step: 1, biomeId: 'badlands' });
  assert.deepEqual(out.earnedRecruits, []);
  assert.equal(out.affinityProven, false);
  assert.ok(out.failures.length >= 1, 'failed earned-recruit recorded');
});
