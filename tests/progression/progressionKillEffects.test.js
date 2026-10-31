'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  applyPerkKillEffects,
} = require('../../apps/backend/services/progression/progressionApply');

// Category B (TKT-JOB-PHASEC) — on-kill attack buffs. applyPerkKillEffects(actor)
// mutates the killer in place and returns { applied }.
//
// Decay model (verified sessionRoundBridge.js ~1704): when status.attack_mod_buff
// decrements to <= 0 the bridge blanket-zeros attack_mod_bonus. So the temporary
// buff rides attack_mod_bonus + status.attack_mod_buff (decays); the permanent
// buff rides actor.mod (base stat, never decayed). resolveAttack sums
// mod + attack_mod_bonus, so both reach the d20 roll.

test('applyPerkKillEffects: kill_buff_attack adds temporary attack_mod_bonus + arms decay', () => {
  const actor = {
    id: 'st',
    mod: 3,
    _perk_passives: [
      {
        tag: 'kill_buff_attack',
        payload: { attack_mod: 2, duration: 2 },
        source_perk_id: 'st_r5_killer_focus',
      },
    ],
  };
  const res = applyPerkKillEffects(actor);
  assert.strictEqual(actor.attack_mod_bonus, 2, 'temporary bonus added');
  assert.strictEqual(actor.status.attack_mod_buff, 2, 'decay counter armed to duration');
  assert.strictEqual(actor.mod, 3, 'base mod untouched for the temporary buff');
  assert.strictEqual(res.applied.length, 1);
  assert.strictEqual(res.applied[0].tag, 'kill_buff_attack');
});

test('applyPerkKillEffects: kill_buff_attack stacks bonus and refreshes decay to the longer window', () => {
  const actor = {
    id: 'st',
    mod: 0,
    attack_mod_bonus: 1,
    status: { attack_mod_buff: 1 },
    _perk_passives: [
      {
        tag: 'kill_buff_attack',
        payload: { attack_mod: 2, duration: 2 },
        source_perk_id: 'st_r5_killer_focus',
      },
    ],
  };
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.attack_mod_bonus, 3, 'bonus stacks (1 + 2)');
  assert.strictEqual(actor.status.attack_mod_buff, 2, 'decay refreshed to max(1,2)');
});

test('applyPerkKillEffects: eternal_kill_buff adds permanent base mod, no decay counter', () => {
  const actor = {
    id: 'st',
    mod: 3,
    _perk_passives: [
      {
        tag: 'eternal_kill_buff',
        payload: { attack_mod: 2 },
        source_perk_id: 'st_r6_eternal_hunt',
      },
    ],
  };
  const res = applyPerkKillEffects(actor);
  assert.strictEqual(actor.mod, 5, 'permanent base mod bump (3 + 2)');
  assert.strictEqual(actor.attack_mod_bonus, undefined, 'no temporary accumulator used');
  assert.strictEqual(
    actor.status?.attack_mod_buff,
    undefined,
    'no decay counter armed (permanent)',
  );
  assert.strictEqual(res.applied[0].tag, 'eternal_kill_buff');
  assert.strictEqual(res.applied[0].mode, 'permanent');
});

test('applyPerkKillEffects: eternal_kill_buff accumulates across kills (no decay)', () => {
  const actor = {
    id: 'st',
    mod: 1,
    _perk_passives: [{ tag: 'eternal_kill_buff', payload: { attack_mod: 2 }, source_perk_id: 'e' }],
  };
  applyPerkKillEffects(actor);
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.mod, 5, 'two kills -> +2 +2 permanent (1 -> 5)');
});

test('applyPerkKillEffects: eternal supersedes kill_buff when an actor has both', () => {
  const actor = {
    id: 'st',
    mod: 4,
    _perk_passives: [
      { tag: 'kill_buff_attack', payload: { attack_mod: 2, duration: 2 }, source_perk_id: 'k' },
      { tag: 'eternal_kill_buff', payload: { attack_mod: 2 }, source_perk_id: 'e' },
    ],
  };
  const res = applyPerkKillEffects(actor);
  assert.strictEqual(actor.mod, 6, 'eternal applied to base mod');
  assert.strictEqual(
    actor.attack_mod_bonus,
    undefined,
    'temporary buff skipped when eternal present',
  );
  assert.strictEqual(res.applied.length, 1, 'only eternal recorded');
  assert.strictEqual(res.applied[0].tag, 'eternal_kill_buff');
});

test('applyPerkKillEffects: no passives = no mutation, empty applied', () => {
  const actor = { id: 'plain', mod: 2 };
  const res = applyPerkKillEffects(actor);
  assert.strictEqual(actor.mod, 2);
  assert.strictEqual(actor.attack_mod_bonus, undefined);
  assert.strictEqual(res.applied.length, 0);
});

test('applyPerkKillEffects: unrelated passive is ignored', () => {
  const actor = {
    id: 'st',
    mod: 2,
    _perk_passives: [{ tag: 'flank_bonus', payload: { damage: 2 }, source_perk_id: 'x' }],
  };
  const res = applyPerkKillEffects(actor);
  assert.strictEqual(actor.mod, 2);
  assert.strictEqual(res.applied.length, 0);
});
