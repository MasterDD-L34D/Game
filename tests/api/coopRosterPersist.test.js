// N2 roster-display -- submitCharacter persists each created PG to the roster
// store (run.id-keyed), best-effort, via constructor DI.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');

function stubStore() {
  const calls = [];
  return {
    calls,
    async get() {
      return [];
    },
    upsert(campaignId, spec) {
      calls.push({ campaignId, spec });
    },
  };
}

function freshAtCharCreation(store) {
  const co = new CoopOrchestrator({ roomCode: 'RSTR', hostId: 'p_h', rosterStore: store });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  return co;
}

test('submitCharacter upserts the roster row keyed on run.id', () => {
  const store = stubStore();
  const co = freshAtCharCreation(store);
  co.submitCharacter(
    'p_h',
    { name: 'Liev', form_id: 'form_x', species_id: 'umbra', job_id: 'custode' },
    { allPlayerIds: ['p_h', 'p_a'] }, // 2 players -> stays in character_creation
  );
  assert.equal(store.calls.length, 1);
  assert.equal(store.calls[0].campaignId, co.run.id);
  assert.equal(store.calls[0].spec.species_id, 'umbra');
  assert.equal(store.calls[0].spec.player_id, 'p_h');
});

test('identical resubmit (dedup) does NOT re-persist', () => {
  const store = stubStore();
  const co = freshAtCharCreation(store);
  const spec = { name: 'Liev', form_id: 'form_x', species_id: 'umbra', job_id: 'custode' };
  co.submitCharacter('p_h', spec, { allPlayerIds: ['p_h', 'p_a'] });
  co.submitCharacter('p_h', spec, { allPlayerIds: ['p_h', 'p_a'] });
  assert.equal(store.calls.length, 1); // 2nd is deduped before the hook
});

test('persist never throws into submit when store.upsert throws', () => {
  const co = new CoopOrchestrator({
    roomCode: 'RSTR',
    hostId: 'p_h',
    rosterStore: {
      get: async () => [],
      upsert() {
        throw new Error('db down');
      },
    },
  });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  assert.doesNotThrow(() =>
    co.submitCharacter(
      'p_h',
      { name: 'Liev', form_id: 'form_x', species_id: 'umbra', job_id: 'custode' },
      { allPlayerIds: ['p_h', 'p_a'] },
    ),
  );
});

test('persist swallows an async-rejecting store upsert (no unhandled rejection)', async () => {
  const co = new CoopOrchestrator({
    roomCode: 'RSTR',
    hostId: 'p_h',
    rosterStore: {
      get: async () => [],
      async upsert() {
        throw new Error('async db down');
      },
    },
  });
  co.startOnboarding({ scenarioStack: ['enc_demo'] });
  co._setPhase('character_creation');
  assert.doesNotThrow(() =>
    co.submitCharacter(
      'p_h',
      { name: 'Liev', form_id: 'form_x', species_id: 'umbra', job_id: 'custode' },
      { allPlayerIds: ['p_h', 'p_a'] },
    ),
  );
  // Let the deferred upsert rejection settle; the hook's .catch must swallow it
  // (an unguarded rejection would surface as an unhandled rejection here).
  await new Promise((resolve) => setImmediate(resolve));
});
