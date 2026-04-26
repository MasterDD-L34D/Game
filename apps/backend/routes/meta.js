// D3: Meta progression routes — recruit, mating, nest.
//
// Endpoints (backward-compat, shape preserved):
//   GET  /api/v1/meta/npg         — lista NPC con affinity/trust
//   POST /api/v1/meta/recruit     — tenta reclutamento
//   POST /api/v1/meta/mating      — tenta mating
//   GET  /api/v1/meta/nest        — stato nido
//   POST /api/v1/meta/nest/setup  — configura nido
//   POST /api/v1/meta/affinity    — aggiorna affinity NPC
//   POST /api/v1/meta/trust       — aggiorna trust NPC
//
// Backing store is an async adapter (Prisma + in-memory fallback).
// See ADR-2026-04-21-meta-progression-prisma.md.
//
// Fonte: Final Design Freeze v0.9 §20-21

'use strict';

const { Router } = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { createMetaStore } = require('../services/metaProgression');

// Lazy load mating.yaml gene_slots schema + mutation catalog for offspring rolls.
// Both non-blocking: if files missing, falls back to {} / null.
let _matingSchemaCache = null;
function loadMatingSchema() {
  if (_matingSchemaCache !== null) return _matingSchemaCache;
  try {
    const yaml = require('js-yaml');
    const root = path.resolve(__dirname, '..', '..', '..');
    const p = path.join(root, 'data', 'core', 'mating.yaml');
    if (!fs.existsSync(p)) {
      _matingSchemaCache = {};
      return _matingSchemaCache;
    }
    const raw = fs.readFileSync(p, 'utf8');
    const doc = yaml.load(raw) || {};
    _matingSchemaCache = doc.gene_slots || {};
    return _matingSchemaCache;
  } catch (_err) {
    _matingSchemaCache = {};
    return _matingSchemaCache;
  }
}

let _mutationCatalogCache = null;
function loadCatalog() {
  if (_mutationCatalogCache !== null) return _mutationCatalogCache;
  try {
    const { loadMutationCatalog } = require('../services/mutations/mutationCatalogLoader');
    _mutationCatalogCache = loadMutationCatalog();
    return _mutationCatalogCache;
  } catch (_err) {
    _mutationCatalogCache = null;
    return _mutationCatalogCache;
  }
}

/**
 * @param {object} [opts]
 * @param {object} [opts.store] — pre-built store (DI for tests or plugin sharing)
 * @param {object} [opts.prisma] — Prisma client if creating a fresh store
 * @param {string|null} [opts.campaignId] — scope NPCs to a campaign
 */
function createMetaRouter(opts = {}) {
  const router = Router();
  const store =
    opts.store || createMetaStore({ prisma: opts.prisma, campaignId: opts.campaignId ?? null });

  router.get('/npg', async (_req, res, next) => {
    try {
      const [npcs, nest] = await Promise.all([store.listNpcs(), store.getNest()]);
      res.json({ npcs, nest });
    } catch (err) {
      next(err);
    }
  });

  router.post('/affinity', async (req, res, next) => {
    try {
      const { npc_id, delta } = req.body || {};
      if (!npc_id || typeof delta !== 'number') {
        return res.status(400).json({ error: 'npc_id and delta (number) required' });
      }
      const npc = await store.updateAffinity(npc_id, delta);
      const can_recruit = await store.canRecruit(npc_id);
      res.json({ npc, can_recruit });
    } catch (err) {
      next(err);
    }
  });

  router.post('/trust', async (req, res, next) => {
    try {
      const { npc_id, delta } = req.body || {};
      if (!npc_id || typeof delta !== 'number') {
        return res.status(400).json({ error: 'npc_id and delta (number) required' });
      }
      const npc = await store.updateTrust(npc_id, delta);
      const [can_recruit, can_mate] = await Promise.all([
        store.canRecruit(npc_id),
        store.canMate(npc_id),
      ]);
      res.json({ npc, can_recruit, can_mate });
    } catch (err) {
      next(err);
    }
  });

  router.post('/recruit', async (req, res, next) => {
    try {
      const { npc_id } = req.body || {};
      if (!npc_id) return res.status(400).json({ error: 'npc_id required' });
      const result = await store.recruit(npc_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/mating', async (req, res, next) => {
    try {
      const { npc_id, party_member } = req.body || {};
      if (!npc_id || !party_member) {
        return res.status(400).json({ error: 'npc_id and party_member required' });
      }
      const result = await store.rollMating(npc_id, party_member);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/nest', async (_req, res, next) => {
    try {
      const nest = await store.getNest();
      res.json(nest);
    } catch (err) {
      next(err);
    }
  });

  router.post('/nest/setup', async (req, res, next) => {
    try {
      const { biome, requirements_met } = req.body || {};
      const nest = await store.setNest(biome || 'default', requirements_met !== false);
      res.json(nest);
    } catch (err) {
      next(err);
    }
  });

  // ─── Sprint C — squad-mate offspring roll (MHS 3-tier visual) ─────
  // Distinct from /mating (NPC pair-bond DC roll). This rolls offspring
  // spec from two squad creatures + biome at mating time.
  router.post('/mating/roll', async (req, res, next) => {
    try {
      const { parent_a, parent_b, biome_id } = req.body || {};
      if (!parent_a || !parent_b) {
        return res.status(400).json({ error: 'parent_a and parent_b (objects with id) required' });
      }
      if (!parent_a.id || !parent_b.id) {
        return res.status(400).json({ error: 'parent_a.id and parent_b.id required' });
      }
      const geneSlotsSchema = loadMatingSchema();
      const mutationCatalog = loadCatalog();
      const result = await store.rollOffspring({
        parentA: parent_a,
        parentB: parent_b,
        biomeId: biome_id || null,
        context: { geneSlotsSchema, mutationCatalog },
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/nest/offspring', async (_req, res, next) => {
    try {
      const offspring = await store.listOffspring();
      res.json({ offspring });
    } catch (err) {
      next(err);
    }
  });

  router.post('/nest/add_offspring', async (req, res, next) => {
    try {
      const { offspring } = req.body || {};
      if (!offspring || typeof offspring !== 'object') {
        return res.status(400).json({ error: 'offspring object required' });
      }
      const entry = await store.addOffspring(offspring);
      if (!entry) return res.status(400).json({ error: 'invalid offspring shape' });
      res.json({ added: entry });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Test surface — reset module-level YAML caches between tests.
function _resetCachesForTest() {
  _matingSchemaCache = null;
  _mutationCatalogCache = null;
}

module.exports = { createMetaRouter, _resetCachesForTest };
