// tests/api/jobs.test.js — FRICTION #4 discoverability endpoint + expansion wire
//
// Verifica base (7 job canonici):
//   - GET /api/jobs → lista 11 job (7 base + 4 expansion stalker/symbiont/beastmaster/aberrant)
//   - GET /api/jobs/skirmisher → dettaglio con abilities [dash_strike, evasive_maneuver, blade_flurry]
//   - GET /api/jobs/nonexistent → 404
//   - GET /api/jobs/skirmisher expose cost_ap/cost_pi/cost_pp per ability
// Verifica expansion (sprint 2026-04-25):
//   - GET /api/jobs/{stalker,symbiont,beastmaster,aberrant} → 3 abilities + status='expansion'
//   - progressionLoader.loadPerks() merges jobs_expansion.yaml.perks

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');

test('GET /api/jobs ritorna 11 job (7 base + 4 expansion) con signature_mechanic + ability_ids', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs');
  assert.equal(res.status, 200);
  assert.ok(res.body.jobs, 'body.jobs presente');
  assert.equal(res.body.count, 11, 'expected 11 job in catalog (7 base + 4 expansion)');
  const ids = res.body.jobs.map((j) => j.id).sort();
  assert.deepEqual(ids, [
    'aberrant',
    'artificer',
    'beastmaster',
    'harvester',
    'invoker',
    'ranger',
    'skirmisher',
    'stalker',
    'symbiont',
    'vanguard',
    'warden',
  ]);
  const skirm = res.body.jobs.find((j) => j.id === 'skirmisher');
  assert.ok(skirm.signature_mechanic);
  assert.ok(skirm.signature_mechanic.toLowerCase().includes('hit-and-run'));
  assert.deepEqual(skirm.ability_ids, ['dash_strike', 'evasive_maneuver', 'blade_flurry']);
  // Expansion job sentinel: status='expansion' bubbled from YAML
  const expansionIds = res.body.jobs
    .filter((j) => j.status === 'expansion')
    .map((j) => j.id)
    .sort();
  assert.deepEqual(expansionIds, ['aberrant', 'beastmaster', 'stalker', 'symbiont']);
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

// EXPANSION jobs (data/core/jobs_expansion.yaml — wave 2026-04-25 sprint).
// Loader merge additivo: 4 nuovi job + 48 perks (12/job).

test('GET /api/jobs/stalker (expansion) ritorna 3 abilities con effect_type validi', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/stalker');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'stalker');
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'damage');
  assert.equal(res.body.abilities.length, 3);
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, ['alpha_strike', 'silent_step', 'deathmark']);
});

test('GET /api/jobs/symbiont (expansion) abilities + role support', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/symbiont');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'support');
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, ['symbiotic_bond', 'shared_vitality', 'synaptic_burst']);
});

test('GET /api/jobs/beastmaster (expansion) abilities + role control', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/beastmaster');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'control');
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, ['summon_companion', 'pack_command', 'feral_sacrifice']);
});

test('GET /api/jobs/aberrant (expansion) abilities + role damage', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });

  const res = await request(app).get('/api/jobs/aberrant');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'expansion');
  assert.equal(res.body.role, 'damage');
  const ids = res.body.abilities.map((a) => a.ability_id);
  assert.deepEqual(ids, ['mutation_burst', 'phenotype_shift', 'aberrant_overdrive']);
});

test('progressionLoader.loadPerks() merges expansion perks (stalker level_2)', async () => {
  const {
    loadPerks,
    resetProgressionCache,
  } = require('../../apps/backend/services/progression/progressionLoader');
  resetProgressionCache();
  const perks = loadPerks();
  assert.ok(perks.jobs, 'perks.jobs presente');
  assert.ok(perks.jobs.stalker, 'stalker job perks merged');
  assert.ok(perks.jobs.stalker.perks, 'stalker.perks normalized');
  const lvl2 = perks.jobs.stalker.perks.level_2;
  assert.ok(lvl2, 'stalker level_2 entry');
  assert.ok(lvl2.perk_a && lvl2.perk_a.id, 'stalker level_2 perk_a.id');
  assert.ok(lvl2.perk_b && lvl2.perk_b.id, 'stalker level_2 perk_b.id');
  // Expansion perks coexist with base perks (skirmisher non rotto)
  assert.ok(perks.jobs.skirmisher, 'base skirmisher perks ancora presenti');
  assert.ok(perks.jobs.skirmisher.perks?.level_2?.perk_a?.id, 'skirmisher level_2 ancora intatto');
});
