// Sprint Spore Moderate (ADR-2026-04-26 §S6) — resolver consumption tests.
//
// Verifies passive_token consumers wire correctly:
//   - archetype_tank_plus_dr1     → -1 damage (min 0 floor)
//   - archetype_ambush_plus_init2 → +2 init se action.is_critical/is_flank
//   - archetype_scout_plus_sight2 → +2 effective attack_range
//
// Back-compat: unit senza _archetype_passives = zero behavior change.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TANK_PLUS_DR1,
  AMBUSH_PLUS_INIT2,
  SCOUT_PLUS_SIGHT2,
  getDamageReduction,
  getInitiativeBonus,
  getSightRangeBonus,
  effectiveAttackRange,
  applyDamageReduction,
} = require('../../apps/backend/services/combat/archetypePassives');
const { computeResolvePriority } = require('../../apps/backend/services/roundOrchestrator');

// ─── tank_plus DR-1 ─────────────────────────────────────────────

test('tank_plus DR-1: reduces damage by 1', () => {
  const target = { _archetype_passives: [TANK_PLUS_DR1] };
  const r = applyDamageReduction(5, target);
  assert.equal(r.damage, 4);
  assert.equal(r.reduced, 1);
});

test('tank_plus DR-1: floor at 0 (does not go negative)', () => {
  const target = { _archetype_passives: [TANK_PLUS_DR1] };
  const r = applyDamageReduction(1, target);
  assert.equal(r.damage, 0);
  assert.equal(r.reduced, 1);
  // damage 0 input → DR not applied (no negative reduce)
  const r0 = applyDamageReduction(0, target);
  assert.equal(r0.damage, 0);
  assert.equal(r0.reduced, 0);
});

test('tank_plus DR-1: back-compat — unit without _archetype_passives unchanged', () => {
  assert.equal(getDamageReduction({}), 0);
  assert.equal(getDamageReduction(null), 0);
  assert.equal(getDamageReduction({ _archetype_passives: [] }), 0);
  const r = applyDamageReduction(5, { hp: 10 });
  assert.equal(r.damage, 5);
  assert.equal(r.reduced, 0);
});

// ─── ambush_plus init+2 ─────────────────────────────────────────

test('ambush_plus init+2: triggers on critical or flank action', () => {
  const actor = { _archetype_passives: [AMBUSH_PLUS_INIT2] };
  assert.equal(getInitiativeBonus(actor, { is_critical: true }), 2);
  assert.equal(getInitiativeBonus(actor, { is_flank: true }), 2);
  assert.equal(getInitiativeBonus(actor, { is_critical: true, is_flank: true }), 2);
});

test('ambush_plus init+2: NO trigger when neither crit nor flank', () => {
  const actor = { _archetype_passives: [AMBUSH_PLUS_INIT2] };
  assert.equal(getInitiativeBonus(actor, {}), 0);
  assert.equal(getInitiativeBonus(actor, { is_critical: false, is_flank: false }), 0);
  assert.equal(getInitiativeBonus(actor, null), 0);
});

test('ambush_plus init+2: wired in computeResolvePriority', () => {
  // Same unit + action: priority differs by exactly 2 with passive on critical.
  const baseUnit = { initiative: 10 };
  const ambushUnit = {
    initiative: 10,
    _archetype_passives: [AMBUSH_PLUS_INIT2],
  };
  const action = { type: 'attack', is_critical: true };
  const basePriority = computeResolvePriority(baseUnit, action);
  const ambushPriority = computeResolvePriority(ambushUnit, action);
  assert.equal(ambushPriority - basePriority, 2);
  // Without crit/flank trigger, no delta
  const calmAction = { type: 'attack' };
  assert.equal(
    computeResolvePriority(ambushUnit, calmAction),
    computeResolvePriority(baseUnit, calmAction),
  );
});

// ─── scout_plus sight+2 ─────────────────────────────────────────

test('scout_plus sight+2: extends effective attack_range by 2', () => {
  const actor = { _archetype_passives: [SCOUT_PLUS_SIGHT2] };
  assert.equal(getSightRangeBonus(actor), 2);
  assert.equal(effectiveAttackRange(actor, 3), 5);
  assert.equal(effectiveAttackRange(actor, 1), 3);
});

test('scout_plus sight+2: back-compat — unit without passive unchanged', () => {
  assert.equal(getSightRangeBonus({}), 0);
  assert.equal(getSightRangeBonus(null), 0);
  assert.equal(effectiveAttackRange({}, 3), 3);
  assert.equal(effectiveAttackRange({ _archetype_passives: [] }, 5), 5);
});

// ─── combo: tank + ambush + scout do not interfere ─────────────

test('combo: all three passives stack independently without interference', () => {
  const actor = {
    initiative: 5,
    _archetype_passives: [TANK_PLUS_DR1, AMBUSH_PLUS_INIT2, SCOUT_PLUS_SIGHT2],
  };
  // tank DR works
  const dr = applyDamageReduction(4, actor);
  assert.equal(dr.damage, 3);
  assert.equal(dr.reduced, 1);
  // ambush init bonus on flank
  assert.equal(getInitiativeBonus(actor, { is_flank: true }), 2);
  // scout sight bonus
  assert.equal(effectiveAttackRange(actor, 2), 4);
  // computeResolvePriority sees the +2 only when crit/flank set
  const prioCrit = computeResolvePriority(actor, { type: 'attack', is_critical: true });
  const prioCalm = computeResolvePriority(actor, { type: 'attack' });
  assert.equal(prioCrit - prioCalm, 2);
});

// ─── full back-compat sweep ─────────────────────────────────────

test('back-compat: zero behavior change when _archetype_passives undefined', () => {
  // Mirror real session unit shape (no Spore mutations applied).
  const plainActor = { id: 'u1', initiative: 8, hp: 10, mod: 2 };
  const plainTarget = { id: 'u2', hp: 10, dc: 12 };
  // Damage path
  const dr = applyDamageReduction(7, plainTarget);
  assert.equal(dr.damage, 7);
  // Init path
  const prio = computeResolvePriority(plainActor, { type: 'attack', is_critical: true });
  assert.equal(prio, 8); // initiative 8 + speed 0 - penalty 0 + archetype 0
  // Sight path
  assert.equal(effectiveAttackRange(plainActor, 2), 2);
});
