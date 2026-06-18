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

// HA5 (sez.7/8): the Codex surfaces a DIEGETIC descriptor derived from a
// codex-native proxy. It is DETAIL-ONLY (not on list summaries), the raw proxy
// stays secret, and the bands are archival-completeness (renamed post-2026-06-18
// audit: the proxy measures authoring completeness, not ecological fit).
const VALID_DESCRIPTORS = ['scheda completa', 'scheda parziale', 'scheda frammentaria'];
const PUBLIC_ENTRY_KEYS = [
  'id',
  'type',
  'display_name_it',
  'display_name_en',
  'subtitle_it',
  'unlock',
  'aliena_dimensions',
  'skiv_instance_note',
  'variants',
  'traits_core',
  'traits_optional',
  'synergies',
];

test('HA5 descriptor is detail-only, archival-honest, and never leaks the raw score', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const list = await request(app).get('/api/v1/codex/entries').expect(200);
    // Descriptor is detail-only -> must NOT appear on list summaries.
    for (const e of list.body.entries) {
      assert.equal(e.presence_descriptor, undefined, 'list summary carries no descriptor');
    }

    const detail = await request(app).get('/api/v1/codex/entries/dune_stalker').expect(200);
    assert.ok(
      VALID_DESCRIPTORS.includes(detail.body.presence_descriptor),
      'descriptor is diegetic',
    );
    assert.equal(detail.body.presence_descriptor, 'scheda completa'); // fully authored

    // Raw proxy must NOT leak under any field name (allowlist guard, both routes).
    const blob = JSON.stringify(list.body) + JSON.stringify(detail.body);
    for (const secret of ['aggregate', 'sub_scores', 'coherence', 'enforcement_factor']) {
      assert.ok(!blob.includes(secret), `secret '${secret}' must not be serialized`);
    }
  } finally {
    await close();
  }
});

test('detail entry is projected to the public allowlist (fail-closed secret guard)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const list = await request(app).get('/api/v1/codex/entries').expect(200);
    // Fetch the detail of EVERY listed entry and assert no unknown top-level key.
    for (const summary of list.body.entries) {
      const res = await request(app)
        .get(`/api/v1/codex/entries/${encodeURIComponent(summary.id)}`)
        .expect(200);
      for (const key of Object.keys(res.body.entry)) {
        assert.ok(
          PUBLIC_ENTRY_KEYS.includes(key),
          `entry '${summary.id}' exposes non-allowlisted key '${key}'`,
        );
      }
    }
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

// 2026-06-18 audit follow-up (Codex P2 on #2839): the top-level allowlist keeps
// PUBLIC containers whole, so a secret under a NESTED key would still serialize.
// projectPublicEntry now scrubs secret-named keys at ANY depth.
test('projectPublicEntry drops top-level unknown AND nested secret-named keys', () => {
  const { projectPublicEntry } = require('../../apps/backend/services/codex/codexEntries');
  const crafted = {
    id: 'x_test',
    type: 'species',
    display_name_it: 'Test',
    alien_fit: 0.9, // top-level unknown -> dropped by allowlist
    aliena_dimensions: {
      E_ecologia: {
        heading: 'Ecologia',
        content: 'public lore',
        coherence: 0.8, // NESTED secret -> dropped by scrub
        sub_scores: { plausibilita: 1 }, // nested secret container -> dropped
      },
      A_ancoraggio_narrativo: { heading: 'Anc', content: 'lore', story_hook_it: 'h' },
    },
  };
  const projected = projectPublicEntry(crafted);
  const blob = JSON.stringify(projected);
  assert.equal(projected.alien_fit, undefined, 'top-level unknown dropped');
  assert.equal(
    projected.aliena_dimensions.E_ecologia.coherence,
    undefined,
    'nested coherence scrubbed',
  );
  assert.equal(
    projected.aliena_dimensions.E_ecologia.sub_scores,
    undefined,
    'nested sub_scores scrubbed',
  );
  for (const secret of ['alien_fit', 'coherence', 'sub_scores', 'plausibilita']) {
    assert.ok(!blob.includes(secret), `secret '${secret}' must not survive projection`);
  }
  // public content survives + the dimension key A_ancoraggio_narrativo is NOT scrubbed.
  assert.equal(projected.aliena_dimensions.E_ecologia.content, 'public lore');
  assert.ok(
    projected.aliena_dimensions.A_ancoraggio_narrativo,
    'dimension key preserved (exact-match scrub)',
  );
});
