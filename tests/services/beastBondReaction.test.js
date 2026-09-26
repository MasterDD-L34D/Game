// Unit tests for Beast Bond reaction trigger (Sprint 6, AncientBeast Tier S #6).
//
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #6 line 230.
// Module: apps/backend/services/combat/beastBondReaction.js

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkBeastBondReactions,
  applyBeastBondReactions,
  buildBeastBondEvents,
} = require('../../apps/backend/services/combat/beastBondReaction');

const REGISTRY = {
  legame_di_branco: {
    triggers_on_ally_attack: {
      range: 1,
      species_filter: 'same',
      atk_delta: 1,
      def_delta: 1,
      duration: 1,
      log_tag: 'legame_di_branco_triggered',
    },
  },
  spirito_combattivo: {
    triggers_on_ally_attack: {
      range: 1,
      species_filter: 'any',
      atk_delta: 1,
      def_delta: 0,
      duration: 1,
      log_tag: 'spirito_combattivo_triggered',
    },
  },
  pack_tactics: {
    triggers_on_ally_attack: {
      range: 1,
      species_filter: 'pack:predoni_nomadi',
      atk_delta: 1,
      def_delta: 1,
      duration: 2,
      log_tag: 'pack_tactics_triggered',
    },
  },
  inert_trait: {
    // No triggers_on_ally_attack — must be ignored.
    description_it: 'placeholder',
  },
};

function unit(overrides) {
  return {
    id: 'u',
    species: 'predoni_nomadi',
    controlled_by: 'sistema',
    hp: 5,
    position: { x: 0, y: 0 },
    traits: [],
    status: {},
    attack_mod_bonus: 0,
    defense_mod_bonus: 0,
    ...overrides,
  };
}

test('no trigger when no ally has the trait', () => {
  const attacker = unit({ id: 'A', position: { x: 0, y: 0 } });
  const ally = unit({ id: 'B', position: { x: 1, y: 0 }, traits: ['inert_trait'] });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  assert.equal(reactions.length, 0);
});

