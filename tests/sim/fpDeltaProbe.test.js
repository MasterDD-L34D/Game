// fp-delta-probe (MA3 N=40) -- offline paired A/B: applies applyFormPulseDelta
// to REAL baseline mbti_axes captured by the batch, across FP profiles x caps,
// and measures shift / letter-flip / clamp rates. Pure analysis, no HTTP.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeSamples, flattenRunsJsonl } = require('../../tools/sim/fp-delta-probe');

const PROFILES = {
  plus: {
    solitary_swarm: 1,
    explore_caution: 1,
    symbiosis_predation: 1,
    memory_instinct: 1,
  },
  neutral: {
    solitary_swarm: 0,
    explore_caution: 0,
    symbiosis_predation: 0,
    memory_instinct: 0,
  },
};

function mkSamples() {
  return [
    {
      unit_id: 'u1',
      faction: 'player',
      mbti_axes: {
        E_I: { value: 0.49, coverage: 1 },
        S_N: { value: 0.98, coverage: 1 },
        T_F: { value: null, coverage: 0 },
        J_P: { value: 0.5, coverage: 1 },
      },
    },
    // mbti_axes assenti -> sample skippato
    { unit_id: 'u2', faction: 'sistema', mbti_axes: null },
    {
      unit_id: 'u3',
      faction: 'player',
      mbti_axes: { E_I: { value: 0.52, coverage: 1 } },
    },
  ];
}

test('analyzeSamples: shift, flip and clamp per (profile, cap, axis)', () => {
  const stats = analyzeSamples(mkSamples(), { profiles: PROFILES, caps: [0.05] });

  // E_I <- solitary_swarm sign -1: u1 0.49 -> 0.44 (no flip), u3 0.52 -> 0.47 (flip)
  const eI = stats.find((s) => s.profile === 'plus' && s.cap === 0.05 && s.axis === 'E_I');
  assert.equal(eI.n, 2);
  assert.ok(Math.abs(eI.mean_abs_shift - 0.05) < 1e-9);
  assert.equal(eI.flips, 1);
  assert.ok(Math.abs(eI.flip_rate - 0.5) < 1e-9);

  // S_N <- explore_caution sign +1: u1 0.98 -> clamp 1.0 (shift 0.02, clamped)
  const sN = stats.find((s) => s.profile === 'plus' && s.cap === 0.05 && s.axis === 'S_N');
  assert.equal(sN.n, 1);
  assert.ok(Math.abs(sN.mean_abs_shift - 0.02) < 1e-9);
  assert.equal(sN.clamps, 1);
  assert.equal(sN.flips, 0);

  // T_F null baseline -> untouched, excluded from n
  const tF = stats.find((s) => s.profile === 'plus' && s.cap === 0.05 && s.axis === 'T_F');
  assert.equal(tF.n, 0);

  // J_P 0.5 -> 0.55: no flip (0.5 is already the >=0.5 side)
  const jP = stats.find((s) => s.profile === 'plus' && s.cap === 0.05 && s.axis === 'J_P');
  assert.equal(jP.n, 1);
  assert.equal(jP.flips, 0);

  // neutral profile -> zero shift, zero flips everywhere
  for (const s of stats.filter((x) => x.profile === 'neutral')) {
    assert.equal(s.mean_abs_shift, 0);
    assert.equal(s.flips, 0);
  }
});

test('flattenRunsJsonl: lifts per-unit samples with mbti_axes from batch lines', () => {
  const lines = [
    JSON.stringify({
      run_id: 0,
      personality_samples: [
        {
          step: 1,
          encounter: 'enc_x',
          units: [
            { unit_id: 'a', faction: 'player', axes: {}, mbti_axes: { E_I: { value: 0.6 } } },
            { unit_id: 'b', faction: 'sistema', axes: {} }, // no mbti -> kept out
          ],
        },
      ],
    }),
  ];
  const flat = flattenRunsJsonl(lines);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].unit_id, 'a');
  assert.equal(flat[0].run_id, 0);
  assert.ok(flat[0].mbti_axes);
});
