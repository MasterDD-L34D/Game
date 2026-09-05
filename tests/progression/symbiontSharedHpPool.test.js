'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { applySharedHpPool } = require('../../apps/backend/services/combat/symbiontBond');

// TKT-JOB-PHASEC slice V5 (symbiont capstone sy_r6_one_soul, OQ-BOND verdict V5) —
// shared_hp_pool: the symbiont + its PRIMARY bonded partner share a combined HP
// pool (sum HP). A hit is split equally across the pair; both KO together when the
// pool empties. Supersedes the redirect (mutual exclusion) + bonded_death_grace
// (a dead symbiont can't grace). applySharedHpPool is hooked into performAttack
// AFTER the damage floor, receiving the struck unit's PRE-hit HP (the floor at 0
// loses overkill, which the pool needs for the both-KO check).

function pair(symExtra = {}, partnerExtra = {}) {
  const symbiont = {
    id: 'sym',
    hp: 20,
    max_hp: 20,
    status: {},
    _bond: { partner_id: 'p', redirect_pct: 0.5, secondary_partner_id: null, secondary_pct: 0 },
    _perk_passives: [{ tag: 'shared_hp_pool', payload: {}, source_perk_id: 'sy_r6' }],
    ...symExtra,
  };
  const partner = { id: 'p', hp: 20, max_hp: 20, status: {}, _bonded_by: 'sym', ...partnerExtra };
  return { symbiont, partner };
}

test('shared_hp_pool: hit on the partner splits equally across the pair', () => {
  const { symbiont, partner } = pair();
  // performAttack already floored partner.hp = 20 - 10 = 10 and credited damage_taken 10.
  partner.hp = 10;
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 10 } };
  const r = applySharedHpPool(session, partner, 10, 20); // preDamage partner.hp = 20
  assert.ok(r, 'pool active');
  assert.strictEqual(r.both_ko, false);
  assert.strictEqual(partner.hp, 15, 'partner net took 5');
  assert.strictEqual(symbiont.hp, 15, 'symbiont net took 5');
  assert.strictEqual(session.damage_taken.p, 5, 'partner damage_taken corrected to 5');
  assert.strictEqual(session.damage_taken.sym, 5, 'symbiont credited 5');
  // Split actuals + counterpart id surfaced for the SG-accrual reconcile (Codex #2542).
  assert.strictEqual(r.counterpart_id, 'sym', 'counterpart id is the symbiont');
  assert.strictEqual(r.target_actual, 5, 'struck partner actually absorbed 5');
  assert.strictEqual(r.counter_actual, 5, 'counterpart absorbed its 5 share');
  assert.ok(!symbiont._pool_both_ko, 'no both-KO tag on a survivable split');
});

test('shared_hp_pool: hit on the symbiont splits equally too', () => {
  const { symbiont, partner } = pair();
  symbiont.hp = 12; // took 8
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { sym: 8 } };
  applySharedHpPool(session, symbiont, 8, 20);
  assert.strictEqual(symbiont.hp, 16, 'symbiont net took 4');
  assert.strictEqual(partner.hp, 16, 'partner net took 4');
});

test('shared_hp_pool: both KO when the pool empties', () => {
  const { symbiont, partner } = pair({ hp: 4 }, { hp: 4 });
  partner.hp = 0; // floored (took 10 vs 4)
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 10 } };
  const r = applySharedHpPool(session, partner, 10, 4); // preDamage 4; pool 8 - 10 = -2
  assert.strictEqual(r.both_ko, true);
  assert.strictEqual(partner.hp, 0);
  assert.strictEqual(symbiont.hp, 0, 'both KO together');
  // Codex #2542 P2: the counterpart is tagged so the bridge emits its kill ONLY
  // on an actual pool both-KO (not merely a bonded unit that happens to be at 0).
  assert.strictEqual(symbiont._pool_both_ko, true, 'counterpart tagged for kill emission');
});

test('shared_hp_pool: overkill on one member overflows into the pool (no premature death)', () => {
  const { symbiont, partner } = pair({ hp: 20 }, { hp: 3 });
  partner.hp = 0; // floored (took 10 vs 3)
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 10 } };
  const r = applySharedHpPool(session, partner, 10, 3); // pool 23 - 10 = 13 > 0
  assert.strictEqual(r.both_ko, false);
  assert.strictEqual(partner.hp + symbiont.hp, 13, 'pool conserved at 13');
  // Codex #2542 P1: no SOLO KO while the pool has HP — the struck target stays
  // >= 1 (performAttack wont treat it as killed); the counterpart covers overflow.
  assert.strictEqual(partner.hp, 1, 'struck partner survives on the pool (>=1)');
  assert.strictEqual(symbiont.hp, 12, 'counterpart covered the lethal overflow');
});

