// W5.5 — Companion picker REST endpoint.
//
// Exposes `apps/backend/services/companion/companionPicker.js` runtime
// for cross-stack consumption (Godot v2 phone composer character creation
// flow uses /api/companion/pick to fetch biome-conditioned suggestions).
//
// Endpoints:
//   POST /api/companion/pick    — runtime pick from skiv_archetype_pool.yaml
//   GET  /api/companion/pool    — debug: enumerate full pool for biome
//
// SPEC-F (Custode Portable Framework) store-backed surface — slices 0-2
// (read + propose, NO persisted mutation). Route PATHS per spec :51-52, served
// from this DI-clean router (NOT routes/skiv.js, the fs-json monitor):
//   GET  /api/skiv/share/:lineage_id?format=json       — share-safe export card
//   GET  /api/skiv/crossbreed/history/:lineage_id       — crossbreed log read
//   POST /api/skiv/crossbreed                           — offspring proposal
// Slice 3 (POST /crossbreed/confirm + cooldown/rate-limit) is gated on
// unanswered design-calls — NOT built here.
//
// Auth: stateless (read-only data lookup, no mutation). Future hardening
// can add JWT token check via shared AUTH_SECRET if exposed publicly.

'use strict';

const express = require('express');
const companionPickerDefault = require('../services/companion/companionPicker');
const { sanitizeWhitelist, signatureFor } = require('../services/skiv/companionStateStore');
const { rollMatingOffspring: rollMatingOffspringDefault } = require('../services/metaProgression');

