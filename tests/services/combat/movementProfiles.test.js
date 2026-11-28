// tests/services/combat/movementProfiles.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getProfile,
  DEFAULT_PROFILE,
  PROFILE_NAMES,
} = require('../../../apps/backend/services/combat/movementProfiles');

test('loads the three W6 profiles from yaml', () => {
  assert.deepEqual(PROFILE_NAMES.slice().sort(), ['heavy', 'light', 'medium']);
  assert.equal(DEFAULT_PROFILE, 'medium');
});

test('heavy profile prices roccia 2.0 and default 1.0', () => {
  const p = getProfile('heavy');
  assert.equal(p.terrain_cost_multiplier.roccia, 2.0);
  assert.equal(p.terrain_cost_multiplier.default, 1.0);
});

test('light profile has only default 1.0 (no penalty)', () => {
  const p = getProfile('light');
  assert.equal(p.terrain_cost_multiplier.default, 1.0);
  assert.equal(p.terrain_cost_multiplier.roccia ?? 1.0, 1.0);
});

test('unknown profile name falls back to the default profile', () => {
  assert.deepEqual(getProfile('nope'), getProfile(DEFAULT_PROFILE));
});
