// OD-024 ai-station 2026-05-14 — interoception traits runtime test.
//
// Validates the 4 RFC sentience v0.1 traits (added to active_effects.yaml
// in this PR) ACTUALLY fire end-to-end through traitEffects.js pipeline,
// not just exist in YAML. Closes Agent #1 review CONCERN P2:
//   - propriocezione `kind: attack_bonus` requires new handler (added).
//   - nocicezione `requires: ferito` requires new actor-status gate (added).

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const yaml = require('js-yaml');

const traitEffects = require('../../apps/backend/services/traitEffects');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ACTIVE_EFFECTS = yaml.load(
  fs.readFileSync(path.join(REPO_ROOT, 'data', 'core', 'traits', 'active_effects.yaml'), 'utf8'),
);

// Build a minimal registry covering only the 4 interoception traits, suitable
// for evaluateAttackTraits which expects { trait_id: definition } map.
const REGISTRY = {
  propriocezione: ACTIVE_EFFECTS.traits.propriocezione,
  equilibrio_vestibolare: ACTIVE_EFFECTS.traits.equilibrio_vestibolare,
  nocicezione: ACTIVE_EFFECTS.traits.nocicezione,
  termocezione: ACTIVE_EFFECTS.traits.termocezione,
};

function _trait(id) {
  return ACTIVE_EFFECTS.traits[id];
}

function _actor(traits = [], status = {}) {
  return { id: 'actor-1', traits, status, x: 0, y: 0 };
}

function _target(traits = [], status = {}) {
  return { id: 'target-1', traits, status, x: 1, y: 0 };
}

function _hit(mos = 5) {
  return { hit: true, mos, result: 'hit' };
}

function _findEffect(result, traitId) {
  return (result.trait_effects || []).find((e) => e.trait === traitId);
}

describe('OD-024 propriocezione — attack_bonus kind handler', () => {
  test('definition uses attack_bonus kind', () => {
    const def = _trait('propriocezione');
    assert.ok(def, 'propriocezione defined in active_effects.yaml');
    assert.equal(def.effect.kind, 'attack_bonus');
    assert.equal(def.effect.amount, 1);
  });

  test('fires on actor attack +1 damage_modifier', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['propriocezione']),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 1, 'attack_bonus must add +1 damage');
    const fx = _findEffect(result, 'propriocezione');
    assert.ok(fx);
    assert.equal(fx.triggered, true);
    assert.equal(fx.effect, 'proprioception_balance');
  });

  test('does NOT fire when applies_to=actor + trait on target side', () => {
    // propriocezione is actor-side. Putting it on target should NOT trigger.
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(),
      target: _target(['propriocezione']),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 0);
  });
});

describe('OD-024 nocicezione — requires:ferito gate', () => {
  test('definition uses requires:ferito + extra_damage kind', () => {
    const def = _trait('nocicezione');
    assert.ok(def);
    assert.equal(def.trigger.requires, 'ferito');
    assert.equal(def.effect.kind, 'extra_damage');
  });

  test('blocks when actor NOT ferito (gate active)', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['nocicezione'], {}),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 0, 'must NOT fire without ferito');
  });

  test('fires when actor.status.ferito = true (Dict pattern)', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['nocicezione'], { ferito: true }),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 1);
    const fx = _findEffect(result, 'nocicezione');
    assert.equal(fx.effect, 'nociception_reactive');
  });

  test('fires when actor.status.ferito = {turns:2}', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['nocicezione'], { ferito: { turns: 2 } }),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 1);
  });

  test('blocks when actor.status.ferito = {turns:0} (expired)', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['nocicezione'], { ferito: { turns: 0 } }),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 0);
  });

  test('fires when actor.status is Array containing ferito', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['nocicezione'], ['ferito', 'stordito']),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 1, 'Array status pattern supported');
  });
});

describe('OD-024 equilibrio_vestibolare + termocezione — damage_reduction', () => {
  test('equilibrio_vestibolare on target hit reduces damage', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(),
      target: _target(['equilibrio_vestibolare']),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, -1);
    const fx = _findEffect(result, 'equilibrio_vestibolare');
    assert.equal(fx.effect, 'vestibular_advantage');
  });

  test('termocezione on target hit reduces damage', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(),
      target: _target(['termocezione']),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, -1);
    const fx = _findEffect(result, 'termocezione');
    assert.equal(fx.effect, 'thermoception_resist');
  });
});

describe('OD-024 traits — registry sanity', () => {
  test('all 4 interoception traits present, T1 sensoriale', () => {
    const required = ['propriocezione', 'equilibrio_vestibolare', 'nocicezione', 'termocezione'];
    for (const id of required) {
      assert.ok(_trait(id), `${id} present`);
      assert.equal(_trait(id).tier, 'T1');
      assert.equal(_trait(id).category, 'sensoriale');
    }
  });

  test('combined: actor with propriocezione + nocicezione (ferito) stacks +2', () => {
    const result = traitEffects.evaluateAttackTraits({
      registry: REGISTRY,
      actor: _actor(['propriocezione', 'nocicezione'], { ferito: true }),
      target: _target(),
      attackResult: _hit(),
    });
    assert.equal(result.damage_modifier, 2, 'both attack-side traits stack');
  });
});
