// RECON-04a (Fase-1 Spore) — cost-charging contract guard.
//
// Lock the invariant: PE/PI mutation cost is DISPLAY-ONLY in Fase-1 and NOT
// deducted from the unit store. Charging is deferred to M13.P3 progression
// integration, signaled by the response marker `cost_charging: 'deferred_m13_p3'`.
//
// Why this guard exists (harsh-review P0 #4): when M13.P3 wires real PE/PI
// charging, it MUST honor this marker. A naive wire that deducts PE/PI here —
// while the route already displays the cost — would SILENTLY DOUBLE-CHARGE.
// If a future change starts deducting unit.pe / unit.pi on apply, these
// assertions fail, forcing an explicit decision instead of a silent regression.
//
// Scope: contract only, no catalog edits (parallel-safe with RECON-02).
// G4 tdd-guard: no tool installed; this is a characterization/guard test of
// shipped behavior (asserts current invariant), so it lands GREEN by design.
//
// NOTE on path: placed in tests/api/ (not tests/routes/ as the plan §15 drafted)
// because scripts/run-test-api.cjs globs `tests/api/*.test.js` only — tests/routes/
// is not referenced by any runner (see ripple-audit doc §3, orphaned-glob finding).

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const DEFERRED = 'deferred_m13_p3';

test('cost-charging: /eligible carries deferred_m13_p3 marker (cost shown, not charged)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .post('/api/v1/mutations/eligible')
      .send({ unit: { id: 'u-cc-elig', trait_ids: ['denti_seghettati'] } })
      .expect(200);
    assert.equal(res.body.cost_charging, DEFERRED, 'eligible response declares deferred charging');
    const entry = res.body.eligible.find((e) => e.id === 'denti_bleed_to_chelate');
    assert.ok(entry, 'denti_bleed_to_chelate eligible (fixture sanity)');
  } finally {
    await close();
  }
});

test('cost-charging: /apply declares deferred_m13_p3 + displays PE/PI cost fields', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const unit = {
      id: 'u-cc-apply',
      trait_ids: ['denti_seghettati'],
      applied_mutations: [],
      mp: 20,
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'denti_bleed_to_chelate' })
      .expect(200);
    assert.equal(res.body.cost_charging, DEFERRED, 'apply response declares deferred charging');
    // Cost displayed (PE/PI present in payload — value may be number or null).
    assert.ok('pe_cost' in res.body, 'pe_cost displayed in response');
    assert.ok('pi_cost' in res.body, 'pi_cost displayed in response');
  } finally {
    await close();
  }
});

test('cost-charging: DOUBLE-CHARGE GUARD — apply deducts MP only, never PE/PI store', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // Unit carries explicit PE/PI store fields. Fase-1 must NOT touch them.
    const unit = {
      id: 'u-cc-guard',
      trait_ids: ['denti_seghettati'],
      applied_mutations: [],
      mp: 20,
      pe: 100,
      pi: 50,
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'denti_bleed_to_chelate' })
      .expect(200);

    // MP is the only currency actually charged in Fase-1.
    assert.equal(res.body.mp_spent, 8, 'MP charged (mp_cost denti_bleed_to_chelate = 8)');
    assert.equal(res.body.unit.mp, 12, 'unit.mp deducted 20 - 8 = 12');

    // PE / PI store untouched — charging deferred to M13.P3.
    assert.equal(
      res.body.unit.pe,
      100,
      'unit.pe NOT charged (deferred_m13_p3) — double-charge guard',
    );
    assert.equal(
      res.body.unit.pi,
      50,
      'unit.pi NOT charged (deferred_m13_p3) — double-charge guard',
    );
    assert.equal(res.body.cost_charging, DEFERRED, 'marker still present alongside guard');
  } finally {
    await close();
  }
});

test('cost-charging: back-compat — unit without mp/pe/pi still applies + marker present', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const unit = {
      id: 'u-cc-backcompat',
      trait_ids: ['denti_seghettati'],
      applied_mutations: [],
      // intentionally NO mp / pe / pi fields
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'denti_bleed_to_chelate' })
      .expect(200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.mp_spent, 0, 'no MP deducted when field absent (back-compat)');
    assert.equal(res.body.cost_charging, DEFERRED, 'marker present even on back-compat path');
    assert.equal(res.body.unit.pe, undefined, 'no synthetic pe introduced');
    assert.equal(res.body.unit.pi, undefined, 'no synthetic pi introduced');
  } finally {
    await close();
  }
});
