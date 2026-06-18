// =============================================================================
// Creature dossier route -- per-creature player-facing story-card.
//
// GET /api/creature/:run_id/:actor_id/dossier
//
// The "attachment surface": permadeath / lethal stakes (SPEC-J) only land
// emotionally when the player has a pre-built relationship with the creature
// (name, scars, mutations, the run it lived through). Those primitives are
// already emitted to the durable chronicle (chronicleStore, JSONL per run_id,
// actor_id-keyed): creature_named (identity), scar_earned/healed/transformed
// (SPEC-J Nido), mutation_acquired/mutation_lineage (M-3), biome_wound (A13),
// creature_death (fate). Nothing JOINED them into one read object -- this does.
//
// Pure-read: composes from the chronicle ONLY (no session/campaign in-memory
// state, no lineagePropagator pool which is keyed by (species,biome) not actor,
// no AJV contract seam, no forbidden path). Band-neutral, additive.
// =============================================================================

'use strict';

const express = require('express');
const { getChronicle } = require('../services/chronicle/chronicleStore');

const SCAR_TYPES = {
  scar_earned: 'earned',
  scar_healed: 'healed',
  scar_transformed: 'transformed',
};
const MUTATION_TYPES = {
  mutation_acquired: 'acquired',
  mutation_lineage: 'lineage',
};

// Pure: fold a creature's chronological chronicle events into one story-card.
// `events` are already actor-filtered + chronological (oldest first).
//
// SECRET/PRIVATE guard (SPEC-B sez.10 visibility, fail-closed): this endpoint is
// an UNAUTHENTICATED public read, so it surfaces ONLY `public`-tier events. A
// future `private` (device-owner) or `secret` (engine-only) chronicle event must
// not leak through a player-facing card to an arbitrary caller. Today every
// emitter writes `tier:'public'`, so this is a no-op now + a structural guard
// for later (mirrors the codex secret-invariant). An authenticated owner-view
// that also shows `private` events is a follow-up.
function composeDossier(events, { run_id, actor_id }) {
  const list = (Array.isArray(events) ? events : []).filter(
    (ev) => ev && (ev.tier == null || ev.tier === 'public'),
  );

  let name = null;
  let stage = null;
  let mbtiReveal = false;
  const scars = [];
  const mutations = [];
  const biomeWounds = [];
  let fate = { fallen: false, type: null, at: null };
  const byType = {};
  const timeline = [];

  for (const ev of list) {
    if (!ev || typeof ev !== 'object') continue;
    const type = ev.type;
    const at = ev.ts || null;
    const payload = ev.payload || {};
    byType[type] = (byType[type] || 0) + 1;
    timeline.push({ type, tier: ev.tier || null, at, payload });

    if (type === 'creature_named') {
      // latest naming wins (name is stable per creature, stage advances re-emit)
      if (payload.name) name = payload.name;
      if (payload.stage) stage = payload.stage;
      mbtiReveal = Boolean(payload.mbti_reveal);
    } else if (SCAR_TYPES[type]) {
      scars.push({ state: SCAR_TYPES[type], at, ...payload });
    } else if (MUTATION_TYPES[type]) {
      mutations.push({ kind: MUTATION_TYPES[type], at, ...payload });
    } else if (type === 'biome_wound') {
      biomeWounds.push({ at, ...payload });
    } else if (type === 'creature_death' && !fate.fallen) {
      fate = { fallen: true, type, at };
    }
  }

  return {
    run_id,
    actor_id,
    named: name != null,
    name,
    stage,
    mbti_reveal: mbtiReveal,
    born: list.length ? list[0].ts || null : null,
    last_seen: list.length ? list[list.length - 1].ts || null : null,
    event_count: list.length,
    fate,
    scars,
    mutations,
    biome_wounds: biomeWounds,
    timeline,
    summary: { total: list.length, by_type: byType },
  };
}

function createCreatureDossierRouter(opts = {}) {
  const router = express.Router();
  const baseDir = opts.baseDir; // shares the chronicle store's baseDir (tests)

  router.get('/creature/:run_id/:actor_id/dossier', (req, res, next) => {
    try {
      const { run_id: runId, actor_id: actorId } = req.params;
      // getChronicle returns [] for unknown run -> empty (anonymous) card, 200.
      const events = getChronicle(runId, { actor_id: actorId, baseDir });
      res.json(composeDossier(events, { run_id: runId, actor_id: actorId }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createCreatureDossierRouter, composeDossier };
