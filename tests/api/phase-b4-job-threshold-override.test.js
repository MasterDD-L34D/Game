// OD-025 Phase B4 ai-station 2026-05-14 — job_threshold_override engine consumption.
//
// Closes economy-design GSD audit GAP: custode tank assists_min:6/12
// unreachable for tank playstyle (kills+damage_taken, not assists).
// Override replaces base threshold with damage_taken_min proxy.
//
// Schema:
//   cfg.job_threshold_override[job_id][tier] = { <field>: number|null }
//   - <number> sets new threshold (replaces base or adds new metric)
//   - null DELETES gate (skip threshold check)
//
// Tests:
//   - _mergeJobThreshold helper (graceful fallbacks + override semantics)
//   - computeUnitMetrics damage_taken accumulator
//   - evaluatePromotion custode alt-path eligibility (assists null + damage_taken_min)
//   - applyPromotion respects override-defined eligibility gate

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePromotion,
  computeUnitMetrics,
  _mergeJobThreshold,
  FALLBACK_CONFIG,
} = require('../../apps/backend/services/progression/promotionEngine');

function _unit(jobId, tier = 'captain') {
  return {
    id: `pg-${jobId}`,
    job_id: jobId,
    promotion_tier: tier,
    hp: 30,
    max_hp: 30,
    attack_mod: 0,
    defense_mod: 0,
    initiative: 0,
  };
}

function _attack(actor, target, turn, killed = false, damage = 0) {
  return {
    action_type: 'attack',
    actor_id: actor,
    target_id: target,
    turn,
    killed,
    damage_dealt: damage,
    result: killed ? 'kill' : 'hit',
  };
}

describe('Phase B4 — _mergeJobThreshold helper', () => {
  const CFG_OVERRIDE = {
    job_threshold_override: {
      custode: {
        elite: { assists_min: null, damage_taken_min: 30 },
        master: { assists_min: null, damage_taken_min: 75 },
      },
    },
  };

  test('returns base when no job_threshold_override in cfg', () => {
    const base = { kills_min: 18, assists_min: 6 };
    assert.deepEqual(_mergeJobThreshold(base, {}, { job_id: 'custode' }, 'elite'), base);
  });

  test('returns base when unit has no job_id', () => {
    const base = { kills_min: 18 };
    assert.deepEqual(_mergeJobThreshold(base, CFG_OVERRIDE, {}, 'elite'), base);
  });

  test('returns base when job_id unrecognized', () => {
    const base = { kills_min: 18, assists_min: 6 };
    assert.deepEqual(
      _mergeJobThreshold(base, CFG_OVERRIDE, { job_id: 'guerriero' }, 'elite'),
      base,
    );
  });

  test('returns base when tier override absent (e.g. veteran/captain)', () => {
    const base = { kills_min: 3 };
    assert.deepEqual(
      _mergeJobThreshold(base, CFG_OVERRIDE, { job_id: 'custode' }, 'veteran'),
      base,
    );
  });

  test('null value DELETES base gate', () => {
    const base = { kills_min: 18, assists_min: 6, objectives_min: 6 };
    const merged = _mergeJobThreshold(base, CFG_OVERRIDE, { job_id: 'custode' }, 'elite');
    assert.ok(!('assists_min' in merged), 'assists_min removed by null override');
    assert.equal(merged.kills_min, 18, 'base kills_min preserved');
    assert.equal(merged.objectives_min, 6, 'base objectives_min preserved');
  });

  test('numeric override ADDS new gate metric (damage_taken_min)', () => {
    const base = { kills_min: 18, assists_min: 6 };
    const merged = _mergeJobThreshold(base, CFG_OVERRIDE, { job_id: 'custode' }, 'elite');
    assert.equal(merged.damage_taken_min, 30, 'NEW damage_taken_min gate added');
  });
});

