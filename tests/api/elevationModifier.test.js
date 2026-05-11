// TKT-M14-A — elevation + terrain modifier unit tests.
// 8 test coverage per scope ticket §1 acceptance.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeElevationModifier,
  computeTerrainModifier,
  computeCombatPositionModifier,
  TERRAIN_TYPES,
} = require('../../apps/backend/services/combat/elevationModifier');

test('elevation +1 (attacker high ground) → +1 attack bonus', () => {
  const r = computeElevationModifier({ elevation: 2 }, { elevation: 1 });
  assert.equal(r.attackBonus, 1);
  assert.equal(r.elevationDelta, 1);
  assert.equal(r.reason, 'high_ground');
});

test('elevation -1 (attacker low ground) → -1 attack bonus', () => {
  const r = computeElevationModifier({ elevation: 0 }, { elevation: 1 });
  assert.equal(r.attackBonus, -1);
  assert.equal(r.elevationDelta, -1);
  assert.equal(r.reason, 'low_ground');
});

test('elevation 0 (level) → no modifier', () => {
  const r = computeElevationModifier({ elevation: 1 }, { elevation: 1 });
  assert.equal(r.attackBonus, 0);
  assert.equal(r.elevationDelta, 0);
  assert.equal(r.reason, 'level_ground');
});

test('forest defender → +1 defense bonus (cover)', () => {
  const r = computeTerrainModifier({ terrain_type: 'none' }, { terrain_type: 'forest' });
  assert.equal(r.defenseBonus, 1);
  assert.equal(r.attackBonus, 0);
  assert.deepEqual(r.reasons, ['cover_forest']);
});

test('water melee attacker → -1 attack (unstable footing)', () => {
  const r = computeTerrainModifier(
    { terrain_type: 'water' },
    { terrain_type: 'none' },
    { attack_distance: 1 },
  );
  assert.equal(r.attackBonus, -1);
  assert.ok(r.reasons.includes('footing_water_melee'));
});

test('cinder + fire channel → +1 damage_bonus (ember synergy)', () => {
  const r = computeTerrainModifier(
    { terrain_type: 'cinder' },
    { terrain_type: 'none' },
    { channel: 'fuoco', attack_distance: 1 },
  );
  assert.equal(r.damageBonus, 1);
  assert.ok(r.reasons.includes('ember_synergy_fire'));
});

test('stone melee attacker → +1 attack (stable footing)', () => {
  const r = computeTerrainModifier(
    { terrain_type: 'stone' },
    { terrain_type: 'none' },
    { attack_distance: 1 },
  );
  assert.equal(r.attackBonus, 1);
  assert.ok(r.reasons.includes('footing_stone_melee'));
});

test('combined: high ground + cinder + fire melee → +1 attack + +1 damage', () => {
  // Attacker: elevation 2, cinder terrain, fire channel, melee distance.
  // Target:   elevation 1, level ground (terrain none).
  // Expected: elevation +1 attack, cinder +1 damage, total attackBonus = +1.
  const r = computeCombatPositionModifier(
    { elevation: 2, terrain_type: 'cinder' },
    { elevation: 1, terrain_type: 'none' },
    { channel: 'fuoco', attack_distance: 1 },
  );
  assert.equal(r.attackBonus, 1);
  assert.equal(r.damageBonus, 1);
  assert.equal(r.defenseBonus, 0);
  assert.equal(r.elevationDelta, 1);
  assert.equal(r.elevationReason, 'high_ground');
  assert.ok(r.terrainReasons.includes('ember_synergy_fire'));
});

test('missing tile metadata → all modifiers zero (no-op)', () => {
  const r = computeCombatPositionModifier(null, null, {});
  assert.equal(r.attackBonus, 0);
  assert.equal(r.defenseBonus, 0);
  assert.equal(r.damageBonus, 0);
  assert.equal(r.elevationDelta, 0);
});

test('TERRAIN_TYPES exposes canonical enum', () => {
  assert.ok(Array.isArray(TERRAIN_TYPES));
  assert.deepEqual(TERRAIN_TYPES, ['none', 'forest', 'water', 'cinder', 'stone']);
});

test('unknown terrain type normalizes to none → no modifier', () => {
  const r = computeTerrainModifier(
    { terrain_type: 'lava' }, // not in enum
    { terrain_type: 'swamp' }, // not in enum
    { channel: 'fuoco', attack_distance: 1 },
  );
  assert.equal(r.attackBonus, 0);
  assert.equal(r.defenseBonus, 0);
  assert.equal(r.damageBonus, 0);
});

test('ranged attacker on water → no melee penalty', () => {
  const r = computeTerrainModifier(
    { terrain_type: 'water' },
    { terrain_type: 'none' },
    { attack_distance: 3 }, // ranged
  );
  assert.equal(r.attackBonus, 0);
  assert.ok(!r.reasons.includes('footing_water_melee'));
});
