// 2026-05-20 — Combat readonly diagnostic routes (A6 pattern gap-fill
// Explore quick-wins wave 3 #2 + #4).
// Mirror pattern coopRoleDemands.test.js + coopAlienaSummaries.test.js.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createCombatRouter } = require('../../apps/backend/routes/combat');
const {
  listStatusPenalties,
  WOUNDED_PERMA_ATTACK_PENALTY,
  BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD,
} = require('../../apps/backend/services/combat/statusModifiers');
const { listBiomeModifiers } = require('../../apps/backend/services/combat/biomeModifiers');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/combat', createCombatRouter());
  return app;
}

// ===========================================================================
// status-penalties
// ===========================================================================

test('GET /api/combat/status-penalties: returns both tier tables', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/status-penalties');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.wounded_perma_attack_penalty));
  assert.ok(Array.isArray(res.body.bleeding_fracture_slow_down_threshold));
});

test('GET /api/combat/status-penalties: wounded_perma covers light/medium/severe', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/status-penalties');
  const severities = res.body.wounded_perma_attack_penalty.map((e) => e.severity);
  for (const s of ['light', 'medium', 'severe']) {
    assert.ok(severities.includes(s), `wounded_perma missing ${s}`);
  }
});

test('GET /api/combat/status-penalties: bleeding_fracture covers minor/medium/major', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/status-penalties');
  const severities = res.body.bleeding_fracture_slow_down_threshold.map((e) => e.severity);
  for (const s of ['minor', 'medium', 'major']) {
    assert.ok(severities.includes(s), `bleeding_fracture missing ${s}`);
  }
});

test('GET /api/combat/status-penalties: penalty values match source constants', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/status-penalties');
  for (const entry of res.body.wounded_perma_attack_penalty) {
    assert.equal(entry.penalty, WOUNDED_PERMA_ATTACK_PENALTY[entry.severity]);
  }
  for (const entry of res.body.bleeding_fracture_slow_down_threshold) {
    assert.equal(entry.triggers_slow_down, BLEEDING_FRACTURE_SLOW_DOWN_THRESHOLD[entry.severity]);
  }
});

test('GET /api/combat/status-penalties: no-auth (readonly diagnostic)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/status-penalties');
  assert.equal(res.status, 200);
});

test('listStatusPenalties: returned shape matches contract', () => {
  const data = listStatusPenalties();
  assert.ok(Array.isArray(data.wounded_perma_attack_penalty));
  assert.ok(Array.isArray(data.bleeding_fracture_slow_down_threshold));
  for (const e of data.wounded_perma_attack_penalty) {
    assert.equal(typeof e.severity, 'string');
    assert.equal(typeof e.penalty, 'number');
  }
  for (const e of data.bleeding_fracture_slow_down_threshold) {
    assert.equal(typeof e.severity, 'string');
    assert.equal(typeof e.triggers_slow_down, 'boolean');
  }
});

// ===========================================================================
// biome-modifiers
// ===========================================================================

test('GET /api/combat/biome-modifiers: returns count + items array', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/biome-modifiers');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.count, 'number');
  assert.ok(Array.isArray(res.body.items));
  assert.equal(res.body.items.length, res.body.count);
});

test('GET /api/combat/biome-modifiers: each item exposes diff_base + hp_mult + pressure_*', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/biome-modifiers');
  for (const item of res.body.items) {
    assert.equal(typeof item.biome_id, 'string');
    assert.ok(item.biome_id.length > 0);
    assert.equal(typeof item.diff_base, 'number');
    assert.equal(typeof item.hp_mult, 'number');
    assert.equal(typeof item.pressure_mult, 'number');
    assert.equal(typeof item.pressure_initial_bonus, 'number');
  }
});

test('GET /api/combat/biome-modifiers: no-auth (readonly diagnostic)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/combat/biome-modifiers');
  assert.equal(res.status, 200);
});

test('listBiomeModifiers: stable sort by biome_id', () => {
  const items = listBiomeModifiers();
  const ids = items.map((x) => x.biome_id);
  const sorted = [...ids].sort();
  assert.deepEqual(ids, sorted, 'items must be sorted by biome_id alphabetically');
});

test('listBiomeModifiers: gracefully handles empty registry', () => {
  const items = listBiomeModifiers({});
  assert.deepEqual(items, []);
});

test('listBiomeModifiers: SAFE_DEFAULTS for unknown biome in registry', () => {
  // Provide registry without any matching biome_id structure
  const items = listBiomeModifiers({ fake_biome: null });
  assert.equal(items.length, 1);
  // null biome cfg → returns SAFE_DEFAULTS
  assert.equal(items[0].diff_base, 1.0);
  assert.equal(items[0].hp_mult, 1.0);
});
