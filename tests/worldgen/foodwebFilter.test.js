// Tests for foodwebFilter — TKT-WORLDGEN-GAPA (2026-05-29).
//
// Wires ecosystemResolver trophic data into a reinforcement spawn-pool
// whitelist filter (Caves of Qud spawn-whitelist pattern). FILTER only,
// never generation. Species names below are real catalog entries:
//   badlands consumers: rust-scavenger, sand-burrower, echo-wing,
//                        ferrocolonia-magnetotattica (badlands.ecosystem.yaml)
//   off-biome (cryosteppe): cryo-lynx, steppe-bison-mini (cryosteppe.ecosystem.yaml)
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { filterReinforcementPool } = require('../../apps/backend/services/worldgen/foodwebFilter');
const ecosystemResolver = require('../../apps/backend/services/worldgen/ecosystemResolver');

test('foodwebFilter: no biome_id -> passthrough (applied false)', () => {
  const pool = [{ unit_id: 'grunt', weight: 1 }];
  const r = filterReinforcementPool(pool, null);
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'no_biome');
  assert.equal(r.pool, pool);
});

test('foodwebFilter: empty pool -> passthrough', () => {
  const r = filterReinforcementPool([], 'badlands');
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'empty_pool');
});

test('foodwebFilter: unknown biome (no ecosystem) -> passthrough', () => {
  const pool = [{ unit_id: 'grunt', weight: 1 }];
  const r = filterReinforcementPool(pool, 'no-such-biome', {
    getEcosystem: () => null,
  });
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'no_ecosystem');
  assert.equal(r.pool, pool);
});

test('foodwebFilter: real badlands trophic-clean pool -> no exclusions (BAND-NEUTRAL)', () => {
  ecosystemResolver._resetCache();
  const pool = [
    { unit_id: 'rust-scavenger', weight: 2 },
    { unit_id: 'sand-burrower', weight: 2 },
    { unit_id: 'echo-wing', weight: 1 },
    { unit_id: 'ferrocolonia-magnetotattica', weight: 1 },
  ];
  const r = filterReinforcementPool(pool, 'badlands');
  assert.deepEqual(r.excluded, []);
  assert.equal(r.pool.length, pool.length); // nothing removed -> bands unchanged
  assert.equal(r.reason, 'all_in_foodweb');
});

test('foodwebFilter: off-biome species excluded, biome species kept', () => {
  ecosystemResolver._resetCache();
  const pool = [
    { unit_id: 'rust-scavenger', weight: 2 }, // badlands consumer
    { unit_id: 'cryo-lynx', weight: 2 }, // cryosteppe -- off-biome
  ];
  const r = filterReinforcementPool(pool, 'badlands');
  assert.equal(r.applied, true);
  assert.equal(r.reason, 'filtered');
  assert.deepEqual(
    r.pool.map((e) => e.unit_id),
    ['rust-scavenger'],
  );
  assert.deepEqual(r.excluded, ['cryo-lynx']);
});

test('foodwebFilter: ALL off-biome -> fallback to unfiltered (never empties pool)', () => {
  ecosystemResolver._resetCache();
  const pool = [
    { unit_id: 'cryo-lynx', weight: 1 }, // cryosteppe
    { unit_id: 'steppe-bison-mini', weight: 1 }, // cryosteppe
  ];
  const r = filterReinforcementPool(pool, 'badlands');
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'all_excluded_fallback');
  assert.equal(r.pool, pool); // pool preserved -- spawning never blocked
  assert.equal(r.excluded.length, 2);
});

test('foodwebFilter: injected resolver (pure, no I/O)', () => {
  const pool = [
    { unit_id: 'wolf', weight: 1 },
    { unit_id: 'shark', weight: 1 },
  ];
  const fakeEco = { biome_id: 'forest', species_all: ['wolf', 'deer'] };
  const r = filterReinforcementPool(pool, 'forest', {
    getEcosystem: () => fakeEco,
  });
  assert.equal(r.applied, true);
  assert.deepEqual(
    r.pool.map((e) => e.unit_id),
    ['wolf'],
  );
  assert.deepEqual(r.excluded, ['shark']);
});

test('foodwebFilter: normalizes whitespace in unit_id match', () => {
  const pool = [{ unit_id: ' wolf ', weight: 1 }];
  const fakeEco = { biome_id: 'forest', species_all: ['wolf'] };
  const r = filterReinforcementPool(pool, 'forest', {
    getEcosystem: () => fakeEco,
  });
  assert.equal(r.reason, 'all_in_foodweb');
  assert.deepEqual(r.excluded, []);
});

module.exports = {};
