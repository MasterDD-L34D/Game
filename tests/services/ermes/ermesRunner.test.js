// ADR-2026-05-29 TKT-BR-03 -- ermesRunner reverse-index + idempotent queue.
//
// Locks the invariants of createErmesRunner (route shipped #2428 senza test):
//   1. reverse-index trait -> [pool_id] built at boot from biome_pools
//      (core + support + role_templates.preferred_traits).
//   2. enqueueRerun set-based dedup (same trait twice -> queue size 1).
//   3. runQueuedRerun ('/skip' lab) returns affected_pools (deduped) + clears
//      queue; empty queue -> skipped; listeners fire on completion.
//   4. missing biome_pools file -> empty index, no throw (soft-fail boot).
//
// Test runner: node:test. labScriptPath '/skip' bypasses python spawn.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createErmesRunner } = require('../../../apps/backend/services/ermes/ermesRunner');

// t_shared in both pools; t_a only savana; t_b only caverna (support);
// t_rt only caverna (via role_templates.preferred_traits).
const POOLS_FIXTURE = {
  pools: [
    { id: 'pool_savana', traits: { core: ['t_shared', 't_a'], support: [] }, role_templates: [] },
    {
      id: 'pool_caverna',
      traits: { core: ['t_shared'], support: ['t_b'] },
      role_templates: [{ preferred_traits: ['t_rt'] }],
    },
  ],
};

function makeRunner(extraOpts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ermes-runner-'));
  const p = path.join(dir, 'biome_pools.json');
  fs.writeFileSync(p, JSON.stringify(POOLS_FIXTURE));
  // Reverse-index built at construction, so the fixture file can go after.
  const runner = createErmesRunner({ biomePoolsPath: p, labScriptPath: '/skip', ...extraOpts });
  fs.rmSync(dir, { recursive: true, force: true });
  return runner;
}

test('reverse-index maps trait -> pools (core + support + role_templates)', () => {
  const r = makeRunner();
  assert.deepEqual(r.poolsForTrait('t_shared').sort(), ['pool_caverna', 'pool_savana']);
  assert.deepEqual(r.poolsForTrait('t_a'), ['pool_savana']);
  assert.deepEqual(r.poolsForTrait('t_b'), ['pool_caverna']);
  assert.deepEqual(r.poolsForTrait('t_rt'), ['pool_caverna']);
  assert.deepEqual(r.poolsForTrait('unknown_trait'), []);
});

test('getTraitToPoolsMap returns a populated Map', () => {
  const r = makeRunner();
  const map = r.getTraitToPoolsMap();
  assert.ok(map instanceof Map);
  assert.ok(map.has('t_shared'));
});

test('enqueueRerun: valid id true, missing id false, set-based dedup', () => {
  const r = makeRunner();
  assert.equal(r.pendingQueueSize(), 0);
  assert.equal(r.enqueueRerun({ traitId: 't_shared' }), true);
  assert.equal(r.enqueueRerun({ traitId: 't_shared' }), true);
  assert.equal(r.pendingQueueSize(), 1, 'dedup: same trait enqueued twice = size 1');
  assert.equal(r.enqueueRerun({}), false);
  assert.equal(r.enqueueRerun(), false);
  assert.equal(r.pendingQueueSize(), 1);
});

test('runQueuedRerun (/skip) returns deduped affected_pools + clears queue', async () => {
  const r = makeRunner();
  r.enqueueRerun({ traitId: 't_shared' }); // -> both pools
  r.enqueueRerun({ traitId: 't_a' }); // -> savana (already counted)
  const res = await r.runQueuedRerun();
  assert.equal(res.skipped_lab, true);
  assert.deepEqual(res.trait_ids.sort(), ['t_a', 't_shared']);
  assert.deepEqual(res.affected_pools.sort(), ['pool_caverna', 'pool_savana']);
  assert.equal(r.pendingQueueSize(), 0, 'queue cleared after run');
  assert.equal(r.isRunning(), false);
});

test('runQueuedRerun on empty queue -> skipped empty_queue', async () => {
  const r = makeRunner();
  const res = await r.runQueuedRerun();
  assert.deepEqual(res, { skipped: true, reason: 'empty_queue' });
});

test('onRerunComplete listener fires with result', async () => {
  const r = makeRunner();
  let received = null;
  r.onRerunComplete((result) => {
    received = result;
  });
  r.enqueueRerun({ traitId: 't_b' });
  await r.runQueuedRerun();
  assert.ok(received, 'listener invoked');
  assert.deepEqual(received.affected_pools, ['pool_caverna']);
});

test('missing biome_pools file -> empty index, no throw', () => {
  const r = createErmesRunner({
    biomePoolsPath: path.join(os.tmpdir(), 'no_such_biome_pools_xyz.json'),
    labScriptPath: '/skip',
  });
  assert.deepEqual(r.poolsForTrait('t_shared'), []);
  assert.equal(r.getTraitToPoolsMap().size, 0);
});
