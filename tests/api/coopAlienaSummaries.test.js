// 2026-05-20 — GET /api/coop/aliena-summaries readonly diagnostic route.
// Mirror pattern A6 listBiomeRoleDemands (gap-fill Explore quick-win discovery).
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
  listAlienaSummaries,
  STATIC_SUMMARIES,
  FALLBACK_SUMMARY,
} = require('../../apps/backend/services/coop/alienaGenerator');

function buildApp() {
  const lobby = new LobbyService();
  const coopStore = createCoopStore({ lobby });
  const app = express();
  app.use(express.json());
  app.use('/api', createLobbyRouter({ lobby }));
  app.use('/api', createCoopRouter({ lobby, coopStore }));
  return app;
}

test('GET /api/coop/aliena-summaries: returns count + items array', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/aliena-summaries');
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.count, 'number');
  assert.ok(Array.isArray(res.body.items));
  assert.equal(res.body.items.length, res.body.count);
});

test('GET /api/coop/aliena-summaries: count matches STATIC_SUMMARIES keys', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/aliena-summaries');
  assert.equal(res.body.count, Object.keys(STATIC_SUMMARIES).length);
});

test('GET /api/coop/aliena-summaries: each item exposes biome_id + summary + has_fallback', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/aliena-summaries');
  for (const item of res.body.items) {
    assert.equal(typeof item.biome_id, 'string');
    assert.ok(item.biome_id.length > 0);
    assert.equal(typeof item.summary, 'string');
    assert.ok(item.summary.length > 0, `${item.biome_id} summary must be non-empty`);
    assert.equal(typeof item.has_fallback, 'boolean');
  }
});

test('GET /api/coop/aliena-summaries: savana entry surfaces expected summary text (parity Godot v2 sample JSON)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/aliena-summaries');
  const savana = res.body.items.find((x) => x.biome_id === 'savana');
  assert.ok(savana, 'savana entry must be present');
  assert.ok(savana.summary.includes('Savana'));
  assert.equal(savana.has_fallback, false);
});

test('GET /api/coop/aliena-summaries: requires no auth (readonly diagnostic)', async () => {
  const app = buildApp();
  const res = await request(app).get('/api/coop/aliena-summaries');
  assert.equal(res.status, 200);
});

test('listAlienaSummaries: returned items do not leak mutations to STATIC_SUMMARIES (frozen source)', () => {
  const items = listAlienaSummaries();
  const savanaItem = items.find((x) => x.biome_id === 'savana');
  const originalSummary = STATIC_SUMMARIES.savana;
  savanaItem.summary = 'MUTATED';
  // STATIC_SUMMARIES is Object.freeze'd so mutation cannot leak; verify.
  assert.equal(STATIC_SUMMARIES.savana, originalSummary);
});

test('listAlienaSummaries: FALLBACK_SUMMARY exported as separate constant (not part of per-biome map)', () => {
  assert.equal(typeof FALLBACK_SUMMARY, 'string');
  assert.ok(FALLBACK_SUMMARY.length > 0);
  // No biome entry in STATIC_SUMMARIES is identical to FALLBACK_SUMMARY,
  // so all has_fallback flags must be false.
  const items = listAlienaSummaries();
  for (const item of items) {
    assert.equal(item.has_fallback, false, `${item.biome_id} should not equal FALLBACK_SUMMARY`);
  }
});
