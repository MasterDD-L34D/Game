'use strict';

// Form-Pulse trait v2 enemy-HP offset -- W1 offset-rework (grilling 2026-06-30, branch 2+4).
// The offset is no longer a flat constant gated by the flag alone (that bug gave flag-ON + solo
// enemies +40% HP with ZERO player buff). It is now f(actual granted buff power):
//   - strict no-op (1.0) when FORM_PULSE_TRAIT_V2_ENABLED is OFF,
//   - 1.0 when ON but 0 trait granted (solo / dormant) = the bug fix,
//   - scales linearly from the calibrated anchor at the #3017 reference team to net-neutral at
//     every player-count,
//   - still folds into applyEnemyHpMultiplier (sistema-only, idempotent).
// Granted buff power = countGrantedV2BuffPower(units) = the branco+minor(+imprint) trait
// instances actually present on the player creatures.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  formPulseV2EnemyHpOffset,
  FP_V2_ENEMY_HP_OFFSET_DEFAULT,
  FP_V2_REFERENCE_BUFF_DEFAULT,
  applyEnemyHpMultiplier,
} = require('../../../apps/backend/services/combat/biomeModifiers');
const {
  countGrantedV2BuffPower,
  PROPOSED_BRANCO_TRAIT_MAPPING,
  PROPOSED_MINOR_TRAIT_MAPPING,
} = require('../../../apps/backend/services/identity/brancoTraitEmergence');

const ON = { FORM_PULSE_TRAIT_V2_ENABLED: 'true' };

test('offset is 1.0 (no-op) when the flag is unset, regardless of buff power', () => {
  assert.equal(formPulseV2EnemyHpOffset({}, 0), 1.0);
  assert.equal(formPulseV2EnemyHpOffset({}, FP_V2_REFERENCE_BUFF_DEFAULT), 1.0);
});

test('offset is 1.0 when the flag is explicitly not "true"', () => {
  assert.equal(formPulseV2EnemyHpOffset({ FORM_PULSE_TRAIT_V2_ENABLED: 'false' }, 8), 1.0);
  assert.equal(formPulseV2EnemyHpOffset({ FORM_PULSE_TRAIT_V2_ENABLED: '1' }, 8), 1.0);
});

test('SOLO fix: flag ON but 0 granted buff -> 1.0 (no spurious +40% enemy HP)', () => {
  assert.equal(formPulseV2EnemyHpOffset(ON, 0), 1.0);
  assert.equal(formPulseV2EnemyHpOffset(ON), 1.0, 'buff power defaults to 0');
});

test('offset equals the calibrated anchor at the reference buff level (preserves #3017)', () => {
  const v = formPulseV2EnemyHpOffset(ON, FP_V2_REFERENCE_BUFF_DEFAULT);
  assert.equal(v, FP_V2_ENEMY_HP_OFFSET_DEFAULT);
  assert.ok(v > 1.0, 'anchor must add difficulty for a fully-granted reference team');
});

test('buff-scaling: offset rises linearly with team buff (net-neutral at every player-count)', () => {
  // reference = a fully-granted 2-creature team (branco+minor each = 4 instances) -> anchor 1.4.
  // A full-grant team of N creatures carries 2N instances; the offset scales 1 + 0.4*(2N/4).
  const ref = FP_V2_REFERENCE_BUFF_DEFAULT; // 4
  const slope = FP_V2_ENEMY_HP_OFFSET_DEFAULT - 1.0; // 0.4
  const at = (buff) => 1 + slope * (buff / ref);
  // 1 fully-granted creature (2 instances), 2 (4), 3 (6), 4 (8)
  assert.equal(formPulseV2EnemyHpOffset(ON, 2), at(2)); // 1.2
  assert.equal(formPulseV2EnemyHpOffset(ON, 4), at(4)); // 1.4 (= anchor)
  assert.equal(formPulseV2EnemyHpOffset(ON, 6), at(6)); // 1.6
  assert.equal(formPulseV2EnemyHpOffset(ON, 8), at(8)); // 1.8
  // strictly monotonic in buff power
  assert.ok(formPulseV2EnemyHpOffset(ON, 8) > formPulseV2EnemyHpOffset(ON, 4));
});

