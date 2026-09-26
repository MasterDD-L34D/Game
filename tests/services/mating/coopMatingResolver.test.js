'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveCoopMatingOffspring,
} = require('../../../apps/backend/services/mating/coopMatingResolver');

test('rolls via injected store (no prisma -> bare parents)', async () => {
  const calls = [];
  const stubStore = {
    rollOffspring: async (args) => {
      calls.push(args);
      return { success: true, offspring: { lineage_id: 'L1' } };
    },
  };
  const res = await resolveCoopMatingOffspring({
    store: stubStore,
    parentAId: 'u_a',
    parentBId: 'u_b',
    biomeId: 'enc_a',
    campaignId: null,
    prisma: null,
  });
  assert.equal(res.success, true);
  assert.equal(res.offspring.lineage_id, 'L1');
  assert.equal(calls[0].parentA.id, 'u_a');
  assert.equal(calls[0].parentB.id, 'u_b');
  assert.equal(calls[0].biomeId, 'enc_a');
});

test('guards: missing store or ids', async () => {
  assert.equal(
    (await resolveCoopMatingOffspring({ store: null, parentAId: 'a', parentBId: 'b' })).error,
    'store_required',
  );
  const stub = { rollOffspring: async () => ({ success: true, offspring: {} }) };
  assert.equal(
    (await resolveCoopMatingOffspring({ store: stub, parentAId: '', parentBId: 'b' })).error,
    'parent_ids_required',
  );
});
