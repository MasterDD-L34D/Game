// SPEC-I ER6 (ratificato 2026-06-10, opzione C) -- StressWave event-trigger
// bounded: wave session-local (baseline + escalation_rate * turno) sui dati
// biomes.yaml finora dormienti; al PRIMO crossing di una soglia scatta UN
// evento one-shot (rescue = heal player bounded, overrun = +1 reinforcement
// budget SIS). Flag STRESSWAVE_EVENTS_ENABLED default OFF (gate N=40, sez.8).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeWave,
  checkCrossings,
  applyStressWaveTick,
  RESCUE_HEAL_HP,
  OVERRUN_BUDGET_BONUS,
} = require('../../apps/backend/services/combat/stressWave');

const CFG = {
  baseline: 0.36,
  escalation_rate: 0.06,
  event_thresholds: { rescue: 0.58, overrun: 0.82 },
};

function mkSession(turn, biomeId = 'abisso_vulcanico') {
  return {
    session_id: 's1',
    turn,
    biome_id: biomeId,
    units: [
      { id: 'p1', controlled_by: 'player', hp: 5, max_hp: 10 },
      { id: 'p2', controlled_by: 'player', hp: 9, max_hp: 10 },
      { id: 'dead', controlled_by: 'player', hp: 0, max_hp: 10 },
      { id: 'e1', controlled_by: 'sistema', hp: 8, max_hp: 8 },
    ],
    events: [],
  };
}

test('computeWave: baseline + escalation*turn, clamped to [0,1]', () => {
  assert.ok(Math.abs(computeWave(CFG, 0) - 0.36) < 1e-9);
  assert.ok(Math.abs(computeWave(CFG, 4) - 0.6) < 1e-9);
  assert.equal(computeWave(CFG, 100), 1);
  assert.equal(computeWave(null, 5), 0);
});

test('checkCrossings: fires each threshold ONCE, in order, when wave crosses', () => {
  // turn 4 -> wave 0.60 >= rescue 0.58, < overrun 0.82
  const first = checkCrossings(CFG, 4, {});
  assert.deepEqual(
    first.map((e) => e.event),
    ['rescue'],
  );
  // same turn, rescue already triggered -> nothing
  assert.deepEqual(checkCrossings(CFG, 4, { rescue: true }), []);
  // turn 8 -> wave 0.84 >= overrun; rescue already done -> only overrun
  const second = checkCrossings(CFG, 8, { rescue: true });
  assert.deepEqual(
    second.map((e) => e.event),
    ['overrun'],
  );
  // both crossed in one jump (e.g. late join): both fire, rescue first
  const both = checkCrossings(CFG, 8, {});
  assert.deepEqual(
    both.map((e) => e.event),
    ['rescue', 'overrun'],
  );
});

test('applyStressWaveTick: flag OFF (default) -> no-op', () => {
  delete process.env.STRESSWAVE_EVENTS_ENABLED;
  const s = mkSession(10);
  const out = applyStressWaveTick(s);
  assert.equal(out, null);
  assert.equal(s.units[0].hp, 5);
  assert.equal(s.stresswaveTriggered, undefined);
});

test('applyStressWaveTick flag ON: rescue heals living players (cap max_hp), one-shot', (t) => {
  process.env.STRESSWAVE_EVENTS_ENABLED = 'true';
  t.after(() => delete process.env.STRESSWAVE_EVENTS_ENABLED);
  const s = mkSession(4); // wave 0.60 -> rescue
  const out = applyStressWaveTick(s);
  assert.ok(out && out.fired.includes('rescue'));
  assert.equal(s.units[0].hp, 5 + RESCUE_HEAL_HP); // p1 healed
  assert.equal(s.units[1].hp, 10); // p2 capped at max_hp
  assert.equal(s.units[2].hp, 0); // dead stays dead
  assert.equal(s.units[3].hp, 8); // enemy untouched
  assert.equal(s.stresswaveTriggered.rescue, true);
  assert.ok(s.stresswave_event_latest && s.stresswave_event_latest.event === 'rescue');
  const ev = s.events.find((e) => e.action_type === 'stresswave_event');
  assert.ok(ev && ev.result === 'rescue' && ev.turn === 4);
  // re-tick same turn -> nothing new
  const again = applyStressWaveTick(s);
  assert.equal(again, null);
});

test('applyStressWaveTick flag ON: overrun arms one-shot reinforcement bonus', (t) => {
  process.env.STRESSWAVE_EVENTS_ENABLED = 'true';
  t.after(() => delete process.env.STRESSWAVE_EVENTS_ENABLED);
  const s = mkSession(8);
  s.stresswaveTriggered = { rescue: true }; // already fired earlier
  const out = applyStressWaveTick(s);
  assert.ok(out && out.fired.includes('overrun'));
  assert.equal(s._stresswaveOverrunBonus, OVERRUN_BUDGET_BONUS);
  assert.equal(s.stresswaveTriggered.overrun, true);
});

test('applyStressWaveTick: biome without stresswave config -> no-op (flag ON)', (t) => {
  process.env.STRESSWAVE_EVENTS_ENABLED = 'true';
  t.after(() => delete process.env.STRESSWAVE_EVENTS_ENABLED);
  const s = mkSession(10, 'biome_inesistente_xyz');
  assert.equal(applyStressWaveTick(s), null);
});
