// tests/services/combat/abilitySuppression.test.js
//
// inibito ability-suppression (creature-trait mechanics slice 1).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//       (Ability suppression prereq -- status `inibito`).
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isAbilityInhibited,
  INIBITO_STATUS,
} = require('../../../apps/backend/services/combat/abilitySuppression');

test('INIBITO_STATUS is the canonical status name', () => {
  assert.equal(INIBITO_STATUS, 'inibito');
});

test('isAbilityInhibited: object-map status.inibito > 0 -> true', () => {
  assert.equal(isAbilityInhibited({ status: { inibito: 2 } }), true);
  assert.equal(isAbilityInhibited({ status: { inibito: 1 } }), true);
});

test('isAbilityInhibited: object-map inibito 0 or absent -> false', () => {
  assert.equal(isAbilityInhibited({ status: { inibito: 0 } }), false);
  assert.equal(isAbilityInhibited({ status: {} }), false);
  assert.equal(isAbilityInhibited({}), false);
  assert.equal(isAbilityInhibited(null), false);
  assert.equal(isAbilityInhibited(undefined), false);
});

test('isAbilityInhibited: array-shape statuses [{id,remaining_turns}] -> true when live', () => {
  assert.equal(isAbilityInhibited({ statuses: [{ id: 'inibito', remaining_turns: 1 }] }), true);
  assert.equal(isAbilityInhibited({ statuses: [{ id: 'inibito', remaining_turns: 0 }] }), false);
  assert.equal(isAbilityInhibited({ statuses: [{ id: 'panic', remaining_turns: 2 }] }), false);
});

test('isAbilityInhibited: array-of-strings status shape -> true', () => {
  assert.equal(isAbilityInhibited({ status: ['inibito', 'ferito'] }), true);
  assert.equal(isAbilityInhibited({ status: ['ferito'] }), false);
});

// ── guard wired at the ability dispatch entry (abilityExecutor.executeAbility) ──

const { createAbilityExecutor } = require('../../../apps/backend/services/abilityExecutor');

function makeExec(onAttack) {
  return createAbilityExecutor({
    performAttack: onAttack || (() => ({ nextState: {}, turnLogEntry: {} })),
    buildAttackEvent: () => ({}),
    buildMoveEvent: () => ({}),
    appendEvent: () => {},
    manhattanDistance: () => 1,
  });
}

test('executeAbility: inibito actor is blocked before any dispatch', async () => {
  let dispatched = false;
  const exec = makeExec(() => {
    dispatched = true;
    return { nextState: {}, turnLogEntry: {} };
  });
  const actor = { id: 'g', status: { inibito: 1 }, ap: 2, ap_remaining: 2, traits: [] };
  const session = { units: [actor], events: [] };
  const res = await exec.executeAbility({ session, actor, body: { ability_id: 'dash_strike' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.blocked, true);
  assert.equal(res.body.reason, 'inibito');
  assert.equal(dispatched, false, 'no ability dispatch when inhibited');
  assert.equal(actor.ap_remaining, 2, 'no AP spent when blocked');
});

test('executeAbility: non-inibito actor is NOT guard-blocked (conditional)', async () => {
  const exec = makeExec();
  const actor = { id: 'g', status: {}, ap: 2, ap_remaining: 2, traits: [] };
  const session = { units: [actor], events: [] };
  const res = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: '__no_such_ability__' },
  });
  // Reaches the normal not-found path -> NOT the inibito guard.
  assert.notEqual(res.body && res.body.reason, 'inibito');
});

// ── matrice_antimagia Mode B (on-hit apply inibito) from active_effects.yaml ──

const {
  loadActiveTraitRegistry,
  evaluateStatusTraits,
} = require('../../../apps/backend/services/traitEffects');

test('matrice_antimagia (active_effects.yaml) applies inibito on melee hit', () => {
  const registry = loadActiveTraitRegistry();
  assert.ok(registry.matrice_antimagia, 'matrice_antimagia must be defined in active_effects.yaml');
  const actor = { id: 'g', traits: ['matrice_antimagia'], position: { x: 0, y: 0 } };
  const target = { id: 't', traits: [], position: { x: 1, y: 0 } }; // manhattan 1 = melee
  const out = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 1 },
    killOccurred: false,
  });
  const applied = out.status_applies.find((s) => s.stato === 'inibito');
  assert.ok(applied, 'melee hit should apply inibito');
  assert.equal(applied.target_side, 'target');
  assert.equal(applied.turns, 1);
});

test('matrice_antimagia: ranged (non-melee) hit does NOT apply inibito', () => {
  const registry = loadActiveTraitRegistry();
  const actor = { id: 'g', traits: ['matrice_antimagia'], position: { x: 0, y: 0 } };
  const target = { id: 't', traits: [], position: { x: 3, y: 0 } }; // manhattan 3 = not melee
  const out = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 1 },
    killOccurred: false,
  });
  assert.equal(
    out.status_applies.find((s) => s.stato === 'inibito'),
    undefined,
  );
});