test('trigger on adjacent ally (Manhattan=1) with `any` filter', () => {
  const attacker = unit({ id: 'A', position: { x: 0, y: 0 }, species: 'foo' });
  const ally = unit({
    id: 'B',
    position: { x: 1, y: 0 },
    species: 'bar',
    traits: ['spirito_combattivo'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].holder_id, 'B');
  assert.equal(reactions[0].trait_id, 'spirito_combattivo');
  assert.equal(reactions[0].effect.atk_delta, 1);
  assert.equal(reactions[0].effect.def_delta, 0);
});

test('range fail: ally at Manhattan=2 does NOT trigger range=1 trait', () => {
  const attacker = unit({ id: 'A', position: { x: 0, y: 0 } });
  const ally = unit({
    id: 'B',
    position: { x: 2, y: 0 },
    traits: ['legame_di_branco'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  assert.equal(reactions.length, 0);
});

test('species filter `same`: only same-species ally triggers', () => {
  const attacker = unit({ id: 'A', species: 'predoni_nomadi', position: { x: 0, y: 0 } });
  const sameSpeciesAlly = unit({
    id: 'B',
    species: 'predoni_nomadi',
    position: { x: 1, y: 0 },
    traits: ['legame_di_branco'],
  });
  const otherSpeciesAlly = unit({
    id: 'C',
    species: 'erbivoro',
    position: { x: 0, y: 1 },
    traits: ['legame_di_branco'],
  });
  const reactions = checkBeastBondReactions(
    attacker,
    [attacker, sameSpeciesAlly, otherSpeciesAlly],
    REGISTRY,
  );
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].holder_id, 'B');
});

test('species filter `pack:predoni_nomadi`: only that species triggers it', () => {
  const attacker = unit({ id: 'A', species: 'predoni_nomadi', position: { x: 0, y: 0 } });
  const allyPack = unit({
    id: 'B',
    species: 'erbivoro',
    position: { x: 1, y: 0 },
    traits: ['pack_tactics'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, allyPack], REGISTRY);
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].trait_id, 'pack_tactics');
  // Same scenario but attacker is wrong species → no trigger.
  const wrongAttacker = unit({ id: 'A', species: 'erbivoro', position: { x: 0, y: 0 } });
  const r2 = checkBeastBondReactions(wrongAttacker, [wrongAttacker, allyPack], REGISTRY);
  assert.equal(r2.length, 0);
});

test('enemies ignored even when adjacent + carrying trait', () => {
  const attacker = unit({ id: 'A', controlled_by: 'sistema', position: { x: 0, y: 0 } });
  const enemy = unit({
    id: 'X',
    controlled_by: 'player',
    position: { x: 1, y: 0 },
    traits: ['spirito_combattivo'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, enemy], REGISTRY);
  assert.equal(reactions.length, 0);
});

test('dead ally (hp=0) does NOT trigger', () => {
  const attacker = unit({ id: 'A', position: { x: 0, y: 0 } });
  const deadAlly = unit({
    id: 'B',
    hp: 0,
    position: { x: 1, y: 0 },
    traits: ['spirito_combattivo'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, deadAlly], REGISTRY);
  assert.equal(reactions.length, 0);
});

test('apply mutates holder bonuses + arms status[*_buff] for decay', () => {
  const attacker = unit({ id: 'A', species: 'predoni_nomadi' });
  const ally = unit({
    id: 'B',
    species: 'predoni_nomadi',
    position: { x: 1, y: 0 },
    traits: ['legame_di_branco'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  applyBeastBondReactions(reactions);
  assert.equal(ally.attack_mod_bonus, 1);
  assert.equal(ally.defense_mod_bonus, 1);
  assert.equal(ally.status.attack_mod_buff, 1);
  assert.equal(ally.status.defense_mod_buff, 1);
  assert.equal(reactions[0].applied, true);
});

test('cumulative: two reaction sources stack on same holder', () => {
  const attacker = unit({ id: 'A', species: 'predoni_nomadi' });
  // Holder carries BOTH legame_di_branco + spirito_combattivo → two reactions.
  const ally = unit({
    id: 'B',
    species: 'predoni_nomadi',
    position: { x: 1, y: 0 },
    traits: ['legame_di_branco', 'spirito_combattivo'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  assert.equal(reactions.length, 2);
  applyBeastBondReactions(reactions);
  // legame_di_branco: +1 atk +1 def. spirito_combattivo: +1 atk +0 def.
  assert.equal(ally.attack_mod_bonus, 2);
  assert.equal(ally.defense_mod_bonus, 1);
});

test('duration 2 sets status to higher value via Math.max', () => {
  const attacker = unit({ id: 'A', species: 'predoni_nomadi' });
  const ally = unit({
    id: 'B',
    species: 'erbivoro',
    position: { x: 1, y: 0 },
    traits: ['pack_tactics'],
    status: { attack_mod_buff: 1 }, // pre-existing 1-turn buff
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  applyBeastBondReactions(reactions);
  // pack_tactics duration=2 wins over pre-existing 1.
  assert.equal(ally.status.attack_mod_buff, 2);
  assert.equal(ally.status.defense_mod_buff, 2);
});

test('buildBeastBondEvents emits one event per applied reaction', () => {
  const attacker = unit({ id: 'A', species: 'predoni_nomadi' });
  const ally = unit({
    id: 'B',
    species: 'predoni_nomadi',
    position: { x: 1, y: 0 },
    traits: ['legame_di_branco'],
  });
  const reactions = checkBeastBondReactions(attacker, [attacker, ally], REGISTRY);
  applyBeastBondReactions(reactions);
  const events = buildBeastBondEvents(reactions, attacker, {
    session_id: 's1',
    turn: 3,
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].action_type, 'beast_bond_triggered');
  assert.equal(events[0].actor_id, 'A');
  assert.equal(events[0].ally_id, 'B');
  assert.equal(events[0].trait_id, 'legame_di_branco');
  assert.equal(events[0].turn, 3);
  assert.equal(events[0].log_tag, 'legame_di_branco_triggered');
});
