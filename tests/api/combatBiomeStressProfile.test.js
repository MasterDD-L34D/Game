// 2026-06-01 — Combat biome-stress-profile readonly diagnostic (A6 pattern).
// Surfaces the DEAD biomes.yaml fields (stresswave / hazard stress_modifiers /
// narrative / npc_archetypes) — catalog-mapping-audit §4. Mirror of
// combatReadonly.test.js. Read-only, band-neutral.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createCombatRouter } = require('../../apps/backend/routes/combat');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/combat', createCombatRouter());
  return app;
}

test('GET /api/combat/biome-stress-profiles: returns count + items array', async () => {
  const res = await request(buildApp()).get('/api/combat/biome-stress-profiles');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.count, 'number');
  assert.ok(Array.isArray(res.body.items));
  assert.equal(res.body.items.length, res.body.count);
  assert.ok(res.body.count > 0, 'at least one biome');
});

test('GET /api/combat/biome-stress-profiles: each item exposes the surfaced fields', async () => {
  const res = await request(buildApp()).get('/api/combat/biome-stress-profiles');
  for (const item of res.body.items) {
    assert.equal(typeof item.biome_id, 'string');
    assert.ok('stresswave' in item);
    assert.ok('hazard_severity' in item);
    assert.ok('stress_modifiers' in item);
    assert.ok('narrative' in item);
    assert.ok('npc_archetypes' in item);
  }
});

test('GET /api/combat/biome-stress-profiles: at least one biome carries a stresswave block', async () => {
  const res = await request(buildApp()).get('/api/combat/biome-stress-profiles');
  const withStresswave = res.body.items.filter(
    (i) => i.stresswave && i.stresswave.baseline != null,
  );
  assert.ok(withStresswave.length > 0, 'stresswave.baseline surfaced for at least one biome');
});

test('GET /api/combat/biome-stress-profile/:id: returns the single biome profile', async () => {
  const app = buildApp();
  const list = await request(app).get('/api/combat/biome-stress-profiles');
  const firstId = list.body.items[0].biome_id;
  const res = await request(app).get(`/api/combat/biome-stress-profile/${firstId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.biome_id, firstId);
  assert.ok('stresswave' in res.body);
});

test('GET /api/combat/biome-stress-profile/:id: 404 for an unknown biome', async () => {
  const res = await request(buildApp()).get('/api/combat/biome-stress-profile/__nope__');
  assert.equal(res.status, 404);
  assert.ok(res.body.error);
});
