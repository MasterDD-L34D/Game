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

  return router;
}

module.exports = { createLineageRouter };
