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
const { createMetaStore } = require('../services/metaProgression');

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

  return router;
}

module.exports = { createMetaRouter };
