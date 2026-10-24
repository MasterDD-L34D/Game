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
  ADAPTER_PLUS_HAZARD,
  ALPHA_PLUS_AFF1,
  getDamageReduction,
  getInitiativeBonus,
  getSightRangeBonus,
  effectiveAttackRange,
  applyDamageReduction,
  hasHazardImmunity,
  applyHazardImmunity,
  countAdjacentAllies,
  computeAlphaAffinityGrant,
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

// ─── adapter_plus hazard immunity (Path A 2026-04-27) ─────────

test('adapter_plus: hazard damage 5 → reduced to 0 when passive active', () => {
  const target = { _archetype_passives: [ADAPTER_PLUS_HAZARD] };
  assert.equal(hasHazardImmunity(target), true);
  const r = applyHazardImmunity(5, target);
  assert.equal(r.damage, 0);
  assert.equal(r.immune, true);
});

test('adapter_plus: normal damage path NOT affected (DR helper independent)', () => {
  // Verifica isolation: adapter passive non triggera DR su attacchi normali.
  // applyDamageReduction guarda solo TANK_PLUS_DR1, non ADAPTER.
  const target = { _archetype_passives: [ADAPTER_PLUS_HAZARD] };
  const r = applyDamageReduction(5, target);
  assert.equal(r.damage, 5);
  assert.equal(r.reduced, 0);
});

test('adapter_plus: back-compat — hazard damage 5 stays 5 when passive absent', () => {
  assert.equal(hasHazardImmunity({}), false);
  assert.equal(hasHazardImmunity(null), false);
  assert.equal(hasHazardImmunity({ _archetype_passives: [] }), false);
  const r = applyHazardImmunity(5, { hp: 10 });
  assert.equal(r.damage, 5);
  assert.equal(r.immune, false);
});

// ─── alpha_plus affinity grant (Path A 2026-04-27) ────────────

test('alpha_plus: actor with 2 adjacent allies → grant = 2', () => {
  const actor = {
    id: 'a1',
    controlled_by: 'player',
    position: { x: 3, y: 3 },
    hp: 10,
    _archetype_passives: [ALPHA_PLUS_AFF1],
  };
  const ally1 = { id: 'a2', controlled_by: 'player', position: { x: 4, y: 3 }, hp: 8 };
  const ally2 = { id: 'a3', controlled_by: 'player', position: { x: 3, y: 2 }, hp: 8 };
  const farAlly = { id: 'a4', controlled_by: 'player', position: { x: 5, y: 5 }, hp: 8 };
  const enemyAdj = { id: 'e1', controlled_by: 'sistema', position: { x: 2, y: 3 }, hp: 8 };
  const units = [actor, ally1, ally2, farAlly, enemyAdj];
  assert.equal(countAdjacentAllies(actor, units), 2);
  assert.equal(computeAlphaAffinityGrant(actor, units), 2);
});

test('alpha_plus: actor with 0 adjacent allies → grant = 0', () => {
  const actor = {
    id: 'a1',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    hp: 10,
    _archetype_passives: [ALPHA_PLUS_AFF1],
  };
  const farAlly = { id: 'a2', controlled_by: 'player', position: { x: 5, y: 5 }, hp: 8 };
  assert.equal(computeAlphaAffinityGrant(actor, [actor, farAlly]), 0);
});

test('alpha_plus: dead allies + enemies excluded from grant count', () => {
  const actor = {
    id: 'a1',
    controlled_by: 'player',
    position: { x: 2, y: 2 },
    hp: 10,
    _archetype_passives: [ALPHA_PLUS_AFF1],
  };
  const deadAlly = { id: 'a2', controlled_by: 'player', position: { x: 3, y: 2 }, hp: 0 };
  const adjEnemy = { id: 'e1', controlled_by: 'sistema', position: { x: 1, y: 2 }, hp: 8 };
  const liveAlly = { id: 'a3', controlled_by: 'player', position: { x: 2, y: 3 }, hp: 6 };
  assert.equal(computeAlphaAffinityGrant(actor, [actor, deadAlly, adjEnemy, liveAlly]), 1);
});

test('alpha_plus: back-compat — actor without passive returns 0', () => {
  const actor = { id: 'a1', controlled_by: 'player', position: { x: 0, y: 0 }, hp: 10 };
  const ally = { id: 'a2', controlled_by: 'player', position: { x: 1, y: 0 }, hp: 8 };
  assert.equal(countAdjacentAllies(actor, [actor, ally]), 0);
  assert.equal(computeAlphaAffinityGrant(actor, [actor, ally]), 0);
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
