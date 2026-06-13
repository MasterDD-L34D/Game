// Sprint α — Bravado AP refill tests (Hard West 2 pattern).
//
// 3 cases: kill triggers refill, max cap, sistema actor no refill.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { onKillRefill, REFILL_AMOUNT } = require('../../../apps/backend/services/combat/bravado');

test('bravado: player kill → +1 AP refill', () => {
  const actor = { controlled_by: 'player', ap: 2, ap_remaining: 0 };
  const target = { hp: 0 };
  const r = onKillRefill(actor, target);
  assert.equal(r.refilled, REFILL_AMOUNT);
  assert.equal(r.new_ap, 1);
  assert.equal(actor.ap_remaining, 1);
});

test('bravado: cap a actor.ap (no exceed max)', () => {
  const actor = { controlled_by: 'player', ap: 2, ap_remaining: 2 };
  const target = { hp: 0 };
  const r = onKillRefill(actor, target);
  assert.equal(r.refilled, 0);
  assert.equal(r.reason, 'capped');
  assert.equal(actor.ap_remaining, 2);
});

test('bravado: sistema actor (controlled_by !== player) no refill', () => {
  const actor = { controlled_by: 'sistema', ap: 2, ap_remaining: 0 };
  const target = { hp: 0 };
  const r = onKillRefill(actor, target);
  assert.equal(r.refilled, 0);
  assert.equal(r.reason, 'not_player');
  assert.equal(actor.ap_remaining, 0);
  // target sopravvive caso
  const r2 = onKillRefill({ controlled_by: 'player', ap: 2, ap_remaining: 0 }, { hp: 3 });
  assert.equal(r2.refilled, 0);
  assert.equal(r2.reason, 'target_alive');
});
