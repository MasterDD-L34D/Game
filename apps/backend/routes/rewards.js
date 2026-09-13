// V2 Tri-Sorgente reward offer routes.
//
// Endpoints:
//   POST /api/rewards/offer   — build 3-card + skip offer
//   POST /api/rewards/skip    — acknowledge skip → +1 fragment
//   GET  /api/rewards/fragments — fragments per campaign
//
// Payload shape (POST /offer):
//   {
//     campaign_id, actor_id?, pool_id?,
//     roll_bucket?, personality?, recent_actions?,
//     dominant_tags?, acquired_counts?, roster_tags?,
//     seed?, offer_size?, temperature?
//   }

'use strict';

const fs = require('fs').promises;
const path = require('path');
const { Router } = require('express');
const {
  buildOffer,
  DEFAULT_TEMPERATURE,
  DEFAULT_OFFER_SIZE,
} = require('../services/rewards/rewardOffer');
const { loadPool } = require('../services/rewards/rewardPoolLoader');
const { addFragments, getFragments } = require('../services/rewards/skipFragmentStore');

// A-residual #2 (2026-04-27) — Reward auto-log telemetry JSONL.
// Mirror del pattern session.js appendTelemetryEvent (best-effort, non-blocking).
// Logs su `logs/telemetry_YYYYMMDD.jsonl` per analisi funnel reward_offer/skip.
const LOGS_DIR = path.resolve(__dirname, '../../../logs');
async function appendRewardTelemetry({ campaign_id, actor_id, type, payload }) {
  try {
    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const telemetryPath = path.join(LOGS_DIR, `telemetry_${yyyymmdd}.jsonl`);
    const entry = {
      ts: now.toISOString(),
      session_id: null,
      campaign_id: campaign_id || null,
      player_id: actor_id || null,
      type: type || 'unknown',
      payload: payload ?? null,
    };
    await fs.mkdir(LOGS_DIR, { recursive: true });
    await fs.appendFile(telemetryPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Non-blocking telemetry — never crash request on write failure.
  }
}

function createRewardsRouter() {
  const router = Router();

  router.post('/rewards/offer', (req, res) => {
    const {
      campaign_id,
      actor_id,
      pool_id,
      roll_bucket,
      personality,
      recent_actions,
      dominant_tags,
      acquired_counts,
      roster_tags,
      seed,
      offer_size,
      temperature,
    } = req.body || {};
    const poolDoc = loadPool(pool_id || 'reward_pool_mvp');
    if (!poolDoc) {
      return res.status(404).json({ error: `pool "${pool_id || 'reward_pool_mvp'}" non trovato` });
    }
    const result = buildOffer(poolDoc.cards, {
      rollBucket: roll_bucket,
      personality,
      recentActions: recent_actions,
      dominantTags: dominant_tags,
      acquiredCounts: acquired_counts,
      rosterTags: roster_tags,
      seed,
      offerSize: offer_size || DEFAULT_OFFER_SIZE,
      temperature: temperature || DEFAULT_TEMPERATURE,
    });
    // A-residual #2 — auto-log reward_offer event (funnel analysis input).
    appendRewardTelemetry({
      campaign_id: campaign_id || null,
      actor_id: actor_id || null,
      type: 'reward_offer',
      payload: {
        pool_id: poolDoc.pool_id,
        offer_size: result.offers.length,
        offer_ids: result.offers.map((o) => o?.id || null),
        skip_available: result.skip_available,
        roll_bucket: roll_bucket || null,
      },
    });
    res.json({
      campaign_id: campaign_id || null,
      actor_id: actor_id || null,
      pool_id: poolDoc.pool_id,
      offer_size: result.offers.length,
      offers: result.offers,
      skip_available: result.skip_available,
      skip_fragment_delta: result.skip_fragment_delta,
    });
  });

  router.post('/rewards/skip', (req, res) => {
    const { campaign_id, reason } = req.body || {};
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id richiesto' });
    const newCount = addFragments(campaign_id, 1, { reason: reason || 'skip_offer' });
    // A-residual #2 — auto-log reward_skip event (funnel analysis input).
    appendRewardTelemetry({
      campaign_id,
      actor_id: null,
      type: 'reward_skip',
      payload: {
        reason: reason || 'skip_offer',
        fragment_count: newCount,
      },
    });
    res.json({ campaign_id, fragment_count: newCount, delta: 1 });
  });

  router.get('/rewards/fragments', (req, res) => {
    const campaignId = req.query.campaign_id;
    if (!campaignId) return res.status(400).json({ error: 'campaign_id query richiesto' });
    const f = getFragments(campaignId);
    res.json({ campaign_id: campaignId, ...f });
  });

  return router;
}

module.exports = { createRewardsRouter };
