'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildScenarioEnemies,
  TIER_HP,
  TIER_MOD,
  GRID_SAFE_MAX,
} = require('../../tools/sim/scenario-enemies');

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
  assert.ok(
    e.position.x <= GRID_SAFE_MAX && e.position.y <= GRID_SAFE_MAX,
    `positions clamped on-grid (<= ${GRID_SAFE_MAX}), got ${JSON.stringify(e.position)}`,
  );
  assert.deepEqual(e.status, {});
  assert.notEqual(enemies[0].id, enemies[1].id, 'distinct ids');
});

test('buildScenarioEnemies: tiers scale hp/mod (base < elite < apex)', () => {
  assert.ok(TIER_HP.base < TIER_HP.elite && TIER_HP.elite < TIER_HP.apex, 'hp scales by tier');
  assert.ok(TIER_MOD.base < TIER_MOD.elite && TIER_MOD.elite < TIER_MOD.apex, 'mod scales by tier');
});

test('buildScenarioEnemies: missing or unsupported YAML -> null (runner falls back)', () => {
  assert.equal(buildScenarioEnemies('enc_does_not_exist_zzz'), null, 'missing -> null');
  // Only elimination is supported (the combat-adapter resolves victory = all foes dead).
  // Non-elimination objectives -> null -> fallback, so we never misreport a survival/
  // capture encounter as an elimination 'scenario' fight (Codex #2567 P2).
  assert.equal(buildScenarioEnemies('enc_escort_01'), null, 'escort -> null');
  assert.equal(buildScenarioEnemies('enc_tutorial_02'), null, 'survival -> null');
  assert.equal(buildScenarioEnemies('enc_caverna_02'), null, 'capture_point -> null');
});
