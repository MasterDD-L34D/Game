'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyNidoEconomy } = require('../../tools/sim/nido-economy');
const { makeMbtiPolicy } = require('../../tools/sim/mbti-policy');

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

test('applyNidoEconomy: captures offspring lineage parent species from the mating roll (breeding signal)', async () => {
  const http = fakeHttp();
  const out = await applyNidoEconomy(http, { step: 2, biomeId: 'badlands', runId: 'run_x' });
  assert.equal(out.offspring, 1);
  assert.equal(out.offspringLineages.length, 1, 'one lineage record per offspring rolled');
  const lin = out.offspringLineages[0];
  // greedy pool: courtship step1 -> dune-stalker (parentA), step2 -> nano-rust-bloom (parentB).
  // The diversity metric keys on the PARENT SPECIES (policy-sensitive), not the per-run-unique
  // lineage_id (a hash of the per-run courtship ids -> never collides, never diverges by policy).
  assert.deepEqual(lin.parentSpecies, ['dune-stalker', 'nano-rust-bloom']);
  assert.equal(lin.lineageId, 'l1', 'canonical lineage_id captured from the /mating/roll response');
});

test('applyNidoEconomy: offspring lineage species DIVERGE by policy (mbti breeds a different cross)', async () => {
  // The headline of lineage_diversity: a temperament that courts a different species order
  // breeds a different parent-species cross -> the breeding signal becomes policy-sensitive
  // (the bare offspring COUNT is not). ESFP pool order = [nano-rust-bloom, sand-burrower, ...].
  const greedyOut = await applyNidoEconomy(fakeHttp(), {
    step: 2,
    biomeId: 'badlands',
    runId: 'run_g',
  });
  const esfpOut = await applyNidoEconomy(fakeHttp(), {
    step: 2,
    biomeId: 'badlands',
    runId: 'run_e',
    policy: makeMbtiPolicy('ESFP'),
  });
  assert.deepEqual(greedyOut.offspringLineages[0].parentSpecies, [
    'dune-stalker',
    'nano-rust-bloom',
  ]);
  assert.deepEqual(esfpOut.offspringLineages[0].parentSpecies, [
    'nano-rust-bloom',
    'sand-burrower',
  ]);
  assert.notDeepEqual(
    greedyOut.offspringLineages[0].parentSpecies,
    esfpOut.offspringLineages[0].parentSpecies,
  );
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
