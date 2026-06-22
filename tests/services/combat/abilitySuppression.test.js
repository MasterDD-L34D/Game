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

// ── matrice_antimagia Mode A: suppress_ability AoE (trait-granted ability) ──

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function makeAoeExec() {
  return createAbilityExecutor({
    performAttack: () => ({}),
    buildAttackEvent: () => ({}),
    buildMoveEvent: () => ({}),
    appendEvent: () => {},
    manhattanDistance: manhattan,
  });
}

test('suppress_ability (matrice_pulse): inibito to in-area enemies, AP spent', async () => {
  const exec = makeAoeExec();
  const actor = {
    id: 'golem',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    hp: 10,
    ap: 2,
    ap_remaining: 2,
    status: {},
    traits: ['matrice_antimagia'],
  };
  const near = { id: 'e1', controlled_by: 'sistema', position: { x: 1, y: 1 }, hp: 8, status: {} };
  const far = { id: 'e2', controlled_by: 'sistema', position: { x: 5, y: 5 }, hp: 8, status: {} };
  const ally = { id: 'a1', controlled_by: 'player', position: { x: 1, y: 0 }, hp: 8, status: {} };
  const session = {
    units: [actor, near, far, ally],
    grid: { width: 6 },
    events: [],
    turn: 1,
    session_id: 't',
  };
  const res = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'matrice_pulse', position: { x: 1, y: 1 } },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(Number(near.status.inibito), 2, 'in-area enemy inhibited 2 turns');
  assert.equal(Number(far.status.inibito || 0), 0, 'far enemy not inhibited');
  assert.equal(Number(ally.status.inibito || 0), 0, 'same-faction ally not inhibited');
  assert.equal(actor.ap_remaining, 0, 'spent 2 AP');
});

test('suppress_ability: an inhibited matrice carrier cannot pulse (guard precedes)', async () => {
  const exec = makeAoeExec();
  const actor = {
    id: 'golem',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    hp: 10,
    ap: 2,
    ap_remaining: 2,
    status: { inibito: 1 },
    traits: ['matrice_antimagia'],
  };
  const enemy = { id: 'e1', controlled_by: 'sistema', position: { x: 1, y: 1 }, hp: 8, status: {} };
  const session = {
    units: [actor, enemy],
    grid: { width: 6 },
    events: [],
    turn: 1,
    session_id: 't',
  };
  const res = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'matrice_pulse', position: { x: 1, y: 1 } },
  });
  assert.equal(res.body.reason, 'inibito');
  assert.equal(Number(enemy.status.inibito || 0), 0, 'no pulse when the caster is inhibited');
});

// ── apply_status as a trait-granted ability (un-dormants spore_burst etc.) ──

test('apply_status (spore_burst): applies its status to the target', async () => {
  const exec = makeAoeExec();
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    hp: 10,
    ap: 2,
    ap_remaining: 2,
    status: {},
    traits: ['spore_psichiche_silenziate'],
  };
  const enemy = { id: 'e1', controlled_by: 'sistema', position: { x: 1, y: 0 }, hp: 8, status: {} };
  const session = {
    units: [actor, enemy],
    grid: { width: 6 },
    events: [],
    turn: 1,
    session_id: 't',
  };
  const res = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'spore_burst', target_id: 'e1' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(Number(enemy.status.disorient) > 0, 'target got disorient');
  assert.equal(actor.ap_remaining, 0, 'spent 2 AP');
});

test('apply_status: rejects a same-faction target (respects ability.target=enemy)', async () => {
  const exec = makeAoeExec();
  const actor = {
    id: 'a',
    controlled_by: 'player',
    position: { x: 0, y: 0 },
    hp: 10,
    ap: 2,
    ap_remaining: 2,
    status: {},
    traits: ['spore_psichiche_silenziate'],
  };
  const ally = { id: 'a2', controlled_by: 'player', position: { x: 1, y: 0 }, hp: 8, status: {} };
  const session = { units: [actor, ally], grid: { width: 6 }, events: [], turn: 1, session_id: 't' };
  const res = await exec.executeAbility({
    session,
    actor,
    body: { ability_id: 'spore_burst', target_id: 'a2' },
  });
  assert.equal(res.status, 400, 'enemy-target ability must reject an ally target');
  assert.equal(Number(ally.status.disorient || 0), 0, 'ally not debuffed');
  assert.equal(actor.ap_remaining, 2, 'no AP spent on a rejected target');
});
