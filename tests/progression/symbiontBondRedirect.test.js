'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computeBondConfig,
  applyBondRedirect,
} = require('../../apps/backend/services/combat/symbiontBond');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice B4a (Cat C/D, OQ-BOND verdict V3) — symbiont bond redirect.
// symbiotic_bond pairs the symbiont with an adjacent ally (sets symbiont._bond +
// partner._bonded_by). When a bonded partner takes damage, applyBondRedirect (hooked
// into performAttack AFTER intercept + companion bond) moves redirect_pct of the
// damage from the partner to the symbiont, capped at the symbiont's HP.
// Perks: bond_redirect_strong (50%->60%), dual_bond (2nd partner @25%),
// emergency_full_redirect (partner HP<=30% -> 100%, cd 5), bond_no_distance_limit.

// --- computeBondConfig (unit) ---

test('computeBondConfig: no perks → 50%, no dual, distance gated', () => {
  const c = computeBondConfig({ id: 's', _perk_passives: [] });
  assert.strictEqual(c.redirect_pct, 0.5);
  assert.strictEqual(c.dual, false);
  assert.strictEqual(c.secondary_pct, 0);
  assert.strictEqual(c.no_distance_limit, false);
});

test('computeBondConfig: bond_redirect_strong → 60%', () => {
  const c = computeBondConfig({
    id: 's',
    _perk_passives: [
      { tag: 'bond_redirect_strong', payload: { redirect_pct: 0.6 }, source_perk_id: 'sy_r1' },
    ],
  });
  assert.strictEqual(c.redirect_pct, 0.6);
});

test('computeBondConfig: dual_bond → secondary 25%', () => {
  const c = computeBondConfig({
    id: 's',
    _perk_passives: [
      { tag: 'dual_bond', payload: { secondary_redirect_pct: 0.25 }, source_perk_id: 'sy_r2' },
    ],
  });
  assert.strictEqual(c.dual, true);
  assert.strictEqual(c.secondary_pct, 0.25);
});

test('computeBondConfig: bond_no_distance_limit → true', () => {
  const c = computeBondConfig({
    id: 's',
    _perk_passives: [{ tag: 'bond_no_distance_limit', payload: {}, source_perk_id: 'sy_r6' }],
  });
  assert.strictEqual(c.no_distance_limit, true);
});

// --- applyBondRedirect (unit) ---

function makeSession(symbiont, target) {
  return { units: [symbiont, target], turn: 1, damage_taken: {} };
}
function makeSymbiont(extra = {}) {
  return { id: 'sym', hp: 20, max_hp: 20, position: { x: 0, y: 0 }, _perk_passives: [], ...extra };
}
function makeTarget(extra = {}) {
  return { id: 'ally', hp: 10, max_hp: 20, position: { x: 1, y: 0 }, ...extra };
}

test('applyBondRedirect: no _bonded_by → null', () => {
  const sym = makeSymbiont();
  const tgt = makeTarget();
  assert.strictEqual(applyBondRedirect(makeSession(sym, tgt), tgt, 10), null);
});

test('applyBondRedirect: 50% basic — moves floor(dmg*0.5) to symbiont', () => {
  const sym = makeSymbiont({
    _bond: { partner_id: 'ally', redirect_pct: 0.5, secondary_partner_id: null, secondary_pct: 0 },
  });
  const tgt = makeTarget({ _bonded_by: 'sym', hp: 10, max_hp: 20 }); // took 10 (20->10)
  const session = makeSession(sym, tgt);
  const r = applyBondRedirect(session, tgt, 10);
  assert.strictEqual(r.redirected, 5);
  assert.strictEqual(tgt.hp, 15, 'target restored by 5');
  assert.strictEqual(sym.hp, 15, 'symbiont takes 5');
  assert.strictEqual(session.damage_taken.sym, 5);
  assert.strictEqual(session.damage_taken.ally, -5, 'target damage_taken reduced');
});

