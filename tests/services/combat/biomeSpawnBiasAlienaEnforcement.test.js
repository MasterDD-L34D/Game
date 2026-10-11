'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyBiomeBias } = require('../../../apps/backend/services/combat/biomeSpawnBias');

const biome = { biome_id: 'b', affixes: ['fire'] };
function entryHigh() {
  return { id: 'h', unit_id: 'h', tags: ['fire'], narrative_hooks: ['x'], weight: 1 };
}
function entryLow() {
  return { id: 'l', unit_id: 'l', tags: [], weight: 1 };
}

test('strength=1 down-weights low-coherence entry, keeps weights > 0', () => {
  const out = applyBiomeBias([entryHigh(), entryLow()], biome, {
    alienaEnforcement: { strength: 1 },
    canonicalPool: [{ id: 'h' }],
  });
  const hi = out.find((e) => e.id === 'h');
  const lo = out.find((e) => e.id === 'l');
  assert.ok(lo.weight < hi.weight, 'low-coherence weight < high');
  assert.ok(lo.weight > 0, 'floored above 0');
  assert.ok(lo._aliena_enforcement.factor < 1);
  assert.ok(Math.abs(hi._aliena_enforcement.factor - 1) < 1e-9, 'high-coherence factor ~1');
});

test('strength=0 / absent -> no modulation, no _aliena_enforcement', () => {
  const base = applyBiomeBias([entryHigh(), entryLow()], biome, { canonicalPool: [{ id: 'h' }] });
  const zero = applyBiomeBias([entryHigh(), entryLow()], biome, {
    alienaEnforcement: { strength: 0 },
    canonicalPool: [{ id: 'h' }],
  });
  for (const e of base) assert.equal(e._aliena_enforcement, undefined);
  for (const e of zero) assert.equal(e._aliena_enforcement, undefined);
  assert.equal(base.find((e) => e.id === 'l').weight, zero.find((e) => e.id === 'l').weight);
});
