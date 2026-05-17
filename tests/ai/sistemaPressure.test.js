// tests/ai/sistemaPressure.test.js — AI War "AI Progress" pattern
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeSistemaTier,
  applyPressureDelta,
  SISTEMA_PRESSURE_TIERS,
} = require('../../apps/backend/routes/sessionHelpers');

// ── computeSistemaTier ──

test('computeSistemaTier: pressure 0 → Calm', () => {
  const tier = computeSistemaTier(0);
  assert.equal(tier.label, 'Calm');
  assert.equal(tier.intents_per_round, 1);
  assert.equal(tier.reinforcement_budget, 0);
});

test('computeSistemaTier: pressure 24 → still Calm', () => {
  assert.equal(computeSistemaTier(24).label, 'Calm');
});

test('computeSistemaTier: pressure 25 → Alert', () => {
  const tier = computeSistemaTier(25);
  assert.equal(tier.label, 'Alert');
  assert.equal(tier.intents_per_round, 2);
  assert.equal(tier.reinforcement_budget, 1);
});

test('computeSistemaTier: pressure 50 → Escalated', () => {
  assert.equal(computeSistemaTier(50).label, 'Escalated');
});

test('computeSistemaTier: pressure 75 → Critical', () => {
  const tier = computeSistemaTier(75);
  assert.equal(tier.label, 'Critical');
  assert.equal(tier.intents_per_round, 3);
});

test('computeSistemaTier: pressure 95 → Apex', () => {
  const tier = computeSistemaTier(95);
  assert.equal(tier.label, 'Apex');
  assert.equal(tier.reinforcement_budget, 4);
});

test('computeSistemaTier: pressure 100 (cap) → Apex', () => {
  assert.equal(computeSistemaTier(100).label, 'Apex');
});

test('computeSistemaTier: pressure 150 (overflow) → clamped to Apex', () => {
  assert.equal(computeSistemaTier(150).label, 'Apex');
});

test('computeSistemaTier: pressure -5 (underflow) → Calm', () => {
  assert.equal(computeSistemaTier(-5).label, 'Calm');
});

test('computeSistemaTier: NaN → Calm default', () => {
  assert.equal(computeSistemaTier(NaN).label, 'Calm');
  assert.equal(computeSistemaTier(undefined).label, 'Calm');
  assert.equal(computeSistemaTier(null).label, 'Calm');
});

// ── applyPressureDelta ──

test('applyPressureDelta: +15 from 0 → 15', () => {
  assert.equal(applyPressureDelta(0, 15), 15);
});

test('applyPressureDelta: -10 from 5 → clamped to 0', () => {
  assert.equal(applyPressureDelta(5, -10), 0);
});

test('applyPressureDelta: +20 from 90 → 100 (clamped)', () => {
  assert.equal(applyPressureDelta(90, 20), 100);
});

test('applyPressureDelta: NaN delta → no change', () => {
  assert.equal(applyPressureDelta(42, NaN), 42);
  assert.equal(applyPressureDelta(42, undefined), 42);
});

test('applyPressureDelta: NaN current → treated as 0', () => {
  assert.equal(applyPressureDelta(null, 15), 15);
  assert.equal(applyPressureDelta(undefined, 15), 15);
});

// ── SISTEMA_PRESSURE_TIERS contract ──

test('SISTEMA_PRESSURE_TIERS: 5 tiers monotonic thresholds', () => {
  assert.equal(SISTEMA_PRESSURE_TIERS.length, 5);
  for (let i = 1; i < SISTEMA_PRESSURE_TIERS.length; i++) {
    assert.ok(
      SISTEMA_PRESSURE_TIERS[i].threshold > SISTEMA_PRESSURE_TIERS[i - 1].threshold,
      `tier ${i} threshold must exceed tier ${i - 1}`,
    );
  }
});

test('SISTEMA_PRESSURE_TIERS: intents_per_round never decreases', () => {
  for (let i = 1; i < SISTEMA_PRESSURE_TIERS.length; i++) {
    assert.ok(
      SISTEMA_PRESSURE_TIERS[i].intents_per_round >=
        SISTEMA_PRESSURE_TIERS[i - 1].intents_per_round,
    );
  }
});

test('SISTEMA_PRESSURE_TIERS: reinforcement_budget strictly non-decreasing', () => {
  for (let i = 1; i < SISTEMA_PRESSURE_TIERS.length; i++) {
    assert.ok(
      SISTEMA_PRESSURE_TIERS[i].reinforcement_budget >=
        SISTEMA_PRESSURE_TIERS[i - 1].reinforcement_budget,
    );
  }
});
