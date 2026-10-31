// RECON-03a (Fase-1 Spore) — bingo distribution balance (monte-carlo).
//
// G3 gate: the category bingo (3-of-category -> archetype passive) must not be
// dominated by any single archetype in random builds. Pre-rebalance the catalog
// was 14 physiological / 36 -> tank_plus near-guaranteed. RECON-03a re-categorized
// 3 biome-adaptive tegument entries physiological->environmental (now 11/6/6/5/8),
// lowering physiological clustering.
//
// This test runs a deterministic monte-carlo (seeded PRNG -> reproducible, no
// flake) over random 5-mutation builds and asserts NO archetype triggers in
// >50% of builds (primary focus: tank_plus). Random 5-pick is unconstrained
// (ignores body_slot gating) = conservative WORST case: slot-legal builds cannot
// stack 2 tegument physiological, so real tank_plus rate is <= this measure.
//
// Placed in tests/api/ (CI-globbed by run-test-api.cjs); tests/services/ is not
// in any runner glob (RECON-04a §3.3). Imports the engine directly.
//
// G4 tdd-guard: characterization of shipped engine + content rebalance.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  loadMutationCatalog,
} = require('../../apps/backend/services/mutations/mutationCatalogLoader');
const { computeMutationBingo } = require('../../apps/backend/services/mutations/mutationEngine');

// Deterministic PRNG (mulberry32) for reproducible monte-carlo.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('bingo balance: random 5-mutation builds -> no archetype dominates >50% (RECON-03a)', () => {
  const catalog = loadMutationCatalog();
  const ids = Object.keys(catalog.byId);
  assert.equal(ids.length, 36, 'catalog has 36 entries (fixture sanity)');

  const N = 1000;
  const BUILD = 5;
  const rng = mulberry32(20260526);
  const archCount = Object.create(null);
  let tankPlus = 0;

  for (let i = 0; i < N; i++) {
    // Partial Fisher-Yates: distinct BUILD-pick from ids.
    const pool = ids.slice();
    for (let k = 0; k < BUILD; k++) {
      const j = k + Math.floor(rng() * (pool.length - k));
      const tmp = pool[k];
      pool[k] = pool[j];
      pool[j] = tmp;
    }
    const build = pool.slice(0, BUILD);
    const { archetypes } = computeMutationBingo({ applied_mutations: build }, catalog);
    for (const a of archetypes) {
      archCount[a.archetype] = (archCount[a.archetype] || 0) + 1;
      if (a.archetype === 'tank_plus') tankPlus++;
    }
  }

  const tankRate = tankPlus / N;
  // eslint-disable-next-line no-console
  console.log(
    `[RECON-03a monte-carlo] N=${N} build=${BUILD} seed=20260526 -> tank_plus=${(tankRate * 100).toFixed(1)}% ; archetypes=${JSON.stringify(archCount)}`,
  );

  // Primary gate (G3): physiological tank_plus must not dominate random builds.
  assert.ok(tankRate < 0.5, `tank_plus rate ${(tankRate * 100).toFixed(1)}% must be < 50%`);

  // General gate: no archetype triggers in >50% of builds.
  for (const arch of Object.keys(archCount)) {
    const rate = archCount[arch] / N;
    assert.ok(rate < 0.5, `archetype ${arch} rate ${(rate * 100).toFixed(1)}% must be < 50%`);
  }
});
