// 2026-05-20 — Combat readonly diagnostic routes (A6 pattern, gap-fill
// Explore quick-wins wave 3 #2 + #4).
//
// Endpoints:
//   GET /api/combat/status-penalties — wounded_perma + bleeding/fracture tiers
//   GET /api/combat/biome-modifiers  — runtime diff_base + hp_mult + pressure formula per biome
//
// Frontend combat UI può preload questi reference table evitando
// client-side duplication / null-fallback.

'use strict';

const { Router } = require('express');
const { listStatusPenalties } = require('../services/combat/statusModifiers');
const { listBiomeModifiers } = require('../services/combat/biomeModifiers');

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

  return router;
}

module.exports = { createCombatRouter };