test('shared_hp_pool: an odd 1-HP tail the split cannot share -> both KO together (no silent solo drop)', () => {
  // Codex #2542 P1: poolAfter would be 1 (partner pre 1 + sym 5 - 5), but a single
  // HP cannot keep BOTH members >= 1; rather than silently leave one at 0 while the
  // other lives (which the rest of the combat code reads as a solo KO), the pair
  // falls together (non-silent both-KO).
  const { symbiont, partner } = pair({ hp: 5 }, { hp: 1 });
  partner.hp = 0; // floored (took 5 vs 1)
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 5 } };
  const r = applySharedHpPool(session, partner, 5, 1); // pool 1 + 5 - 5 = 1
  assert.strictEqual(r.both_ko, true, 'cannot keep both >= 1 on a 1-HP pool -> both KO');
  assert.strictEqual(partner.hp, 0);
  assert.strictEqual(symbiont.hp, 0, 'both fall together, not a solo drop');
  assert.strictEqual(symbiont._pool_both_ko, true, 'counterpart tagged for the kill emission');
});

test('shared_hp_pool: no perk → null (redirect/normal path applies instead)', () => {
  const { symbiont, partner } = pair({ _perk_passives: [] });
  partner.hp = 10;
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 10 } };
  assert.strictEqual(applySharedHpPool(session, partner, 10, 20), null);
});

test('shared_hp_pool: only the PRIMARY bond pools (secondary partner → null)', () => {
  const symbiont = {
    id: 'sym',
    hp: 20,
    max_hp: 20,
    _bond: { partner_id: 'p1', redirect_pct: 0.5, secondary_partner_id: 'p2', secondary_pct: 0.25 },
    _perk_passives: [{ tag: 'shared_hp_pool', payload: {}, source_perk_id: 'sy_r6' }],
  };
  const secondary = { id: 'p2', hp: 10, max_hp: 20, _bonded_by: 'sym' };
  const session = { units: [symbiont, secondary], turn: 1, damage_taken: { p2: 10 } };
  assert.strictEqual(applySharedHpPool(session, secondary, 10, 20), null, 'secondary not pooled');
});

test('shared_hp_pool: unbonded unit → null', () => {
  const lone = { id: 'x', hp: 10, max_hp: 20 };
  const session = { units: [lone], turn: 1, damage_taken: {} };
  assert.strictEqual(applySharedHpPool(session, lone, 5, 15), null);
});

test('shared_hp_pool: a downed counterpart does NOT pool or get resurrected (Codex #2542 P1)', () => {
  const { symbiont, partner } = pair({ hp: 0 }); // symbiont downed OUTSIDE this pool
  partner.hp = 0; // struck partner floored; pre-damage HP (20) passed below
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 10 } };
  const r = applySharedHpPool(session, partner, 10, 20);
  assert.strictEqual(r, null, 'no pool while the counterpart is already KO');
  assert.strictEqual(symbiont.hp, 0, 'dead symbiont is NOT lifted back to 1 by the split');
});

test('shared_hp_pool: a struck unit already dead pre-damage → null', () => {
  const { symbiont, partner } = pair();
  partner.hp = 0;
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 5 } };
  assert.strictEqual(applySharedHpPool(session, partner, 5, 0), null, 'preTarget <= 0 -> no pool');
});

test('shared_hp_pool: a burst overkilling a 1-HP pool empties it (both KO) given the real pre-burst HP', () => {
  // Codex #2542 P1 (caller): the terrain re-split must pass the PRE-burst HP (1),
  // not the floored hp + burst (3) — otherwise pool 1+1-3 looks like 1 and survives.
  const { symbiont, partner } = pair({ hp: 1 }, { hp: 1 });
  partner.hp = 0; // floored by the burst
  const session = { units: [symbiont, partner], turn: 1, damage_taken: { p: 3 } };
  const r = applySharedHpPool(session, partner, 3, 1); // real pre-burst HP = 1
  assert.strictEqual(r.both_ko, true, 'pool 1+1-3 <= 0 -> both KO together');
  assert.strictEqual(partner.hp, 0);
  assert.strictEqual(symbiont.hp, 0);
});

test('shared_hp_pool: a full bonus is absorbed by the pool when the struck member is low (Codex #2542 P2)', () => {
  // The bridge passes the FULL bonus + the struck member's pre-bonus HP, so a
  // +3 focus-fire on a 1-HP pooled member is covered by the 20-HP partner instead
  // of being clamped to 1 and losing the other 2.
  const { symbiont, partner } = pair({ hp: 20 }, { hp: 1 });
  const session = { units: [symbiont, partner], turn: 1, damage_taken: {} };
  const r = applySharedHpPool(session, partner, 3, 1); // full bonus 3, struck pre-HP 1
  assert.strictEqual(r.both_ko, false);
  assert.strictEqual(partner.hp + symbiont.hp, 18, 'pool 21 - 3 = 18 (the full 3 landed)');
  assert.ok(partner.hp >= 1, 'struck member survives on the pool');
  assert.strictEqual(r.counter_actual, 3, 'the bonded partner absorbed the full bonus');
});
