// =============================================================================
// biomeWound -- SPEC-P A13 write-side (DF-levels: biome degrade cross-run).
//
// QA1 ratified: SPEC-P owns the A13 write-side (degrade); SPEC-I is read-side of
// the pressure. PA2 ratified: cap stretto + recupero (max 2 biomi feriti, step 1
// banda, recovery vincendo nel bioma ferito = anti-brick). PA4 ratified: entrambi
// meccanico (pressione SPEC-I entro ER2 +/-2) + narrativo/Codex.
//
// MECHANISM (objective, tested): bounded wound set + cap + recovery + pressure
// mapping (within ER2) + biome_wound chronicle emit (M-7).
// MAGNITUDE (`PRESSURE_PER_BIOME`) = RATIFIED-PROVISIONAL (master-dd 2026-06-10,
// N=40 evidence #2702: trigger 15/15 live, debuff SIMMETRICO intenzionale =
// ferita ecologica/segnaletica, net-impact ~0 by design; re-validate player data).
//
// Persistence (the wounded set lives cross-run in the meta-network state,
// `services/worldgen/metaNetworkResolver`) + the TRIGGER (wound on run-fail in a
// biome) = follow-up wiring (this module is the pure mechanism).
// =============================================================================

'use strict';

const { appendEvent } = require('../chronicle/chronicleStore');

const MAX_WOUNDED_BIOMES = 2; // PA2: cap stretto
const ER2_PRESSURE_CAP = 2; // PA4: within ER2 +/-2 combined cap (anti overconstrain)
const DEGRADE_STEP = 1; // PA2: 1 eco-band step per wound
const PRESSURE_PER_BIOME = 1; // RATIFIED-PROVISIONAL (master-dd 2026-06-10, PA2)

/**
 * Mark a biome wounded (additive, capped, idempotent). Pure: returns a new array.
 * @returns { wounded, added, capped? }
 */
function woundBiome(wounded, biomeId) {
  const list = Array.isArray(wounded) ? wounded.slice() : [];
  if (!biomeId) return { wounded: list, added: false };
  if (list.includes(biomeId)) return { wounded: list, added: false };
  if (list.length >= MAX_WOUNDED_BIOMES) return { wounded: list, added: false, capped: true };
  list.push(biomeId);
  return { wounded: list, added: true };
}

/**
 * Recovery (anti-brick): winning in a wounded biome heals it. Pure.
 * @returns { wounded, healed }
 */
function healBiome(wounded, biomeId) {
  const list = Array.isArray(wounded) ? wounded.slice() : [];
  const i = list.indexOf(biomeId);
  if (i === -1) return { wounded: list, healed: false };
  list.splice(i, 1);
  return { wounded: list, healed: true };
}

/**
 * PA4 mechanical mapping: N wounded biomes -> SPEC-I pressure delta, HARD-bounded
 * by ER2 (never exceeds +/-2 combined, even if the set somehow grows past the cap).
 */
function pressureDelta(wounded) {
  const n = Array.isArray(wounded) ? wounded.length : 0;
  return Math.min(n * PRESSURE_PER_BIOME, ER2_PRESSURE_CAP);
}

/**
 * Emit a biome_wound chronicle event (M-7). No-op if biomeId missing.
 */
function emitBiomeWound(runId, biomeId, opts = {}) {
  if (!biomeId) return { ok: false, error: 'no_biome' };
  return appendEvent(
    runId,
    {
      type: 'biome_wound',
      actor_id: null,
      tier: 'public',
      payload: { biome_id: biomeId, step: DEGRADE_STEP },
    },
    { baseDir: opts.baseDir },
  );
}

module.exports = {
  MAX_WOUNDED_BIOMES,
  ER2_PRESSURE_CAP,
  DEGRADE_STEP,
  PRESSURE_PER_BIOME,
  woundBiome,
  healBiome,
  pressureDelta,
  emitBiomeWound,
};
