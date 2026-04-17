// tests/api/jobs.test.js — FRICTION #4 discoverability endpoint
//
// Verifica:
//   - GET /api/jobs → lista 7 job (skirmisher, vanguard, warden, artificer, invoker, ranger, harvester)
//   - GET /api/jobs/skirmisher → dettaglio con abilities [dash_strike, evasive_maneuver, blade_flurry]
//   - GET /api/jobs/nonexistent → 404
//   - GET /api/jobs/skirmisher expose cost_ap/cost_pi/cost_pp per ability

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /api/jobs ritorna 7 job con signature_mechanic + ability_ids', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs');
  assert.equal(res.status, 200);
  assert.ok(res.body.jobs, 'body.jobs presente');
  assert.equal(res.body.count, 7, 'expected 7 job in catalog');
  const ids = res.body.jobs.map((j) => j.id).sort();
  assert.deepEqual(ids, [
    'artificer',
    'harvester',
    'invoker',
    'ranger',
    'skirmisher',
    'vanguard',
    'warden',
  ]);
  const skirm = res.body.jobs.find((j) => j.id === 'skirmisher');
  assert.ok(skirm.signature_mechanic);
  assert.ok(skirm.signature_mechanic.toLowerCase().includes('hit-and-run'));
  assert.deepEqual(skirm.ability_ids, ['dash_strike', 'evasive_maneuver', 'blade_flurry']);
});

test('GET /api/jobs/skirmisher ritorna abilities con cost + effect_type', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/skirmisher');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'skirmisher');
  assert.equal(res.body.role, 'damage');
  assert.ok(Array.isArray(res.body.abilities));
  assert.equal(res.body.abilities.length, 3);
  const dash = res.body.abilities.find((a) => a.ability_id === 'dash_strike');
  assert.ok(dash, 'dash_strike presente');
  assert.equal(dash.cost_ap, 2);
  assert.equal(dash.cost_pi, 3);
  assert.equal(dash.effect_type, 'move_attack');
  assert.equal(dash.move_distance, 2);
  assert.equal(dash.rank, 1);
});

test('GET /api/jobs/vanguard abilities includono shield_bash + taunt + fortify', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/vanguard');
  assert.equal(res.status, 200);
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, ['shield_bash', 'taunt', 'fortify']);
  const fortify = res.body.abilities.find((a) => a.ability_id === 'fortify');
  assert.equal(fortify.rank, 2);
  assert.equal(fortify.cost_pt, 3);
});

test('GET /api/jobs/nonexistent → 404 con error message', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/nonexistent');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
  assert.ok(res.body.error.includes('nonexistent'));
});
