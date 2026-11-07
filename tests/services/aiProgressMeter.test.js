// 2026-04-26 — aiProgressMeter tests (P0 Tier S AI War quick-win).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PRESSURE_TIERS,
  tierForPressure,
  nextTier,
  getProgressMeterState,
} = require('../../apps/backend/services/ai/aiProgressMeter');

test('PRESSURE_TIERS: 5 tier coverage 0/25/50/75/95', () => {
  assert.equal(PRESSURE_TIERS.length, 5);
  assert.equal(PRESSURE_TIERS[0].name, 'Calm');
  assert.equal(PRESSURE_TIERS[4].name, 'Apex');
});

test('tierForPressure: 0 -> Calm', () => {
  const t = tierForPressure(0);
  assert.equal(t.name, 'Calm');
  assert.equal(t.intents_per_round, 1);
});

test('tierForPressure: 50 -> Escalated', () => {
  const t = tierForPressure(50);
  assert.equal(t.name, 'Escalated');
  assert.equal(t.intents_per_round, 3);
});

test('tierForPressure: 100+ clamps to Apex', () => {
  const t = tierForPressure(150);
  assert.equal(t.name, 'Apex');
  assert.equal(t.pressure_value, 100);
});

test('tierForPressure: NaN safe -> Calm', () => {
  const t = tierForPressure(NaN);
  assert.equal(t.name, 'Calm');
});

test('nextTier: 0 -> Alert (25)', () => {
  const next = nextTier(0);
  assert.equal(next.name, 'Alert');
  assert.equal(next.threshold, 25);
});

test('nextTier: 95 (Apex) -> null', () => {
  assert.equal(nextTier(95), null);
});

test('getProgressMeterState: empty session -> Calm baseline', () => {
  const out = getProgressMeterState(null);
  assert.equal(out.pressure, 0);
  assert.equal(out.tier.name, 'Calm');
  assert.equal(out.next_tier.name, 'Alert');
  assert.equal(out.distance_to_next, 25);
});

test('getProgressMeterState: session pressure 60 -> Escalated', () => {
  const session = { sistema_pressure: 60, events: [] };
  const out = getProgressMeterState(session);
  assert.equal(out.pressure, 60);
  assert.equal(out.tier.name, 'Escalated');
  assert.equal(out.next_tier.name, 'Critical');
  assert.equal(out.distance_to_next, 15);
});

test('getProgressMeterState: history extracts pressure-tagged events', () => {
  const session = {
    sistema_pressure: 30,
    events: [
      { turn: 1, action_type: 'attack', pressure: 10 },
      { turn: 2, action_type: 'kill', pressure: 30 },
      { turn: 3, action_type: 'move' }, // no pressure -> skipped
    ],
  };
  const out = getProgressMeterState(session);
  assert.equal(out.history.length, 2);
  assert.equal(out.history[0].pressure, 10);
  assert.equal(out.history[1].pressure, 30);
});

test('getProgressMeterState: Apex pressure 100 -> next_tier null', () => {
  const session = { sistema_pressure: 100, events: [] };
  const out = getProgressMeterState(session);
  assert.equal(out.tier.name, 'Apex');
  assert.equal(out.next_tier, null);
  assert.equal(out.distance_to_next, null);
});
