// tests/progression/jobPerkCategoryAReachability.test.js
//
// TKT-JOB-PHASEC Category A — Gate-5 reachability integration.
//
// Proves the FULL production chain for the two expansion perks, composing the
// REAL modules (no stubs):
//   real ProgressionEngine.pickPerk (loads jobs_expansion.yaml)
//     -> store.set
//     -> applyProgressionToUnits (the exact call session.js /start makes)
//     -> unit._perk_passives carries the tag
//     -> computePerkCombatModifiers reads it and returns the runtime modifier
//
// This is the chain that performAttack consumes (perkCombatMods = computePerk-
// CombatModifiers(actor, target, { isFirstStrike, rng }); the multiplier scales
// damageDealt and ignoreDr gates the resistance step). The literal performAttack
// call is closure-internal (not exported), verified by code review — matching the
// existing test bar for the 5 prior perk tags (tests/api/progressionApply.test.js
// is likewise unit/integration on the engine + computePerkDamageBonus, not HTTP).
//
// The pure computePerkCombatModifiers behaviour (chance fire/no-fire, apex
// first-strike gating, stacking) is covered exhaustively in
// tests/progression/progressionCombatModifiers.test.js.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyProgressionToUnits,
  computePerkCombatModifiers,
  resetDefaults,
} = require('../../apps/backend/services/progression/progressionApply');
const { ProgressionEngine } = require('../../apps/backend/services/progression/progressionEngine');
const {
  createProgressionStore,
} = require('../../apps/backend/services/progression/progressionStore');

function freshCtx() {
  resetDefaults();
  return { engine: new ProgressionEngine(), store: createProgressionStore() };
}

// Seed a unit at max level (huge xp caps at max_level) and pick one perk.
function seedPick(engine, store, unitId, job, level, choice) {
  const seeded = engine.seed(unitId, job, { xpTotal: 1_000_000 });
  const picked = engine.pickPerk(seeded, level, choice);
  store.set(null, unitId, picked.unit);
}

test('reachability: real engine seeds ABERRANT random_double_dmg_chance and applyProgressionToUnits attaches it', () => {
  const { engine, store } = freshCtx();
  seedPick(engine, store, 'ab', 'aberrant', 4, 'a'); // ab_r3_chaos_attack

  const units = [{ id: 'ab', controlled_by: 'player', hp: 30, hp_max: 30 }];
  applyProgressionToUnits(units, { engine, store });

  const passives = units[0]._perk_passives;
  assert.ok(Array.isArray(passives), '_perk_passives attached');
  const doubler = passives.find((p) => p.tag === 'random_double_dmg_chance');
  assert.ok(doubler, 'random_double_dmg_chance present from real engine');
  assert.equal(doubler.payload.chance, 0.25, 'payload chance from jobs_expansion.yaml');

  // The runtime modifier reads the attached passive: rng below chance -> x2.
  const mods = computePerkCombatModifiers(units[0], { id: 'foe' }, { rng: () => 0.0 });
  assert.equal(mods.multiplier, 2, 'attached perk drives the runtime damage multiplier');
});

test('reachability: real engine seeds STALKER apex_first_strike and applyProgressionToUnits attaches it', () => {
  const { engine, store } = freshCtx();
  seedPick(engine, store, 'st', 'stalker', 7, 'a'); // st_r6_apex_predator

  const units = [{ id: 'st', controlled_by: 'player', hp: 24, hp_max: 24 }];
  applyProgressionToUnits(units, { engine, store });

  const apex = (units[0]._perk_passives || []).find((p) => p.tag === 'apex_first_strike');
  assert.ok(apex, 'apex_first_strike present from real engine');
  assert.equal(apex.payload.ignore_dr, true, 'payload ignore_dr from jobs_expansion.yaml');

  // The runtime modifier reads it: first strike -> DR bypass; not first strike -> no bypass.
  const first = computePerkCombatModifiers(units[0], { id: 'foe' }, { isFirstStrike: true });
  assert.equal(first.ignoreDr, true, 'attached perk drives DR bypass on first strike');
  const later = computePerkCombatModifiers(units[0], { id: 'foe' }, { isFirstStrike: false });
  assert.equal(later.ignoreDr, false, 'no bypass once first strike consumed');
});

test('reachability: sistema (enemy) units never receive Category A perks', () => {
  const { engine, store } = freshCtx();
  seedPick(engine, store, 'e1', 'aberrant', 4, 'a');

  const units = [{ id: 'e1', controlled_by: 'sistema', hp: 30, hp_max: 30 }];
  applyProgressionToUnits(units, { engine, store });

  assert.equal(units[0]._perk_passives, undefined, 'enemy units skipped (no perk attach)');
  const mods = computePerkCombatModifiers(units[0], { id: 'foe' }, { rng: () => 0.0 });
  assert.equal(mods.multiplier, 1, 'neutral modifiers for a unit with no perks');
});
