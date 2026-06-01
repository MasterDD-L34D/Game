'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  computePerkDefenseBonus,
} = require('../../apps/backend/services/progression/progressionApply');
const { applyBondedDeathGrace } = require('../../apps/backend/services/combat/symbiontBond');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice B4b (Cat C/D/G, OQ-BOND verdict V3) — the 3 non-redirect
// symbiont tags: bonded_proximity_defense (def per ally adjacent to the bonded
// partner, via the slice-1 def-eval seam), chain_heal_adjacent (shared_vitality
// also heals allies adjacent to the bonded partner), bonded_death_grace (the
// symbiont heals + rages when its bonded partner dies).

// --- bonded_proximity_defense (computePerkDefenseBonus self-passive) ---

function ally(id, x, y, extra = {}) {
  return { id, controlled_by: 'player', hp: 20, max_hp: 20, position: { x, y }, ...extra };
}

test('bonded_proximity_defense: +1 def per ally adjacent to the bonded partner', () => {
  const sym = ally('sym', 0, 0, {
    _bond: { partner_id: 'p' },
    _perk_passives: [
      {
        tag: 'bonded_proximity_defense',
        payload: { per_ally: 1, max: 3 },
        source_perk_id: 'sy_r2',
      },
    ],
  });
  const partner = ally('p', 5, 5);
  const units = [
    sym,
    partner,
    ally('a1', 5, 6), // adjacent to partner
    ally('a2', 6, 5), // adjacent to partner
    ally('far', 0, 1), // adjacent to sym, NOT partner
  ];
  const r = computePerkDefenseBonus(sym, { units });
  assert.strictEqual(r.bonus, 2, 'a1 + a2 adjacent to the bonded partner');
});

test('bonded_proximity_defense: capped at max', () => {
  const sym = ally('sym', 0, 0, {
    _bond: { partner_id: 'p' },
    _perk_passives: [
      {
        tag: 'bonded_proximity_defense',
        payload: { per_ally: 1, max: 3 },
        source_perk_id: 'sy_r2',
      },
    ],
  });
  const partner = ally('p', 5, 5);
  const units = [
    sym,
    partner,
    ally('a1', 5, 6),
    ally('a2', 6, 5),
    ally('a3', 4, 5),
    ally('a4', 5, 4), // 4 adjacent → capped at 3
  ];
  const r = computePerkDefenseBonus(sym, { units });
  assert.strictEqual(r.bonus, 3, 'capped at max 3');
});

test('bonded_proximity_defense: no bond → no bonus', () => {
  const sym = ally('sym', 0, 0, {
    _perk_passives: [
      {
        tag: 'bonded_proximity_defense',
        payload: { per_ally: 1, max: 3 },
        source_perk_id: 'sy_r2',
      },
    ],
  });
  const r = computePerkDefenseBonus(sym, { units: [sym, ally('x', 0, 1)] });
  assert.strictEqual(r.bonus, 0);
});

// --- bonded_death_grace (applyBondedDeathGrace) ---

test('bonded_death_grace: dead partner heals the symbiont 50% max_hp + rage', () => {
  const sym = {
    id: 'sym',
    hp: 4,
    max_hp: 20,
    status: {},
    _perk_passives: [
      {
        tag: 'bonded_death_grace',
        payload: { heal_pct: 0.5, rage_turns: 3 },
        source_perk_id: 'sy_r5',
      },
    ],
  };
  const partner = { id: 'p', hp: 0, _bonded_by: 'sym' };
  const r = applyBondedDeathGrace({ units: [sym, partner], turn: 1 }, partner);
  assert.ok(r, 'grace fired');
  assert.strictEqual(r.healed, 10, '50% of 20');
  assert.strictEqual(sym.hp, 14, '4 + 10');
  assert.strictEqual(sym.status.rage, 3);
});

test('bonded_death_grace: heal capped at max_hp', () => {
  const sym = {
    id: 'sym',
    hp: 18,
    max_hp: 20,
    status: {},
    _perk_passives: [
      {
        tag: 'bonded_death_grace',
        payload: { heal_pct: 0.5, rage_turns: 3 },
        source_perk_id: 'sy_r5',
      },
    ],
  };
  const partner = { id: 'p', hp: 0, _bonded_by: 'sym' };
  applyBondedDeathGrace({ units: [sym, partner], turn: 1 }, partner);
  assert.strictEqual(sym.hp, 20, 'capped at max_hp');
});

test('bonded_death_grace: no perk → null', () => {
  const sym = { id: 'sym', hp: 4, max_hp: 20, status: {}, _perk_passives: [] };
  const partner = { id: 'p', hp: 0, _bonded_by: 'sym' };
  assert.strictEqual(applyBondedDeathGrace({ units: [sym, partner], turn: 1 }, partner), null);
});

test('bonded_death_grace: dead symbiont cannot grace → null', () => {
  const sym = {
    id: 'sym',
    hp: 0,
    max_hp: 20,
    status: {},
    _perk_passives: [
      {
        tag: 'bonded_death_grace',
        payload: { heal_pct: 0.5, rage_turns: 3 },
        source_perk_id: 'sy_r5',
      },
    ],
  };
  const partner = { id: 'p', hp: 0, _bonded_by: 'sym' };
  assert.strictEqual(applyBondedDeathGrace({ units: [sym, partner], turn: 1 }, partner), null);
});

// --- chain_heal_adjacent (executeHeal shared_vitality integration) ---

function makeExecutor(rng) {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: {} }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y),
    rng,
  });
}

test('chain_heal_adjacent: shared_vitality also heals allies adjacent to the target at 50%', async () => {
  const ex = makeExecutor(() => 0.99); // 1d4 → 4
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 3,
    ap_remaining: 3,
    position: { x: 0, y: 0 },
    _perk_passives: [
      { tag: 'chain_heal_adjacent', payload: { factor: 0.5 }, source_perk_id: 'sy_r4' },
    ],
  };
  const target = { id: 'p', controlled_by: 'player', hp: 10, max_hp: 20, position: { x: 1, y: 0 } };
  const adj = { id: 'adj', controlled_by: 'player', hp: 10, max_hp: 20, position: { x: 1, y: 1 } }; // adjacent to target
  const far = { id: 'far', controlled_by: 'player', hp: 10, max_hp: 20, position: { x: 9, y: 9 } };
  const res = await ex.executeAbility({
    session: { units: [sym, target, adj, far], turn: 1 },
    actor: sym,
    body: { ability_id: 'shared_vitality', target_id: 'p' },
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(target.hp, 14, 'primary heal 4');
  assert.strictEqual(adj.hp, 12, 'chain heal floor(4*0.5)=2');
  assert.strictEqual(far.hp, 10, 'non-adjacent ally not chained');
});

test('chain_heal_adjacent: absent → shared_vitality heals only the target', async () => {
  const ex = makeExecutor(() => 0.99);
  const sym = {
    id: 'sym',
    job: 'symbiont',
    controlled_by: 'player',
    ap: 3,
    ap_remaining: 3,
    position: { x: 0, y: 0 },
    _perk_passives: [],
  };
  const target = { id: 'p', controlled_by: 'player', hp: 10, max_hp: 20, position: { x: 1, y: 0 } };
  const adj = { id: 'adj', controlled_by: 'player', hp: 10, max_hp: 20, position: { x: 1, y: 1 } };
  await ex.executeAbility({
    session: { units: [sym, target, adj], turn: 1 },
    actor: sym,
    body: { ability_id: 'shared_vitality', target_id: 'p' },
  });
  assert.strictEqual(adj.hp, 10, 'no chain heal without the perk');
});
