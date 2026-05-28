// §21 ALIENA-C — initial wave baseline telemetry helper tests.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const { emitInitial } = require('../../apps/backend/services/combat/initialAlienaTelemetry');

test('emitInitial: default (flag absent) does NOT attach buffer', () => {
  const session = {};
  const encounter = {
    biome_id: 'dune',
    affixes: ['sabbia'],
    reinforcement_pool: [{ unit_id: 'x', weight: 1, tags: ['sand'], role: 'apex' }],
  };
  emitInitial(session, encounter);
  assert.equal(session.aliena_coherence_telemetry, undefined);
});

test('emitInitial: opt-in flag emits baseline round=0 snapshot for reinforcement_pool', () => {
  const session = {};
  const encounter = {
    biome_id: 'dune',
    affixes: ['sabbia'],
    reinforcement_pool: [
      { unit_id: 'dune_stalker', weight: 1, tags: ['sand'], role: 'apex' },
      { unit_id: 'mire_husk', weight: 1, tags: ['wet'], role: 'support' },
    ],
    reinforcement_policy: { aliena_coherence_telemetry: true },
  };
  emitInitial(session, encounter);
  assert.ok(Array.isArray(session.aliena_coherence_telemetry));
  assert.equal(session.aliena_coherence_telemetry.length, 2);
  for (const s of session.aliena_coherence_telemetry) {
    assert.equal(s.round, 0);
    assert.equal(s.biome_id, 'dune');
    assert.ok(Number.isFinite(s.aggregate));
  }
});
