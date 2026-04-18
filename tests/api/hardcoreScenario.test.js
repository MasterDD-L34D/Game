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
    assert.equal(boss.mod, 5); // iter 2: 4→5
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
