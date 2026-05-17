// Sprint Spore Moderate (ADR-2026-04-26 §S3) — mpTracker pool unit tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initUnit,
  accrueEncounter,
  spend,
  resetForRun,
  TIER_MEDIUM_MP,
  KILL_STATUS_MP,
  BIOME_MATCH_MP,
  MP_POOL_MAX,
} = require('../../apps/backend/services/mutations/mpTracker');

test('initUnit: sets default mp=5 + mp_earned_total=0 (idempotent)', () => {
  const u = {};
  initUnit(u);
  assert.equal(u.mp, 5);
  assert.equal(u.mp_earned_total, 0);
  // Re-call: no overwrite
  u.mp = 17;
  initUnit(u);
  assert.equal(u.mp, 17);
});

test('accrueEncounter: tier 2 win → +2 MP', () => {
  const u = { mp: 0 };
  const r = accrueEncounter(u, { tier: 2 });
  assert.equal(r.earned, TIER_MEDIUM_MP);
  assert.equal(u.mp, 2);
  assert.ok(r.sources.some((s) => s.startsWith('tier_2_clear')));
});

test('accrueEncounter: kill with status → +1 MP', () => {
  const u = { mp: 0 };
  const r = accrueEncounter(u, { tier: 1, kill_with_status: true });
  assert.equal(r.earned, KILL_STATUS_MP);
  assert.equal(u.mp, 1);
});

test('accrueEncounter: biome match → +1 MP', () => {
  const u = { mp: 0 };
  const r = accrueEncounter(u, { tier: 1, biome_affinity_match: true });
  assert.equal(r.earned, BIOME_MATCH_MP);
  assert.equal(u.mp, 1);
});

test('accrueEncounter: full bonus stack tier3+kill+biome → 4 MP', () => {
  const u = { mp: 0 };
  const r = accrueEncounter(u, {
    tier: 3,
    kill_with_status: true,
    biome_affinity_match: true,
  });
  assert.equal(r.earned, TIER_MEDIUM_MP + KILL_STATUS_MP + BIOME_MATCH_MP);
  assert.equal(u.mp, 4);
  assert.equal(r.sources.length, 3);
});

test('accrueEncounter: tier 1 only no bonus → +0 MP', () => {
  const u = { mp: 5 };
  const r = accrueEncounter(u, { tier: 1 });
  assert.equal(r.earned, 0);
  assert.equal(u.mp, 5);
});

test('accrueEncounter: cap at MP_POOL_MAX (capped flag set)', () => {
  const u = { mp: MP_POOL_MAX - 1 };
  const r = accrueEncounter(u, { tier: 3, kill_with_status: true, biome_affinity_match: true });
  assert.equal(u.mp, MP_POOL_MAX);
  assert.equal(r.capped, true);
});

test('accrueEncounter: tracks mp_earned_total cumulative (uncapped counter)', () => {
  const u = { mp: 0, mp_earned_total: 0 };
  accrueEncounter(u, { tier: 2 }); // +2
  accrueEncounter(u, { tier: 2, kill_with_status: true }); // +3
  assert.equal(u.mp_earned_total, 5);
});

test('spend: deducts and returns ok=true when sufficient', () => {
  const u = { mp: 10 };
  const r = spend(u, 8);
  assert.equal(r.ok, true);
  assert.equal(r.spent, 8);
  assert.equal(u.mp, 2);
});

test('spend: insufficient funds → no deduct + ok=false', () => {
  const u = { mp: 3 };
  const r = spend(u, 8);
  assert.equal(r.ok, false);
  assert.equal(r.spent, 0);
  assert.equal(u.mp, 3);
});

test('resetForRun: pool back to default 5', () => {
  const u = { mp: 22, mp_earned_total: 100 };
  resetForRun(u);
  assert.equal(u.mp, 5);
  assert.equal(u.mp_earned_total, 0);
});
