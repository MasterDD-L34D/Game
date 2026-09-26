// SPRINT_023: test suite per apps/backend/services/traitEffects.js
//
// Copre:
//   - evaluateAttackTraits pass 1 (damage modifiers)
//     * zampe_a_molla: trigger su mos>=5 + sopraelevato
//     * pelle_elastomera: trigger su hit, damage_delta -1
//     * trait non-definito: non triggerato
//     * trait apply_status: deferred (non triggerato in pass 1)
//   - evaluateStatusTraits pass 2 (status applications)
//     * ferocia: on_kill=true, target_side=actor, rage=3
//     * intimidatore: melee_only, target_side=target, panic=2
//     * stordimento: min_mos=8, target_side=target, stunned=1
//     * denti_seghettati: on hit, bleeding=2
//     * martello_osseo: min_mos=8, fracture=2
//     * Trigger falliti (miss, mos basso, non melee, non kill)

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  evaluateStatusTraits,
  isElevated,
} = require('../../apps/backend/services/traitEffects');

// Carica il registry reale dalla yaml
const TRAIT_REGISTRY_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'data',
  'core',
  'traits',
  'active_effects.yaml',
);
const registry = loadActiveTraitRegistry(TRAIT_REGISTRY_PATH, {
  log: () => {},
  warn: () => {},
});

// ─────────────────────────────────────────────────────────────────
// isElevated (helper)
// ─────────────────────────────────────────────────────────────────

test('isElevated: true quando actor.y > target.y', () => {
  assert.equal(isElevated({ position: { x: 0, y: 3 } }, { position: { x: 0, y: 1 } }), true);
});

test('isElevated: false quando y uguale', () => {
  assert.equal(isElevated({ position: { x: 0, y: 2 } }, { position: { x: 0, y: 2 } }), false);
});

test('isElevated: false su input null', () => {
  assert.equal(isElevated(null, { position: { x: 0, y: 0 } }), false);
  assert.equal(isElevated({ position: { x: 0, y: 0 } }, null), false);
});

// ─────────────────────────────────────────────────────────────────
// evaluateAttackTraits — pelle_elastomera (damage reduction)
// ─────────────────────────────────────────────────────────────────

function buildUnit(overrides = {}) {
  return {
    id: 'unit_test',
    hp: 10,
    max_hp: 10,
    position: { x: 0, y: 0 },
    traits: [],
    ...overrides,
  };
}

test('pelle_elastomera: hit → damage_modifier -1', () => {
  const actor = buildUnit({ id: 'a' });
  const target = buildUnit({ id: 't', traits: ['pelle_elastomera'] });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 3, pt: 0 },
  });
  assert.equal(result.damage_modifier, -1);
  const triggered = result.trait_effects.find((t) => t.trait === 'pelle_elastomera');
  assert.equal(triggered.triggered, true);
  assert.equal(triggered.effect, 'damage_reduction');
});

test('pelle_elastomera: miss → non triggerato', () => {
  const target = buildUnit({ traits: ['pelle_elastomera'] });
  const result = evaluateAttackTraits({
    registry,
    actor: buildUnit(),
    target,
    attackResult: { hit: false, mos: -5, pt: 0 },
  });
  assert.equal(result.damage_modifier, 0);
  const entry = result.trait_effects.find((t) => t.trait === 'pelle_elastomera');
  assert.equal(entry.triggered, false);
});

// ─────────────────────────────────────────────────────────────────
// evaluateAttackTraits — zampe_a_molla (altezza)
// ─────────────────────────────────────────────────────────────────

test('zampe_a_molla: mos>=5 + sopraelevato → +1 damage', () => {
  const actor = buildUnit({ traits: ['zampe_a_molla'], position: { x: 0, y: 3 } });
  const target = buildUnit({ id: 't', position: { x: 0, y: 1 } });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 5, pt: 0 },
  });
  assert.equal(result.damage_modifier, 1);
});

test('zampe_a_molla: mos<5 → non triggerato anche sopraelevato', () => {
  const actor = buildUnit({ traits: ['zampe_a_molla'], position: { x: 0, y: 3 } });
  const target = buildUnit({ id: 't', position: { x: 0, y: 1 } });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 4, pt: 0 },
  });
  assert.equal(result.damage_modifier, 0);
});

test('zampe_a_molla: mos>=5 ma non sopraelevato → non triggerato', () => {
  const actor = buildUnit({ traits: ['zampe_a_molla'], position: { x: 0, y: 1 } });
  const target = buildUnit({ id: 't', position: { x: 0, y: 1 } });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 7, pt: 0 },
  });
  assert.equal(result.damage_modifier, 0);
});

// ─────────────────────────────────────────────────────────────────
// evaluateAttackTraits — apply_status trait (deferred)
// ─────────────────────────────────────────────────────────────────

test('ferocia (apply_status): deferred nel pass 1, no damage modifier', () => {
  const actor = buildUnit({ traits: ['ferocia'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 10, pt: 0 },
  });
  assert.equal(result.damage_modifier, 0);
  const entry = result.trait_effects.find((t) => t.trait === 'ferocia');
  assert.equal(entry.triggered, false);
  assert.equal(entry.effect, 'deferred_status');
});

