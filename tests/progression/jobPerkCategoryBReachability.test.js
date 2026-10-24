// tests/progression/jobPerkCategoryBReachability.test.js
//
// TKT-JOB-PHASEC Category B — Gate-5 reachability integration.
//
// Proves the production chain for the two on-kill perks, composing the REAL
// modules (no stubs):
//   real ProgressionEngine.pickPerk (loads jobs_expansion.yaml)
//     -> store.set
//     -> applyProgressionToUnits (the exact call session.js /start makes)
//     -> unit._perk_passives carries the tag
//     -> applyPerkKillEffects mutates the killer's attack mod
//
// applyPerkKillEffects is invoked inside performAttack's killOccurred branch
// (session.js, after the lineage propagation hook) — the live combat resolver the
// /round/execute priority_queue flow traverses. That invocation is closure-
// internal (performAttack is not exported), verified by code review, matching the
// existing test bar for the prior perk tags.
//
// Pure behaviour (temp vs permanent, eternal-precedence, decay arming) is covered
// in tests/progression/progressionKillEffects.test.js.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyProgressionToUnits,
  applyPerkKillEffects,
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

test('reachability: real engine seeds STALKER kill_buff_attack (L6 perk_b) and it buffs the killer on kill', () => {
  const { engine, store } = freshCtx();
  seedPick(engine, store, 'st', 'stalker', 6, 'b'); // st_r5_killer_focus

  const units = [{ id: 'st', controlled_by: 'player', hp: 24, hp_max: 24, mod: 3 }];
  applyProgressionToUnits(units, { engine, store });

  const buff = (units[0]._perk_passives || []).find((p) => p.tag === 'kill_buff_attack');
  assert.ok(buff, 'kill_buff_attack present from real engine');
  assert.equal(buff.payload.attack_mod, 2, 'payload attack_mod from jobs_expansion.yaml');

  applyPerkKillEffects(units[0]);
  assert.equal(units[0].attack_mod_bonus, 2, 'temporary attack buff applied on kill');
  assert.ok(Number(units[0].status.attack_mod_buff) > 0, 'decay counter armed');
});

test('reachability: real engine seeds STALKER eternal_kill_buff (L7 perk_b) -> permanent base mod', () => {
  const { engine, store } = freshCtx();
  seedPick(engine, store, 'st', 'stalker', 7, 'b'); // st_r6_eternal_hunt

  const units = [{ id: 'st', controlled_by: 'player', hp: 24, hp_max: 24, mod: 3 }];
  applyProgressionToUnits(units, { engine, store });

  const eternal = (units[0]._perk_passives || []).find((p) => p.tag === 'eternal_kill_buff');
  assert.ok(eternal, 'eternal_kill_buff present from real engine');

  applyPerkKillEffects(units[0]);
  assert.equal(units[0].mod, 5, 'permanent base mod bump on kill (3 -> 5)');
  assert.equal(
    units[0].attack_mod_bonus,
    undefined,
    'no temporary accumulator for the permanent buff',
  );
});

test('reachability: a unit with no kill perks is unaffected on kill', () => {
  const { engine, store } = freshCtx();
  // skirmisher L2 perk_a is flank_specialist (not a kill perk) — attaches a
  // passive but applyPerkKillEffects must ignore it.
  seedPick(engine, store, 'sk', 'skirmisher', 2, 'a');

  const units = [{ id: 'sk', controlled_by: 'player', hp: 10, hp_max: 10, mod: 4 }];
  applyProgressionToUnits(units, { engine, store });

  const res = applyPerkKillEffects(units[0]);
  assert.equal(units[0].mod, 4, 'base mod untouched');
  assert.equal(units[0].attack_mod_bonus, undefined, 'no temp buff');
  assert.equal(res.applied.length, 0, 'no kill-perk effect applied');
});