function createCompanionRouter({
  companionPicker = companionPickerDefault,
  store = null,
  rollMatingOffspring = rollMatingOffspringDefault,
} = {}) {
  const router = express.Router();

  /**
   * POST /api/companion/pick
   * Body: { biome_id, form_axes?, run_seed?, trainer_canonical? }
   * Response: 200 { custode: {...} }
   *           400 { error: "missing_biome_id" }
   */
  router.post('/companion/pick', (req, res) => {
    const body = req.body || {};
    const biomeId = String(body.biome_id || '');
    if (!biomeId) {
      return res.status(400).json({ error: 'missing_biome_id' });
    }
    try {
      const custode = companionPicker.pick({
        biomeId,
        formAxes: body.form_axes && typeof body.form_axes === 'object' ? body.form_axes : {},
        runSeed: Number.isFinite(body.run_seed) ? body.run_seed : 0,
        trainerCanonical: Boolean(body.trainer_canonical),
      });
      return res.json({ custode });
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_pick_failed', message: String(err.message || err) });
    }
  });

  /**
   * GET /api/companion/pool?biome_id=savana
   * Debug-only enumeration of available archetypes for biome.
   * Response: 200 { biome_id, archetypes: [...] }
   *           400 { error: "missing_biome_id" }
   */
  router.get('/companion/pool', (req, res) => {
    const biomeId = String(req.query.biome_id || '');
    if (!biomeId) {
      return res.status(400).json({ error: 'missing_biome_id' });
    }
    try {
      const archetypes =
        typeof companionPicker.listArchetypesForBiome === 'function'
          ? companionPicker.listArchetypesForBiome(biomeId)
          : [];
      return res.json({ biome_id: biomeId, archetypes });
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_pool_failed', message: String(err.message || err) });
    }
  });

  // ─── SPEC-F slices 0-2: Custode portable store-backed routes ──────────
  //
  // Guard: these routes need the companion store singleton injected. When the
  // store is absent (e.g. a minimal test mounting only the picker) they return
  // 503 instead of throwing, so the picker routes above stay independent.
  function requireStore(res) {
    if (!store) {
      res.status(503).json({ error: 'companion_store_unavailable' });
      return false;
    }
    return true;
  }

  /**
   * GET /api/skiv/share/:lineage_id?format=json[&include_diary=true]
   *
   * Share-safe export card (SPEC-F export contract, spec :97-116). Returns the
   * sanitized whitelist subset only -- raw/ephemeral PII (session_id, hp_current,
   * _notes, ...) is dropped by sanitizeWhitelist. voice_diary_portable is
   * stripped to [] unless BOTH ?include_diary=true AND a stored consent boolean
   * are truthy (default opt-out, spec :135-138). Signature is recomputed
   * server-side via signatureFor (transport integrity, spec :111-114).
   *
   * format=json is the only supported format in v1 (qr/card = follow-up).
   */
  router.get('/skiv/share/:lineage_id', (req, res) => {
    if (!requireStore(res)) return;
    const lineageId = String(req.params.lineage_id || '');
    const format = req.query.format ? String(req.query.format) : 'json';
    if (format !== 'json') {
      return res.status(400).json({ error: 'unsupported_format', format });
    }
    let state;
    try {
      state = store.getCompanionState(lineageId);
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_share_failed', message: String(err.message || err) });
    }
    if (!state) {
      return res.status(404).json({ error: 'lineage_not_found' });
    }
    // Whitelist-only export (defense-in-depth; drops any PII present on state).
    const card = sanitizeWhitelist(state);
    // Diary opt-out enforcement: include only with consent AND explicit request.
    const includeDiary = String(req.query.include_diary || '') === 'true';
    const hasConsent = Boolean(state.voice_diary_consent);
    if (!includeDiary || !hasConsent) {
      card.voice_diary_portable = [];
    }
    card.generated_at = new Date().toISOString();
    // Recompute signature server-side over the final whitelist payload.
    card.companion_card_signature = signatureFor(card);
    return res.json(card);
  });

  /**
   * GET /api/skiv/crossbreed/history/:lineage_id
   *
   * Read-only crossbreed log. Returns [] (count 0) when the lineage is absent
   * (graceful, not an error -- mirrors store.getCrossbreedHistory).
   */
  router.get('/skiv/crossbreed/history/:lineage_id', (req, res) => {
    if (!requireStore(res)) return;
    const lineageId = String(req.params.lineage_id || '');
    let history;
    try {
      history = store.getCrossbreedHistory(lineageId) || [];
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_history_failed', message: String(err.message || err) });
    }
    return res.json({ lineage_id: lineageId, count: history.length, history });
  });

  /**
   * POST /api/skiv/crossbreed
   * Body: { lineage_id, partner_card_json, biome_id? }
   *
   * Crossbreed PROPOSAL (slice 2 -- NO store write). Steps:
   *   1. getCompanionState(lineage_id) -> 404 if missing.
   *   2. Verify partner card integrity: signatureFor(partner) must equal
   *      partner.companion_card_signature else 400 signature_mismatch.
   *   3. Biological gate: BOTH parents need species_id else 422
   *      crossbreed_requires_biological (narrative Custodi cannot breed,
   *      spec sez. 4 + reconstruction pt5).
   *   4. rollMatingOffspring({parentA: local, parentB: partner, biomeId,
   *      context:{useGeneEncoder:true}}) -- engine owns the genetics.
   *   5. Return {proposal, tier, visual_hints}. No persistence.
   *
   * partner_card_url fetch is deferred (SSRF -- v1 is JSON-only).
   */
  router.post('/skiv/crossbreed', (req, res) => {
    if (!requireStore(res)) return;
    const body = req.body || {};
    const lineageId = String(body.lineage_id || '');
    const partner = body.partner_card_json;
    if (!partner || typeof partner !== 'object') {
      return res.status(400).json({ error: 'partner_card_required' });
    }
    let local;
    try {
      local = store.getCompanionState(lineageId);
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_crossbreed_failed', message: String(err.message || err) });
    }
    if (!local) {
      return res.status(404).json({ error: 'lineage_not_found' });
    }
    // Step 2: verify partner signature (transport integrity).
    let expectedSig;
    try {
      expectedSig = signatureFor(partner);
    } catch (err) {
      return res
        .status(400)
        .json({ error: 'partner_card_invalid', message: String(err.message || err) });
    }
    if (partner.companion_card_signature !== expectedSig) {
      return res.status(400).json({ error: 'signature_mismatch' });
    }
    // Step 3: biological gate -- both parents must have species_id.
    if (!local.species_id || !partner.species_id) {
      return res.status(422).json({ error: 'crossbreed_requires_biological' });
    }
    // Step 4: roll offspring (engine-owned genetics, gene-encoder lineage chain).
    const biomeId = body.biome_id || local.biome_id || partner.biome_id || null;
    let result;
    try {
      result = rollMatingOffspring({
        parentA: local,
        parentB: partner,
        biomeId,
        context: { useGeneEncoder: true },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_crossbreed_failed', message: String(err.message || err) });
    }
    if (!result || result.success === false) {
      return res.status(422).json({
        error: 'crossbreed_rejected',
        reason: (result && result.reason) || 'unknown',
      });
    }
    // Step 5: propose only -- NO store write (slice 3 confirm is gated).
    return res.json({
      proposal: result.offspring,
      tier: result.tier,
      visual_hints: result.visual_hints,
    });
  });

  return router;
}

module.exports = { createCompanionRouter };
