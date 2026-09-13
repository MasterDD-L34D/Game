// 2026-05-20 — GET /api/coop/role-demands readonly diagnostic route.
// Mirror pattern A6 listStarterBiomas (gap-fill Explore quick-win discovery).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createLobbyRouter } = require('../../apps/backend/routes/lobby');
const { createCoopRouter } = require('../../apps/backend/routes/coop');
const { createCoopStore } = require('../../apps/backend/services/coop/coopStore');
const { LobbyService } = require('../../apps/backend/services/network/wsSession');
const {
  listBiomeRoleDemands,
  BIOME_ROLE_DEMANDS,
} = require('../../apps/backend/services/coop/ermesExporter');

function buildApp() {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const app = express();
  app.use(express.json());
  app.use('/api', createLobbyRouter({ lobby }));
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  return app;
}

test('GET /api/coop/role-demands: returns count + items array', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/role-demands');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.count, 'number');
  assert.ok(Array.isArray(res.body.items));
  assert.equal(res.body.items.length, res.body.count);
});

test('GET /api/coop/role-demands: count matches BIOME_ROLE_DEMANDS keys', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/role-demands');
  assert.equal(res.body.count, Object.keys(BIOME_ROLE_DEMANDS).length);
});

test('GET /api/coop/role-demands: each item exposes biome_id + roles_demanded + total_slots', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/role-demands');
  for (const item of res.body.items) {
    assert.equal(typeof item.biome_id, 'string');
    assert.ok(item.biome_id.length > 0);
    assert.equal(typeof item.roles_demanded, 'object');
    assert.equal(typeof item.total_slots, 'number');
    assert.ok(item.total_slots >= 1, `${item.biome_id} total_slots must be ≥1`);
  }
});

test('GET /api/coop/role-demands: savana entry exposes esploratore + guerriero (parity Godot)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/role-demands');
  const savana = res.body.items.find((x) => x.biome_id === 'savana');
  assert.ok(savana, 'savana entry must be present');
  assert.equal(savana.roles_demanded.esploratore, 1);
  assert.equal(savana.roles_demanded.guerriero, 1);
  assert.equal(savana.total_slots, 2);
});

test('GET /api/coop/role-demands: requires no auth (readonly diagnostic)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/role-demands');
  assert.equal(res.status, 200);
});

test('listBiomeRoleDemands: returned roles_demanded is a defensive copy (mutation does not leak to BIOME_ROLE_DEMANDS)', () => {
  const items = listBiomeRoleDemands();
  const savanaItem = items.find((x) => x.biome_id === 'savana');
  const originalEsploratore = BIOME_ROLE_DEMANDS.savana.esploratore;
  savanaItem.roles_demanded.esploratore = 99;
  assert.equal(BIOME_ROLE_DEMANDS.savana.esploratore, originalEsploratore);
});

test('listBiomeRoleDemands: total_slots correctly sums multi-role biomes (foresta_miceliale=2)', () => {
  const items = listBiomeRoleDemands();
  const foresta = items.find((x) => x.biome_id === 'foresta_miceliale');
  assert.ok(foresta);
  assert.equal(foresta.total_slots, 2); // tessitore: 2
  assert.equal(foresta.roles_demanded.tessitore, 2);
});
