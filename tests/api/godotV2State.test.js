// TKT-D2-C 2026-05-13 — Godot v2 CampaignState cross-stack service tests.
//
// Validates getState + upsertState round-trip + canonical shape conversion +
// validation edges (empty campaign_id rejection, default values fallback).
// Prisma client stubbed (no live DB required).

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const godotV2State = require('../../apps/backend/services/campaign/godotV2State');

function makeStub(rows = new Map()) {
  return {
    rows,
    godotV2CampaignState: {
      async findUnique({ where }) {
        return rows.get(where.campaignId) || null;
      },
      async upsert({ where, update, create }) {
        const existing = rows.get(where.campaignId);
        const merged = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { id: 'uuid-stub', ...create, updatedAt: new Date(), createdAt: new Date() };
        rows.set(where.campaignId, merged);
        return merged;
      },
    },
  };
}

test('getState returns null when no row exists', async () => {
  const stub = makeStub();
  const out = await godotV2State.getState('absent_campaign', { prisma: stub });
  assert.equal(out, null);
});

test('getState throws on empty campaign_id', async () => {
  const stub = makeStub();
  await assert.rejects(() => godotV2State.getState('', { prisma: stub }), /campaign_id required/);
  await assert.rejects(() => godotV2State.getState(null, { prisma: stub }), /campaign_id required/);
});

test('upsertState stores defaults when fields absent', async () => {
  const stub = makeStub();
  const out = await godotV2State.upsertState({ campaign_id: 'fresh' }, { prisma: stub });
  assert.equal(out.campaign_id, 'fresh');
  assert.deepEqual(out.wounds_by_unit, {});
  assert.deepEqual(out.status_locks, {});
  assert.equal(out.last_encounter_id, '');
  assert.deepEqual(out.promotion_tiers, {});
  assert.deepEqual(out.conviction_axes, {});
  assert.deepEqual(out.seasonal_state, {});
});

test('upsertState persists full payload + round-trips via getState', async () => {
  const stub = makeStub();
  const payload = {
    campaign_id: 'demo_001',
    wounds_by_unit: { pg_skiv_alpha: [{ kind: 'arm', severity: 'minor' }] },
    status_locks: { pg_pulverator: ['stunned'] },
    last_encounter_id: 'enc_savana_03',
    promotion_tiers: { pg_skiv_alpha: 'veteran' },
    conviction_axes: { pg_skiv_alpha: { utility: 60, liberty: 55, morality: 50 } },
    seasonal_state: { current_season: 'autumn', current_year: 2, current_phase: 'battle' },
  };
  const written = await godotV2State.upsertState(payload, { prisma: stub });
  assert.equal(written.campaign_id, 'demo_001');
  assert.equal(written.last_encounter_id, 'enc_savana_03');
  assert.equal(written.promotion_tiers.pg_skiv_alpha, 'veteran');

  const read = await godotV2State.getState('demo_001', { prisma: stub });
  assert.ok(read);
  assert.deepEqual(read.wounds_by_unit, payload.wounds_by_unit);
  assert.deepEqual(read.conviction_axes, payload.conviction_axes);
  assert.deepEqual(read.seasonal_state, payload.seasonal_state);
});

test('upsertState idempotent — second call overwrites', async () => {
  const stub = makeStub();
  await godotV2State.upsertState(
    { campaign_id: 'cid', promotion_tiers: { pg_a: 'base' } },
    { prisma: stub },
  );
  const out = await godotV2State.upsertState(
    { campaign_id: 'cid', promotion_tiers: { pg_a: 'veteran' } },
    { prisma: stub },
  );
  assert.equal(out.promotion_tiers.pg_a, 'veteran');
  assert.equal(stub.rows.size, 1, 'Single row via upsert');
});

test('upsertState rejects empty payload', async () => {
  const stub = makeStub();
  await assert.rejects(() => godotV2State.upsertState({}, { prisma: stub }), /campaign_id/);
  await assert.rejects(
    () => godotV2State.upsertState({ campaign_id: '' }, { prisma: stub }),
    /campaign_id/,
  );
  await assert.rejects(() => godotV2State.upsertState(null, { prisma: stub }), /payload required/);
});

test('_rowToShape converts camelCase row to snake_case JSON', () => {
  const row = {
    campaignId: 'X',
    woundsByUnit: { u: 1 },
    statusLocks: { u: ['s'] },
    lastEncounterId: 'enc',
    promotionTiers: { u: 'veteran' },
    convictionAxes: { u: {} },
    seasonalState: {},
    updatedAt: new Date('2026-05-13T00:00:00Z'),
  };
  const shape = godotV2State._rowToShape(row);
  assert.equal(shape.campaign_id, 'X');
  assert.equal(shape.last_encounter_id, 'enc');
  assert.equal(shape.promotion_tiers.u, 'veteran');
  assert.ok(shape.updated_at instanceof Date);
});