// ─────────────────────────────────────────────────────────────────
// evaluateAttackTraits — trait sconosciuto
// ─────────────────────────────────────────────────────────────────

test('trait sconosciuto: no triggered, no damage modifier', () => {
  const actor = buildUnit({ traits: ['trait_fantasma'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateAttackTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 5, pt: 0 },
  });
  assert.equal(result.damage_modifier, 0);
  const entry = result.trait_effects.find((t) => t.trait === 'trait_fantasma');
  assert.equal(entry.triggered, false);
});

// ─────────────────────────────────────────────────────────────────
// evaluateStatusTraits — ferocia
// ─────────────────────────────────────────────────────────────────

test("ferocia: on_kill=true + hit → applica rage 3 all'actor", () => {
  const actor = buildUnit({ traits: ['ferocia'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 5, pt: 0 },
    killOccurred: true,
  });
  assert.equal(result.status_applies.length, 1);
  assert.equal(result.status_applies[0].trait, 'ferocia');
  assert.equal(result.status_applies[0].target_side, 'actor');
  assert.equal(result.status_applies[0].stato, 'rage');
  assert.equal(result.status_applies[0].turns, 3);
});

test('ferocia: killOccurred=false → non triggerato', () => {
  const actor = buildUnit({ traits: ['ferocia'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 5, pt: 0 },
    killOccurred: false,
  });
  assert.equal(result.status_applies.length, 0);
});

test('ferocia: hit=false → non triggerato', () => {
  const actor = buildUnit({ traits: ['ferocia'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: false, mos: -2, pt: 0 },
    killOccurred: false,
  });
  assert.equal(result.status_applies.length, 0);
});

// ─────────────────────────────────────────────────────────────────
// evaluateStatusTraits — intimidatore (melee_only)
// ─────────────────────────────────────────────────────────────────

test('intimidatore: melee (dist 1) + hit → panic 2 al target', () => {
  const actor = buildUnit({ traits: ['intimidatore'], position: { x: 2, y: 2 } });
  const target = buildUnit({ id: 't', position: { x: 2, y: 3 } });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 3, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'intimidatore');
  assert.ok(apply, 'intimidatore deve essere triggerato');
  assert.equal(apply.target_side, 'target');
  assert.equal(apply.stato, 'panic');
  assert.equal(apply.turns, 2);
});

test('intimidatore: ranged (dist 2) → non triggerato', () => {
  const actor = buildUnit({ traits: ['intimidatore'], position: { x: 2, y: 2 } });
  const target = buildUnit({ id: 't', position: { x: 4, y: 2 } });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 3, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'intimidatore');
  assert.equal(apply, undefined);
});

// ─────────────────────────────────────────────────────────────────
// evaluateStatusTraits — stordimento (min_mos=8)
// ─────────────────────────────────────────────────────────────────

test('stordimento: mos>=8 → stunned 1 al target', () => {
  const actor = buildUnit({ traits: ['stordimento'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 8, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'stordimento');
  assert.ok(apply);
  assert.equal(apply.stato, 'stunned');
  assert.equal(apply.turns, 1);
});

test('stordimento: mos=7 → non triggerato', () => {
  const actor = buildUnit({ traits: ['stordimento'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 7, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'stordimento');
  assert.equal(apply, undefined);
});

// ─────────────────────────────────────────────────────────────────
// evaluateStatusTraits — denti_seghettati (bleeding)
// ─────────────────────────────────────────────────────────────────

test('denti_seghettati: hit → bleeding 2 al target', () => {
  const actor = buildUnit({ traits: ['denti_seghettati'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 1, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'denti_seghettati');
  assert.ok(apply);
  assert.equal(apply.stato, 'bleeding');
  assert.equal(apply.turns, 2);
});

// ─────────────────────────────────────────────────────────────────
// evaluateStatusTraits — martello_osseo (fracture + min_mos=8)
// ─────────────────────────────────────────────────────────────────

test('martello_osseo: critico → fracture 2 al target', () => {
  const actor = buildUnit({ traits: ['martello_osseo'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 10, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'martello_osseo');
  assert.ok(apply);
  assert.equal(apply.stato, 'fracture');
});

test('martello_osseo: mos basso → non triggerato', () => {
  const actor = buildUnit({ traits: ['martello_osseo'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 5, pt: 0 },
    killOccurred: false,
  });
  const apply = result.status_applies.find((s) => s.trait === 'martello_osseo');
  assert.equal(apply, undefined);
});

// ─────────────────────────────────────────────────────────────────
// Multiple traits combinati
// ─────────────────────────────────────────────────────────────────

test('actor con ferocia + denti_seghettati: kill → sia rage che bleeding', () => {
  const actor = buildUnit({ traits: ['ferocia', 'denti_seghettati'] });
  const target = buildUnit({ id: 't' });
  const result = evaluateStatusTraits({
    registry,
    actor,
    target,
    attackResult: { hit: true, mos: 5, pt: 0 },
    killOccurred: true,
  });
  assert.equal(result.status_applies.length, 2);
  const rage = result.status_applies.find((s) => s.stato === 'rage');
  const bleed = result.status_applies.find((s) => s.stato === 'bleeding');
  assert.ok(rage);
  assert.ok(bleed);
});
