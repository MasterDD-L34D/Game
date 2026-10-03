// 2026-05-20 — Combat readonly diagnostic routes (A6 pattern, gap-fill
// Explore quick-wins wave 3 #2 + #4 + wave 6 #1).
//
// Endpoints:
//   GET /api/combat/status-penalties — wounded_perma + bleeding/fracture tiers
//   GET /api/combat/biome-modifiers  — runtime diff_base + hp_mult + pressure formula per biome
//   GET /api/combat/biome-stress-profiles      — all biomes' stresswave/hazard/narrative (DEAD fields surfaced)
//   GET /api/combat/biome-stress-profile/:id   — one biome's stress profile (404 if unknown)
//   GET /api/combat/ennea-effects    — 9/9 ennea archetype buff catalog (label + buffs + desc)
//
// Frontend combat UI può preload questi reference table evitando
// client-side duplication / null-fallback.

'use strict';

const { Router } = require('express');
const { listStatusPenalties } = require('../services/combat/statusModifiers');
const {
  listBiomeModifiers,
  getBiomeStressProfile,
  listBiomeStressProfiles,
} = require('../services/combat/biomeModifiers');
const { listEnneaEffects } = require('../services/enneaEffects');

function createCombatRouter() {
  const router = Router();

  router.get('/status-penalties', (_req, res) => {
    const data = listStatusPenalties();
    res.json({
      wounded_perma_attack_penalty: data.wounded_perma_attack_penalty,
      bleeding_fracture_slow_down_threshold: data.bleeding_fracture_slow_down_threshold,
    });
  });

  router.get('/biome-modifiers', (_req, res) => {
    const items = listBiomeModifiers();
    res.json({ count: items.length, items });
  });

  router.get('/ennea-effects', (_req, res) => {
    const items = listEnneaEffects();
    res.json({ count: items.length, items });
  });

  // 2026-06-01 — surface the DEAD biomes.yaml fields (stresswave / hazard
  // stress_modifiers / narrative / npc_archetypes) for inspection. Read-only,
  // band-neutral (no combat effect). See docs/reports/2026-06-01-catalog-mapping-audit.md.
  router.get('/biome-stress-profiles', (_req, res) => {
    const items = listBiomeStressProfiles();
    res.json({ count: items.length, items });
  });

  router.get('/biome-stress-profile/:id', (req, res) => {
    const profile = getBiomeStressProfile(String(req.params.id || ''));
    if (!profile) {
      return res.status(404).json({ error: `biome "${req.params.id}" non trovato` });
    }
    res.json(profile);
  });

  return router;
}

module.exports = { createCombatRouter };
