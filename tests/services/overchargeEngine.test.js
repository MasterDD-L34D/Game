'use strict';

// TKT-P6-AP3 — Overcharge verb (Pillar 6 fairness / FFT charge beat).
//
// Symmetric twin of defyEngine: the player spends a full SG gauge to gain +1 AP
// THIS turn, so a `cost_ap: 3` ability (frozen_stasis / power_strike /
// sonic_blast / meteoric_shield / armatura guard) becomes playable inside the
// 2-AP/turn budget — but only as a telegraphed "all-in" move, not spam.
//
// Pure module (mirror defyEngine): canOvercharge(actor) validates, applyOvercharge
// (actor) mutates actor in place. Route wraps side-effects + event.
//
// Cost = 3 SG (POOL_MAX = 3 → empties the gauge; defy costs 2). Effect:
// actor.ap_remaining += 1, capped so it cannot exceed base ap + 1 (one
// overcharge per turn). Guard actor.status.overcharged marks the turn used.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  OVERCHARGE_SG_COST,
  OVERCHARGE_AP_GAIN,
  canOvercharge,
  applyOvercharge,
  ERR_NOT_FOUND,
  ERR_NOT_PLAYER,
  ERR_KO,
  ERR_INSUFFICIENT_SG,
  ERR_ALREADY_OVERCHARGED,
} = require('../../apps/backend/services/combat/overchargeEngine');

function player(over = {}) {
  return {
    id: 'p1',
    controlled_by: 'player',
    hp: 20,
    ap: 2,
    ap_remaining: 2,
    sg: 3,
    status: {},
    ...over,
  };
}

test('OVERCHARGE constants: 3 SG cost, +1 AP gain', () => {
  assert.equal(OVERCHARGE_SG_COST, 3);
  assert.equal(OVERCHARGE_AP_GAIN, 1);
});

test('canOvercharge: ok for an alive player with a full gauge', () => {
  assert.deepEqual(canOvercharge(player()), { ok: true });
});

test('canOvercharge: actor_not_found when null', () => {
  assert.equal(canOvercharge(null).error, ERR_NOT_FOUND);
});

test('canOvercharge: not_player_controlled for sistema units', () => {
  assert.equal(canOvercharge(player({ controlled_by: 'sistema' })).error, ERR_NOT_PLAYER);
});

test('canOvercharge: actor_ko at 0 hp', () => {
  assert.equal(canOvercharge(player({ hp: 0 })).error, ERR_KO);
});

test('canOvercharge: insufficient_sg below the cost', () => {
  const res = canOvercharge(player({ sg: 2 }));
  assert.equal(res.error, ERR_INSUFFICIENT_SG);
  assert.deepEqual(res.detail, { sg: 2, required: 3 });
});

test('canOvercharge: already_overcharged this turn', () => {
  assert.equal(
    canOvercharge(player({ status: { overcharged: 1 } })).error,
    ERR_ALREADY_OVERCHARGED,
  );
});

test('applyOvercharge: spends 3 SG, +1 ap_remaining, marks the turn', () => {
  const actor = player();
  const out = applyOvercharge(actor);
  assert.equal(out.ok, true);
  assert.equal(actor.sg, 0, 'full gauge spent (3 -> 0)');
  assert.equal(actor.ap_remaining, 3, 'ap_remaining 2 -> 3');
  assert.equal(actor.status.overcharged, 1, 'overcharged guard set');
  assert.deepEqual(out.before, { sg: 3, ap_remaining: 2 });
  assert.equal(out.after.sg, 0);
  assert.equal(out.after.ap_remaining, 3);
  assert.deepEqual(out.cost, { sg: 3 });
});

test('applyOvercharge: refuses a second overcharge in the same turn', () => {
  const actor = player({ sg: 3 });
  applyOvercharge(actor); // first ok (sg now 0 anyway)
  const actor2 = player({ sg: 3, status: { overcharged: 1 } });
  const out = applyOvercharge(actor2);
  assert.equal(out.ok, false);
  assert.equal(out.error, ERR_ALREADY_OVERCHARGED);
  assert.equal(actor2.sg, 3, 'no SG spent on refusal');
  assert.equal(actor2.ap_remaining, 2, 'no AP granted on refusal');
});

test('applyOvercharge: refuses when SG insufficient (no mutation)', () => {
  const actor = player({ sg: 2 });
  const out = applyOvercharge(actor);
  assert.equal(out.ok, false);
  assert.equal(out.error, ERR_INSUFFICIENT_SG);
  assert.equal(actor.sg, 2, 'SG untouched');
  assert.equal(actor.ap_remaining, 2, 'AP untouched');
});

test('applyOvercharge: ap_remaining derives from ap when undefined', () => {
  const actor = player({ ap: 2, ap_remaining: undefined });
  const out = applyOvercharge(actor);
  assert.equal(out.ok, true);
  assert.equal(actor.ap_remaining, 3, 'base ap 2 + 1');
});
