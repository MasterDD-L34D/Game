// CAMP-2 (PR-A2) — coopOrchestrator.endCombat folds an optional
// `sistemaObservations` slim-delta { roster:[pg_id], kills:{pg_id:int} } into
// the injected sistema-state store keyed by run.id. Best-effort/async: the
// fold runs in a detached Promise so it NEVER blocks the combat-end path.
//
// Store-injection seam: the orchestrator constructor opts object gains a
// `sistemaStateStore` dep (same DI style as `worldEnricher`). Default wires the
// canonical store; tests inject a STUB recording get/upsert calls.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

// Stub sistema-state store: empty-safe get(), records every upsert(campaignId, uo).
function makeStubStore(initial = {}) {
  const upserts = [];
  return {
    upserts,
    async get() {
      return { units_observed: initial };
    },
    async upsert(campaignId, unitsObserved) {
      upserts.push({ campaignId, unitsObserved });
    },
  };
}

function _setupAtCombat(store) {
  const co = new CoopOrchestrator({ roomCode: 'CAMP', hostId: 'p_h', sistemaStateStore: store });
  co.startRun({ scenarioStack: ['enc_demo_01'] });
  co.submitCharacter(
    'p_h',
    { name: 'Aria', form_id: 'istj', species_id: 'scagliato', job_id: 'guerriero' },
    { allPlayerIds: ['p_h'] },
  );
  co.confirmWorld();
  return co;
}

// Best-effort accumulation is detached via Promise.resolve().then(...). Yield a
// macrotask so the chained async fold + upsert settle before asserting.
const tick = () => new Promise((r) => setImmediate(r));

test('endCombat folds sistemaObservations into store.upsert(run.id, ...)', async () => {
  const store = makeStubStore();
  const co = _setupAtCombat(store);
  const runId = co.run.id;
  co.endCombat({
    outcome: 'victory',
    xpEarned: 10,
    sistemaObservations: { roster: ['pg_a', 'pg_b'], kills: { pg_a: 3, pg_b: 1 } },
  });
  await tick();
  assert.equal(store.upserts.length, 1, 'exactly one upsert fired');
  const { campaignId, unitsObserved } = store.upserts[0];
  assert.equal(campaignId, runId, 'upsert keyed by run.id');
  // pg_a: 3 kills >= HIGH_THREAT_KILLS(3) -> threat high.
  assert.deepEqual(unitsObserved.pg_a, {
    kills_vs_sistema: 3,
    sightings: 1,
    threat_level: 'high',
  });
  // pg_b: 1 kill < threshold -> threat normal.
  assert.deepEqual(unitsObserved.pg_b, {
    kills_vs_sistema: 1,
    sightings: 1,
    threat_level: 'normal',
  });
});

test('endCombat folds onto prior units_observed from store.get', async () => {
  const store = makeStubStore({
    pg_a: { kills_vs_sistema: 2, sightings: 5, threat_level: 'normal' },
  });
  const co = _setupAtCombat(store);
  co.endCombat({
    outcome: 'victory',
    sistemaObservations: { roster: ['pg_a'], kills: { pg_a: 1 } },
  });
  await tick();
  assert.equal(store.upserts.length, 1);
  // prior 2 kills + 1 this encounter = 3 >= threshold -> high; sightings 5 + 1.
  assert.deepEqual(store.upserts[0].unitsObserved.pg_a, {
    kills_vs_sistema: 3,
    sightings: 6,
    threat_level: 'high',
  });
});

test('endCombat WITHOUT sistemaObservations does NOT upsert (back-compat)', async () => {
  const store = makeStubStore();
  const co = _setupAtCombat(store);
  co.endCombat({ outcome: 'victory', xpEarned: 10 });
  await tick();
  assert.equal(store.upserts.length, 0, 'no observations -> no accumulation');
  assert.equal(co.phase, 'debrief', 'phase still advances normally');
});

test('endCombat phase + outcome unaffected by sistemaObservations', async () => {
  const store = makeStubStore();
  const co = _setupAtCombat(store);
  const ret = co.endCombat({
    outcome: 'defeat',
    sistemaObservations: { roster: ['pg_a'], kills: {} },
  });
  await tick();
  assert.equal(co.phase, 'debrief');
  assert.equal(co.run.outcome, 'defeat');
  assert.equal(ret.outcome, 'defeat');
});

test('default store (no injection) does not break endCombat', async () => {
  // Back-compat: omitting sistemaStateStore must still construct + drive to
  // debrief without throwing, even when sistemaObservations supplied (default
  // store is stub-safe with no DATABASE_URL -> upsert no-op).
  const co = new CoopOrchestrator({ roomCode: 'DFLT', hostId: 'p_h' });
  co.startRun({ scenarioStack: ['enc_demo_01'] });
  co.submitCharacter('p_h', { name: 'Aria', form_id: 'istj' }, { allPlayerIds: ['p_h'] });
  co.confirmWorld();
  assert.doesNotThrow(() =>
    co.endCombat({ outcome: 'victory', sistemaObservations: { roster: ['pg_a'], kills: {} } }),
  );
  await tick();
  assert.equal(co.phase, 'debrief');
});
