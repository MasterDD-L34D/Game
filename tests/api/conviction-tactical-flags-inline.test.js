// GSD audit narrative-design GAP-002 fix — inline evasion/retreat flag
// enrichment in convictionEngine.evaluateConviction.
//
// Before: MOVE_EVASION + RETREAT_LOW_HP deltas read flags.evasion + flags.retreat
// from event payload but NO upstream pipeline set those flags. Tactical evader
// playstyles never registered conviction delta despite axis claiming to track.
//
// After: evaluateConviction pre-enriches events inline via
// _enrichTacticalFlags(events, units) walk:
// - flag.evasion: actor attacked target on turn N, moved away (Manhattan
//   distance to target_pos increases) on turn N or N+1
// - flag.retreat: actor moves when actor.hp ≤ 35% of max_hp

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  _enrichTacticalFlags,
  RETREAT_LOW_HP_RATIO,
  evaluateConviction,
  initialAxis,
} = require('../../apps/backend/services/convictionEngine');

const ALICE_UNIT = { id: 'alice', hp: 20, max_hp: 20 };
const BOB_UNIT = { id: 'bob', hp: 15, max_hp: 15 };

describe('_enrichTacticalFlags — evasion detection', () => {
  test('sets flags.evasion when move increases distance to last attack target', () => {
    const events = [
      {
        action_type: 'attack',
        actor_id: 'alice',
        target_id: 'enemy1',
        target_pos: { x: 5, y: 5 },
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 4, y: 5 },
        position_to: { x: 2, y: 5 }, // farther from enemy1 (5,5)
        turn: 1,
      },
    ];
    _enrichTacticalFlags(events, [ALICE_UNIT]);
    assert.equal(events[1].flags.evasion, true);
  });

  test('does NOT flag evasion when move advances toward target', () => {
    const events = [
      {
        action_type: 'attack',
        actor_id: 'alice',
        target_id: 'enemy1',
        target_pos: { x: 5, y: 5 },
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 3, y: 5 },
        position_to: { x: 4, y: 5 }, // CLOSER to enemy (advance)
        turn: 2,
      },
    ];
    _enrichTacticalFlags(events, [ALICE_UNIT]);
    assert.notEqual(events[1].flags?.evasion, true);
  });

  test('evasion window: only same turn OR next turn after attack', () => {
    const events = [
      {
        action_type: 'attack',
        actor_id: 'alice',
        target_id: 'enemy1',
        target_pos: { x: 5, y: 5 },
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 4, y: 5 },
        position_to: { x: 2, y: 5 },
        turn: 5, // 4 turns after attack — outside window
      },
    ];
    _enrichTacticalFlags(events, [ALICE_UNIT]);
    assert.notEqual(events[1].flags?.evasion, true, 'move 4 turns later not evasion');
  });

  test('no evasion when no prior attack from same actor', () => {
    const events = [
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 0, y: 0 },
        position_to: { x: 3, y: 3 },
        turn: 1,
      },
    ];
    _enrichTacticalFlags(events, [ALICE_UNIT]);
    assert.notEqual(events[0].flags?.evasion, true);
  });
});

describe('_enrichTacticalFlags — retreat detection', () => {
  test('flags.retreat when actor HP ≤ 35% of max_hp at move time', () => {
    // Alice max_hp=20, threshold = floor(20 * 0.35) = 7.
    // Receives 14 damage → hp=6 (below threshold) → move flagged retreat.
    const events = [
      {
        action_type: 'attack',
        actor_id: 'enemy1',
        target_id: 'alice',
        damage_dealt: 14,
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 0, y: 0 },
        position_to: { x: 1, y: 0 },
        turn: 2,
      },
    ];
    _enrichTacticalFlags(events, [ALICE_UNIT]);
    assert.equal(events[1].flags.retreat, true);
  });

  test('NO retreat flag when actor HP above threshold', () => {
    const events = [
      {
        action_type: 'attack',
        actor_id: 'enemy1',
        target_id: 'alice',
        damage_dealt: 5, // hp 20 → 15 (above threshold 7)
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 0, y: 0 },
        position_to: { x: 1, y: 0 },
        turn: 2,
      },
    ];
    _enrichTacticalFlags(events, [ALICE_UNIT]);
    assert.notEqual(events[1].flags?.retreat, true);
  });

  test('RETREAT_LOW_HP_RATIO is 0.35 (tunable constant exported)', () => {
    assert.equal(RETREAT_LOW_HP_RATIO, 0.35);
  });
});

