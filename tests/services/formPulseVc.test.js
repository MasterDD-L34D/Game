// formPulse -> VC axis delta transform -- SPEC-M acceptance #4 (soft + bounded).
// Mechanism (bounded clamp01 nudge) is objective; the creature->MBTI MAPPING is a
// PROPOSED default (ratify via MA3, master-dd) -- tests target the mechanism.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyFormPulseDelta,
  aggregateFormPulses,
  PROPOSED_FP_VC_MAPPING,
  MAX_FP_VC_DELTA,
} = require('../../apps/backend/services/formPulseVc');

function axes(over = {}) {
  return {
    E_I: { value: 0.5, coverage: 'full' },
    S_N: { value: 0.5, coverage: 'full' },
    T_F: { value: 0.5, coverage: 'full' },
    J_P: { value: 0.5, coverage: 'full' },
    ...over,
  };
}

test('PROPOSED_FP_VC_MAPPING maps to valid MBTI axes only', () => {
  const valid = new Set(['E_I', 'S_N', 'T_F', 'J_P']);
  for (const cfg of Object.values(PROPOSED_FP_VC_MAPPING)) {
    assert.ok(valid.has(cfg.mbti), `bad mbti ${cfg.mbti}`);
    assert.ok(cfg.sign === 1 || cfg.sign === -1);
  }
});

// Verdetto master-dd 2026-06-10 (#2679 Q4): direction semantics pinned to the
// ENGINE letter convention (deriveMbtiType: E_I value HIGH = Introvert). A
// +Sciame swipe (solitary_swarm +1, social pole) must push E_I toward E =
// DOWN; the old sign +1 nudged toward Solitario (inverted vs intent).
test('+Sciame swipe pushes E_I toward Extraversion (engine convention: down)', () => {
  const out = applyFormPulseDelta(axes(), { solitary_swarm: 1 });
  assert.ok(out.E_I.value < 0.5, `+Sciame must LOWER E_I (toward E); got ${out.E_I.value}`);
});

test('+Predazione/+Cauto/+Memoria keep their engine-consistent directions', () => {
  const out = applyFormPulseDelta(axes(), {
    symbiosis_predation: 1, // Predazione -> T (HIGH)
    explore_caution: 1, // Cauto -> S (HIGH)
    memory_instinct: 1, // Memoria -> J (HIGH)
  });
  assert.ok(out.T_F.value > 0.5);
  assert.ok(out.S_N.value > 0.5);
  assert.ok(out.J_P.value > 0.5);
});

test('applyFormPulseDelta: nudges mapped axis by sign*input*maxDelta', () => {
  // pick a known mapping entry
  const [fpKey, cfg] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const out = applyFormPulseDelta(axes(), { [fpKey]: 1 });
  const expected = 0.5 + cfg.sign * 1 * MAX_FP_VC_DELTA;
  assert.ok(Math.abs(out[cfg.mbti].value - expected) < 1e-9);
  assert.equal(out[cfg.mbti].fp_adjusted, true);
});

test('applyFormPulseDelta: input clamped to [-1,1] (bounded)', () => {
  const [fpKey, cfg] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const out = applyFormPulseDelta(axes(), { [fpKey]: 99 }); // huge -> clamp to 1
  const expected = 0.5 + cfg.sign * 1 * MAX_FP_VC_DELTA;
  assert.ok(Math.abs(out[cfg.mbti].value - expected) < 1e-9);
});

test('applyFormPulseDelta: result clamp01 (never exceeds 1 or below 0)', () => {
  const [fpKey, cfg] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const high = axes({ [cfg.mbti]: { value: 0.99, coverage: 'full' } });
  const out = applyFormPulseDelta(high, { [fpKey]: cfg.sign * 99 });
  assert.ok(out[cfg.mbti].value <= 1);
  const low = axes({ [cfg.mbti]: { value: 0.01, coverage: 'full' } });
  const out2 = applyFormPulseDelta(low, { [fpKey]: -cfg.sign * 99 });
  assert.ok(out2[cfg.mbti].value >= 0);
});

test('applyFormPulseDelta: no-op on empty/missing fpAxes (backward compat)', () => {
  assert.deepEqual(applyFormPulseDelta(axes(), {}), axes());
  assert.deepEqual(applyFormPulseDelta(axes(), null), axes());
});

test('applyFormPulseDelta: ignores unmapped fp axis', () => {
  const out = applyFormPulseDelta(axes(), { totally_unknown_axis: 1 });
  assert.deepEqual(out, axes());
});

test('applyFormPulseDelta: does not mutate input', () => {
  const input = axes();
  const [fpKey] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  applyFormPulseDelta(input, { [fpKey]: 1 });
  assert.equal(input[Object.values(PROPOSED_FP_VC_MAPPING)[0].mbti].value, 0.5);
});

test('applyFormPulseDelta: skips axes with null/non-finite value', () => {
  const [fpKey, cfg] = Object.entries(PROPOSED_FP_VC_MAPPING)[0];
  const nulled = axes({ [cfg.mbti]: { value: null, coverage: 'partial' } });
  const out = applyFormPulseDelta(nulled, { [fpKey]: 1 });
  assert.equal(out[cfg.mbti].value, null); // unchanged, no crash
});

test('aggregateFormPulses: averages axes across players (Map input)', () => {
  const m = new Map([
    ['p1', { axes: { solitary_swarm: 1, explore_caution: 0 } }],
    ['p2', { axes: { solitary_swarm: -1, explore_caution: 1 } }],
  ]);
  const agg = aggregateFormPulses(m);
  assert.ok(Math.abs(agg.solitary_swarm - 0) < 1e-9); // (1 + -1)/2
  assert.ok(Math.abs(agg.explore_caution - 0.5) < 1e-9); // (0 + 1)/2
});

test('aggregateFormPulses: empty -> {}', () => {
  assert.deepEqual(aggregateFormPulses(new Map()), {});
  assert.deepEqual(aggregateFormPulses(null), {});
});
