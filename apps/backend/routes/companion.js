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
// SPEC-F (Custode Portable Framework) store-backed surface. Route PATHS per spec
// :51-52, served from this DI-clean router (NOT routes/skiv.js, the fs-json monitor):
//   GET  /api/skiv/share/:lineage_id?format=json|card|qr — share-safe export card
//   POST /api/skiv/offspring/:id/promote                 — offspring -> ambassador (B4)
//   POST /api/skiv/import                                — foreign card -> ambassador (B4, sez.6)
//   GET  /api/skiv/crossbreed/history/:lineage_id        — crossbreed log read
//   POST /api/skiv/crossbreed                            — offspring proposal (+ crossbreed_seed)
//   POST /api/skiv/crossbreed/confirm                    — commit (persist + cooldown + rate-limit)
// Policies are ADR-2026-04-27 ratified (cooldown 1/campaign, rate-limit 10/h IP,
// history/ambassador FIFO cap 10) -- impl of ratified defaults, no open design-call.
//
// Auth: FC4-A v1 = signature-verify (transport integrity, NOT anti-forgery) +
// rate-limit. Per-Nido isolation (Option A) behind SPEC_F_NIDO_ISOLATION_ENABLED
// (OFF by default = global cap + per-IP rate-limit, byte-identical). ON: the ambassador
// cap is scoped PER-OWNER (JWT sub / self-asserted player_id) so honest Nidos stop
// FIFO-evicting each other; the write rate-limit goes per-owner ONLY for a JWT-trusted
// owner (a self-asserted player_id stays per-IP so a rotating-id flood can't bypass it).
// Option D (SPEC_F_WRITE_AUTH_ENABLED, OFF by default) adds a JWT enforce-gate on the
// WRITES (not the public reads) so req.auth.userId becomes the trusted owner ->
// adversarial-safe isolation. Durable per-Nido cap (persisted nidoId, Prisma) = Option C.

'use strict';

const express = require('express');
const crypto = require('crypto');
const companionPickerDefault = require('../services/companion/companionPicker');
const { sanitizeWhitelist, signatureFor } = require('../services/skiv/companionStateStore');
const { toDisplayCard, toQrPayload } = require('../services/skiv/companionCardExport');
const { rollMatingOffspring: rollMatingOffspringDefault } = require('../services/metaProgression');
const offspringStoreDefault = require('../services/lineage/offspringStore');
const { resolveOffspringGenome } = require('../services/skiv/offspringGenome');
const { createAuthHandlers } = require('../middleware/auth');

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

// SPEC-F per-Nido isolation (Option A, in-memory). OFF by default = today's global
// ambassador cap + per-IP rate-limit, byte-identical. ON = the store's cap scopes
// PER-OWNER (owner = JWT sub, else the request's player_id) so honest Nidos stop
// FIFO-evicting each other; the write rate-limit goes per-owner ONLY for a JWT-trusted
// owner (self-asserted player_id stays per-IP -- a rotating-id flood can't mint budgets).
// Warm-state only (owner index resets on restart; durable = Option C Prisma migration).
const NIDO_ISOLATION_ENABLED = process.env.SPEC_F_NIDO_ISOLATION_ENABLED === 'true';

// SPEC-F Option D: optional JWT gate on the WRITE routes (not the public-tier reads).
// OFF by default = writes stay open, byte-identical. ON = the shared auth handler
// enforces a valid token IF AUTH_SECRET is configured (else a noop -> still open);
// a verified token populates req.auth.userId (JWT sub), so deriveOwner returns a
// crypto-bound (trusted) owner and the per-Nido isolation becomes adversarial-safe
// (closes the self-asserted player_id spoof/rotation ceiling). Needs the isolation
// flag too for the per-owner cap; independent so auth + cap can be staged separately.
const WRITE_AUTH_ENABLED = process.env.SPEC_F_WRITE_AUTH_ENABLED === 'true';

