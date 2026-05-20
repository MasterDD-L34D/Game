// 2026-05-20 — Combat ennea-effects readonly diagnostic (A6 pattern,
// Explore quick-wins wave 6 #1).
// Mirror pattern combatReadonly.test.js (status-penalties + biome-modifiers).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createCombatRouter } = require('../../apps/backend/routes/combat');
const { listEnneaEffects, ENNEA_EFFECTS } = require('../../apps/backend/services/enneaEffects');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/combat', createCombatRouter());
  return app;
}

test('GET /api/combat/ennea-effects: returns count + items array', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/ennea-effects');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.count, 'number');
  assert.ok(Array.isArray(res.body.items));
  assert.equal(res.body.items.length, res.body.count);
});

test('GET /api/combat/ennea-effects: count matches ENNEA_EFFECTS keys (9/9 coverage)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/ennea-effects');
  assert.equal(res.body.count, Object.keys(ENNEA_EFFECTS).length);
  assert.equal(res.body.count, 9, '9/9 ennea archetype canonical coverage');
});

test('GET /api/combat/ennea-effects: each item exposes archetype + label + buffs + description', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/ennea-effects');
  for (const item of res.body.items) {
    assert.equal(typeof item.archetype, 'string');
    assert.ok(item.archetype.length > 0);
    assert.equal(typeof item.label, 'string');
    assert.ok(Array.isArray(item.buffs));
    assert.equal(typeof item.description, 'string');
  }
});

test('GET /api/combat/ennea-effects: items sorted alphabetically by archetype', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/ennea-effects');
  const archetypes = res.body.items.map((x) => x.archetype);
  const sorted = [...archetypes].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(archetypes, sorted);
});

test('GET /api/combat/ennea-effects: spot-check Coordinatore(2) defense buff', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/ennea-effects');
  const coord = res.body.items.find((x) => x.archetype === 'Coordinatore(2)');
  assert.ok(coord, 'Coordinatore(2) must be present');
  assert.equal(coord.label, 'Sinergia di Squadra');
  assert.equal(coord.buffs.length, 1);
  assert.equal(coord.buffs[0].stat, 'defense_mod');
  assert.equal(coord.buffs[0].amount, 1);
});

test('GET /api/combat/ennea-effects: no-auth (readonly diagnostic)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/ennea-effects');
  assert.equal(res.status, 200);
});

test('listEnneaEffects: defensive copy (mutation does not leak to ENNEA_EFFECTS)', () => {
  const items = listEnneaEffects();
  const coordItem = items.find((x) => x.archetype === 'Coordinatore(2)');
  const originalAmount = ENNEA_EFFECTS['Coordinatore(2)'].buffs[0].amount;
  coordItem.buffs[0].amount = 999;
  assert.equal(ENNEA_EFFECTS['Coordinatore(2)'].buffs[0].amount, originalAmount);
});

test('listEnneaEffects: all 9 canonical archetypes present', () => {
  const items = listEnneaEffects();
  const archetypes = items.map((x) => x.archetype);
  for (const arch of [
    'Conquistatore(3)',
    'Coordinatore(2)',
    'Esploratore(7)',
    'Architetto(5)',
    'Stoico(9)',
    'Cacciatore(8)',
  ]) {
    assert.ok(archetypes.includes(arch), `${arch} missing`);
  }
});
