'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildScenarioEnemies,
  TIER_HP,
  TIER_MOD,
  TIER_DC,
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

test('buildScenarioEnemies: missing YAML -> null; OA2 -> non-elim objectives supported', () => {
  assert.equal(buildScenarioEnemies('enc_does_not_exist_zzz'), null, 'missing -> null');
  // OA2 (SPEC-O): non-elimination objectives are now SUPPORTED -> authored roster (not
  // null). The combat-adapter objective-driver (zone-pursuit + objective-outcome) makes
  // them complete in the sim, so they no longer fall back to the weak fixed enemy.
  assert.ok(buildScenarioEnemies('enc_caverna_02'), 'capture_point -> roster (OA2)');
});

// fase-2c difficulty calibration (Finding 1: completion_rate 1.0 OOB). The authored
// encounters are 2-base-unit fights a 30-HP party crushes deterministically; the band
// needs a tunable difficulty knob. `scaling` is the injected calibration the band batch
// applies (faithful default = no scaling), kept here as a pure, testable param (no env
// global). Count is the decisive lever (damage is ~1-3/hit, so 2 units can never out-race
// a 60-HP party; more units can), with hp/mod/dc deltas for the fine knife-edge.

test('buildScenarioEnemies: scaling.countMult multiplies the wave-1 unit count', () => {
  // enc_tutorial_01 wave-1 = 2 units. x3 -> 6 distinct scaled units.
  const enemies = buildScenarioEnemies('enc_tutorial_01', { countMult: 3 });
  assert.equal(enemies.length, 6, '2 authored units x3 = 6 scaled');
  assert.equal(new Set(enemies.map((e) => e.id)).size, 6, 'ids stay distinct after scaling');
});

test('buildScenarioEnemies: scaling.countAdd adds flat units per unitDef', () => {
  assert.equal(buildScenarioEnemies('enc_tutorial_01', { countAdd: 2 }).length, 4, '2 + 2 = 4');
});

test('buildScenarioEnemies: scaling hp/mod/dc deltas tune the tier stats', () => {
  const e = buildScenarioEnemies('enc_tutorial_01', {
    hpMult: 2,
    hpAdd: 1,
    modAdd: 5,
    dcAdd: 4,
  })[0]; // base tier
  assert.equal(e.hp, TIER_HP.base * 2 + 1, 'hp = base*hpMult + hpAdd');
  assert.equal(e.max_hp, e.hp, 'max_hp tracks scaled hp');
  assert.equal(e.mod, TIER_MOD.base + 5, 'mod = base + modAdd');
  assert.equal(e.dc, TIER_DC.base + 4, 'dc = base + dcAdd');
});

test('buildScenarioEnemies: no scaling -> faithful authored count + tier defaults', () => {
  const enemies = buildScenarioEnemies('enc_tutorial_01');
  assert.equal(enemies.length, 2, 'no count scaling by default');
  assert.equal(enemies[0].hp, TIER_HP.base, 'default base hp');
  assert.equal(enemies[0].mod, TIER_MOD.base, 'default base mod');
  assert.equal(enemies[0].dc, TIER_DC.base, 'default base dc');
});
