// Opt 3 N=40 evidence (#2679) -- pure aggregator over per-run personality
// samples (full-loop batch). Distribution stats are EVIDENCE for the master-dd
// ratification (L-069 posture: the batch reports, the human ratifies).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  aggregatePersonality,
  renderPersonalityMd,
  AXIS_KEYS,
} = require('../../tools/sim/personality-axes-aggregator');

function axes(sym, expl, sol, mem, agi) {
  return {
    symbiosis_predation: sym,
    explore_caution: expl,
    solitary_swarm: sol,
    memory_instinct: mem,
    agile_robust: agi,
  };
}

function runWith(samples) {
  return { personalitySamples: samples };
}

test('empty / absent samples -> n_samples 0 (renderer returns empty string)', () => {
  const agg = aggregatePersonality([runWith([]), {}]);
  assert.equal(agg.n_samples, 0);
  assert.equal(renderPersonalityMd(agg), '');
});

test('per-axis mean/sd/min/max over all units of all steps of all runs', () => {
  const results = [
    runWith([
      {
        step: 1,
        encounter: 'enc_a',
        units: [
          { unit_id: 'hero_a', faction: 'player', axes: axes(0.2, 0.5, 0.5, 0.5, 0.5) },
          { unit_id: 'foe_1', faction: 'sistema', axes: axes(0.6, 0.5, 0.5, 0.5, 0.5) },
        ],
      },
    ]),
    runWith([
      {
        step: 1,
        encounter: 'enc_a',
        units: [{ unit_id: 'hero_a', faction: 'player', axes: axes(1.0, 0.5, 0.5, 0.5, 0.5) }],
      },
    ]),
  ];
  const agg = aggregatePersonality(results);
  assert.equal(agg.n_samples, 3);
  const sym = agg.per_axis.symbiosis_predation;
  assert.ok(Math.abs(sym.mean - 0.6) < 1e-9); // (0.2+0.6+1.0)/3
  assert.equal(sym.min, 0.2);
  assert.equal(sym.max, 1.0);
  // population sd of [0.2, 0.6, 1.0] = sqrt(0.32/3)... population variance =
  // ((0.4^2)+(0)+(0.4^2))/3 = 0.32/3
  assert.ok(Math.abs(sym.sd - Math.sqrt(0.32 / 3)) < 1e-9);
});

test('neutral_rate per axis + degenerate all-neutral fraction', () => {
  const results = [
    runWith([
      {
        step: 1,
        encounter: 'e',
        units: [
          { unit_id: 'u1', faction: 'player', axes: axes(0.5, 0.5, 0.5, 0.5, 0.5) },
          { unit_id: 'u2', faction: 'player', axes: axes(0.9, 0.5, 0.5, 0.5, 0.5) },
        ],
      },
    ]),
  ];
  const agg = aggregatePersonality(results);
  assert.equal(agg.per_axis.symbiosis_predation.neutral_rate, 0.5);
  assert.equal(agg.per_axis.agile_robust.neutral_rate, 1);
  assert.equal(agg.degenerate_rate, 0.5); // u1 all-neutral, u2 not
});

test('pairwise correlation: perfectly correlated + anti-correlated pairs', () => {
  const results = [
    runWith([
      {
        step: 1,
        encounter: 'e',
        units: [
          { unit_id: 'a', faction: 'player', axes: axes(0.1, 0.1, 0.9, 0.5, 0.5) },
          { unit_id: 'b', faction: 'player', axes: axes(0.5, 0.5, 0.5, 0.5, 0.5) },
          { unit_id: 'c', faction: 'player', axes: axes(0.9, 0.9, 0.1, 0.5, 0.5) },
        ],
      },
    ]),
  ];
  const agg = aggregatePersonality(results);
  const corr = agg.correlations;
  const symExpl = corr.find(
    (c) => c.pair.includes('symbiosis_predation') && c.pair.includes('explore_caution'),
  );
  assert.ok(Math.abs(symExpl.r - 1) < 1e-9, 'sym/expl perfectly correlated');
  const symSol = corr.find(
    (c) => c.pair.includes('symbiosis_predation') && c.pair.includes('solitary_swarm'),
  );
  assert.ok(Math.abs(symSol.r + 1) < 1e-9, 'sym/sol perfectly anti-correlated');
  // Constant axis (memory_instinct) -> r null (no variance), never NaN.
  const symMem = corr.find(
    (c) => c.pair.includes('symbiosis_predation') && c.pair.includes('memory_instinct'),
  );
  assert.equal(symMem.r, null);
});

test('dominant-axis histogram skips all-neutral units', () => {
  const results = [
    runWith([
      {
        step: 1,
        encounter: 'e',
        units: [
          { unit_id: 'a', faction: 'player', axes: axes(0.9, 0.5, 0.5, 0.5, 0.5) },
          { unit_id: 'b', faction: 'sistema', axes: axes(0.5, 0.5, 0.5, 0.5, 0.5) },
          { unit_id: 'c', faction: 'player', axes: axes(0.6, 0.5, 0.1, 0.5, 0.5) },
        ],
      },
    ]),
  ];
  const agg = aggregatePersonality(results);
  assert.equal(agg.dominant_hist.symbiosis_predation, 1); // unit a
  assert.equal(agg.dominant_hist.solitary_swarm, 1); // unit c (|0.1-0.5| > |0.6-0.5|)
  assert.equal(
    Object.values(agg.dominant_hist).reduce((s, v) => s + v, 0),
    2,
  );
});

test('per-faction split mirrors the overall per-axis stats shape', () => {
  const results = [
    runWith([
      {
        step: 1,
        encounter: 'e',
        units: [
          { unit_id: 'a', faction: 'player', axes: axes(0.2, 0.5, 0.5, 0.5, 0.5) },
          { unit_id: 'f', faction: 'sistema', axes: axes(0.8, 0.5, 0.5, 0.5, 0.5) },
        ],
      },
    ]),
  ];
  const agg = aggregatePersonality(results);
  assert.equal(agg.by_faction.player.n_samples, 1);
  assert.ok(Math.abs(agg.by_faction.player.per_axis.symbiosis_predation.mean - 0.2) < 1e-9);
  assert.ok(Math.abs(agg.by_faction.sistema.per_axis.symbiosis_predation.mean - 0.8) < 1e-9);
});

test('renderPersonalityMd: emits one table row per axis + PROPOSED disclaimer', () => {
  const results = [
    runWith([
      {
        step: 1,
        encounter: 'e',
        units: [{ unit_id: 'a', faction: 'player', axes: axes(0.9, 0.4, 0.3, 0.2, 0.5) }],
      },
    ]),
  ];
  const md = renderPersonalityMd(aggregatePersonality(results));
  for (const key of AXIS_KEYS) {
    assert.ok(md.includes(key), `row for ${key}`);
  }
  assert.ok(/PROPOSED/.test(md), 'ratification disclaimer present');
  assert.ok(/master-dd/.test(md), 'human-verdict posture stated');
});