function createCompanionRouter({
  companionPicker = companionPickerDefault,
  store = null,
  rollMatingOffspring = rollMatingOffspringDefault,
  offspringStore = offspringStoreDefault,
  nidoIsolationEnabled = NIDO_ISOLATION_ENABLED,
  writeAuthEnabled = WRITE_AUTH_ENABLED,
  authenticate = null,
} = {}) {
  const router = express.Router();

  // Option D write-gate middleware: enforce/populate auth on SPEC-F writes when
  // opted in (else a passthrough -> open, byte-identical). Injected `authenticate`
  // wins (tests); otherwise createAuthHandlers is used JWT-ONLY: `legacyToken:null`
  // DISABLES the shared TRAIT_EDITOR_TOKEN/TRAITS_API_TOKEN fallback (Codex P2) --
  // a SPEC-F write must be bound to a per-player JWT sub, never the shared static
  // trait-editor token (wrong credential + no per-owner identity). So: JWT-enforce
  // when AUTH_SECRET set, noop -> open otherwise (regardless of the trait tokens).
  const writeAuth = writeAuthEnabled
    ? authenticate || createAuthHandlers({ legacyToken: null }).authenticate
    : (_req, _res, next) => next();

  // SPEC-F per-Nido isolation (Option A). Owner = the caller's durable identity:
  // JWT sub (req.auth.userId, present only when an AUTH_SECRET middleware ran) else
  // the request's player_id (body/query -- already the primary id, campaign.js:216).
  // null when unknown -> the write degrades to the global cap + per-IP rate-limit.
  //
  // TRUST CEILING (load-bearing for the flip decision): the JWT sub is
  // cryptographically bound (`trusted:true`); player_id is SELF-ASSERTED
  // (`trusted:false`). Returns { id, trusted }. id is coerced to a string-or-null
  // (an object/array player_id must never become a Map/rate-limit key).
  function deriveOwner(req) {
    const jwtSub = req.auth && typeof req.auth.userId === 'string' ? req.auth.userId : null;
    if (jwtSub) return { id: jwtSub, trusted: true };
    const body = req.body && typeof req.body.player_id === 'string' ? req.body.player_id : null;
    const query = req.query && typeof req.query.player_id === 'string' ? req.query.player_id : null;
    return { id: body || query || null, trusted: false };
  }
  // Rate-limit key: per-owner ONLY for a crypto-bound (JWT-trusted) owner. A
  // SELF-ASSERTED player_id stays PER-IP on purpose -- otherwise a griefer rotating
  // distinct player_id strings would mint a fresh 10/h budget each request and flood
  // the store unbounded (the per-owner cap removes the global ceiling). Per-owner
  // isolation of the CAP is still cooperative for self-asserted owners; the per-IP
  // rate-limit is what bounds a rotating-id flood.
  function rateKey(req, owner) {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    return nidoIsolationEnabled && owner.id && owner.trusted ? `owner:${owner.id}` : ip;
  }

  // Each store-growing write (crossbreed, promote, import) gets its OWN 10/h-per-IP
  // budget (ADR-04-27): independent so a griefer exhausting one cannot also block
  // the others (partial mitigation of cap-10 FIFO eviction grief; full per-Nido
  // isolation = SPEC-F-wide auth, see header). Per-router Map (per-process/per-run
  // durability, matching the in-memory cooldown below).
  function makeRateLimiter() {
    const hits = new Map(); // ip -> number[] (ms timestamps within the window)
    return function limited(ip) {
      const now = Date.now();
      const key = ip || 'unknown';
      const recent = (hits.get(key) || []).filter((t) => now - t < CROSSBREED_RATE_WINDOW_MS);
      if (recent.length >= CROSSBREED_RATE_LIMIT) {
        hits.set(key, recent);
        return true;
      }
      recent.push(now);
      hits.set(key, recent);
      return false;
    };
  }
  const crossbreedRateLimited = makeRateLimiter();
  const promoteRateLimited = makeRateLimiter();
  const importRateLimited = makeRateLimiter();

  // Cooldown 1 crossbreed per campaign per lineage (ADR-04-27). Tracked IN-MEMORY
  // (per-router), NOT on the crossbreed_history item: the ratified
  // skiv_companion schema (packages/contracts, additionalProperties:false) does
  // not model a campaign_id on the event, and that schema is a forbidden-path
  // change. In-memory matches the rate-limit's durability (per-process / per-run);
  // a durable cross-restart cooldown needs a contracts schema field = master-dd.
  const _crossbreedCampaigns = new Set(); // `${campaignId}::${lineageId}`
  const cooldownKey = (campaignId, lineageId) => `${campaignId}::${lineageId}`;

  // Overwrite guard for the ambassador registry. getCompanionState reads the
  // in-memory Map only, but saveCompanionState upserts to Prisma -> after a
  // backend restart a persisted ambassador is absent from memory and a
  // client-supplied lineage_id would slip past a memory-only check + overwrite
  // the persisted row (violating FC1 home-authoritative). Hydrate the row first
  // so promote/import refuse cross-restart collisions too. No-op for in-memory
  // stores (hydrateAsync returns null when Prisma is absent); a hydrate failure
  // degrades to same-process only and never blocks a valid write.
  async function lineageExists(lineageId) {
    if (typeof store.getCompanionState !== 'function') return false;
    if (typeof store.hydrateAsync === 'function') {
      try {
        await store.hydrateAsync(lineageId);
      } catch {
        /* non-fatal: fall through to the in-memory check */
      }
    }
    return Boolean(store.getCompanionState(lineageId));
  }

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
   * format=json (default) = full signed whitelist card. format=card = labeled
   * display projection. format=qr = the public share_url to encode (ADR-04-27
   * :110,:174-181: QR encapsulates share_url; scan -> URL -> fetch json -> verify
   * -> import). card/qr are pure projections of the same signed json card
   * (companionCardExport.js); the client renders the visual card / QR pixels.
   */
  router.get('/skiv/share/:lineage_id', (req, res) => {
    if (!requireStore(res)) return;
    const lineageId = String(req.params.lineage_id || '');
    const format = req.query.format ? String(req.query.format) : 'json';
    if (!['json', 'card', 'qr'].includes(format)) {
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
    // card/qr are pure projections of the same signed json card (no new PII path).
    // QR encodes the PUBLIC share_url (ADR-2026-04-27 :110,:174-181): materialize
    // from the stored value or the request, NOT injected into the signed card so
    // the json format's signature is unchanged.
    if (format === 'card' || format === 'qr') {
      const shareUrl =
        card.share_url ||
        `${req.protocol}://${req.get('host')}${req.baseUrl}/skiv/share/${encodeURIComponent(lineageId)}`;
      return res.json(
        format === 'card' ? toDisplayCard(card, shareUrl) : toQrPayload(card, shareUrl),
      );
    }
    return res.json(card);
  });

  /**
   * POST /api/skiv/offspring/:offspring_id/promote
   * Body: { species_id, unit_id?, offspring? }
   *
   * SPEC-F B4 -- offspring -> playable lineage. FC3 (spec :162): an EXPLICIT
   * per-offspring extraction (not mass-export). Persists the offspring as an
   * ambassador companion card (reuses saveCompanionState + the cap-10 FIFO); the
   * card is the portable, spawnable genome AND a crossbreed-able ambassador. Also
   * returns a thin `spawn_descriptor` = the genome a session/Godot needs to spawn
   * the offspring as a playable unit; combat-stat derivation + live-run roster
   * injection are DOWNSTREAM (session lane), not wired here. Species is resolved at
   * promote-time from the body (the offspring record carries no species field;
   * adding one = forbidden-path packages/contracts).
   *
   * Two offspring sources (master-dd 2026-07-01 = promote-from-descriptor):
   *   - body.offspring = the CROSSBREED result (rollMatingOffspring, from the
   *     /crossbreed/confirm response) -- not persisted, different shape; used when
   *     present. Trusting the client descriptor is consistent with FC4 (signature =
   *     integrity, not authenticity) + confirm already trusting client partner cards.
   *   - else offspringStore.getById(:offspring_id) = a PERSISTED ritual record.
   * resolveOffspringGenome() normalizes both shapes + applies the ratified genome
   * projection (env_mutation+fusions -> mutations, bonus+gene_slots -> cabinet).
   *
   * Response: 201 { ambassador, spawn_descriptor } | 400 species_required |
   *           400 lineage_id_required | 404 offspring_not_found |
   *           409 lineage_already_promoted | 422 invalid_offspring |
   *           422 promote_failed | 429 rate_limited
   */
  router.post('/skiv/offspring/:offspring_id/promote', writeAuth, async (req, res) => {
    if (!requireStore(res)) return;
    const owner = deriveOwner(req);
    if (promoteRateLimited(rateKey(req, owner))) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const offspringId = String(req.params.offspring_id || '');
    const body = req.body || {};
    const speciesId = body.species_id ? String(body.species_id) : '';
    if (!speciesId) {
      return res.status(400).json({
        error: 'species_required',
        hint: 'the offspring record carries no species; pass species_id in the body',
      });
    }
    // Prefer a body-supplied crossbreed descriptor; else look up a persisted ritual record.
    let offspring = body.offspring && typeof body.offspring === 'object' ? body.offspring : null;
    if (!offspring) {
      try {
        offspring = await offspringStore.getById(offspringId);
      } catch (err) {
        return res
          .status(500)
          .json({ error: 'offspring_lookup_failed', message: String(err.message || err) });
      }
      if (!offspring) {
        return res.status(404).json({ error: 'offspring_not_found' });
      }
    }
    // Defense-in-depth: body.offspring is untrusted -> never let a malformed
    // descriptor throw out of the async handler (unhandled rejection = crash).
    let genome;
    try {
      genome = resolveOffspringGenome(offspring);
    } catch (err) {
      return res
        .status(422)
        .json({ error: 'invalid_offspring', message: String(err.message || err) });
    }
    if (!genome.lineage_id) {
      return res.status(400).json({ error: 'lineage_id_required' });
    }
    // Refuse to overwrite an existing ambassador: promote CREATES a new one, and
    // the (crossbreed-descriptor) lineage_id is client-supplied -> refusing an
    // in-place overwrite stops a caller clobbering another lineage's card
    // (species/mutations/cabinet) by re-using its lineage_id (store is keyed by
    // it). lineageExists hydrates so this holds across a restart too.
    if (await lineageExists(genome.lineage_id)) {
      return res
        .status(409)
        .json({ error: 'lineage_already_promoted', lineage_id: genome.lineage_id });
    }
    // Ambassador companion card (saveCompanionState applies cap-10 FIFO + signs).
    // Only offspring-derived fields are set -- no fabricated mbti/aspect/progression.
    const ambassadorState = {
      schema_version: '0.2.0',
      unit_id: body.unit_id ? String(body.unit_id) : `offspring-${genome.lineage_id}`,
      species_id: speciesId,
      biome_id: genome.biome_id,
      lineage_id: genome.lineage_id,
      mutations: genome.mutations,
      cabinet: { unlocked: genome.cabinet_unlocked },
    };
    let ambassador;
    try {
      ambassador = store.saveCompanionState(ambassadorState, {
        owner: owner.id,
        isolate: nidoIsolationEnabled,
      });
    } catch (err) {
      return res.status(422).json({ error: 'promote_failed', message: String(err.message || err) });
    }
    const spawnDescriptor = {
      lineage_id: genome.lineage_id,
      species_id: speciesId,
      applied_mutations: genome.mutations,
      trait_ids: genome.trait_ids,
      biome_origin: genome.biome_id,
    };
    return res.status(201).json({ ambassador, spawn_descriptor: spawnDescriptor });
  });

  /**
   * POST /api/skiv/import
   * Body: { card }
   *
   * SPEC-F sez.6 -- import a signed FOREIGN card (the GET /skiv/share?format=json
   * output of ANOTHER Nido) as a permanent ambassador (spec :120-121, acceptance
   * #4). FC4-A trust model (ratified 2026-06-08): accept a card on a VALID
   * companion_card_signature (tamper-detect on transport, spec :112-113) +
   * rate-limit 10/h per IP (ADR-04-27); no allowlist/registry (= "B se abuso").
   *
   * The signature detects CORRUPTION, not FORGERY (public sha256, no server
   * secret, spec :217-219) -- so rate-limit + refuse-overwrite + whitelist
   * sanitize are the real guards. saveCompanionState re-signs server-side over its
   * OWN whitelist (client sig + any PII on the card are dropped). FC1
   * home-authoritative: an import NEVER overwrites an existing local lineage (409);
   * additive resync of a returning Custode is a separate slice.
   *
   * Response: 201 { ambassador } | 400 card_required | 400 card_invalid |
   *           400 signature_mismatch | 400 lineage_id_required |
   *           409 lineage_already_imported | 422 import_failed | 429 rate_limited
   */
  router.post('/skiv/import', writeAuth, async (req, res) => {
    if (!requireStore(res)) return;
    // Rate-limit FIRST (before body validation): every attempt -- incl. malformed
    // -- counts against the IP budget, so a garbage flood cannot probe the endpoint
    // for free, and the cap-10 FIFO write path stays behind the same budget.
    // Mirrors /promote's rate-limit-first posture.
    const owner = deriveOwner(req);
    if (importRateLimited(rateKey(req, owner))) {
      return res.status(429).json({ error: 'rate_limited' });
    }
    const body = req.body || {};
    // Untrusted body: reject a non-object OR array card (arrays are typeof
    // 'object' but never a valid card -- Array.isArray boundary-hygiene, #3131).
    const card =
      body.card && typeof body.card === 'object' && !Array.isArray(body.card) ? body.card : null;
    if (!card) {
      return res.status(400).json({ error: 'card_required' });
    }
    // Verify transport integrity: signatureFor(card) must match the card's own sig.
    let expectedSig;
    try {
      expectedSig = signatureFor(card);
    } catch (err) {
      return res.status(400).json({ error: 'card_invalid', message: String(err.message || err) });
    }
    if (card.companion_card_signature !== expectedSig) {
      return res.status(400).json({ error: 'signature_mismatch' });
    }
    const lineageId = card.lineage_id ? String(card.lineage_id) : '';
    if (lineageId.length < 4) {
      return res.status(400).json({ error: 'lineage_id_required' });
    }
    // FC1 home-authoritative: refuse to overwrite an existing local ambassador
    // (import CREATES; lineage_id is client-supplied + the store is keyed by it ->
    // without this an importer clobbers another lineage's card by re-using its id).
    // lineageExists hydrates the persistent store so this also holds after a restart.
    if (await lineageExists(lineageId)) {
      return res.status(409).json({ error: 'lineage_already_imported', lineage_id: lineageId });
    }
    // Persist: saveCompanionState sanitizes to whitelist (drops PII), re-signs
    // server-side, applies cap-10 FIFO. Wrap: a malformed card must 422, not throw.
    let ambassador;
    try {
      ambassador = store.saveCompanionState(card, {
        owner: owner.id,
        isolate: nidoIsolationEnabled,
      });
    } catch (err) {
      return res.status(422).json({ error: 'import_failed', message: String(err.message || err) });
    }
    return res.status(201).json({ ambassador });
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
  router.post('/skiv/crossbreed/confirm', writeAuth, (req, res) => {
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
    const owner = deriveOwner(req);
    if (crossbreedRateLimited(rateKey(req, owner))) {
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