test('applyBondRedirect: 60% strong redirect', () => {
  const sym = makeSymbiont({
    _bond: { partner_id: 'ally', redirect_pct: 0.6, secondary_partner_id: null, secondary_pct: 0 },
  });
  const tgt = makeTarget({ _bonded_by: 'sym', hp: 10, max_hp: 20 });
  const r = applyBondRedirect(makeSession(sym, tgt), tgt, 10);
  assert.strictEqual(r.redirected, 6);
  assert.strictEqual(sym.hp, 14);
});

test('applyBondRedirect: capped at symbiont HP (excess stays on target)', () => {
  const sym = makeSymbiont({
    hp: 3,
    _bond: { partner_id: 'ally', redirect_pct: 0.5, secondary_partner_id: null, secondary_pct: 0 },
  });
  const tgt = makeTarget({ _bonded_by: 'sym', hp: 10, max_hp: 20 });
  const r = applyBondRedirect(makeSession(sym, tgt), tgt, 10); // would be 5, capped to 3
  assert.strictEqual(r.redirected, 3);
  assert.strictEqual(sym.hp, 0);
  assert.strictEqual(r.symbiont_killed, true);
  assert.strictEqual(tgt.hp, 13, 'target restored by only the capped 3');
});

test('applyBondRedirect: dead symbiont → null', () => {
  const sym = makeSymbiont({ hp: 0, _bond: { partner_id: 'ally', redirect_pct: 0.5 } });
  const tgt = makeTarget({ _bonded_by: 'sym' });
  assert.strictEqual(applyBondRedirect(makeSession(sym, tgt), tgt, 10), null);
});

test('applyBondRedirect: secondary partner uses secondary_pct', () => {
  const sym = makeSymbiont({
    _bond: {
      partner_id: 'main',
      redirect_pct: 0.6,
      secondary_partner_id: 'ally',
      secondary_pct: 0.25,
    },
  });
  const tgt = makeTarget({ _bonded_by: 'sym', hp: 12, max_hp: 20 });
  const r = applyBondRedirect(makeSession(sym, tgt), tgt, 8); // floor(8*0.25)=2
  assert.strictEqual(r.redirected, 2);
});

test('applyBondRedirect: emergency_full_redirect — partner HP<=30% → 100% + cooldown', () => {
  const sym = makeSymbiont({
    _bond: { partner_id: 'ally', redirect_pct: 0.5, secondary_partner_id: null, secondary_pct: 0 },
    _perk_passives: [
      { tag: 'emergency_full_redirect', payload: { cooldown: 5 }, source_perk_id: 'sy_r4' },
    ],
  });
  const tgt = makeTarget({ _bonded_by: 'sym', hp: 5, max_hp: 20 }); // 25% → emergency
  const session = makeSession(sym, tgt);
  const r = applyBondRedirect(session, tgt, 8);
  assert.strictEqual(r.emergency, true);
  assert.strictEqual(r.redirected, 8, '100% redirect');
  assert.strictEqual(sym._emergency_redirect_cd, 6, 'cooldown until round 1+5');
  // 2nd hit same/next rounds within cooldown → no emergency (falls back to 50%)
  const tgt2 = makeTarget({ _bonded_by: 'sym', hp: 4, max_hp: 20 });
  const session2 = { units: [sym, tgt2], turn: 3, damage_taken: {} };
  const r2 = applyBondRedirect(session2, tgt2, 8);
  assert.strictEqual(r2.emergency, false, 'still on cooldown at round 3');
  assert.strictEqual(r2.redirected, 4, 'falls back to 50%');
});

// --- symbiotic_bond cast (executeAbility integration, real catalog spec) ---

function makeExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: {} }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng: () => 0,
  });
}

