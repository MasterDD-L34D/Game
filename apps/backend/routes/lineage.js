// Sprint B Spore S5 (ADR-2026-04-26-spore-part-pack-slots) — REST surface
// for cross-generational lineage propagation.
//
// Endpoints (additive, no breaking changes):
//   POST /api/v1/lineage/propagate
//        body { legacyUnit, species_id, biome_id }
//        → { written_traits: [...], pool_size, species_id, biome_id }
//   POST /api/v1/lineage/inherit
//        body { newUnit, species_id, biome_id, lineage_id?, opts? }
//        → { unit, inherited: [...], pool_consumed: false, pool_size }
//   GET  /api/v1/lineage/pool/:species/:biome
//        → { species_id, biome_id, mutations: [...], pool_size }
//
// IMPORTANT: lifecycle_phase=legacy hook (chi chiama propagateLineage
// post-mortem unit) è deferred a sprint successivo. Questo è "the plumbing",
// non "the trigger".
//
// Cross-ref:
// - apps/backend/services/generation/lineagePropagator.js
// - data/core/species/dune_stalker_lifecycle.yaml `legacy.inheritable_traits`

'use strict';

const { Router } = require('express');
const {
  propagateLineage,
  inheritFromLineage,
  inspectPool,
  computeBondHeartsDelta,
} = require('../services/generation/lineagePropagator');

function createLineageRouter() {
  const router = Router();

  /**
   * POST /propagate — body { legacyUnit, species_id, biome_id }.
   * Writes legacyUnit.applied_mutations to the (species, biome) pool.
   */
  router.post('/propagate', (req, res) => {
    const { legacyUnit, species_id: speciesId, biome_id: biomeId } = req.body || {};
    if (!legacyUnit || typeof legacyUnit !== 'object') {
      return res.status(400).json({ error: 'legacyUnit (object) required' });
    }
    if (typeof speciesId !== 'string' || !speciesId) {
      return res.status(400).json({ error: 'species_id (string) required' });
    }
    if (typeof biomeId !== 'string' || !biomeId) {
      return res.status(400).json({ error: 'biome_id (string) required' });
    }
    try {
      const result = propagateLineage(legacyUnit, speciesId, biomeId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'propagate_failed', message: err.message });
    }
  });

  /**
   * POST /inherit — body { newUnit, species_id, biome_id, lineage_id?, opts? }.
   * Inherits 1-2 random mutations from pool to newborn (free grant).
   * opts: { min, max } cap (defaults 1..2). RNG is server-side Math.random.
   */
  router.post('/inherit', (req, res) => {
    const {
      newUnit,
      species_id: speciesId,
      biome_id: biomeId,
      lineage_id: lineageId = null,
      opts = {},
    } = req.body || {};
    if (!newUnit || typeof newUnit !== 'object') {
      return res.status(400).json({ error: 'newUnit (object) required' });
    }
    if (typeof speciesId !== 'string' || !speciesId) {
      return res.status(400).json({ error: 'species_id (string) required' });
    }
    if (typeof biomeId !== 'string' || !biomeId) {
      return res.status(400).json({ error: 'biome_id (string) required' });
    }
    try {
      const result = inheritFromLineage(newUnit, speciesId, biomeId, lineageId, {
        min: typeof opts.min === 'number' ? opts.min : undefined,
        max: typeof opts.max === 'number' ? opts.max : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'inherit_failed', message: err.message });
    }
  });

  /**
   * GET /pool/:species/:biome — read-only inspection.
   * 200 sempre (pool vuoto → mutations: [], pool_size: 0).
   */
  router.get('/pool/:species/:biome', (req, res) => {
    const { species, biome } = req.params;
    if (!species || !biome) {
      return res.status(400).json({ error: 'species and biome route params required' });
    }
    res.json(inspectPool(species, biome));
  });

  /**
   * Skiv Goal 4 — legacy death mutation choice ritual endpoint.
   *
   * POST /legacy-ritual — body
   *   { session_id, unit_id, mutationsToLeave: string[],
   *     legacyUnit?: { id, applied_mutations[] }, species_id, biome_id }
   *
   * Allenatore (player) chooses what subset of applied_mutations to leave
   * to next generation. Decision is irreversible per session (caller-side
   * lock). Returns narrative beat (bond hearts delta + Skiv voice line)
   * + propagation result.
   *
   * Caller flow (frontend):
   *   1. legacyRitualPanel.js shows checkbox list of legacyUnit.applied_mutations
   *   2. User submits subset
   *   3. Endpoint propagates subset + returns narrative beat
   *
   * Note: caller is responsible for passing legacyUnit (server-side has
   * no notion of "which unit is dying" outside the active session combat
   * runtime, which already triggers propagateLineage on kill in
   * routes/session.js). This endpoint exists for the explicit ritual UX
   * where allenatore wants to pick subset BEFORE the runtime hook fires
   * (or as override after).
   */
  router.post('/legacy-ritual', (req, res) => {
    const {
      session_id: sessionId,
      unit_id: unitId,
      mutationsToLeave,
      legacyUnit,
      species_id: speciesId,
      biome_id: biomeId,
    } = req.body || {};

    if (typeof sessionId !== 'string' || !sessionId) {
      return res.status(400).json({ error: 'session_id (string) required' });
    }
    if (typeof unitId !== 'string' || !unitId) {
      return res.status(400).json({ error: 'unit_id (string) required' });
    }
    if (typeof speciesId !== 'string' || !speciesId) {
      return res.status(400).json({ error: 'species_id (string) required' });
    }
    if (typeof biomeId !== 'string' || !biomeId) {
      return res.status(400).json({ error: 'biome_id (string) required' });
    }
    if (!Array.isArray(mutationsToLeave)) {
      return res.status(400).json({
        error:
          'mutationsToLeave (array of mutation_id strings) required — pass [] to leave nothing',
      });
    }
    const cleanLeave = mutationsToLeave.filter((m) => typeof m === 'string' && m);

    // legacyUnit is optional. If absent, fabricate a minimal shape from
    // mutationsToLeave (allenatore explicitly picked subset; we can still
    // propagate without the full unit object). This keeps the endpoint
    // usable from a UI that has only the picked subset in scope.
    const unit =
      legacyUnit && typeof legacyUnit === 'object'
        ? legacyUnit
        : { id: unitId, applied_mutations: cleanLeave };

    const totalApplied = Array.isArray(unit.applied_mutations) ? unit.applied_mutations.length : 0;

    try {
      const propagation = propagateLineage(unit, speciesId, biomeId, {
        mutationsToLeave: cleanLeave,
      });
      const narrative = computeBondHeartsDelta(propagation.left_count, totalApplied);
      res.json({
        ok: true,
        session_id: sessionId,
        unit_id: unitId,
        propagation,
        narrative,
      });
    } catch (err) {
      res.status(500).json({ error: 'legacy_ritual_failed', message: err.message });
    }
  });

  return router;
}

module.exports = { createLineageRouter };
