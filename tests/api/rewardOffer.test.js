// V2 Tri-Sorgente reward offer tests

'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  buildOffer,
  scoreCard,
  rollComponent,
  personalityComponent,
  actionComponent,
  synergyBoost,
  duplicatePenalty,
  softmaxSample,
  createRng,
} = require('../../apps/backend/services/rewards/rewardOffer');
const {
  _resetStore,
  addFragments,
  getFragments,
} = require('../../apps/backend/services/rewards/skipFragmentStore');
const { createApp } = require('../../apps/backend/app');

// ─── Pure function tests ──────────────────────────────────────────────

test('createRng: deterministic with seed', () => {
  const r1 = createRng(42);
  const r2 = createRng(42);
  const s1 = [r1(), r1(), r1()];
  const s2 = [r2(), r2(), r2()];
  assert.deepEqual(s1, s2);
});

test('rollComponent: direct hit = 1.0, adjacent = 0.5, far = 0', () => {
  const card = { roll_bucket: 10 };
  assert.equal(rollComponent(card, 10), 1.0);
  assert.equal(rollComponent(card, 11), 0.5);
  assert.equal(rollComponent(card, 13), 0.5);
  assert.equal(rollComponent(card, 15), 0);
});

test('personalityComponent: matches MBTI + Ennea', () => {
  const card = {
    personality_weights: [
      { mbti: 'INTJ', weight: 1.0 },
      { ennea: '5', weight: 0.8 },
    ],
  };
  const score = personalityComponent(card, { mbti_type: 'INTJ', ennea_top_themes: ['5'] });
  assert.ok(score >= 1.8);
});

test('actionComponent: log-scaled by count', () => {
  const card = { action_affinities: [{ action: 'attack', weight: 1.0 }] };
  const low = actionComponent(card, { attack: 1 });
  const high = actionComponent(card, { attack: 10 });
  assert.ok(high > low);
  assert.ok(high < 10, 'log-scaled, not linear');
});

test('synergyBoost: tag overlap gives boost', () => {
  const card = { synergy_tags: ['offense', 'melee'] };
  assert.equal(synergyBoost(card, ['offense']), 0.5);
  assert.equal(synergyBoost(card, ['offense', 'melee']), 1.0);
  assert.equal(synergyBoost(card, ['defense']), 0);
});

test('duplicatePenalty: card already maxed out', () => {
  const card = { id: 'c1', max_copies: 1 };
  assert.equal(duplicatePenalty(card, { c1: 1 }), 1.0);
  assert.equal(duplicatePenalty(card, { c1: 0 }), 0);
});

test('scoreCard: composite score respects weights', () => {
  const card = { id: 'c1', rarity: 'common', roll_bucket: 10, synergy_tags: ['offense'] };
  const ctx = { rollBucket: 10, dominantTags: ['offense'] };
  const score = scoreCard(card, ctx);
  // base 1.0 + roll 1.0 + synergy 0.5 = 2.5
  assert.ok(score > 2.0, `expected >2.0, got ${score}`);
});

test('softmaxSample: respects n without replacement', () => {
  const scores = [1, 2, 3, 4, 5];
  const rng = createRng(42);
  const picked = softmaxSample(scores, 3, rng);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3, 'no duplicates');
});

test('buildOffer: returns 3 unique offers', () => {
  const pool = Array.from({ length: 10 }, (_, i) => ({
    id: `c${i}`,
    rarity: 'common',
    roll_bucket: i + 1,
    synergy_tags: ['offense'],
  }));
  const result = buildOffer(pool, { seed: 42, rollBucket: 5, dominantTags: ['offense'] });
  assert.equal(result.offers.length, 3);
  const ids = result.offers.map((o) => o.card.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal(result.skip_available, true);
  // 2026-04-26 #1870 — orphan currency cleanup: skip_fragment_delta resets to 0
  // (re-enable a 1 quando nest sink M10+ live).
  assert.equal(result.skip_fragment_delta, 0);
});

test('buildOffer: empty pool returns empty offers', () => {
  const result = buildOffer([], {});
  assert.equal(result.offers.length, 0);
  assert.equal(result.skip_available, false);
});

test('buildOffer: deterministic with seed', () => {
  const pool = Array.from({ length: 8 }, (_, i) => ({
    id: `c${i}`,
    rarity: 'common',
    roll_bucket: i + 1,
  }));
  const r1 = buildOffer(pool, { seed: 123, rollBucket: 4 });
  const r2 = buildOffer(pool, { seed: 123, rollBucket: 4 });
  assert.deepEqual(
    r1.offers.map((o) => o.card.id),
    r2.offers.map((o) => o.card.id),
  );
});

// ─── Skip fragment store ───────────────────────────────────────────────

test('skipFragmentStore: addFragments increments', () => {
  _resetStore();
  const total = addFragments('c1', 1, { reason: 'skip_offer' });
  assert.equal(total, 1);
  addFragments('c1', 2);
  const f = getFragments('c1');
  assert.equal(f.count, 3);
  assert.equal(f.history.length, 2);
});

// ─── Route integration ─────────────────────────────────────────────────

test('POST /api/rewards/offer: returns 3 offers from MVP pool', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/rewards/offer')
    .send({ campaign_id: 'c1', actor_id: 'u1', roll_bucket: 10, seed: 42 });
  assert.equal(res.status, 200);
  assert.equal(res.body.pool_id, 'reward_pool_mvp');
  assert.equal(res.body.offers.length, 3);
  assert.equal(res.body.skip_available, true);
});

test('POST /api/rewards/skip: increments fragments', async (t) => {
  _resetStore();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/rewards/skip').send({ campaign_id: 'c_test' });
  assert.equal(res.status, 200);
  assert.equal(res.body.fragment_count, 1);
});

test('POST /api/rewards/skip: missing campaign_id = 400', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app).post('/api/rewards/skip').send({});
  assert.equal(res.status, 400);
});

test('GET /api/rewards/fragments: returns count + history', async (t) => {
  _resetStore();
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  await request(app).post('/api/rewards/skip').send({ campaign_id: 'c_frag' });
  await request(app).post('/api/rewards/skip').send({ campaign_id: 'c_frag' });
  const res = await request(app).get('/api/rewards/fragments?campaign_id=c_frag');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.history.length, 2);
});

test('POST /api/rewards/offer: invalid pool_id = 404', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const res = await request(app)
    .post('/api/rewards/offer')
    .send({ pool_id: 'nonexistent', seed: 1 });
  assert.equal(res.status, 404);
});
