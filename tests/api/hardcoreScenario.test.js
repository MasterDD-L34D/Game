// Test enc_tutorial_06_hardcore encounter + session /start con modulation=full
// ADR-2026-04-17 PR 4 co-op scaling hardcore.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');

test('GET /api/tutorial/enc_tutorial_06_hardcore returns 14 units + recommended modulation', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/tutorial/enc_tutorial_06_hardcore').expect(200);
    assert.equal(res.body.id, 'enc_tutorial_06_hardcore');
    assert.equal(res.body.difficulty_rating, 6);
    assert.equal(res.body.recommended_modulation, 'full');
    assert.equal(res.body.sistema_pressure_start, 85); // iter 2: 75→85
    assert.ok(Array.isArray(res.body.units));
    // iter 2: rimosso 3° elite, totale 8 player + 6 enemy = 14.
    assert.equal(res.body.units.length, 14);
    const players = res.body.units.filter((u) => u.controlled_by === 'player');
    const enemies = res.body.units.filter((u) => u.controlled_by === 'sistema');
    assert.equal(players.length, 8);
    assert.equal(enemies.length, 6);
    const boss = enemies.find((u) => u.id === 'e_apex_boss');
    assert.ok(boss);
    assert.equal(boss.hp, 40); // iter 2: 22→40
    assert.equal(boss.mod, 3); // iter 4 (M14-C): 5→3 per compensare elevation +30%
    assert.equal(boss.guardia, 4); // iter 2: 3→4
    assert.equal(boss.attack_range, 3); // iter 2: 2→3
    assert.ok(boss.traits.includes('ondata_psichica'), 'iter 2 AOE trait');
    const elite3 = enemies.find((u) => u.id === 'e_elite_hunter_3');
    assert.ok(!elite3, 'iter 2: third elite removed');
  } finally {
    await close();
  }
});

test('GET /api/tutorial lists hardcore scenario', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/tutorial').expect(200);
    assert.ok(Array.isArray(res.body.scenarios));
    const hc = res.body.scenarios.find((s) => s.id === 'enc_tutorial_06_hardcore');
    assert.ok(hc, 'hardcore scenario listed');
    assert.equal(hc.difficulty, 6);
  } finally {
    await close();
  }
});

test('GET /api/tutorial/enc_tutorial_06_hardcore_quartet returns 4p + 6e + boss hp 22', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .get('/api/tutorial/enc_tutorial_06_hardcore_quartet')
      .expect(200);
    assert.equal(res.body.id, 'enc_tutorial_06_hardcore_quartet');
    assert.equal(res.body.recommended_modulation, 'quartet');
    assert.ok(Array.isArray(res.body.units));
    assert.equal(res.body.units.length, 10); // 4 player + 6 enemy
    const players = res.body.units.filter((u) => u.controlled_by === 'player');
    const enemies = res.body.units.filter((u) => u.controlled_by === 'sistema');
    assert.equal(players.length, 4);
    assert.equal(enemies.length, 6);
    const boss = enemies.find((u) => u.id === 'e_apex_boss');
    assert.equal(boss.hp, 22, 'iter 5A quartet: boss hp 40→22 balanced');
  } finally {
    await close();
  }
});

test('POST /api/session/start with hardcore units + modulation=full → grid 10x10', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sc = await request(app).get('/api/tutorial/enc_tutorial_06_hardcore').expect(200);
    const res = await request(app)
      .post('/api/session/start')
      .send({
        units: sc.body.units,
        sistema_pressure_start: sc.body.sistema_pressure_start,
        modulation: sc.body.recommended_modulation,
        hazard_tiles: sc.body.hazard_tiles,
      })
      .expect(200);
    const state = await request(app)
      .get(`/api/session/state?session_id=${res.body.session_id}`)
      .expect(200);
    assert.equal(state.body.grid?.width, 10);
    assert.equal(state.body.grid?.height, 10);
    assert.equal(state.body.grid_size, 10);
    assert.equal(state.body.units.length, 14); // iter 2: 15→14
    assert.equal(state.body.sistema_pressure, 85); // iter 2: 75→85
  } finally {
    await close();
  }
});

// M14-C 2026-04-26 — elevation populate smoke. Verifica che il field sopravviva
// normalisation (session.js) e sia leggibile post-spawn.
// Raw scenario units espongono elevation solo per unit vantage-point; post-
// normaliseUnit in /session/start tutte le unit hanno elevation integer (default 0).
// iter3 post-calibration: solo BOSS mantiene elevation 1, elite scesi a ground.
test('GET hardcore_06 raw units: BOSS vantage = 1, elite + player ground = 0', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app).get('/api/tutorial/enc_tutorial_06_hardcore').expect(200);
    const boss = res.body.units.find((u) => u.id === 'e_apex_boss');
    const elite1 = res.body.units.find((u) => u.id === 'e_elite_hunter_1');
    const elite2 = res.body.units.find((u) => u.id === 'e_elite_hunter_2');
    const p0 = res.body.units.find((u) => u.controlled_by === 'player');
    assert.equal(boss.elevation, 1, 'BOSS su altare rialzato');
    assert.equal(elite1.elevation, 0, 'iter3: elite 1 scesa a ground');
    assert.equal(elite2.elevation, 0, 'iter3: elite 2 scesa a ground');
    assert.equal(p0.elevation, 0, 'player ground floor (explicit)');
  } finally {
    await close();
  }
});

test('POST session start preserva elevation attraverso normalization', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const sc = await request(app).get('/api/tutorial/enc_tutorial_06_hardcore').expect(200);
    const res = await request(app)
      .post('/api/session/start')
      .send({
        units: sc.body.units,
        sistema_pressure_start: sc.body.sistema_pressure_start,
        modulation: sc.body.recommended_modulation,
        hazard_tiles: sc.body.hazard_tiles,
      })
      .expect(200);
    const state = await request(app)
      .get(`/api/session/state?session_id=${res.body.session_id}`)
      .expect(200);
    const boss = state.body.units.find((u) => u.id === 'e_apex_boss');
    const p0 = state.body.units.find((u) => u.controlled_by === 'player');
    const minion = state.body.units.find((u) => u.id === 'e_minion_1');
    assert.equal(boss.elevation, 1, 'elevation survive normalise in session state');
    assert.equal(p0.elevation, 0, 'player elevation=0 preserved');
    // minion senza elevation esplicita → default 0 post-normalise.
    assert.equal(minion.elevation, 0, 'unit senza elevation esplicita → 0');
  } finally {
    await close();
  }
});

test('GET hardcore_07 patrol leader elevation=1 (vedetta)', async () => {
  const { app, close } = createApp({ databasePath: null });
  try {
    const res = await request(app)
      .get('/api/tutorial/enc_tutorial_07_hardcore_pod_rush')
      .expect(200);
    const leader = res.body.units.find((u) => u.id === 'e_patrol_leader');
    const p0 = res.body.units.find((u) => u.controlled_by === 'player');
    assert.equal(leader.elevation, 1);
    assert.equal(p0.elevation, 0);
  } finally {
    await close();
  }
});
