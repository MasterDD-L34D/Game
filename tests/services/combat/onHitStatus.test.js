'use strict';

// Combat parity GAP-1 — port of the removed Python resolver STEP 3
// `on_hit_status` (services/rules/resolver.py @ d0c86c60~1, lines ~840-870)
// into the live Node attack resolver.
//
// Behaviour ported: on a SUCCESSFUL hit, for each ATTACKER trait carrying an
// `on_hit_status` block { status_id, trigger_dc, duration, intensity }, the
// TARGET rolls a save d20 + target.tier vs trigger_dc. If the save FAILS
// (roll + tier < trigger_dc) the status is applied to the target
// (target.status[status_id] = max(existing, duration)). The integer key then
// decays 1/round via the universal loop in sessionRoundBridge.js and is read
// by the existing consumers in statusModifiers.js / session.js.
//
// The d20 helper mirrors session.js performAttack: Math.floor(rng() * 20) + 1
// (seeded via pseudoRng for determinism — never Math.random).

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyOnHitStatuses } = require('../../../apps/backend/services/combat/onHitStatus');

// A fixed-value rng: floor(value * 20) + 1 = the d20 roll.
//   value 0.45 -> floor(9.0)+1 = roll 10
//   value 0.95 -> floor(19.0)+1 = roll 20
function fixedRng(value) {
  return () => value;
}

// Minimal mechanics registry shaped like trait_mechanics.yaml `traits` map.
const MECHANICS = {
  spore_psichiche_silenziate: {
    on_hit_status: { status_id: 'disorient', duration: 2, intensity: 1, trigger_dc: 12 },
  },
  cannone_sonico_a_raggio: {
    on_hit_status: { status_id: 'disorient', duration: 2, intensity: 1, trigger_dc: 15 },
  },
  inert_trait: {
    // no on_hit_status -> never contributes
    attack_mod: 1,
  },
};

test('on_hit_status: failing save (roll+tier < trigger_dc) applies the status to the target', () => {
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const target = { id: 't1', tier: 1, status: {} };
  // roll 10 + tier 1 = 11 < 12 -> save FAILS -> apply.
  const result = applyOnHitStatuses(actor, target, {
    rng: fixedRng(0.45),
    mechanicsRegistry: MECHANICS,
  });
  assert.equal(target.status.disorient, 2, 'status applied with its duration on failed save');
  assert.equal(result.applied.length, 1, 'one status reported applied');
  assert.equal(result.applied[0].status_id, 'disorient');
});

test('on_hit_status: passing save (roll+tier >= trigger_dc) does NOT apply the status', () => {
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const target = { id: 't1', tier: 1, status: {} };
  // roll 20 + tier 1 = 21 >= 12 -> save PASSES -> no apply.
  const result = applyOnHitStatuses(actor, target, {
    rng: fixedRng(0.95),
    mechanicsRegistry: MECHANICS,
  });
  assert.equal(target.status.disorient, undefined, 'status NOT applied on passed save');
  assert.equal(result.applied.length, 0, 'no status reported applied');
});

test('on_hit_status: target.tier raises the save total (tier can turn a fail into a pass)', () => {
  // roll 10, trigger_dc 12. tier 1 -> total 11 (fail). tier 2 -> total 12 (>= -> pass).
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const lowTier = { id: 't1', tier: 1, status: {} };
  const highTier = { id: 't2', tier: 2, status: {} };
  applyOnHitStatuses(actor, lowTier, { rng: fixedRng(0.45), mechanicsRegistry: MECHANICS });
  applyOnHitStatuses(actor, highTier, { rng: fixedRng(0.45), mechanicsRegistry: MECHANICS });
  assert.equal(lowTier.status.disorient, 2, 'tier 1: save fails -> applied');
  assert.equal(highTier.status.disorient, undefined, 'tier 2: save total meets DC -> not applied');
});

test('on_hit_status: traits without an on_hit_status block contribute nothing', () => {
  const actor = { id: 'a1', traits: ['inert_trait'] };
  const target = { id: 't1', tier: 1, status: {} };
  const result = applyOnHitStatuses(actor, target, {
    rng: fixedRng(0.0),
    mechanicsRegistry: MECHANICS,
  });
  assert.equal(result.applied.length, 0, 'inert trait applies no status');
  assert.deepEqual(target.status, {}, 'target status untouched');
});

test('on_hit_status: default tier is 1 when target.tier is absent', () => {
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const target = { id: 't1', status: {} }; // no tier
  // roll 10 + default tier 1 = 11 < 12 -> fail -> apply.
  applyOnHitStatuses(actor, target, { rng: fixedRng(0.45), mechanicsRegistry: MECHANICS });
  assert.equal(target.status.disorient, 2, 'missing tier defaults to 1 -> save fails -> applied');
});

test('on_hit_status: existing duration is kept via max-merge (never shortened)', () => {
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate'] };
  const target = { id: 't1', tier: 1, status: { disorient: 5 } };
  // failing save would set duration 2, but existing 5 must win (max-merge).
  applyOnHitStatuses(actor, target, { rng: fixedRng(0.45), mechanicsRegistry: MECHANICS });
  assert.equal(target.status.disorient, 5, 'max(existing 5, new 2) = 5');
});

test('on_hit_status: multiple attacker traits each roll an independent save', () => {
  // spore trigger_dc 12, cannone trigger_dc 15. roll 13 + tier 1 = 14.
  //   spore: 14 >= 12 -> pass (no apply)
  //   cannone: 14 < 15 -> fail (apply)
  // value 0.6 -> floor(12.0)+1 = roll 13.
  const actor = { id: 'a1', traits: ['spore_psichiche_silenziate', 'cannone_sonico_a_raggio'] };
  const target = { id: 't1', tier: 1, status: {} };
  const result = applyOnHitStatuses(actor, target, {
    rng: fixedRng(0.6),
    mechanicsRegistry: MECHANICS,
  });
  assert.equal(target.status.disorient, 2, 'cannone (DC15) failed save -> disorient applied');
  assert.equal(result.applied.length, 1, 'only the cannone save failed');
});
