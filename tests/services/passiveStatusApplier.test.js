// Sprint 13 — Status engine wave A passive ancestor producer.
//
// Tests producer side: scan unit.traits, find passive apply_status entries
// with Wave A status, set unit.status[stato]. Consumer side
// (statusModifiers.js) tested separately.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  applyPassiveAncestors,
  applyPassiveAncestorsToRoster,
  passiveStatusSpec,
  collectTraitIds,
  WAVE_A_STATUSES,
  PASSIVE_BLOCKLIST,
  PASSIVE_DEFAULT_TURNS,
} = require('../../apps/backend/services/combat/passiveStatusApplier');

const PASSIVE_LINKED_TRAIT = {
  trigger: { action_type: 'passive' },
  effect: { kind: 'apply_status', stato: 'linked', turns: 5 },
  applies_to: 'actor',
};
const PASSIVE_FED_TRAIT = {
  trigger: { action_type: 'passive' },
  effect: { kind: 'apply_status', stato: 'fed' }, // no turns → default 99
  applies_to: 'actor',
};
const PASSIVE_FRENZY_TRAIT = {
  trigger: { action_type: 'passive' },
  effect: { kind: 'apply_status', stato: 'frenzy', turns: 99 },
  applies_to: 'actor',
};
const ATTACK_TRAIT = {
  trigger: { action_type: 'attack' },
  effect: { kind: 'apply_status', stato: 'linked', turns: 2 },
  applies_to: 'actor',
};
const NON_STATUS_PASSIVE = {
  trigger: { action_type: 'passive' },
  effect: { kind: 'damage_reduction', amount: 1 },
  applies_to: 'target',
};
const UNKNOWN_STATUS_PASSIVE = {
  trigger: { action_type: 'passive' },
  effect: { kind: 'apply_status', stato: 'unknown_stato_xyz', turns: 5 },
  applies_to: 'actor',
};

const REGISTRY = {
  linked_passive: PASSIVE_LINKED_TRAIT,
  fed_passive: PASSIVE_FED_TRAIT,
  frenzy_passive: PASSIVE_FRENZY_TRAIT,
  linked_attack: ATTACK_TRAIT,
  damage_red_passive: NON_STATUS_PASSIVE,
  unknown_passive: UNKNOWN_STATUS_PASSIVE,
};

describe('WAVE_A_STATUSES + PASSIVE_BLOCKLIST', () => {
  test('canonical 7 statuses defined', () => {
    const expected = ['linked', 'fed', 'healing', 'attuned', 'sensed', 'telepatic_link', 'frenzy'];
    for (const s of expected) {
      assert.ok(WAVE_A_STATUSES.has(s), `${s} should be in Wave A`);
    }
    assert.equal(WAVE_A_STATUSES.size, 7);
  });

  test('frenzy in PASSIVE_BLOCKLIST (rage variant, never auto-permanent)', () => {
    assert.ok(PASSIVE_BLOCKLIST.has('frenzy'));
  });

  test('PASSIVE_DEFAULT_TURNS = 99 (effectively permanent)', () => {
    assert.equal(PASSIVE_DEFAULT_TURNS, 99);
  });
});

describe('collectTraitIds', () => {
  test('string array → ids', () => {
    assert.deepEqual(collectTraitIds({ traits: ['a', 'b', 'c'] }), ['a', 'b', 'c']);
  });
  test('object array with .id → ids', () => {
    const out = collectTraitIds({ traits: [{ id: 'x' }, { id: 'y' }] });
    assert.deepEqual(out, ['x', 'y']);
  });
  test('mixed array tolerated', () => {
    const out = collectTraitIds({ traits: ['a', { id: 'b' }, '', null, { id: '' }, undefined] });
    assert.deepEqual(out, ['a', 'b']);
  });
  test('null/undefined/non-object → []', () => {
    assert.deepEqual(collectTraitIds(null), []);
    assert.deepEqual(collectTraitIds(undefined), []);
    assert.deepEqual(collectTraitIds({ traits: null }), []);
    assert.deepEqual(collectTraitIds({}), []);
  });
});

describe('passiveStatusSpec', () => {
  test('passive + apply_status + Wave A → spec', () => {
    const out = passiveStatusSpec(PASSIVE_LINKED_TRAIT);
    assert.deepEqual(out, { stato: 'linked', turns: 5, applies_to: 'actor' });
  });

  test('passive + apply_status + missing turns → default 99', () => {
    const out = passiveStatusSpec(PASSIVE_FED_TRAIT);
    assert.equal(out.turns, PASSIVE_DEFAULT_TURNS);
  });

  test('attack-trigger → null (not passive)', () => {
    assert.equal(passiveStatusSpec(ATTACK_TRAIT), null);
  });

  test('passive + non-apply_status effect → null', () => {
    assert.equal(passiveStatusSpec(NON_STATUS_PASSIVE), null);
  });

  test('passive + apply_status + unknown stato → null (not Wave A)', () => {
    assert.equal(passiveStatusSpec(UNKNOWN_STATUS_PASSIVE), null);
  });

  test('frenzy in PASSIVE_BLOCKLIST → null even if passive (safety)', () => {
    assert.equal(passiveStatusSpec(PASSIVE_FRENZY_TRAIT), null);
  });

  test('null/undefined definition → null', () => {
    assert.equal(passiveStatusSpec(null), null);
    assert.equal(passiveStatusSpec(undefined), null);
    assert.equal(passiveStatusSpec({}), null);
  });
});

