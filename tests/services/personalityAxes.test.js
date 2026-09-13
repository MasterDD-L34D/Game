// Opt 3 OUTPUT derivation (#2679) -- pure core tests.
// PARITY FIXTURES: keep in sync with GGv2 tests/unit/test_personality_axes.gd
// (same scalar inputs -> same expected outputs, both stacks).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AXIS_KEYS,
  deriveAxes,
  deriveFromVcActor,
  normalizeStat,
  hasSignal,
} = require('../../apps/backend/services/personalityAxes');

const NEUTRAL_INPUTS = {
  t_f: 0.5,
  e_i: 0.5,
  s_n: 0.5,
  j_p: 0.5,
  action_switch_rate: 0.5,
  setup_ratio: 0.5,
  speed_norm: 0.5,
  hp_norm: 0.5,
};

test('AXIS_KEYS: the 5 canonical EN creature keys in radar order', () => {
  assert.deepEqual(AXIS_KEYS, [
    'symbiosis_predation',
    'explore_caution',
    'solitary_swarm',
    'memory_instinct',
    'agile_robust',
  ]);
});

test('parity fixture: neutral -> all 0.5', () => {
  const axes = deriveAxes(NEUTRAL_INPUTS);
  for (const key of AXIS_KEYS) {
    assert.ok(Math.abs(axes[key] - 0.5) < 1e-9, `${key} expected 0.5 got ${axes[key]}`);
  }
});

test('parity fixture: predator-planner poles', () => {
  const axes = deriveAxes({
    ...NEUTRAL_INPUTS,
    t_f: 1,
    e_i: 1,
    s_n: 1,
    j_p: 1,
    action_switch_rate: 0,
    setup_ratio: 1,
  });
  assert.equal(axes.symbiosis_predation, 1); // T_F high = T = Predazione (+pole)
  assert.equal(axes.solitary_swarm, 0); // E_I high = I = Solitario -> 1 - e_i
  assert.equal(axes.explore_caution, 1); // S + J = Cauto (+pole)
  assert.equal(axes.memory_instinct, 1); // no switch + setup = Memoria (+pole)
});

test('parity fixture: swarm-improviser poles', () => {
  const axes = deriveAxes({
    ...NEUTRAL_INPUTS,
    t_f: 0,
    e_i: 0,
    s_n: 0,
    j_p: 0,
    action_switch_rate: 1,
    setup_ratio: 0,
  });
  assert.equal(axes.symbiosis_predation, 0);
  assert.equal(axes.solitary_swarm, 1); // E behaviour -> Sciame
  assert.equal(axes.explore_caution, 0); // N + P -> Esplorativo
  assert.equal(axes.memory_instinct, 0); // all switch, no setup -> Istinto
});

test('parity fixture: glass-cannon / tank agile_robust orientation', () => {
  const glass = deriveAxes({ ...NEUTRAL_INPUTS, speed_norm: 1, hp_norm: 0 });
  assert.equal(glass.agile_robust, 0); // fast + fragile = Agile (0; +pole is Robusto)
  const tank = deriveAxes({ ...NEUTRAL_INPUTS, speed_norm: 0, hp_norm: 1 });
  assert.equal(tank.agile_robust, 1); // slow + tanky = Robusto (+pole)
});

test('parity fixture: missing inputs degrade per-axis to 0.5', () => {
  const axes = deriveAxes({ t_f: 0.8 });
  assert.ok(Math.abs(axes.symbiosis_predation - 0.8) < 1e-9);
  assert.equal(axes.solitary_swarm, 0.5);
  assert.equal(axes.explore_caution, 0.5);
  assert.equal(axes.memory_instinct, 0.5);
  assert.equal(axes.agile_robust, 0.5);
});

test('deriveAxes clamps out-of-range inputs', () => {
  const axes = deriveAxes({ ...NEUTRAL_INPUTS, t_f: 1.7, e_i: -0.3 });
  assert.equal(axes.symbiosis_predation, 1);
  assert.equal(axes.solitary_swarm, 1); // 1 - clamp01(-0.3) = 1 - 0 = 1
});