test('symbiotic_bond: sets bond on adjacent ally', async () => {
  const ex = makeExecutor();
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 3,
    ap_remaining: 3,
    position: { x: 0, y: 0 },
    _perk_passives: [],
  };
  const ally = {
    id: 'ally',
    controlled_by: 'player',
    hp: 20,
    max_hp: 20,
    position: { x: 1, y: 0 },
  };
  const res = await ex.executeAbility({
    session: { units: [sym, ally], turn: 1 },
    actor: sym,
    body: { ability_id: 'symbiotic_bond', target_id: 'ally' },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(sym._bond.partner_id, 'ally');
  assert.strictEqual(sym._bond.redirect_pct, 0.5);
  assert.strictEqual(ally._bonded_by, 'sym');
});

test('symbiotic_bond: non-adjacent ally → 400 (distance gated)', async () => {
  const ex = makeExecutor();
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 3,
    ap_remaining: 3,
    position: { x: 0, y: 0 },
    _perk_passives: [],
  };
  const ally = {
    id: 'ally',
    controlled_by: 'player',
    hp: 20,
    max_hp: 20,
    position: { x: 5, y: 0 },
  };
  const res = await ex.executeAbility({
    session: { units: [sym, ally], turn: 1 },
    actor: sym,
    body: { ability_id: 'symbiotic_bond', target_id: 'ally' },
  });
  assert.strictEqual(res.status, 400, 'distance gate blocks a far bond');
});

test('symbiotic_bond: bond_no_distance_limit bypasses adjacency', async () => {
  const ex = makeExecutor();
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 3,
    ap_remaining: 3,
    position: { x: 0, y: 0 },
    _perk_passives: [{ tag: 'bond_no_distance_limit', payload: {}, source_perk_id: 'sy_r6' }],
  };
  const ally = {
    id: 'ally',
    controlled_by: 'player',
    hp: 20,
    max_hp: 20,
    position: { x: 5, y: 0 },
  };
  const res = await ex.executeAbility({
    session: { units: [sym, ally], turn: 1 },
    actor: sym,
    body: { ability_id: 'symbiotic_bond', target_id: 'ally' },
  });
  assert.strictEqual(res.status, 200, 'no_distance_limit allows a far bond');
  assert.strictEqual(ally._bonded_by, 'sym');
});

test('symbiotic_bond: bond_redirect_strong sets 60% redirect at cast', async () => {
  const ex = makeExecutor();
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 3,
    ap_remaining: 3,
    position: { x: 0, y: 0 },
    _perk_passives: [
      { tag: 'bond_redirect_strong', payload: { redirect_pct: 0.6 }, source_perk_id: 'sy_r1' },
    ],
  };
  const ally = {
    id: 'ally',
    controlled_by: 'player',
    hp: 20,
    max_hp: 20,
    position: { x: 1, y: 0 },
  };
  await ex.executeAbility({
    session: { units: [sym, ally], turn: 1 },
    actor: sym,
    body: { ability_id: 'symbiotic_bond', target_id: 'ally' },
  });
  assert.strictEqual(sym._bond.redirect_pct, 0.6);
});

test('symbiotic_bond: dual_bond second cast sets secondary partner', async () => {
  const ex = makeExecutor();
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 5,
    ap_remaining: 5,
    position: { x: 0, y: 0 },
    _perk_passives: [
      { tag: 'dual_bond', payload: { secondary_redirect_pct: 0.25 }, source_perk_id: 'sy_r2' },
    ],
  };
  const a1 = { id: 'a1', controlled_by: 'player', hp: 20, max_hp: 20, position: { x: 1, y: 0 } };
  const a2 = { id: 'a2', controlled_by: 'player', hp: 20, max_hp: 20, position: { x: 0, y: 1 } };
  const session = { units: [sym, a1, a2], turn: 1 };
  await ex.executeAbility({
    session,
    actor: sym,
    body: { ability_id: 'symbiotic_bond', target_id: 'a1' },
  });
  await ex.executeAbility({
    session,
    actor: sym,
    body: { ability_id: 'symbiotic_bond', target_id: 'a2' },
  });
  assert.strictEqual(sym._bond.partner_id, 'a1', 'primary kept');
  assert.strictEqual(sym._bond.secondary_partner_id, 'a2', 'secondary set by dual_bond');
  assert.strictEqual(a2._bonded_by, 'sym');
});
