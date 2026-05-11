// TKT-M15 — Promotion engine unit tests.
//
// Covers: computeUnitMetrics, evaluatePromotion gates, applyPromotion stat
// deltas, max-tier reached, not-next-tier rejection.

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPromotionConfig,
  computeUnitMetrics,
  evaluatePromotion,
  applyPromotion,
  currentTier,
  nextTier,
  resetCache,
  FALLBACK_CONFIG,
} = require('../../apps/backend/services/progression/promotionEngine');

const TEST_CONFIG = {
  version: 'test',
  tier_ladder: ['base', 'veteran', 'captain'],
  thresholds: {
    veteran: { kills_min: 2, objectives_min: 1 },
    captain: { kills_min: 5, objectives_min: 2, assists_min: 1 },
  },
  rewards: {
    veteran: { hp_bonus: 5, attack_mod_bonus: 1, ability_unlock_tier: 'r2' },
    captain: {
      hp_bonus: 10,
      attack_mod_bonus: 2,
      initiative_bonus: 2,
      ability_unlock_tier: 'r3',
    },
  },
};

function buildUnit(overrides = {}) {
  return {
    id: 'pg1',
    controlled_by: 'player',
    hp: 10,
    max_hp: 10,
    attack_mod: 0,
    initiative: 5,
    promotion_tier: 'base',
    ...overrides,
  };
}

test('loadPromotionConfig returns parsed YAML or fallback', () => {
  resetCache();
  const cfg = loadPromotionConfig();
  assert.ok(cfg);
  assert.ok(Array.isArray(cfg.tier_ladder));
  assert.equal(cfg.tier_ladder[0], 'base');
  assert.ok(cfg.thresholds);
  assert.ok(cfg.rewards);
});

test('computeUnitMetrics counts kills from explicit kill flag', () => {
  const unit = buildUnit();
  const events = [
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e1', killed: true, turn: 1 },
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e2', killed: true, turn: 2 },
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e3', killed: false, turn: 3 },
  ];
  const m = computeUnitMetrics(unit, events);
  assert.equal(m.kills, 2);
  assert.equal(m.assists, 0);
  assert.equal(m.objectives, 0);
});

test('computeUnitMetrics counts kills from target_hp_after=0 fallback', () => {
  const unit = buildUnit();
  const events = [
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e1', target_hp_after: 0, turn: 1 },
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e2', target_hp_after: 3, turn: 2 },
  ];
  const m = computeUnitMetrics(unit, events);
  assert.equal(m.kills, 1);
});

test('computeUnitMetrics counts objectives via objective_complete event', () => {
  const unit = buildUnit();
  const events = [
    { action_type: 'objective_complete', actor_id: 'pg1', result: 'ok', turn: 5 },
    {
      action_type: 'objective_complete',
      contributors: ['pg1', 'pg2'],
      result: 'completed',
      turn: 8,
    },
  ];
  const m = computeUnitMetrics(unit, events);
  assert.equal(m.objectives, 2);
});

test('evaluatePromotion returns eligible when thresholds met', () => {
  const unit = buildUnit();
  const events = [
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e1', killed: true, turn: 1 },
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e2', killed: true, turn: 2 },
    { action_type: 'objective_complete', actor_id: 'pg1', result: 'ok', turn: 3 },
  ];
  const result = evaluatePromotion(unit, events, TEST_CONFIG);
  assert.equal(result.current_tier, 'base');
  assert.equal(result.next_tier, 'veteran');
  assert.equal(result.eligible, true);
  assert.equal(result.reason, 'thresholds_met');
  assert.equal(result.metrics.kills, 2);
  assert.equal(result.metrics.objectives, 1);
});

test('evaluatePromotion returns not eligible when below threshold', () => {
  const unit = buildUnit();
  const events = [
    { action_type: 'attack', actor_id: 'pg1', target_id: 'e1', killed: true, turn: 1 },
  ];
  const result = evaluatePromotion(unit, events, TEST_CONFIG);
  assert.equal(result.eligible, false);
  assert.ok(result.reason.includes('kills'));
});

test('evaluatePromotion handles max tier reached', () => {
  const unit = buildUnit({ promotion_tier: 'captain' });
  const result = evaluatePromotion(unit, [], TEST_CONFIG);
  assert.equal(result.next_tier, null);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'max_tier_reached');
});

test('applyPromotion applies stat deltas + tier bump', () => {
  const unit = buildUnit();
  const result = applyPromotion(unit, 'veteran', TEST_CONFIG);
  assert.equal(result.ok, true);
  assert.equal(result.applied_tier, 'veteran');
  assert.equal(result.previous_tier, 'base');
  assert.equal(unit.promotion_tier, 'veteran');
  assert.equal(unit.hp, 15);
  assert.equal(unit.max_hp, 15);
  assert.equal(unit.attack_mod, 1);
  assert.equal(unit.ability_tier_unlocked, 'r2');
});

test('applyPromotion rejects non-next tier (skip ladder)', () => {
  const unit = buildUnit();
  const result = applyPromotion(unit, 'captain', TEST_CONFIG);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'not_next_tier');
});

test('applyPromotion captain adds initiative bonus', () => {
  const unit = buildUnit({ promotion_tier: 'veteran' });
  const result = applyPromotion(unit, 'captain', TEST_CONFIG);
  assert.equal(result.ok, true);
  assert.equal(unit.promotion_tier, 'captain');
  assert.equal(unit.initiative, 7); // 5 + 2
  assert.equal(unit.attack_mod, 2);
  assert.equal(unit.ability_tier_unlocked, 'r3');
});

test('currentTier + nextTier helpers', () => {
  assert.equal(currentTier({ promotion_tier: 'veteran' }), 'veteran');
  assert.equal(currentTier({}), 'base');
  assert.equal(currentTier(null), 'base');
  assert.equal(nextTier('base', ['base', 'veteran', 'captain']), 'veteran');
  assert.equal(nextTier('captain', ['base', 'veteran', 'captain']), null);
});

test('FALLBACK_CONFIG is consistent', () => {
  assert.ok(FALLBACK_CONFIG.tier_ladder.includes('base'));
  assert.ok(FALLBACK_CONFIG.rewards.veteran);
  assert.ok(FALLBACK_CONFIG.thresholds.captain);
});
