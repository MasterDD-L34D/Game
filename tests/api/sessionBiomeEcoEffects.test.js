'use strict';
// ERMES FASE 3 P1 — wire test: applyBiomeEcoEffects surfaces in /api/session/start response.
// ADR-2026-05-29: biomeCostsLog now carries { unit_id, adr21c, ermes, combined_delta, capped, biome_id, band }
// per-unit log. Tests: HIGH band present for cryosteppe_convergence; no log when biome_id absent.

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

async function getTutorialUnits(app) {
  const res = await request(app).get('/api/tutorial/enc_tutorial_01');
  assert.equal(res.status, 200, `tutorial load failed: ${res.status}`);
  return res.body.units;
}

test('session/start surfaces ERMES band in biomeCostsLog (cryosteppe HIGH)', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = await getTutorialUnits(app);

  const res = await request(app)
    .post('/api/session/start')
    .send({
      units,
      biome_id: 'cryosteppe_convergence',
    })
    .expect(200);

  assert.ok(
    Array.isArray(res.body.biomeCostsLog),
    `biomeCostsLog must be an array in response, got: ${JSON.stringify(res.body.biomeCostsLog)}`,
  );

  const high = res.body.biomeCostsLog.find((e) => e.band === 'high');
  assert.ok(
    high,
    `expected at least one log entry with band=high for cryosteppe_convergence; log=${JSON.stringify(res.body.biomeCostsLog)}`,
  );
});

test('session/start without biome_id -> no biome eco log', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = await getTutorialUnits(app);

  const res = await request(app).post('/api/session/start').send({ units }).expect(200);

  const log = res.body.biomeCostsLog;
  assert.ok(
    !log || (Array.isArray(log) && log.length === 0),
    `expected biomeCostsLog absent or empty when no biome_id; got: ${JSON.stringify(log)}`,
  );
});
