// RECON-02 (Fase-1 Spore) — derived_ability_id emergence contract.
//
// S2 part->ability: when a mutation catalog entry has a non-null
// `derived_ability_id`, applying it must surface that id on the response AND
// unlock it into `unit.abilities[]` (applyMutationPure, mutationEngine.js:161-167).
//
// RECON-02 populated 12/36 entries (cross-category, non-symbiotic,
// non-Manual_apply_only). The remaining 24 stay null (partial authoring debt,
// documented). This test locks the emergence wiring.
//
// Placed in tests/api/ (route-level integration) because scripts/run-test-api.cjs
// globs `tests/api/*.test.js`; tests/services/ is NOT in any CI runner glob
// (same orphaned-glob finding as RECON-04a ripple-audit §3.3). The route path
// exercises the full wiring (route -> applyMutationPure -> catalog).
//
// G4 tdd-guard: characterization of shipped wiring + new content (GREEN by
// design). Content-only ticket bypass per plan §G4 Option B.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('POST /apply: populated derived_ability_id unlocks into unit.abilities (S2)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // denti_bleed_to_chelate -> derived_ability_id: denti_chelatanti (RECON-02).
    const unit = {
      id: 'u-da',
      trait_ids: ['denti_seghettati'],
      applied_mutations: [],
      mp: 20,
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'denti_bleed_to_chelate' })
      .expect(200);

    assert.equal(
      res.body.derived_ability_id,
      'denti_chelatanti',
      'derived ability surfaced on response',
    );
    assert.ok(Array.isArray(res.body.unit.abilities), 'abilities array present on updated unit');
    assert.ok(
      res.body.unit.abilities.includes('denti_chelatanti'),
      'derived ability unlocked into unit.abilities[]',
    );
  } finally {
    await close();
  }
});

test('POST /apply: derived ability not duplicated when already present (idempotent unlock)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const unit = {
      id: 'u-da-idem',
      trait_ids: ['denti_seghettati'],
      applied_mutations: [],
      abilities: ['denti_chelatanti'],
      mp: 20,
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'denti_bleed_to_chelate' })
      .expect(200);

    const count = res.body.unit.abilities.filter((a) => a === 'denti_chelatanti').length;
    assert.equal(count, 1, 'ability present exactly once (no duplicate)');
  } finally {
    await close();
  }
});

test('POST /apply: un-populated mutation yields null derived_ability_id (partial-authoring back-compat)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    // occhi_tension_to_kinetic stays derived_ability_id: null (24/36 unpopulated).
    const unit = {
      id: 'u-null',
      trait_ids: ['occhi_analizzatori_di_tensione'],
      applied_mutations: [],
      mp: 20,
    };
    const res = await request(app)
      .post('/api/v1/mutations/apply')
      .send({ unit, mutation_id: 'occhi_tension_to_kinetic' })
      .expect(200);

    assert.equal(res.body.derived_ability_id, null, 'null derived id when not authored');
    const abilities = res.body.unit.abilities || [];
    assert.ok(
      !abilities.includes('occhi_cinetici'),
      'no synthetic ability unlocked for null entry',
    );
  } finally {
    await close();
  }
});
