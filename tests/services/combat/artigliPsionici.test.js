// tests/services/combat/artigliPsionici.test.js
//
// artigli_psionici (creature-trait mechanics slice 4, trait 2 -- rakshasa).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   "read-the-prey": on a melee hit, the carrier marks its target
//   (lettura_preda) -> thereafter the carrier gains a stacking damage_reduction
//   (cap 3) ONLY when it defends against that SAME target. Source-predicated DR.
//   Marker is per-(carrier,prey), stored off-status (no round decay) -- learned
//   for the encounter.
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  markPrey,
  computeArtigliDR,
  hasTrait,
  ARTIGLI_TRAIT,
  ARTIGLI_CAP,
} = require('../../../apps/backend/services/combat/artigliPsionici');

// ─── markPrey (the SET side, called on the carrier's melee hit) ──────────────

test('markPrey: first mark sets stack 1, increments per hit, caps at ARTIGLI_CAP', () => {
  const carrier = { id: 'rak' };
  assert.equal(markPrey(carrier, 'prey'), 1);
  assert.equal(markPrey(carrier, 'prey'), 2);
  assert.equal(markPrey(carrier, 'prey'), 3);
  assert.equal(markPrey(carrier, 'prey'), 3, 'does not exceed the cap');
  assert.equal(carrier._lettura_preda.prey, 3);
});

test('markPrey: stacks are per-target (independent prey)', () => {
  const carrier = { id: 'rak' };
  markPrey(carrier, 'preyA');
  markPrey(carrier, 'preyA');
  markPrey(carrier, 'preyB');
  assert.equal(carrier._lettura_preda.preyA, 2);
  assert.equal(carrier._lettura_preda.preyB, 1);
});

test('markPrey: tolerant of a null carrier', () => {
  assert.equal(markPrey(null, 'prey'), 0);
});

// ─── computeArtigliDR (the READ side, at the carrier's damage-mitigation step) ─

test('computeArtigliDR: returns the stack vs the marked attacker, 0 otherwise', () => {
  const carrier = { id: 'rak' };
  markPrey(carrier, 'preyA');
  markPrey(carrier, 'preyA'); // 2 stacks vs preyA
  assert.equal(computeArtigliDR(carrier, 'preyA'), 2, 'DR vs the read prey');
  assert.equal(computeArtigliDR(carrier, 'preyB'), 0, 'no DR vs an unmarked attacker');
});

test('computeArtigliDR: 0 when the defender has no marker map', () => {
  assert.equal(computeArtigliDR({ id: 'x' }, 'whoever'), 0);
  assert.equal(computeArtigliDR(null, 'whoever'), 0);
});

test('computeArtigliDR: never exceeds the cap', () => {
  const carrier = { id: 'rak', _lettura_preda: { prey: 99 } };
  assert.equal(computeArtigliDR(carrier, 'prey'), ARTIGLI_CAP);
});

// ─── the two-direction integration (the bug-prone role inversion) ─────────────

test('read-the-prey direction: carrier marks while attacking, DR fires while it defends', () => {
  // The carrier attacks the prey twice (marking it), then the prey counter-attacks:
  // the carrier (now defending) gets DR vs that prey only.
  const carrier = { id: 'rak' };
  const prey = { id: 'goblin' };
  markPrey(carrier, prey.id); // hit 1
  markPrey(carrier, prey.id); // hit 2
  // prey now attacks the carrier -> DR predicated on the attacker's id:
  assert.equal(computeArtigliDR(carrier, prey.id), 2);
  // an unrelated attacker gets nothing:
  assert.equal(computeArtigliDR(carrier, 'other_wolf'), 0);
});

// ─── hasTrait + constants ─────────────────────────────────────────────────────

test('hasTrait: string and object trait arrays', () => {
  assert.equal(hasTrait({ traits: ['artigli_psionici'] }, ARTIGLI_TRAIT), true);
  assert.equal(hasTrait({ traits: [{ id: 'artigli_psionici' }] }, ARTIGLI_TRAIT), true);
  assert.equal(hasTrait({ traits: ['other'] }, ARTIGLI_TRAIT), false);
  assert.equal(hasTrait(null, ARTIGLI_TRAIT), false);
});

test('constants', () => {
  assert.equal(ARTIGLI_TRAIT, 'artigli_psionici');
  assert.equal(ARTIGLI_CAP, 3);
});
