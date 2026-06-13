// TKT-D2-C 2026-05-13 — Godot v2 CampaignState cross-stack service.
//
// Mirror Godot Resource shape (scripts/session/campaign_state.gd):
//   campaign_id + wounds_by_unit + status_locks + last_encounter_id
//   + promotion_tiers (TKT-M15) + conviction_axes (TKT-M14-B)
//   + seasonal_state (TKT-P2 Brigandine).
//
// Write-through adapter: Godot client serializes full Resource → JSON
// + PUTs snapshot, backend stores atomically via upsert by campaign_id.
// Server is ground truth for multi-device + co-op sessions; client
// falls back to user://campaigns/<id>/state.json on offline / 404.
//
// Injectable prisma client so tests stub without live DB.

'use strict';

let _defaultPrisma = null;

function _resolvePrisma(injected) {
  if (injected) return injected;
  if (_defaultPrisma) return _defaultPrisma;
  // Lazy require — keeps service test-injectable without forcing prisma
  // engine boot when callers pass their own.
  _defaultPrisma = require('../../db/prisma').prisma;
  return _defaultPrisma;
}

// Returns null when no row exists (caller falls back to baseline).
async function getState(campaignId, { prisma } = {}) {
  if (!campaignId || typeof campaignId !== 'string') {
    throw new Error('campaign_id required (non-empty string)');
  }
  const client = _resolvePrisma(prisma);
  const row = await client.godotV2CampaignState.findUnique({ where: { campaignId } });
  if (!row) return null;
  return _rowToShape(row);
}

// Upsert by campaign_id. Returns persisted row in canonical shape.
async function upsertState(payload, { prisma } = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload required (object)');
  }
  const campaignId = String(payload.campaign_id || '').trim();
  if (!campaignId) {
    throw new Error('campaign_id required (non-empty string)');
  }
  const data = {
    woundsByUnit: payload.wounds_by_unit || {},
    statusLocks: payload.status_locks || {},
    lastEncounterId: String(payload.last_encounter_id || ''),
    promotionTiers: payload.promotion_tiers || {},
    convictionAxes: payload.conviction_axes || {},
    seasonalState: payload.seasonal_state || {},
  };
  const client = _resolvePrisma(prisma);
  const row = await client.godotV2CampaignState.upsert({
    where: { campaignId },
    update: data,
    create: { campaignId, ...data },
  });
  return _rowToShape(row);
}

// Converts Prisma row → Godot Resource JSON shape (snake_case).
function _rowToShape(row) {
  return {
    campaign_id: row.campaignId,
    wounds_by_unit: row.woundsByUnit,
    status_locks: row.statusLocks,
    last_encounter_id: row.lastEncounterId,
    promotion_tiers: row.promotionTiers,
    conviction_axes: row.convictionAxes,
    seasonal_state: row.seasonalState,
    updated_at: row.updatedAt,
  };
}

module.exports = {
  getState,
  upsertState,
  _rowToShape, // exported for unit tests
};
