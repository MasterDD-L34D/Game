// tests/services/vcAggregateSnapshot.test.js
// TDD for aggregateVcSnapshot (issue #3157 follow-up, P4 analytics unblock).
//
// Root cause being fixed: PR #1535 wrote vcSnapshot.aggregate/.mbti/.ennea into
// the session_end telemetry event, but buildVcSnapshot never returned those
// top-level fields -- vc_aggregate/vc_mbti/vc_ennea logged null for EVERY
// session since. This helper aggregates per_actor into session-level values
// (axis average mirrors narrative/qbnEngine.extractQualities).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { aggregateVcSnapshot } = require('../../apps/backend/services/vcScoring');

function actor(overrides = {}) {
  return {
    mbti_axes: { T_F: 0.8, S_N: 0.6, E_I: 0.4, J_P: 0.2 },
    mbti_type: 'ISTJ',
    ennea_archetypes: [
      { id: 'Individualista(4)', triggered: true },
      { id: 'Perfezionista(1)', triggered: false },
    ],
    aggregate_indices: {
      aggro: { value: 0.5 },
      risk: { value: 0.3 },
      tilt: null, // window-based, null on snapshots by design
    },
    ...overrides,
  };
}

test('aggregates axes, types, triggered ennea and indices across actors', () => {
  const snap = {
    per_actor: {
      a: actor(),
      b: actor({
        mbti_axes: { T_F: 0.2, S_N: 0.4, E_I: 0.6, J_P: 0.8 },
        mbti_type: 'ENFP',
        ennea_archetypes: [{ id: 'Individualista(4)', triggered: true }],
        aggregate_indices: { aggro: { value: 0.7 }, risk: { value: 0.5 }, tilt: null },
      }),
    },
  };
  const out = aggregateVcSnapshot(snap);
  assert.ok(out.mbti, 'mbti aggregated');
  assert.equal(out.mbti.avg_axes.T_F, 0.5);
  assert.equal(out.mbti.avg_axes.J_P, 0.5);
  assert.deepEqual(out.mbti.types, { ISTJ: 1, ENFP: 1 });
  assert.deepEqual(out.ennea, { triggered: { 'Individualista(4)': 2 } });
  assert.equal(out.aggregate.aggro, 0.6);
  assert.equal(out.aggregate.risk, 0.4);
  assert.ok(!('tilt' in out.aggregate), 'null indices are skipped, not averaged as 0');
});

test('empty snapshot -> all nulls (session_end stays backward-compatible)', () => {
  assert.deepEqual(aggregateVcSnapshot({ per_actor: {} }), {
    aggregate: null,
    mbti: null,
    ennea: null,
  });
  assert.deepEqual(aggregateVcSnapshot(null), { aggregate: null, mbti: null, ennea: null });
});

test('actor without numeric axes does not poison the average', () => {
  const snap = {
    per_actor: {
      good: actor(),
      broken: actor({
        mbti_axes: {},
        mbti_type: null,
        ennea_archetypes: [],
        aggregate_indices: {},
      }),
    },
  };
  const out = aggregateVcSnapshot(snap);
  assert.equal(out.mbti.avg_axes.T_F, 0.8, 'only the valid actor counts');
  assert.deepEqual(out.mbti.types, { ISTJ: 1 });
});
