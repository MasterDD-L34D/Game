// campaignStore biomeMemory helpers -- OD-059 (#1673) campaign-scoped READ-ONLY
// NARRATIVE biome-familiarity carry-over. Mirror of campaignPermanentFlags.test.js.
//
// Core OD-059 fix asserted here: two recordBiomeTurns calls under the SAME campaign
// id but DIFFERENT sessions ACCUMULATE (cross-encounter carry-over -- the thing
// `unit.cumulative_biome_turns` (session-scoped, mechanical, inert) never did).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCampaign,
  getCampaign,
  recordBiomeTurns,
  getBiomeMemory,
  _resetStore,
} = require('../../apps/backend/services/campaign/campaignStore');

test('createCampaign initializes empty biomeMemory object', () => {
  _resetStore();
  const c = createCampaign('p1');
  assert.deepEqual(c.biomeMemory, {});
});

test('createCampaign accepts biomeMemory in opts (clone, not shared ref)', () => {
  _resetStore();
  const seed = { u1: { savana: 4 } };
  const c = createCampaign('p1', 'default', { biomeMemory: seed });
  assert.deepEqual(c.biomeMemory, { u1: { savana: 4 } });
  assert.notEqual(c.biomeMemory, seed, 'cloned, not the same ref');
});

test('recordBiomeTurns seeds a new familiarity entry', () => {
  _resetStore();
  const c = createCampaign('p1');
  const updated = recordBiomeTurns(c.id, 'u1', 'savana', 3);
  assert.deepEqual(updated.biomeMemory, { u1: { savana: 3 } });
});

test('OD-059 CORE: two calls, SAME campaign + DIFFERENT sessions -> ACCUMULATE', () => {
  _resetStore();
  const c = createCampaign('p1');
  // encounter #1 (one session)
  recordBiomeTurns(c.id, 'u1', 'savana', 3);
  // encounter #2 (a SEPARATE session of the SAME campaign run) -> carry-over
  recordBiomeTurns(c.id, 'u1', 'savana', 4);
  const mem = getBiomeMemory(c.id, 'u1');
  assert.deepEqual(mem, { savana: 7 }, 'cross-encounter familiarity accumulates');
});

test('recordBiomeTurns keeps biomes + units in separate buckets', () => {
  _resetStore();
  const c = createCampaign('p1');
  recordBiomeTurns(c.id, 'u1', 'savana', 3);
  recordBiomeTurns(c.id, 'u1', 'caverna', 2);
  recordBiomeTurns(c.id, 'u2', 'savana', 5);
  const fresh = getCampaign(c.id);
  assert.deepEqual(fresh.biomeMemory, {
    u1: { savana: 3, caverna: 2 },
    u2: { savana: 5 },
  });
});

test('getBiomeMemory returns the per-unit familiarity map', () => {
  _resetStore();
  const c = createCampaign('p1');
  recordBiomeTurns(c.id, 'u1', 'savana', 6);
  assert.deepEqual(getBiomeMemory(c.id, 'u1'), { savana: 6 });
});

test('getBiomeMemory returns {} for an unknown unit / campaign (no throw)', () => {
  _resetStore();
  const c = createCampaign('p1');
  assert.deepEqual(getBiomeMemory(c.id, 'never_played'), {});
  assert.deepEqual(getBiomeMemory('bad_campaign_id', 'u1'), {});
});

test('recordBiomeTurns ignores invalid input (no throw, no garbage keys)', () => {
  _resetStore();
  const c = createCampaign('p1');
  assert.equal(recordBiomeTurns('nonexistent_id', 'u1', 'savana', 1), null);
  // missing unit/biome -> clone with no garbage keys
  recordBiomeTurns(c.id, null, 'savana', 1);
  recordBiomeTurns(c.id, 'u1', null, 1);
  assert.deepEqual(getCampaign(c.id).biomeMemory, {});
});

// GUARDRAIL (band-safety): the campaign-scoped narrative layer must NEVER write the
// mechanical/inert unit primitive `cumulative_biome_turns`. Separate namespaces.
test('GUARDRAIL: recordBiomeTurns never sets unit.cumulative_biome_turns', () => {
  _resetStore();
  const c = createCampaign('p1');
  recordBiomeTurns(c.id, 'u1', 'savana', 9);
  const fresh = getCampaign(c.id);
  // The store has no `units` array; the layer touches only `biomeMemory`.
  assert.equal('cumulative_biome_turns' in fresh, false);
  assert.equal('units' in fresh, false);
  // And the familiarity value is namespaced under biomeMemory, not a unit field.
  assert.deepEqual(fresh.biomeMemory, { u1: { savana: 9 } });
});
