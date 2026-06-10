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

  // FASE 3 P4: biome-level eco band surfaced in state (consumed by the biome chip).
  assert.equal(
    res.body.state?.ermes_band,
    'high',
    `expected state.ermes_band='high' for cryosteppe_convergence; state.ermes_band=${res.body.state?.ermes_band}`,
  );
});

// SPEC-I ER1 -- role gap wire: flag-gated (default OFF, spec sez.8: ON solo
// post N=40 GREEN). Con flag ON e party senza un ruolo demanded dal bioma,
// i nemici ricevono +1 soft (max-headroom stat) dentro il cap ER2.
test('ER1 flag ON: missing demanded role -> role_gap applied to enemy units only', async (t) => {
  process.env.ERMES_ROLE_GAP_ENABLED = 'true';
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    delete process.env.ERMES_ROLE_GAP_ENABLED;
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = (await getTutorialUnits(app)).map((u) =>
    u.controlled_by === 'player' ? { ...u, job: 'guerriero' } : u,
  );
  // badlands demand = { guerriero: 1, esploratore: 1 } -> esploratore mancante.
  const res = await request(app)
    .post('/api/session/start')
    .send({ units, biome_id: 'badlands' })
    .expect(200);

  const log = res.body.biomeCostsLog || [];
  const withGap = log.filter((e) => e.role_gap && e.role_gap.applied);
  assert.ok(withGap.length > 0, `expected role_gap entries; log=${JSON.stringify(log)}`);
  const playerIds = new Set(units.filter((u) => u.controlled_by === 'player').map((u) => u.id));
  for (const entry of withGap) {
    assert.ok(
      !playerIds.has(entry.unit_id),
      `role_gap must hit enemies only, got ${entry.unit_id}`,
    );
  }
});

test('ER1 flag OFF (default): no role_gap in log even with missing role', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const units = (await getTutorialUnits(app)).map((u) =>
    u.controlled_by === 'player' ? { ...u, job: 'guerriero' } : u,
  );
  const res = await request(app)
    .post('/api/session/start')
    .send({ units, biome_id: 'badlands' })
    .expect(200);

  const log = res.body.biomeCostsLog || [];
  assert.ok(
    log.every((e) => !e.role_gap),
    `expected no role_gap with flag OFF; log=${JSON.stringify(log)}`,
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
