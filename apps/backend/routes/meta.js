// D3: Meta progression routes — recruit, mating, nest.
//
// Endpoints:
//   GET  /api/v1/meta/npg         — lista NPC con affinity/trust
//   POST /api/v1/meta/recruit     — tenta reclutamento
//   POST /api/v1/meta/mating      — tenta mating
//   GET  /api/v1/meta/nest        — stato nido
//   POST /api/v1/meta/nest/setup  — configura nido
//   POST /api/v1/meta/affinity    — aggiorna affinity NPC
//   POST /api/v1/meta/trust       — aggiorna trust NPC
//
// Fonte: Final Design Freeze v0.9 §20-21

'use strict';

const { Router } = require('express');
const { createMetaTracker } = require('../services/metaProgression');

function createMetaRouter() {
  const router = Router();
  // One tracker per server instance (in-memory; persist externally)
  const tracker = createMetaTracker();

  // GET /npg — lista NPC
  router.get('/npg', (_req, res) => {
    res.json({
      npcs: tracker.listNpcs(),
      nest: tracker.getNest(),
    });
  });

  // POST /affinity — { npc_id, delta }
  router.post('/affinity', (req, res) => {
    const { npc_id, delta } = req.body || {};
    if (!npc_id || typeof delta !== 'number') {
      return res.status(400).json({ error: 'npc_id and delta (number) required' });
    }
    const npc = tracker.updateAffinity(npc_id, delta);
    res.json({ npc, can_recruit: tracker.canRecruit(npc_id) });
  });

  // POST /trust — { npc_id, delta }
  router.post('/trust', (req, res) => {
    const { npc_id, delta } = req.body || {};
    if (!npc_id || typeof delta !== 'number') {
      return res.status(400).json({ error: 'npc_id and delta (number) required' });
    }
    const npc = tracker.updateTrust(npc_id, delta);
    res.json({ npc, can_recruit: tracker.canRecruit(npc_id), can_mate: tracker.canMate(npc_id) });
  });

  // POST /recruit — { npc_id }
  router.post('/recruit', (req, res) => {
    const { npc_id } = req.body || {};
    if (!npc_id) return res.status(400).json({ error: 'npc_id required' });
    const result = tracker.recruit(npc_id);
    res.json(result);
  });

  // POST /mating — { npc_id, party_member: { mbti_type, trait_ids } }
  router.post('/mating', (req, res) => {
    const { npc_id, party_member } = req.body || {};
    if (!npc_id || !party_member) {
      return res.status(400).json({ error: 'npc_id and party_member required' });
    }
    const result = tracker.rollMating(npc_id, party_member);
    res.json(result);
  });

  // GET /nest
  router.get('/nest', (_req, res) => {
    res.json(tracker.getNest());
  });

  // POST /nest/setup — { biome, requirements_met }
  router.post('/nest/setup', (req, res) => {
    const { biome, requirements_met } = req.body || {};
    const nest = tracker.setNest(biome || 'default', requirements_met !== false);
    res.json(nest);
  });

  return router;
}

module.exports = { createMetaRouter };
