'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { normaliseUnit } = require('../../apps/backend/routes/sessionHelpers');
const {
  applyPerkKillEffects,
} = require('../../apps/backend/services/progression/progressionApply');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// TKT-JOB-PHASEC slice 3 — PE pool (combat-scoped, OQ-PE verdict B: new pool,
// no coupling with the meta evolution-PE). Field + earn (first_kill_pe_bonus)
// + spend gate/deduct (cost_pe).

// --- 3a. normaliseUnit carries a `pe` field (mirror of `sg`/`mp`) ---

test('normaliseUnit: pe defaults to 0 when absent', () => {
  assert.strictEqual(normaliseUnit({}, 0).pe, 0);
});

test('normaliseUnit: pe preserved from input', () => {
  assert.strictEqual(normaliseUnit({ pe: 7 }, 0).pe, 7);
});

// --- 3b. first_kill_pe_bonus earns PE on the first kill of the encounter ---

test('applyPerkKillEffects: first_kill_pe_bonus grants pe once', () => {
  const actor = {
    id: 'st',
    pe: 0,
    _perk_passives: [
      { tag: 'first_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 'st_r3_first_blood' },
    ],
  };
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.pe, 1);
});

test('applyPerkKillEffects: first_kill_pe_bonus does NOT re-grant on a second kill', () => {
  const actor = {
    id: 'st',
    pe: 0,
    _perk_passives: [
      { tag: 'first_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 'st_r3_first_blood' },
    ],
  };
  applyPerkKillEffects(actor);
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.pe, 1);
});

test('applyPerkKillEffects: no pe change without the perk', () => {
  const actor = { id: 'plain', pe: 3, _perk_passives: [] };
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.pe, 3);
});

// --- 3c. cost_pe gate + deduction in executeAbility ---

function makeExecutor() {
  return createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: { hit: false } }),
    buildAttackEvent: () => ({}),
    buildMoveEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  });
}

test('executeAbility: insufficient PE rejects with 400', async () => {
  const ex = makeExecutor();
  const actor = { id: 'ab', ap_remaining: 5, pe: 0, position: { x: 0, y: 0 }, attack_range: 5 };
  const res = await ex.executeAbility({
    session: { units: [actor], damage_taken: {} },
    actor,
    body: { ability_id: 'aberrant_overdrive', target_id: 'foe' },
  });
  assert.strictEqual(res.status, 400);
  assert.match(String(res.body.error), /PE/i);
  assert.strictEqual(actor.pe, 0, 'PE not deducted on rejection');
});

test('executeAbility: sufficient PE deducts cost_pe', async () => {
  const ex = makeExecutor();
  const actor = { id: 'ab', ap_remaining: 5, pe: 10, position: { x: 0, y: 0 }, attack_range: 5 };
  const target = { id: 'foe', hp: 10, max_hp: 10, position: { x: 1, y: 0 } };
  const res = await ex.executeAbility({
    session: { units: [actor, target], damage_taken: {} },
    actor,
    body: { ability_id: 'aberrant_overdrive', target_id: 'foe' },
  });
  assert.strictEqual(
    res.status,
    200,
    `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  assert.strictEqual(actor.pe, 5, 'cost_pe=5 deducted from pe=10');
});