describe('applyPassiveAncestors', () => {
  test('canonical: passive linked trait → unit.status.linked = 5', () => {
    const unit = { id: 'u1', traits: ['linked_passive'] };
    const events = applyPassiveAncestors(unit, REGISTRY);
    assert.equal(unit.status.linked, 5);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
      unit_id: 'u1',
      trait: 'linked_passive',
      stato: 'linked',
      turns_set: 5,
      source: 'passive_ancestor',
    });
  });

  test('multiple passives same unit → all applied', () => {
    const unit = { id: 'u1', traits: ['linked_passive', 'fed_passive'] };
    applyPassiveAncestors(unit, REGISTRY);
    assert.equal(unit.status.linked, 5);
    assert.equal(unit.status.fed, PASSIVE_DEFAULT_TURNS);
  });

  test('attack-trigger trait skipped (only passives applied)', () => {
    const unit = { id: 'u1', traits: ['linked_attack'] };
    const events = applyPassiveAncestors(unit, REGISTRY);
    assert.deepEqual(events, []);
    assert.equal(unit.status?.linked || 0, 0);
  });

  test('frenzy in blocklist not applied even if YAML authors as passive', () => {
    const unit = { id: 'u1', traits: ['frenzy_passive'] };
    const events = applyPassiveAncestors(unit, REGISTRY);
    assert.deepEqual(events, []);
    assert.equal(unit.status?.frenzy || 0, 0);
  });

  test('idempotent: re-apply does not bump above existing higher value', () => {
    const unit = { id: 'u1', traits: ['linked_passive'], status: { linked: 99 } };
    const events = applyPassiveAncestors(unit, REGISTRY);
    assert.equal(unit.status.linked, 99); // not lowered to 5
    assert.deepEqual(events, []);
  });

  test('refresh: re-apply bumps lower value back to spec turns', () => {
    const unit = { id: 'u1', traits: ['linked_passive'], status: { linked: 2 } };
    const events = applyPassiveAncestors(unit, REGISTRY);
    assert.equal(unit.status.linked, 5);
    assert.equal(events.length, 1);
  });

  test('unknown trait id silently skipped', () => {
    const unit = { id: 'u1', traits: ['unknown_trait_xyz'] };
    const events = applyPassiveAncestors(unit, REGISTRY);
    assert.deepEqual(events, []);
  });

  test('empty traits → no events', () => {
    const unit = { id: 'u1', traits: [] };
    assert.deepEqual(applyPassiveAncestors(unit, REGISTRY), []);
  });

  test('missing unit / registry / both → []', () => {
    assert.deepEqual(applyPassiveAncestors(null, REGISTRY), []);
    assert.deepEqual(applyPassiveAncestors({ id: 'u' }, null), []);
    assert.deepEqual(applyPassiveAncestors(null, null), []);
  });

  test('initializes unit.status if missing', () => {
    const unit = { id: 'u1', traits: ['linked_passive'] };
    applyPassiveAncestors(unit, REGISTRY);
    assert.ok(unit.status && typeof unit.status === 'object');
  });
});

describe('applyPassiveAncestorsToRoster', () => {
  test('iterates roster, returns flat events array', () => {
    const units = [
      { id: 'a', traits: ['linked_passive'] },
      { id: 'b', traits: ['fed_passive'] },
      { id: 'c', traits: [] },
    ];
    const events = applyPassiveAncestorsToRoster(units, REGISTRY);
    assert.equal(events.length, 2);
    const ids = events.map((e) => e.unit_id).sort();
    assert.deepEqual(ids, ['a', 'b']);
  });

  test('null/undefined roster → []', () => {
    assert.deepEqual(applyPassiveAncestorsToRoster(null, REGISTRY), []);
    assert.deepEqual(applyPassiveAncestorsToRoster(undefined, REGISTRY), []);
  });

  test('skips null/garbage entries gracefully', () => {
    const units = [null, { id: 'a', traits: ['linked_passive'] }, undefined, {}];
    const events = applyPassiveAncestorsToRoster(units, REGISTRY);
    assert.equal(events.length, 1);
    assert.equal(events[0].unit_id, 'a');
  });
});