test('env override sets the anchor (offset at the reference buff), still buff-scaled', () => {
  const env = { ...ON, FORM_PULSE_V2_ENEMY_HP_OFFSET: '1.15' };
  assert.equal(formPulseV2EnemyHpOffset(env, FP_V2_REFERENCE_BUFF_DEFAULT), 1.15);
  assert.equal(formPulseV2EnemyHpOffset(env, 0), 1.0, 'still 1.0 at zero buff');
  assert.equal(formPulseV2EnemyHpOffset(env, 2), 1 + 0.15 * (2 / FP_V2_REFERENCE_BUFF_DEFAULT));
});

test('env override for the reference buff re-scales the curve', () => {
  const env = { ...ON, FORM_PULSE_V2_REFERENCE_BUFF: '8' };
  // anchor reached at buff 8 now, not 4
  assert.equal(formPulseV2EnemyHpOffset(env, 8), FP_V2_ENEMY_HP_OFFSET_DEFAULT);
  assert.equal(formPulseV2EnemyHpOffset(env, 4), 1 + (FP_V2_ENEMY_HP_OFFSET_DEFAULT - 1) * 0.5);
});

test('invalid / non-positive overrides fall back to the defaults', () => {
  for (const bad of ['nope', '0', '-2']) {
    assert.equal(
      formPulseV2EnemyHpOffset(
        { ...ON, FORM_PULSE_V2_ENEMY_HP_OFFSET: bad },
        FP_V2_REFERENCE_BUFF_DEFAULT,
      ),
      FP_V2_ENEMY_HP_OFFSET_DEFAULT,
    );
  }
  for (const bad of ['nope', '0', '-2']) {
    // bad reference -> default reference 4 -> anchor at buff 4
    assert.equal(
      formPulseV2EnemyHpOffset({ ...ON, FORM_PULSE_V2_REFERENCE_BUFF: bad }, 4),
      FP_V2_ENEMY_HP_OFFSET_DEFAULT,
    );
  }
});

test('offset never drops below 1.0 (a buff can only add enemy HP, never remove it)', () => {
  assert.ok(formPulseV2EnemyHpOffset(ON, -5) >= 1.0);
  assert.ok(formPulseV2EnemyHpOffset(ON, 0) >= 1.0);
});

test('folded multiplier scales ONLY sistema enemy HP, players untouched, idempotent', () => {
  // a fully-granted reference team -> the anchor offset, folded into the biome hp_mult.
  const offset = formPulseV2EnemyHpOffset(ON, FP_V2_REFERENCE_BUFF_DEFAULT); // = anchor
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
    'enemy HP scaled by anchor offset',
  );
  assert.equal(enemy.hp, enemy.max_hp);
  assert.equal(player.max_hp, 50, 'player HP untouched');

  const before = enemy.max_hp;
  applyEnemyHpMultiplier(units, effective);
  assert.equal(enemy.max_hp, before, 'enemy HP not double-scaled');
});

// ---- countGrantedV2BuffPower: the buff-power signal the caller feeds the offset ----

test('countGrantedV2BuffPower: 0 for solo / no granted trait present', () => {
  assert.equal(countGrantedV2BuffPower([]), 0);
  assert.equal(countGrantedV2BuffPower(null), 0);
  assert.equal(
    countGrantedV2BuffPower([{ controlled_by: 'p1', traits: ['some_player_choice'] }]),
    0,
  );
});

test('countGrantedV2BuffPower: counts branco+minor instances on PLAYER units only', () => {
  const branco = PROPOSED_BRANCO_TRAIT_MAPPING.agile_robust['-']; // coda_stabilizzatrice_vortex
  const minor = PROPOSED_MINOR_TRAIT_MAPPING.solitary_swarm['+']; // biofilm_glow
  const units = [
    { controlled_by: 'p1', traits: [branco, minor] }, // 2
    { controlled_by: 'p2', traits: [branco] }, // 1 (shared branco)
    { controlled_by: 'sistema', traits: [branco] }, // 0 -- enemy buff ignored
  ];
  assert.equal(countGrantedV2BuffPower(units), 3);
});

test('countGrantedV2BuffPower: a fully-granted 2-creature team hits the reference (4)', () => {
  const branco = PROPOSED_BRANCO_TRAIT_MAPPING.agile_robust['-'];
  const m1 = PROPOSED_MINOR_TRAIT_MAPPING.solitary_swarm['+'];
  const m2 = PROPOSED_MINOR_TRAIT_MAPPING.explore_caution['+'];
  const units = [
    { controlled_by: 'p1', traits: [branco, m1] },
    { controlled_by: 'p2', traits: [branco, m2] },
  ];
  assert.equal(countGrantedV2BuffPower(units), FP_V2_REFERENCE_BUFF_DEFAULT);
});
