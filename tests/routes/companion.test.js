// W5.5 — /api/companion/pick + /api/companion/pool route tests.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createCompanionRouter } = require('../../apps/backend/routes/companion');

function buildApp({ companionPicker } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api', createCompanionRouter({ companionPicker }));
  return app;
}

async function postJson(app, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        server.close();
        resolve({ status: res.status, body: data });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

async function getJson(app, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`);
        const data = await res.json();
        server.close();
        resolve({ status: res.status, body: data });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

// --- POST /api/companion/pick ---

test('POST /companion/pick missing biome_id → 400', async () => {
  const app = buildApp();
  const r = await postJson(app, '/api/companion/pick', {});
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'missing_biome_id');
});

test('POST /companion/pick savana with stub picker returns custode', async () => {
  const stubPicker = {
    pick: ({ biomeId }) => ({
      display_name: 'Vrak',
      species_id: 'dune_stalker',
      biome_origin_id: biomeId,
    }),
  };
  const app = buildApp({ companionPicker: stubPicker });
  const r = await postJson(app, '/api/companion/pick', { biome_id: 'savana' });
  assert.equal(r.status, 200);
  assert.equal(r.body.custode.display_name, 'Vrak');
  assert.equal(r.body.custode.biome_origin_id, 'savana');
});

test('POST /companion/pick passes form_axes + run_seed + trainer_canonical', async () => {
  let captured = null;
  const stubPicker = {
    pick: (opts) => {
      captured = opts;
      return { display_name: 'X' };
    },
  };
  const app = buildApp({ companionPicker: stubPicker });
  await postJson(app, '/api/companion/pick', {
    biome_id: 'caverna',
    form_axes: { T: 0.7 },
    run_seed: 42,
    trainer_canonical: true,
  });
  assert.equal(captured.biomeId, 'caverna');
  assert.deepEqual(captured.formAxes, { T: 0.7 });
  assert.equal(captured.runSeed, 42);
  assert.equal(captured.trainerCanonical, true);
});

test('POST /companion/pick picker throw → 500', async () => {
  const stubPicker = {
    pick: () => {
      throw new Error('pool unreadable');
    },
  };
  const app = buildApp({ companionPicker: stubPicker });
  const r = await postJson(app, '/api/companion/pick', { biome_id: 'savana' });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, 'companion_pick_failed');
});

// --- GET /api/companion/pool ---

test('GET /companion/pool missing biome_id → 400', async () => {
  const app = buildApp();
  const r = await getJson(app, '/api/companion/pool');
  assert.equal(r.status, 400);
});

test('GET /companion/pool savana returns archetype list', async () => {
  const stubPicker = {
    listArchetypesForBiome: (biomeId) => [{ id: 'dune_stalker', biome: biomeId }],
  };
  const app = buildApp({ companionPicker: stubPicker });
  const r = await getJson(app, '/api/companion/pool?biome_id=savana');
  assert.equal(r.status, 200);
  assert.equal(r.body.biome_id, 'savana');
  assert.equal(r.body.archetypes.length, 1);
  assert.equal(r.body.archetypes[0].id, 'dune_stalker');
});

test('GET /companion/pool absent listArchetypesForBiome → empty array', async () => {
  const stubPicker = { pick: () => ({}) }; // no listArchetypesForBiome
  const app = buildApp({ companionPicker: stubPicker });
  const r = await getJson(app, '/api/companion/pool?biome_id=savana');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.archetypes, []);
});
