'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  recordOffspring,
  getTribesEmergent,
  listLineageEntries,
  _resetLineageRegistry,
  LINEAGE_REGISTRY_MAX_PER_CAMPAIGN,
} = require('../../apps/backend/services/metaProgression');

test('scoping: campaignId filter isolates lineage entries per campaign', () => {
  _resetLineageRegistry();
  recordOffspring({ unit_id: 'a1', lineage_id: 'LA', campaign_id: 'cA', generation: 0 });
  recordOffspring({ unit_id: 'a2', lineage_id: 'LA', campaign_id: 'cA', generation: 1 });
  recordOffspring({ unit_id: 'b1', lineage_id: 'LB', campaign_id: 'cB', generation: 0 });
  assert.equal(listLineageEntries('cA').length, 2, 'cA sees only its 2');
  assert.equal(listLineageEntries('cB').length, 1, 'cB sees only its 1');
  assert.equal(listLineageEntries().length, 3, 'no-arg = all (back-compat)');
});

test('scoping: getTribesEmergent campaignId filter (cross-campaign isolation)', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++)
    recordOffspring({ unit_id: `x${i}`, lineage_id: 'SHARED', campaign_id: 'cX', generation: i });
  for (let i = 0; i < 3; i++)
    recordOffspring({ unit_id: `y${i}`, lineage_id: 'SHARED', campaign_id: 'cY', generation: i });
  // Same lineage_id across 2 campaigns: scoped each sees 3 (a tribe); unscoped sees 6.
  const tX = getTribesEmergent({ campaignId: 'cX' }).find((t) => t.tribe_id === 'SHARED');
  assert.equal(tX.members_count, 3, 'cX tribe isolated to its 3 members');
  const tAll = getTribesEmergent().find((t) => t.tribe_id === 'SHARED');
  assert.equal(tAll.members_count, 6, 'no-arg = global (back-compat)');
});

test('prune: per-campaign FIFO cap evicts oldest', () => {
  _resetLineageRegistry();
  const cap = LINEAGE_REGISTRY_MAX_PER_CAMPAIGN;
  for (let i = 0; i < cap + 5; i++) {
    recordOffspring({
      unit_id: `u${i}`,
      lineage_id: 'L',
      campaign_id: 'cP',
      generation: i,
      created_at: i,
    });
  }
  assert.equal(listLineageEntries('cP').length, cap, 'campaign capped at MAX');
  // oldest (u0..u4) evicted, newest retained
  const ids = listLineageEntries('cP').map((e) => e.unit_id);
  assert.ok(!ids.includes('u0'), 'oldest evicted');
  assert.ok(ids.includes(`u${cap + 4}`), 'newest retained');
});