describe('evaluateConviction — inline flag enrichment integration', () => {
  test('evader playstyle registers MOVE_EVASION conviction delta', () => {
    const events = [
      {
        action_type: 'attack',
        actor_id: 'alice',
        target_id: 'enemy1',
        target_pos: { x: 5, y: 5 },
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 4, y: 5 },
        position_to: { x: 1, y: 5 },
        turn: 1,
      },
    ];
    const result = evaluateConviction(events, [ALICE_UNIT]);
    const aliceAxis = result.alice;
    const base = initialAxis();
    // MOVE_EVASION delta is { liberty: +1, utility: +1 }.
    assert.ok(aliceAxis.liberty > base.liberty, 'liberty shifted upward');
    assert.ok(aliceAxis.utility > base.utility, 'utility shifted upward');
    assert.ok(aliceAxis.events_classified >= 1);
  });

  test('retreater registers RETREAT_LOW_HP conviction delta', () => {
    const events = [
      {
        action_type: 'attack',
        actor_id: 'enemy1',
        target_id: 'alice',
        damage_dealt: 16, // alice 20 → 4 (below 7 threshold)
        turn: 1,
      },
      {
        action_type: 'move',
        actor_id: 'alice',
        position_from: { x: 0, y: 0 },
        position_to: { x: 5, y: 0 },
        turn: 2,
      },
    ];
    const result = evaluateConviction(events, [ALICE_UNIT]);
    const aliceAxis = result.alice;
    const base = initialAxis();
    // RETREAT_LOW_HP delta is { utility: +2, morality: -1 }.
    assert.ok(aliceAxis.utility > base.utility, 'utility shifted upward (self-preservation)');
    assert.ok(aliceAxis.morality < base.morality, 'morality shifted downward');
  });

  test('baseline preserved when no tactical flags fire', () => {
    const events = []; // empty
    const result = evaluateConviction(events, [ALICE_UNIT]);
    const aliceAxis = result.alice;
    const base = initialAxis();
    assert.equal(aliceAxis.utility, base.utility);
    assert.equal(aliceAxis.liberty, base.liberty);
    assert.equal(aliceAxis.morality, base.morality);
    assert.equal(aliceAxis.events_classified, 0);
  });
});

describe('GSD audit — promotions.yaml balance tweaks', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const yaml = require('js-yaml');
  const promYamlPath = path.resolve(
    __dirname,
    '..',
    '..',
    'data',
    'core',
    'promotions',
    'promotions.yaml',
  );
  const promCfg = yaml.load(fs.readFileSync(promYamlPath, 'utf8'));

  test('esploratore elite init reduced 5 → 4 (over-tune fix)', () => {
    assert.equal(promCfg.job_archetype_bias.esploratore.elite.initiative_bonus, 4);
  });

  test('esploratore master init reduced 6 → 5', () => {
    assert.equal(promCfg.job_archetype_bias.esploratore.master.initiative_bonus, 5);
  });

  test('custode job_threshold_override defined (tank alt-path)', () => {
    assert.ok(promCfg.job_threshold_override);
    assert.ok(promCfg.job_threshold_override.custode);
    assert.equal(promCfg.job_threshold_override.custode.elite.assists_min, null);
    assert.equal(promCfg.job_threshold_override.custode.elite.damage_taken_min, 30);
    assert.equal(promCfg.job_threshold_override.custode.master.damage_taken_min, 75);
  });
});
