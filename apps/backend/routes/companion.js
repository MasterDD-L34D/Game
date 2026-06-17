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
//   POST /api/skiv/crossbreed                           — offspring proposal (+ crossbreed_seed)
//   POST /api/skiv/crossbreed/confirm                   — commit (persist + cooldown + rate-limit)
// Slice 3 policies are ADR-2026-04-27 ratified (cooldown 1/campaign, rate-limit
// 10/h IP, history FIFO cap 10) -- impl of ratified defaults, no open design-call.
//
// Auth: stateless (read-only data lookup, no mutation). Future hardening
// can add JWT token check via shared AUTH_SECRET if exposed publicly.

'use strict';

const express = require('express');
const crypto = require('crypto');
const companionPickerDefault = require('../services/companion/companionPicker');
const { sanitizeWhitelist, signatureFor } = require('../services/skiv/companionStateStore');
const { rollMatingOffspring: rollMatingOffspringDefault } = require('../services/metaProgression');

// SPEC-F slice 3 -- crossbreed offspring is rolled by the engine, but with a
// SEEDED rng so the proposal preview (slice 2) and the committed confirm
// (slice 3) produce the SAME offspring (genre signal: fusion preview-integrity).
// mulberry32: a tiny self-contained deterministic stream from a 32-bit seed
// (the combat pseudoRng is a process-global cursor, wrong shape for a per-request
// seed). The proposal returns its seed; confirm reuses it.
function makeSeededRng(seed) {
  let a = Number(seed) >>> 0 || 1;
  return function seededRng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomCrossbreedSeed() {
  return crypto.randomBytes(4).readUInt32BE(0);
}

// ADR-2026-04-27 ratified defaults: crossbreed rate-limit 10/h per IP.
const CROSSBREED_RATE_LIMIT = 10;
const CROSSBREED_RATE_WINDOW_MS = 60 * 60 * 1000;

function createCompanionRouter({
  companionPicker = companionPickerDefault,
  store = null,
  rollMatingOffspring = rollMatingOffspringDefault,
} = {}) {
  const router = express.Router();

  // Per-router in-memory crossbreed/confirm rate-limit (10/h per IP, ADR-04-27).
  // Per-instance so each test app + each backend process tracks independently.
  const _crossbreedHits = new Map(); // ip -> number[] (ms timestamps within the window)
  function crossbreedRateLimited(ip) {
    const now = Date.now();
    const key = ip || 'unknown';
    const recent = (_crossbreedHits.get(key) || []).filter(
      (t) => now - t < CROSSBREED_RATE_WINDOW_MS,
    );
    if (recent.length >= CROSSBREED_RATE_LIMIT) {
      _crossbreedHits.set(key, recent);
      return true;
    }
    recent.push(now);
    _crossbreedHits.set(key, recent);
    return false;
  }

  // Cooldown 1 crossbreed per campaign per lineage (ADR-04-27). Tracked IN-MEMORY
  // (per-router), NOT on the crossbreed_history item: the ratified
  // skiv_companion schema (packages/contracts, additionalProperties:false) does
  // not model a campaign_id on the event, and that schema is a forbidden-path
  // change. In-memory matches the rate-limit's durability (per-process / per-run);
  // a durable cross-restart cooldown needs a contracts schema field = master-dd.
  const _crossbreedCampaigns = new Set(); // `${campaignId}::${lineageId}`
  const cooldownKey = (campaignId, lineageId) => `${campaignId}::${lineageId}`;

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
    // Seeded rng so the client can replay the EXACT same offspring at /confirm
    // (preview-integrity): the seed is generated here and echoed back; /confirm
    // accepts it. A client may also pass its own crossbreed_seed to re-preview.
    const seed = Number.isFinite(Number(body.crossbreed_seed))
      ? Number(body.crossbreed_seed)
      : randomCrossbreedSeed();
    const biomeId = body.biome_id || local.biome_id || partner.biome_id || null;
    let result;
    try {
      result = rollMatingOffspring({
        parentA: local,
        parentB: partner,
        biomeId,
        context: { useGeneEncoder: true, rng: makeSeededRng(seed) },
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
    // Step 5: propose only -- NO store write (commit is /crossbreed/confirm).
    return res.json({
      proposal: result.offspring,
      tier: result.tier,
      visual_hints: result.visual_hints,
      crossbreed_seed: seed,
    });
  });

  /**
   * POST /api/skiv/crossbreed/confirm
   * Body: { lineage_id, partner_card_json, campaign_id, biome_id?, crossbreed_seed? }
   *
   * Crossbreed COMMIT (slice 3 -- persists). Re-runs the slice-2 validation
   * gates (local exists, partner signature, both biological), then enforces the
   * ADR-2026-04-27 ratified policies:
   *   - rate-limit 10/h per IP (429 rate_limited);
   *   - cooldown 1 per campaign (409 crossbreed_cooldown_active) -- tracked by
   *     campaign_id on the persisted history entry;
   * rolls the offspring with the (optionally client-supplied) crossbreed_seed so
   * the committed creature matches the slice-2 preview, then appends a
   * crossbreed event to crossbreed_history via store.addCrossbreedEvent (FIFO 10,
   * = the Nido lineage record). A NEW playable lineage/ambassador from the
   * offspring is SPEC-E follow-up; this records the event + returns the card.
   */
  router.post('/skiv/crossbreed/confirm', (req, res) => {
    if (!requireStore(res)) return;
    const body = req.body || {};
    const lineageId = String(body.lineage_id || '');
    const partner = body.partner_card_json;
    const campaignId = body.campaign_id ? String(body.campaign_id) : '';
    if (!partner || typeof partner !== 'object') {
      return res.status(400).json({ error: 'partner_card_required' });
    }
    if (!campaignId) {
      return res.status(400).json({ error: 'campaign_id_required' });
    }
    // Rate-limit BEFORE any store work (cheap abuse guard, ADR-04-27).
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    if (crossbreedRateLimited(ip)) {
      return res.status(429).json({ error: 'rate_limited' });
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
    if (!local.species_id || !partner.species_id) {
      return res.status(422).json({ error: 'crossbreed_requires_biological' });
    }
    // Cooldown 1/campaign (ADR-04-27): this campaign already crossbred this lineage.
    if (_crossbreedCampaigns.has(cooldownKey(campaignId, lineageId))) {
      return res.status(409).json({ error: 'crossbreed_cooldown_active' });
    }
    // Roll with the preview seed (or a fresh one) so confirm == the previewed offspring.
    const seed = Number.isFinite(Number(body.crossbreed_seed))
      ? Number(body.crossbreed_seed)
      : randomCrossbreedSeed();
    const biomeId = body.biome_id || local.biome_id || partner.biome_id || null;
    let result;
    try {
      result = rollMatingOffspring({
        parentA: local,
        parentB: partner,
        biomeId,
        context: { useGeneEncoder: true, rng: makeSeededRng(seed) },
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
    // Persist the crossbreed event into the lineage Nido record (FIFO 10).
    // Schema-compliant fields ONLY (skiv_companion crossbreed_history item is
    // additionalProperties:false): role / with_lineage_id / offspring_lineage_id /
    // tier / biome_at_crossbreed. campaign_id + seed are NOT persisted here (not
    // schema fields) -- the cooldown is tracked in-memory above.
    try {
      store.addCrossbreedEvent(lineageId, {
        role: 'parent_a',
        with_lineage_id: partner.lineage_id || null,
        offspring_lineage_id: (result.offspring && result.offspring.lineage_id) || null,
        tier: result.tier,
        biome_at_crossbreed: biomeId,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'companion_crossbreed_failed', message: String(err.message || err) });
    }
    // Mark this campaign+lineage as having crossbred (cooldown 1/campaign).
    _crossbreedCampaigns.add(cooldownKey(campaignId, lineageId));
    return res.json({
      confirmed: true,
      offspring: result.offspring,
      tier: result.tier,
      visual_hints: result.visual_hints,
      crossbreed_seed: seed,
      history_count: (store.getCrossbreedHistory(lineageId) || []).length,
    });
  });

  return router;
}

module.exports = { createCompanionRouter };
