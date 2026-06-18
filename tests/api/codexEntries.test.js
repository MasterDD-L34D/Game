// SPEC-H — A.L.I.E.N.A. 6-dim Codex entries API.
//
// Serves the diegetic Codex content from data/codex/{id}.yaml (shared 6-dim
// schema with the authoring gate). SPEC-H sez.8 invariant: the coherence SCORE
// is `secret` (engine-only, computed by alienaCoherence.js, NOT in these
// files) -- this route must only surface PUBLIC lore. Unlock-state is
// client-side (localStorage) per the hades-schema doc; the route serves
// content + unlock metadata (triggers / locked_preview), not per-player state.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

const ALIENA_DIMENSION_KEYS = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

test('GET /api/v1/codex/entries lists codex entry summaries', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/codex/entries').expect(200);
    assert.ok(Array.isArray(res.body.entries), 'entries is an array');
    assert.equal(typeof res.body.total, 'number');
    const dune = res.body.entries.find((e) => e.id === 'dune_stalker');
    assert.ok(dune, 'dune_stalker summary present');
    assert.equal(dune.type, 'species');
    assert.ok(dune.display_name_it, 'has display_name_it');
    assert.ok(dune.unlock, 'has unlock block');
    assert.ok(Array.isArray(dune.unlock.triggers), 'unlock.triggers is array');
    assert.ok(dune.unlock.locked_preview, 'has locked_preview for the obscured state');
  } finally {
    await close();
  }
});

test('GET /api/v1/codex/entries/:id returns the full 6-dim A.L.I.E.N.A. entry', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/v1/codex/entries/dune_stalker').expect(200);
    const entry = res.body.entry;
    assert.ok(entry, 'entry present');
    assert.equal(entry.id, 'dune_stalker');
    assert.ok(entry.aliena_dimensions, 'has aliena_dimensions');
    for (const key of ALIENA_DIMENSION_KEYS) {
      assert.ok(entry.aliena_dimensions[key], `dimension ${key} present`);
      assert.ok(entry.aliena_dimensions[key].content, `dimension ${key} has content`);
    }
    assert.ok(entry.skiv_instance_note, 'has Skiv-instance note footer');
  } finally {
    await close();
  }
});

test('GET /api/v1/codex/entries/:id 404 on unknown id', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    await request(app).get('/api/v1/codex/entries/not_a_real_entry').expect(404);
  } finally {
    await close();
  }
});

test('codex entries never leak a coherence score (SPEC-H sez.8 secret)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const list = await request(app).get('/api/v1/codex/entries').expect(200);
    const detail = await request(app).get('/api/v1/codex/entries/dune_stalker').expect(200);
    const blob = JSON.stringify(list.body) + JSON.stringify(detail.body);
    for (const secret of ['aggregate', 'sub_scores', 'coherence', 'enforcement_factor']) {
      assert.ok(!blob.includes(secret), `secret field '${secret}' must not be serialized`);
    }
  } finally {
    await close();
  }
});
