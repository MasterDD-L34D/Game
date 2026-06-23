// tests/services/combat/membraneOsmotiche.test.js
//
// membrane_osmotiche (creature-trait mechanics slice 5, trait 7 -- otyugh).
// Spec: docs/superpowers/specs/2026-06-22-creature-trait-mechanics-design.md
//   duration_absorb: incoming status durations -1 on apply. (The turn-start
//   adjacent-water/bog heal is DEFERRED -- the per-tile terrain substrate does
//   not exist; see the slice-5 PR.)
// Real-module tests (CommonJS), CI-gated via tests/services/*/*.test.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  absorbStatusDuration,
  hasTrait,
  MEMBRANE_TRAIT,
  ABSORB,
} = require('../../../apps/backend/services/combat/membraneOsmotiche');

test('a membrane carrier absorbs 1 turn off an incoming status duration', () => {
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 3 }), 2);
  assert.equal(absorbStatusDuration({ target: u, turns: 2 }), 1);
});

test('a 1-turn status is fully absorbed (reduced to 0 -> does not land)', () => {
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 1 }), 0);
});

test('absorb never goes negative', () => {
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 0 }), 0);
});

test('a non-carrier passes the duration through unchanged', () => {
  const u = { traits: ['other'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 3 }), 3);
  assert.equal(absorbStatusDuration({ target: { traits: [] }, turns: 3 }), 3);
});

test('tolerant of null target / non-numeric turns', () => {
  assert.equal(absorbStatusDuration({ target: null, turns: 3 }), 3);
  const u = { traits: ['membrane_osmotiche'] };
  assert.equal(absorbStatusDuration({ target: u, turns: 'x' }), 'x', 'non-numeric returned as-is');
});

test('tolerates object-shaped traits {id}', () => {
  const u = { traits: [{ id: 'membrane_osmotiche' }] };
  assert.equal(absorbStatusDuration({ target: u, turns: 2 }), 1);
});

test('hasTrait + constants', () => {
  assert.equal(hasTrait({ traits: ['membrane_osmotiche'] }, MEMBRANE_TRAIT), true);
  assert.equal(MEMBRANE_TRAIT, 'membrane_osmotiche');
  assert.equal(ABSORB, 1);
});
