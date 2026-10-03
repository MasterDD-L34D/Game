'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sf = require('../../apps/backend/services/combat/staminaFatigue');

const FLAG_ON = { STAMINA_FATIGUE_ENABLED: 'true' };
const FLAG_OFF = {};

test('isFatigueEnabled: only "true" enables', () => {
  assert.equal(sf.isFatigueEnabled(FLAG_ON), true);
  assert.equal(sf.isFatigueEnabled(FLAG_OFF), false);
  assert.equal(sf.isFatigueEnabled({ STAMINA_FATIGUE_ENABLED: '1' }), false);
});

test('isSprintRound: all AP on movement + >=2 tiles', () => {
  assert.equal(sf.isSprintRound({ ap: 2, ap_remaining: 0, _tiles_voluntary_round: 2 }), true);
  // partial move (AP left) -> not a sprint
  assert.equal(sf.isSprintRound({ ap: 2, ap_remaining: 1, _tiles_voluntary_round: 1 }), false);
  // 0 AP but <2 tiles (e.g. AP spent elsewhere) -> not a sprint
  assert.equal(sf.isSprintRound({ ap: 2, ap_remaining: 0, _tiles_voluntary_round: 1 }), false);
});

test('accrueOrDecay: sprint -> +1, resets tally', () => {
  const u = { fatica: 0, ap_remaining: 0, ap: 2, _tiles_voluntary_round: 2 };
  sf.accrueOrDecay(u);
  assert.equal(u.fatica, 1);
  assert.equal(u._tiles_voluntary_round, 0);
});

test('accrueOrDecay: non-sprint -> decay -1, floor 0', () => {
  const u = { fatica: 1, ap_remaining: 2, ap: 2, _tiles_voluntary_round: 0 };
  sf.accrueOrDecay(u);
  assert.equal(u.fatica, 0);
  const u0 = { fatica: 0, ap_remaining: 2, ap: 2 };
  sf.accrueOrDecay(u0);
  assert.equal(u0.fatica, 0); // never negative
});

test('penaltyThreshold: 1 default, 2 with propriocezione', () => {
  assert.equal(sf.penaltyThreshold({ traits: [] }), 1);
  assert.equal(sf.penaltyThreshold({ traits: ['propriocezione'] }), 2);
});

test('fatiguePenalty: fires at threshold, propriocezione tolerates 1 sprint', () => {
  assert.equal(sf.fatiguePenalty({ fatica: 1, traits: [] }), 1);
  assert.equal(sf.fatiguePenalty({ fatica: 0, traits: [] }), 0);
  // propriocezione: fatica 1 < threshold 2 -> no penalty; fatica 2 -> penalty
  assert.equal(sf.fatiguePenalty({ fatica: 1, traits: ['propriocezione'] }), 0);
  assert.equal(sf.fatiguePenalty({ fatica: 2, traits: ['propriocezione'] }), 1);
});

test('isSprintRound: split moves accumulate (1+1 tiles, 0 AP) -> sprint', () => {
  // session.js increments _tiles_voluntary_round by `dist` per move; two 1-tile moves
  // that drain AP must register as a sprint.
  const u = { ap: 2, ap_remaining: 0, _tiles_voluntary_round: 1 + 1 };
  assert.equal(sf.isSprintRound(u), true);
});
