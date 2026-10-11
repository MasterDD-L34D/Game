'use strict';
// Shared species -> role_class map: single source for mbti-policy (temperament ordering)
// and meta-band-aggregator (roster composition metric), so they agree on ecological roles.
const test = require('node:test');
const assert = require('node:assert/strict');
const { SPECIES_ROLE, roleOf } = require('../../tools/sim/species-roles');

test('roleOf: maps every canonical badlands recruit-pool species', () => {
  assert.equal(roleOf('dune-stalker'), 'APEX');
  assert.equal(roleOf('nano-rust-bloom'), 'HAZARD');
  assert.equal(roleOf('ferrocolonia-magnetotattica'), 'PREDATOR');
  assert.equal(roleOf('sand-burrower'), 'PREY');
  assert.equal(roleOf('rust-scavenger'), 'SUPPORT');
});

test('roleOf: unknown species -> UNKNOWN (never throws)', () => {
  assert.equal(roleOf('not-a-species'), 'UNKNOWN');
  assert.equal(roleOf(undefined), 'UNKNOWN');
});

test('SPECIES_ROLE: covers all 5 pool roles distinctly', () => {
  const roles = new Set(Object.values(SPECIES_ROLE));
  assert.deepEqual([...roles].sort(), ['APEX', 'HAZARD', 'PREDATOR', 'PREY', 'SUPPORT']);
});
