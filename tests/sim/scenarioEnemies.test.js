'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildScenarioEnemies, TIER_HP, TIER_MOD } = require('../../tools/sim/scenario-enemies');

test('buildScenarioEnemies: loads a real encounter YAML -> scaled sistema units in runner shape', () => {
  // enc_tutorial_01 wave-1 = 2x predoni_nomadi (tier base).
  const enemies = buildScenarioEnemies('enc_tutorial_01');
  assert.ok(
    Array.isArray(enemies) && enemies.length === 2,
    `2 wave-1 units, got ${enemies && enemies.length}`,
  );
  const e = enemies[0];
  assert.equal(e.controlled_by, 'sistema');
  assert.equal(e.species, 'predoni_nomadi');
  assert.equal(e.hp, TIER_HP.base, 'base-tier hp from the scaling table');
  assert.equal(e.max_hp, e.hp);
  // runner enemy shape (same fields the weak-fixed enemy + combat-adapter use).
  assert.ok(e.ap >= 1 && e.mod >= 1 && e.dc > 0 && e.attack_range >= 1, 'combat-ready stats');
  assert.ok(e.position && typeof e.position.x === 'number' && typeof e.position.y === 'number');
  assert.deepEqual(e.status, {});
  assert.notEqual(enemies[0].id, enemies[1].id, 'distinct ids');
});

test('buildScenarioEnemies: tiers scale hp/mod (base < elite < apex)', () => {
  assert.ok(TIER_HP.base < TIER_HP.elite && TIER_HP.elite < TIER_HP.apex, 'hp scales by tier');
  assert.ok(TIER_MOD.base < TIER_MOD.elite && TIER_MOD.elite < TIER_MOD.apex, 'mod scales by tier');
});

test('buildScenarioEnemies: missing or unsupported YAML -> null (runner falls back)', () => {
  assert.equal(buildScenarioEnemies('enc_does_not_exist_zzz'), null, 'missing -> null');
  // enc_escort_01 has an escort objective (unsupported by this loader) -> null -> fallback.
  assert.equal(buildScenarioEnemies('enc_escort_01'), null, 'unsupported objective -> null');
});
