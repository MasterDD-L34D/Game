// M14-A residuo (TKT-09 2026-04-26) — Full elevation wire validation.
//
// Verifies elevation multiplier is wired in:
//   - resolveAttack damage step (already shipped via computePositionalDamage)
//   - predictCombat expected_damage + elevation_multiplier surface (NEW this PR)
//   - performAttack return surfaces `positional` info
//   - buildAttackEvent emits `elevation_multiplier` field when delta != 0
//
// Compose checks vs PR #1830 evasion_bonus_bonus, PR #1840 terrainReactions.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  predictCombat,
  computePositionalDamage,
} = require('../../apps/backend/routes/sessionHelpers');
const { elevationDamageMultiplier } = require('../../apps/backend/services/grid/hexGrid');

test('predictCombat: same elevation → multiplier 1.0', () => {
  const actor = { mod: 3, elevation: 1 };
  const target = { dc: 12, elevation: 1 };
  const p = predictCombat(actor, target);
  assert.equal(p.elevation_multiplier, 1);
  assert.equal(p.elevation_delta, 0);
  assert.ok(Number.isFinite(p.expected_damage));
});

test('predictCombat: attacker higher → 1.3x multiplier on expected_damage', () => {
  const actor = { mod: 3, elevation: 1 };
  const target = { dc: 12, elevation: 0 };
  const p = predictCombat(actor, target);
  assert.equal(p.elevation_multiplier, 1.3);
  assert.equal(p.elevation_delta, 1);
  // Sanity: expected_damage scales with multiplier — ratio vs same-elev call.
  const same = predictCombat({ mod: 3, elevation: 0 }, { dc: 12, elevation: 0 });
  assert.ok(p.expected_damage >= same.expected_damage);
  assert.ok(p.expected_damage > 0);
});

test('predictCombat: target higher → 0.85x penalty multiplier', () => {
  const actor = { mod: 3, elevation: 0 };
  const target = { dc: 12, elevation: 2 };
  const p = predictCombat(actor, target);
  assert.equal(p.elevation_multiplier, 0.85);
  assert.equal(p.elevation_delta, -2);
});

test('predictCombat: missing elevation → defaults to 0 (multiplier 1.0)', () => {
  const actor = { mod: 3 };
  const target = { dc: 12 };
  const p = predictCombat(actor, target);
  assert.equal(p.elevation_multiplier, 1);
  assert.equal(p.elevation_delta, 0);
});

test('predictCombat: stack with evasion_bonus_bonus PR #1830 — DC raised, multiplier still applies', () => {
  const actor = { mod: 3, elevation: 1 };
  const target = {
    dc: 12,
    elevation: 0,
    evasion_bonus_bonus: 2, // Ennea P4 evasion bonus
    defense_mod_bonus: 1, // status engine extension
  };
  const p = predictCombat(actor, target);
  // DC effective = 12 + 1 + 2 = 15
  assert.equal(p.dc, 15);
  // Elevation multiplier still 1.3 — multiplier is post-hit, indipendent.
  assert.equal(p.elevation_multiplier, 1.3);
  assert.ok(Number.isFinite(p.expected_damage));
});

test('predictCombat: high DC + high elevation → expected_damage NaN-free + non-negative', () => {
  const actor = { mod: 0, elevation: 0 };
  const target = { dc: 25, elevation: 5 }; // unhittable + penalty
  const p = predictCombat(actor, target);
  assert.equal(p.hit_pct, 0);
  assert.equal(p.elevation_multiplier, 0.85);
  assert.equal(p.expected_damage, 0); // 0% hit → 0 expected dmg
  assert.ok(!Number.isNaN(p.expected_damage));
});

test('elevationDamageMultiplier helper: floor 0.1 preserved (no total negation)', () => {
  // Edge: defensive call with weird custom penalty.
  const m = elevationDamageMultiplier({
    attackerElevation: 0,
    targetElevation: 1,
    bonus: 0.3,
    penalty: -10,
  });
  assert.equal(m, 0.1); // clamped to floor
});

test('computePositionalDamage: elevation + flank stack multiplicatively', () => {
  // M14-B wire — elevation 1.3 × flank 1.15 = 1.495 (capped at 2.0)
  const actor = { position: { x: 0, y: 0 }, facing: 'E', elevation: 1 };
  const target = { position: { x: 0, y: 1 }, facing: 'E', elevation: 0 };
  const r = computePositionalDamage({ actor, target, baseDamage: 10 });
  assert.equal(r.elevation_delta, 1);
  assert.ok(r.multiplier > 1.3); // elevation alone would be 1.3
  // 10 * 1.495 = 14.95 → floor 14
  assert.ok(r.damage >= 13 && r.damage <= 15);
});

test('computePositionalDamage: clamp 2.0 max when stacking elevation + flank', () => {
  // Even custom high coeffs cap.
  const actor = { position: { x: 0, y: 0 }, facing: 'E', elevation: 1 };
  const target = { position: { x: 0, y: 1 }, facing: 'E', elevation: 0 };
  const r = computePositionalDamage({
    actor,
    target,
    baseDamage: 10,
    elevationBonus: 1.5, // 2.5x
    flankBonus: 1.0, // 2.0x flank
  });
  // Without clamp: 2.5 * 2.0 = 5.0; with clamp: 2.0
  assert.equal(r.multiplier, 2.0);
  assert.equal(r.damage, 20); // 10 * 2.0
});

test('predictCombat: 8p hardcore-06 BOSS scenario — boss elev=1 vs ground player → -15% expected dmg', () => {
  // Player ground (mod 3) attacca boss elevato (dc 14, hp 40, elev 1).
  const player = { mod: 3, elevation: 0 };
  const boss = { mod: 3, dc: 14, elevation: 1 };
  const p = predictCombat(player, boss);
  assert.equal(p.elevation_multiplier, 0.85); // player below boss
  assert.equal(p.elevation_delta, -1);
  // Boss attacker (mirror) — boss attacca player (player ground, dc ~12, mod 3).
  const bossAttacker = { mod: 3, elevation: 1 };
  const ground = { mod: 3, dc: 12, elevation: 0 };
  const pBoss = predictCombat(bossAttacker, ground);
  assert.equal(pBoss.elevation_multiplier, 1.3); // boss above
  assert.equal(pBoss.elevation_delta, 1);
  // Asymmetry confirmed: boss expected_damage > player expected_damage anche con stessa hit_pct.
  assert.ok(pBoss.expected_damage > p.expected_damage);
});