describe('Phase B4 — computeUnitMetrics damage_taken accumulator', () => {
  test('damage_taken aggregates from attack events targeting unit', () => {
    const unit = { id: 'pg', promotion_tier: 'base' };
    const events = [
      _attack('enemy1', 'pg', 1, false, 5),
      _attack('enemy2', 'pg', 2, false, 7),
      _attack('enemy1', 'pg', 3, false, 3),
    ];
    const m = computeUnitMetrics(unit, events);
    assert.equal(m.damage_taken, 15);
  });

  test('damage_taken does NOT include self-attack (defensive)', () => {
    const unit = { id: 'pg', promotion_tier: 'base' };
    const events = [
      _attack('pg', 'pg', 1, false, 10), // self-target — ignored
    ];
    const m = computeUnitMetrics(unit, events);
    assert.equal(m.damage_taken, 0);
  });

  test('damage_taken zero when no incoming attacks', () => {
    const unit = { id: 'pg', promotion_tier: 'base' };
    const events = [_attack('pg', 'enemy1', 1, false, 5)];
    const m = computeUnitMetrics(unit, events);
    assert.equal(m.damage_taken, 0);
  });
});

describe('Phase B4 — evaluatePromotion custode alt-path', () => {
  test('custode elite eligible via damage_taken_min (no assists needed)', () => {
    const custode = _unit('custode', 'captain');
    // Need 18 kills + 6 objectives + (NEW) damage_taken ≥ 30.
    // Original assists_min:6 OVERRIDDEN to null (removed gate).
    const events = [];
    for (let i = 0; i < 18; i++) {
      events.push(_attack('pg-custode', `e${i}`, i, true, 3));
    }
    // 6 objectives.
    for (let i = 0; i < 6; i++) {
      events.push({
        action_type: 'objective_complete',
        turn: 100 + i,
        actor_id: 'pg-custode',
        result: 'ok',
      });
    }
    // Receive 35 damage (above damage_taken_min=30 threshold).
    for (let i = 0; i < 7; i++) {
      events.push(_attack('foe', 'pg-custode', 200 + i, false, 5));
    }
    const r = evaluatePromotion(custode, events, FALLBACK_CONFIG);
    assert.equal(r.next_tier, 'elite');
    assert.equal(r.eligible, true, `expected eligible: ${r.reason}`);
  });

  test('custode elite BLOCKED when damage_taken below threshold', () => {
    const custode = _unit('custode', 'captain');
    const events = [];
    for (let i = 0; i < 18; i++) {
      events.push(_attack('pg-custode', `e${i}`, i, true, 3));
    }
    for (let i = 0; i < 6; i++) {
      events.push({
        action_type: 'objective_complete',
        turn: 100 + i,
        actor_id: 'pg-custode',
        result: 'ok',
      });
    }
    // Only 10 damage taken (below 30 threshold).
    for (let i = 0; i < 2; i++) {
      events.push(_attack('foe', 'pg-custode', 200 + i, false, 5));
    }
    const r = evaluatePromotion(custode, events, FALLBACK_CONFIG);
    assert.equal(r.eligible, false);
    assert.ok(r.reason.includes('damage_taken'), `reason should mention damage_taken: ${r.reason}`);
  });

  test('custode threshold preview excludes assists_min (deleted by override)', () => {
    const custode = _unit('custode', 'captain');
    const r = evaluatePromotion(custode, [], FALLBACK_CONFIG);
    assert.equal(r.next_tier, 'elite');
    assert.ok(!('assists_min' in r.threshold), 'assists_min removed for custode elite');
    assert.equal(r.threshold.damage_taken_min, 30);
    assert.equal(r.threshold.kills_min, 18, 'base kills_min preserved');
  });

  test('guerriero unaffected by custode override (different job)', () => {
    const guerriero = _unit('guerriero', 'captain');
    const r = evaluatePromotion(guerriero, [], FALLBACK_CONFIG);
    assert.equal(r.threshold.assists_min, 6, 'guerriero retains base assists_min');
    assert.ok(!('damage_taken_min' in r.threshold), 'guerriero has no damage_taken gate');
  });
});

describe('Phase B4 — custode master alt-path', () => {
  test('custode master requires damage_taken ≥ 75', () => {
    const custode = _unit('custode', 'elite');
    const r = evaluatePromotion(custode, [], FALLBACK_CONFIG);
    assert.equal(r.next_tier, 'master');
    assert.equal(r.threshold.damage_taken_min, 75);
    assert.ok(!('assists_min' in r.threshold));
  });
});