test('normalizeStat: linear clamp01, null on bad bounds / non-finite', () => {
  assert.equal(normalizeStat(3.5, 1, 6), 0.5);
  assert.equal(normalizeStat(0, 1, 6), 0); // below min clamps
  assert.equal(normalizeStat(99, 1, 6), 1); // above max clamps
  assert.equal(normalizeStat('x', 1, 6), null);
  assert.equal(normalizeStat(3, 6, 6), null); // degenerate bounds
});

test('deriveFromVcActor: real vcSnapshot per_actor shape', () => {
  const actor = {
    mbti_axes: {
      T_F: { value: 0.9, coverage: 'full' },
      E_I: { value: 0.2, coverage: 'partial' },
      S_N: { value: 0.7, coverage: 'full' },
      J_P: { value: 0.6, coverage: 'partial' },
    },
    raw_metrics: { action_switch_rate: 0.25, setup_ratio: 0.8 },
  };
  // Explicit bounds keep this a pure-math fixture independent of the dataset
  // (#2691 made the DEFAULT bounds data-derived; covered separately below).
  const bounds = { speed: { min: 1, max: 6 }, hp: { min: 6, max: 20 } };
  const axes = deriveFromVcActor(actor, { speed: 3.5, hp_max: 13 }, { bounds });
  assert.ok(Math.abs(axes.symbiosis_predation - 0.9) < 1e-9);
  assert.ok(Math.abs(axes.solitary_swarm - 0.8) < 1e-9);
  assert.ok(Math.abs(axes.explore_caution - (0.6 * 0.7 + 0.4 * 0.6)) < 1e-9);
  assert.ok(Math.abs(axes.memory_instinct - (0.5 * 0.75 + 0.5 * 0.8)) < 1e-9);
  // speed 3.5 in [1,6] -> 0.5; hp 13 in [6,20] -> 0.5 -> agile_robust 0.5
  assert.ok(Math.abs(axes.agile_robust - 0.5) < 1e-9);
});

test('deriveFromVcActor: default bounds are data-derived (#2691 base_stats.yaml)', () => {
  const actor = {
    mbti_axes: { T_F: { value: 0.9 } },
    raw_metrics: {},
  };
  // Dataset bounds: speed [1,6], hp [5,22]. hp_max 13 -> (13-5)/17 = 0.470...,
  // speed 3.5 -> 0.5. agile_robust = 0.7*(1-0.5) + 0.3*0.470... != 0.5 (it would
  // be exactly 0.5 only under the old hardcoded hp [6,20] midpoint).
  const axes = deriveFromVcActor(actor, { speed: 3.5, hp_max: 13 });
  const hpNorm = (13 - 5) / (22 - 5);
  const expected = 0.7 * (1 - 0.5) + 0.3 * hpNorm;
  assert.ok(Math.abs(axes.agile_robust - expected) < 1e-9, `got ${axes.agile_robust}`);
  assert.ok(Math.abs(axes.agile_robust - 0.5) > 1e-6, 'data-derived must differ from old 0.5');
});

test('deriveFromVcActor: null-coverage axes + no stats -> per-axis neutral', () => {
  const actor = {
    mbti_axes: { T_F: { value: 0.9 }, E_I: null, S_N: null, J_P: null },
    raw_metrics: { action_switch_rate: null, setup_ratio: 0.4 },
  };
  const axes = deriveFromVcActor(actor, null);
  assert.ok(Math.abs(axes.symbiosis_predation - 0.9) < 1e-9);
  assert.equal(axes.solitary_swarm, 0.5);
  assert.equal(axes.explore_caution, 0.5);
  assert.equal(axes.memory_instinct, 0.5); // switch null -> neutral
  assert.equal(axes.agile_robust, 0.5);
});

test('hasSignal: true with one finite mbti value, false when all null/absent', () => {
  assert.equal(hasSignal({ mbti_axes: { T_F: { value: 0.7 } } }), true);
  assert.equal(hasSignal({ raw_metrics: { setup_ratio: 0.3 } }), true);
  assert.equal(hasSignal({ mbti_axes: { T_F: null, E_I: null }, raw_metrics: {} }), false);
  assert.equal(hasSignal(null), false);
  assert.equal(hasSignal({}), false);
});
