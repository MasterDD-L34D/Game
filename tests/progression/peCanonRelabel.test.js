'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { normaliseUnit } = require('../../apps/backend/routes/sessionHelpers');
const {
  applyPerkKillEffects,
} = require('../../apps/backend/services/progression/progressionApply');
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');

// PE-canon re-label (#2527): PE = campaign XP (26-ECONOMY_CANONICAL), NOT a combat
// resource. The PHASEC combat-PE work (#2522/#2526) wrote `unit.pe` in combat,
// colliding with the campaign XP the forms/evolution layer uses. This re-label
// CLOSES the collision: combat NEVER writes `unit.pe`; the aberrant combat cost is
// `cost_sg` (decorative). `unit.pe` survives only as a campaign-XP pass-through.

// --- unit.pe is preserved (campaign XP pass-through) ---

test('normaliseUnit: pe defaults to 0 when absent', () => {
  assert.strictEqual(normaliseUnit({}, 0).pe, 0);
});

test('normaliseUnit: pe (campaign XP) preserved from input', () => {
  assert.strictEqual(normaliseUnit({ pe: 7 }, 0).pe, 7);
});

// --- combat no longer writes unit.pe (collision closed) ---

test('applyPerkKillEffects: a kill does NOT mutate unit.pe even with first_kill_pe_bonus', () => {
  const actor = {
    id: 'st',
    pe: 10, // campaign XP carried into combat
    _perk_passives: [
      { tag: 'first_kill_pe_bonus', payload: { pe: 1 }, source_perk_id: 'st_r3_first_blood' },
    ],
  };
  applyPerkKillEffects(actor);
  assert.strictEqual(actor.pe, 10, 'campaign XP untouched by the combat kill hook');
});

test('executeAbility: aberrant_overdrive resolves without mutating unit.pe (cost is decorative cost_sg)', async () => {
  const ex = createAbilityExecutor({
    performAttack: () => ({ damageDealt: 0, result: { hit: false } }),
    buildAttackEvent: () => ({}),
    appendEvent: async () => {},
    manhattanDistance: (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
  });
  const actor = {
    id: 'ab',
    job: 'aberrant',
    ap_remaining: 5,
    pe: 10, // campaign XP
    sg: 3, // H2 cost-gate (2026-06-02): aberrant_overdrive cost_sg=3 needs a full SG pool
    position: { x: 0, y: 0 },
    attack_range: 5,
  };
  const target = { id: 'foe', hp: 10, max_hp: 10, position: { x: 1, y: 0 } };
  const res = await ex.executeAbility({
    session: { units: [actor, target], turn: 1, damage_taken: {} },
    actor,
    body: { ability_id: 'aberrant_overdrive', target_id: 'foe' },
  });
  assert.strictEqual(
    res.status,
    200,
    `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  assert.strictEqual(actor.pe, 10, 'campaign XP untouched by combat ability resolution');
});
