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

const { Router } = require('express');
const {
  buildOffer,
  DEFAULT_TEMPERATURE,
  DEFAULT_OFFER_SIZE,
} = require('../services/rewards/rewardOffer');
const { loadPool } = require('../services/rewards/rewardPoolLoader');
const { addFragments, getFragments } = require('../services/rewards/skipFragmentStore');

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
