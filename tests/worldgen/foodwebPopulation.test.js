// SPEC-I ER7 consumer -- la spawn whitelist (foodwebFilter) consuma lo stato
// popolazione per-bioma: ruolo `depleted` escluso dal pool, `abundant` pesato
// su. Ruoli species->trofico-tier risolti da ecosystemResolver.getSpeciesRoles.
// Band-safety: nessun population -> passthrough; shaping che svuota -> fallback.
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  applyPopulationToPool,
  ABUNDANT_WEIGHT_MULT,
} = require('../../apps/backend/services/worldgen/foodwebFilter');
const ecosystemResolver = require('../../apps/backend/services/worldgen/ecosystemResolver');
const { STATES } = require('../../apps/backend/services/worldgen/biomePopulation');

// --- ecosystemResolver.getSpeciesRoles: trofico tier -> trophic role ---------

test('getSpeciesRoles: real badlands maps tiers to roles', () => {
  ecosystemResolver._resetCache();
  const roles = ecosystemResolver.getSpeciesRoles('badlands');
  // terziari -> apex, primari -> prey, secondari -> mesopredator
  assert.equal(roles['dune-stalker'], 'apex');
  assert.equal(roles['ferrimordax-rutilus'], 'apex');
  assert.equal(roles['sand-burrower'], 'prey');
  assert.equal(roles['rust-scavenger'], 'prey');
  assert.equal(roles['echo-wing'], 'mesopredator');
  // produttori -> producer (mai nei reinforcement pool)
  assert.equal(roles['arbusti_xerofili'], 'producer');
});

test('getSpeciesRoles: unknown biome -> empty map', () => {
  ecosystemResolver._resetCache();
  const roles = ecosystemResolver.getSpeciesRoles('no-such-biome');
  assert.deepEqual(roles, {});
});

// --- foodwebFilter.applyPopulationToPool --------------------------------------

const fakeRoles = {
  'dune-stalker': 'apex',
  'rust-scavenger': 'prey',
  'sand-burrower': 'prey',
  'echo-wing': 'mesopredator',
};
const getRoles = () => fakeRoles;

function pop({ apex = STATES.STABLE, prey = STATES.STABLE, mesopredator = STATES.STABLE } = {}) {
  return {
    apex: { state: apex, seasons: 0 },
    mesopredator: { state: mesopredator, seasons: 0 },
    prey: { state: prey, seasons: 0 },
  };
}

test('applyPopulationToPool: no population -> passthrough', () => {
  const inPool = [{ unit_id: 'rust-scavenger', weight: 1 }];
  const r = applyPopulationToPool(inPool, 'badlands', null, { getSpeciesRoles: getRoles });
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'no_population');
  assert.equal(r.pool, inPool);
});

test('applyPopulationToPool: all-stable population -> no pressure, passthrough', () => {
  const inPool = [{ unit_id: 'rust-scavenger', weight: 1 }];
  const r = applyPopulationToPool(inPool, 'badlands', pop(), { getSpeciesRoles: getRoles });
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'no_pressure');
  assert.equal(r.pool, inPool);
});

test('applyPopulationToPool: depleted prey -> prey species excluded, others kept', () => {
  const inPool = [
    { unit_id: 'dune-stalker', weight: 1 }, // apex
    { unit_id: 'rust-scavenger', weight: 2 }, // prey -> excluded
    { unit_id: 'sand-burrower', weight: 2 }, // prey -> excluded
    { unit_id: 'echo-wing', weight: 1 }, // mesopredator
  ];
  const r = applyPopulationToPool(inPool, 'badlands', pop({ prey: STATES.DEPLETED }), {
    getSpeciesRoles: getRoles,
  });
  assert.equal(r.applied, true);
  assert.equal(r.reason, 'shaped');
  assert.deepEqual(r.pool.map((e) => e.unit_id).sort(), ['dune-stalker', 'echo-wing']);
  assert.deepEqual(r.excluded.sort(), ['rust-scavenger', 'sand-burrower']);
});

test('applyPopulationToPool: abundant apex -> apex species weight bumped (PROPOSED mult)', () => {
  const inPool = [
    { unit_id: 'dune-stalker', weight: 3 }, // apex -> boosted
    { unit_id: 'rust-scavenger', weight: 2 }, // prey -> unchanged
  ];
  const r = applyPopulationToPool(inPool, 'badlands', pop({ apex: STATES.ABUNDANT }), {
    getSpeciesRoles: getRoles,
  });
  assert.equal(r.applied, true);
  const apexEntry = r.pool.find((e) => e.unit_id === 'dune-stalker');
  const preyEntry = r.pool.find((e) => e.unit_id === 'rust-scavenger');
  assert.equal(apexEntry.weight, 3 * ABUNDANT_WEIGHT_MULT);
  assert.equal(preyEntry.weight, 2); // unchanged
  assert.deepEqual(r.boosted, ['dune-stalker']);
});

test('applyPopulationToPool: does NOT mutate input pool entries (pure)', () => {
  const inPool = [{ unit_id: 'dune-stalker', weight: 3 }];
  applyPopulationToPool(inPool, 'badlands', pop({ apex: STATES.ABUNDANT }), {
    getSpeciesRoles: getRoles,
  });
  assert.equal(inPool[0].weight, 3); // original untouched
});

test('applyPopulationToPool: excluding everything -> fallback to original pool (never empty)', () => {
  const inPool = [
    { unit_id: 'rust-scavenger', weight: 1 }, // prey
    { unit_id: 'sand-burrower', weight: 1 }, // prey
  ];
  const r = applyPopulationToPool(inPool, 'badlands', pop({ prey: STATES.DEPLETED }), {
    getSpeciesRoles: getRoles,
  });
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'all_depleted_fallback');
  assert.equal(r.pool, inPool); // spawning never blocked
});

test('applyPopulationToPool: unknown-role species passes through (off-foodweb / synthetic)', () => {
  const inPool = [
    { unit_id: 'synthetic-grunt', weight: 1 }, // not in roleMap
    { unit_id: 'rust-scavenger', weight: 1 }, // prey -> excluded
  ];
  const r = applyPopulationToPool(inPool, 'badlands', pop({ prey: STATES.DEPLETED }), {
    getSpeciesRoles: getRoles,
  });
  assert.equal(r.applied, true);
  assert.deepEqual(
    r.pool.map((e) => e.unit_id),
    ['synthetic-grunt'],
  );
});

test('applyPopulationToPool: no role map -> passthrough', () => {
  const inPool = [{ unit_id: 'rust-scavenger', weight: 1 }];
  const r = applyPopulationToPool(inPool, 'badlands', pop({ prey: STATES.DEPLETED }), {
    getSpeciesRoles: () => ({}),
  });
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'no_roles');
  assert.equal(r.pool, inPool);
});

module.exports = {};
