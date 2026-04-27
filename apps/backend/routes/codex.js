// Codex routes — Tunic decipher pages + glyph progression.
//
// Endpoints:
//   GET  /api/codex/glyphs?campaign_id=X        — list glyphs with state
//   POST /api/codex/glyphs/increment             — { campaign_id, event, delta? }
//   GET  /api/codex/page/:pageId?campaign_id=X   — render page with glyph state
//
// Source: docs/research/2026-04-27-indie-concept-rubabili.md (Tunic).
// Decision: docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §H.4 ADOPT.

'use strict';

const { Router } = require('express');
const tunic = require('../services/codex/tunicGlyphs');

function createCodexRouter() {
  const router = Router();

  router.get('/codex/glyphs', (req, res) => {
    const campaignId = req.query.campaign_id;
    if (!campaignId) return res.status(400).json({ error: 'campaign_id query richiesto' });
    const glyphs = tunic.listGlyphsForCampaign(campaignId);
    const state = tunic.getCodexState(campaignId);
    res.json({
      campaign_id: campaignId,
      glyphs,
      counters: state.counters,
      unlocked_count: state.unlocked.length,
      total_count: glyphs.length,
    });
  });

  router.post('/codex/glyphs/increment', (req, res) => {
    const { campaign_id, event, delta = 1 } = req.body || {};
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id richiesto' });
    if (!event) return res.status(400).json({ error: 'event richiesto' });
    const result = tunic.incrementCounter(campaign_id, event, delta);
    res.json({
      campaign_id,
      event,
      delta: Number(delta) || 0,
      counter: result.counter,
      unlocked_new: result.unlocked_new,
    });
  });

  router.get('/codex/page/:pageId', (req, res) => {
    const campaignId = req.query.campaign_id;
    if (!campaignId) return res.status(400).json({ error: 'campaign_id query richiesto' });
    const page = tunic.getPage(req.params.pageId, campaignId);
    if (!page) return res.status(404).json({ error: `page '${req.params.pageId}' non trovata` });
    res.json({ campaign_id: campaignId, page });
  });

  return router;
}

module.exports = { createCodexRouter };
