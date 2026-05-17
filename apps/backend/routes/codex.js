// Codex routes — Tunic decipher pages + glyph progression.
//
// Endpoints (campaign-scope, glyph progression — PR #1931):
//   GET  /api/codex/glyphs?campaign_id=X        — list glyphs with state
//   POST /api/codex/glyphs/increment             — { campaign_id, event, delta? }
//   GET  /api/codex/page/:pageId?campaign_id=X   — render page with glyph state
//
// Endpoints (session-scope, decipher pages — Bundle B.3):
//   GET  /api/v1/codex/pages?session_id=        — list pages with deciphered flag
//   POST /api/v1/codex/decipher                 — { session_id, page_id, trigger_data }
//
// Source: docs/research/2026-04-27-indie-concept-rubabili.md (Tunic).
// Decision: docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §H.4 ADOPT.
//
// Entrambi gli endpoint set coesistono — campaign-scope (long-lived glyph
// counter) e session-scope (per-session decipher state) sono complementari,
// non overlap. Glyph counter accumula cross-encounter (kill_species,
// enter_biome ecc), decipher pages = blurred→clear toggle per session
// corrente.

'use strict';

const { Router } = require('express');
const tunic = require('../services/codex/tunicGlyphs');
const codexState = require('../services/codex/codexState');

function createCodexRouter() {
  const router = Router();

  // ─── Campaign-scope glyph progression (PR #1931) ─────────────────────────

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

  // ─── Session-scope decipher pages (Bundle B.3) ───────────────────────────

  router.get('/v1/codex/pages', (req, res) => {
    const sessionId = req.query?.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id richiesto (query string)' });
    }
    const pages = codexState.listPagesForSession(String(sessionId));
    res.json({
      session_id: String(sessionId),
      pages,
      total: pages.length,
      deciphered_count: pages.filter((p) => p.deciphered).length,
    });
  });

  router.post('/v1/codex/decipher', (req, res) => {
    const body = req.body || {};
    const { session_id: sessionId, page_id: pageId, trigger_data: triggerData } = body;
    if (!sessionId) {
      return res.status(400).json({ error: 'session_id richiesto' });
    }
    if (!pageId) {
      return res.status(400).json({ error: 'page_id richiesto' });
    }
    const page = codexState.findPage(pageId);
    if (!page) {
      return res.status(404).json({ error: `page_id "${pageId}" non trovato` });
    }
    const valid = codexState.validateTrigger(page, triggerData || {});
    if (!valid) {
      return res.status(409).json({
        error: 'trigger_data non soddisfa decipher_trigger della pagina',
        code: 'TRIGGER_MISMATCH',
        expected: page.decipher_trigger || null,
      });
    }
    const { added } = codexState.markDeciphered(String(sessionId), pageId);
    res.json({
      session_id: String(sessionId),
      page_id: pageId,
      deciphered: true,
      newly_added: added,
      content: page.content_clear || '',
    });
  });

  return router;
}

module.exports = { createCodexRouter };
