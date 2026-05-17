// M7-#2 Phase B — damage curves runtime tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadDamageCurves,
  getEncounterClass,
  applyEnemyDamageMultiplier,
  shouldEnrageBoss,
  getEnrageModBonus,
  getTargetBands,
  getTurnLimitDefeat,
  isTurnLimitExceeded,
  DEFAULT_CLASS,
  _resetCache,
} = require('../../apps/backend/services/balance/damageCurves');

test('loadDamageCurves: reads real YAML', () => {
  _resetCache();
  const data = loadDamageCurves();
  assert.ok(data, 'should load YAML');
  assert.ok(data.encounter_classes, 'should have encounter_classes');
  assert.ok(data.enemy_tiers, 'should have enemy_tiers');
});

test('loadDamageCurves: returns null on missing file', () => {
  _resetCache();
  const data = loadDamageCurves('/nonexistent/path.yaml');
  assert.equal(data, null);
  _resetCache();
});

test('getEncounterClass: fallback standard on missing field', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getEncounterClass({}), 'standard');
  assert.equal(getEncounterClass(null), 'standard');
  assert.equal(getEncounterClass({ encounter_class: 'unknown_xyz' }), 'standard');
});

test('getEncounterClass: explicit class passes through', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getEncounterClass({ encounter_class: 'hardcore' }), 'hardcore');
  assert.equal(getEncounterClass({ encounter_class: 'boss' }), 'boss');
});

test('applyEnemyDamageMultiplier: scales mod by class multiplier', () => {
  _resetCache();
  const unit = { mod: 5 };
  // M7-#2 Phase E iter7: hardcore 1.4 → 1.8
  const applied = applyEnemyDamageMultiplier(unit, 'hardcore');
  assert.equal(applied, true);
  assert.equal(unit.mod, 9); // round(5 * 1.8) = 9
  assert.equal(unit._mod_base, 5);
  assert.equal(unit._mod_multiplier_applied, 1.8);
});

test('applyEnemyDamageMultiplier: no-op on tutorial class (mult 1.0)', () => {
  _resetCache();
  const unit = { mod: 5 };
  const applied = applyEnemyDamageMultiplier(unit, 'tutorial');
  assert.equal(applied, false);
  assert.equal(unit.mod, 5);
});

test('applyEnemyDamageMultiplier: boss class multiplier 2.0', () => {
  _resetCache();
  const unit = { mod: 5 };
  // M7-#2 Phase E iter7: boss 1.6 → 2.0 (mantiene monotonic > hardcore 1.8)
  applyEnemyDamageMultiplier(unit, 'boss');
  assert.equal(unit.mod, 10); // round(5 * 2.0) = 10
});

test('shouldEnrageBoss: boss HP below threshold → true', () => {
  _resetCache();
  const boss = { hp: 7, max_hp: 20 }; // 35%
  // hardcore class threshold 40%
  assert.equal(shouldEnrageBoss(boss, 'hardcore'), true);
});

test('shouldEnrageBoss: boss HP above threshold → false', () => {
  _resetCache();
  const boss = { hp: 15, max_hp: 20 }; // 75%
  assert.equal(shouldEnrageBoss(boss, 'hardcore'), false);
});

test('shouldEnrageBoss: tutorial class → never enrage (threshold null)', () => {
  _resetCache();
  const boss = { hp: 1, max_hp: 20 }; // 5%
  assert.equal(shouldEnrageBoss(boss, 'tutorial'), false);
});

test('getEnrageModBonus: returns boss tier bonus', () => {
  _resetCache();
  loadDamageCurves();
  // M7-#2 Phase E iter7: enrage_mod_bonus 1 → 3 (late-fight drama)
  assert.equal(getEnrageModBonus(), 3);
});

test('getTargetBands: returns 3 rate ranges for class', () => {
  _resetCache();
  loadDamageCurves();
  const bands = getTargetBands('hardcore');
  assert.ok(bands);
  assert.deepEqual(bands.win_rate, [0.15, 0.25]);
  assert.deepEqual(bands.defeat_rate, [0.4, 0.55]);
  assert.deepEqual(bands.timeout_rate, [0.15, 0.25]);
});

test('getTargetBands: null on unknown class', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getTargetBands('unknown_class'), null);
});

// M9 P6 — turn_limit_defeat tests

test('getTurnLimitDefeat: hardcore returns 25', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getTurnLimitDefeat('hardcore'), 25);
});

test('getTurnLimitDefeat: boss returns 20', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getTurnLimitDefeat('boss'), 20);
});

test('getTurnLimitDefeat: tutorial returns null (no limit)', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getTurnLimitDefeat('tutorial'), null);
});

test('getTurnLimitDefeat: unknown class returns null', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(getTurnLimitDefeat('nonexistent'), null);
});

test('isTurnLimitExceeded: hardcore turn 25 → true', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(isTurnLimitExceeded(25, 'hardcore'), true);
});

test('isTurnLimitExceeded: hardcore turn 24 → false', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(isTurnLimitExceeded(24, 'hardcore'), false);
});

test('isTurnLimitExceeded: tutorial turn 999 → false (no limit)', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(isTurnLimitExceeded(999, 'tutorial'), false);
});

test('isTurnLimitExceeded: turn 0 never triggers', () => {
  _resetCache();
  loadDamageCurves();
  assert.equal(isTurnLimitExceeded(0, 'hardcore'), false);
});
