'use strict';

// Form-Pulse trait v2 enemy-HP offset (ratify path-1). Guards: the offset is a
// strict no-op (1.0) unless FORM_PULSE_TRAIT_V2_ENABLED is ON, honors the env
// override, and when folded into applyEnemyHpMultiplier scales ONLY sistema enemy
// HP (players untouched, idempotent). See biomeModifiers.js header.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  formPulseV2EnemyHpOffset,
  FP_V2_ENEMY_HP_OFFSET_DEFAULT,
  applyEnemyHpMultiplier,
} = require('../../../apps/backend/services/combat/biomeModifiers');

test('offset is 1.0 (no-op) when the flag is unset', () => {
  assert.equal(formPulseV2EnemyHpOffset({}), 1.0);
});

test('offset is 1.0 when the flag is explicitly not "true"', () => {
  assert.equal(formPulseV2EnemyHpOffset({ FORM_PULSE_TRAIT_V2_ENABLED: 'false' }), 1.0);
  assert.equal(formPulseV2EnemyHpOffset({ FORM_PULSE_TRAIT_V2_ENABLED: '1' }), 1.0);
});

test('offset is the calibrated default when the flag is ON and no override', () => {
  const v = formPulseV2EnemyHpOffset({ FORM_PULSE_TRAIT_V2_ENABLED: 'true' });
  assert.equal(v, FP_V2_ENEMY_HP_OFFSET_DEFAULT);
  assert.ok(v > 1.0, 'default offset must add difficulty');
});

test('env override wins when the flag is ON', () => {
  assert.equal(
    formPulseV2EnemyHpOffset({
      FORM_PULSE_TRAIT_V2_ENABLED: 'true',
      FORM_PULSE_V2_ENEMY_HP_OFFSET: '1.15',
    }),
    1.15,
  );
});

test('invalid / non-positive override falls back to the default', () => {
  const base = { FORM_PULSE_TRAIT_V2_ENABLED: 'true' };
  assert.equal(
    formPulseV2EnemyHpOffset({ ...base, FORM_PULSE_V2_ENEMY_HP_OFFSET: 'nope' }),
    FP_V2_ENEMY_HP_OFFSET_DEFAULT,
  );
  assert.equal(
    formPulseV2EnemyHpOffset({ ...base, FORM_PULSE_V2_ENEMY_HP_OFFSET: '0' }),
    FP_V2_ENEMY_HP_OFFSET_DEFAULT,
  );
  assert.equal(
    formPulseV2EnemyHpOffset({ ...base, FORM_PULSE_V2_ENEMY_HP_OFFSET: '-2' }),
    FP_V2_ENEMY_HP_OFFSET_DEFAULT,
  );
});

test('folded multiplier scales ONLY sistema enemy HP, players untouched, idempotent', () => {
  const offset = formPulseV2EnemyHpOffset({ FORM_PULSE_TRAIT_V2_ENABLED: 'true' }); // default
  const biomeHpMult = 1.0; // savana baseline -> the offset is the whole multiplier
  const effective = biomeHpMult * offset;

  const units = [
    { id: 'enemy1', controlled_by: 'sistema', max_hp: 100, hp: 100 },
    { id: 'player1', controlled_by: 'p_abc', max_hp: 50, hp: 50 },
  ];
  applyEnemyHpMultiplier(units, effective);

  const enemy = units.find((u) => u.id === 'enemy1');
  const player = units.find((u) => u.id === 'player1');
  assert.equal(
    enemy.max_hp,
    Math.round(100 * FP_V2_ENEMY_HP_OFFSET_DEFAULT),
    'enemy HP scaled by offset',
  );
  assert.equal(enemy.hp, enemy.max_hp);
  assert.equal(player.max_hp, 50, 'player HP untouched');

  // Idempotent: a second application is a no-op (marker set).
  const before = enemy.max_hp;
  applyEnemyHpMultiplier(units, effective);
  assert.equal(enemy.max_hp, before, 'enemy HP not double-scaled');
});
