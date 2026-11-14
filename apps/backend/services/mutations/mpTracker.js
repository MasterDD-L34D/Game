// Sprint Spore Moderate (ADR-2026-04-26 §S3) — MP (Mutation Points) tracker.
//
// Pool separato da PE/PI esistenti (ADR canonical). Pure module mirror del
// pattern V5 sgTracker. Tracks per-unit MP accumulator + caps + spend.
//
// API:
//   initUnit(unit) — ensure MP fields present (idempotent)
//   accrueEncounter(unit, { tier?, kill_with_status?, biome_affinity_match? })
//     → { earned, sources: [...], new_pool }
//   spend(unit, amount=1) → { spent, new_pool, ok }
//   resetForRun(unit) — campaign reset (rare; MP è cross-encounter pool)
//
// Earn formula per ADR §S3:
//   - encounter completato bersaglio tier ≥ 2 → +2 MP
//   - kill con status effect attivo (bleed/stun/fracture) → +1 MP
//   - biome affinity match (specie nel proprio bioma preferito) → +1 MP/encounter
//
// Cap: MP_POOL_MAX (default 30). Strategic ceiling — basta per ~3 mutation
// tier 3 (15 MP cad). Author può raise via env (`MP_POOL_MAX=50`).

'use strict';

const TIER_MEDIUM_MP = 2; // bersaglio tier ≥ 2 vinto
const KILL_STATUS_MP = 1; // kill con status attivo
const BIOME_MATCH_MP = 1; // biome affinity match (1 volta per encounter)
const MP_POOL_MAX = Number(process.env.MP_POOL_MAX) || 30;

/**
 * Ensure unit has MP fields. Idempotent (safe to call every turn).
 *
 * Default initial pool = 5 (basta per 1 mutation tier 1 + 1 buffer). Caller
 * può override passando unit con `mp` già settato.
 */
function initUnit(unit) {
  if (!unit || typeof unit !== 'object') return unit;
  if (typeof unit.mp !== 'number') unit.mp = 5;
  if (typeof unit.mp_earned_total !== 'number') unit.mp_earned_total = 0;
  return unit;
}

/**
 * Accrue MP a fine encounter (post-debrief hook).
 *
 * @param {object} unit — mutated in-place
 * @param {object} params
 * @param {number} [params.tier=1]                    — encounter tier max
 * @param {boolean} [params.kill_with_status=false]   — kill con status attivo
 * @param {boolean} [params.biome_affinity_match=false] — bioma matcha specie
 * @returns {{ earned: number, sources: string[], new_pool: number, capped: boolean }}
 */
function accrueEncounter(
  unit,
  { tier = 1, kill_with_status = false, biome_affinity_match = false } = {},
) {
  initUnit(unit);
  let earned = 0;
  const sources = [];

  if (Number(tier) >= 2) {
    earned += TIER_MEDIUM_MP;
    sources.push(`tier_${tier}_clear:+${TIER_MEDIUM_MP}`);
  }
  if (kill_with_status) {
    earned += KILL_STATUS_MP;
    sources.push(`status_kill:+${KILL_STATUS_MP}`);
  }
  if (biome_affinity_match) {
    earned += BIOME_MATCH_MP;
    sources.push(`biome_match:+${BIOME_MATCH_MP}`);
  }

  const oldPool = Number(unit.mp || 0);
  const candidate = oldPool + earned;
  const newPool = Math.min(candidate, MP_POOL_MAX);
  const capped = candidate > MP_POOL_MAX;

  unit.mp = newPool;
  unit.mp_earned_total = Number(unit.mp_earned_total || 0) + earned;

  return { earned, sources, new_pool: newPool, capped };
}

/**
 * Spend MP (called from /api/v1/mutations/apply via applyMutationPure).
 *
 * @param {object} unit — mutated in-place
 * @param {number} amount — MP da scalare (default 1)
 * @returns {{ spent: number, new_pool: number, ok: boolean }}
 */
function spend(unit, amount = 1) {
  initUnit(unit);
  const cost = Math.max(0, Number(amount) || 0);
  const oldPool = Number(unit.mp || 0);
  if (cost > oldPool) {
    return { spent: 0, new_pool: oldPool, ok: false };
  }
  const newPool = oldPool - cost;
  unit.mp = newPool;
  return { spent: cost, new_pool: newPool, ok: true };
}

/**
 * Reset cross-campaign (rare). Default policy: MP è long-pool, NON si reset
 * per-encounter (a differenza di SG). Usa solo per new-game / lineage death.
 */
function resetForRun(unit) {
  initUnit(unit);
  unit.mp = 5;
  unit.mp_earned_total = 0;
  return unit;
}

module.exports = {
  initUnit,
  accrueEncounter,
  spend,
  resetForRun,
  TIER_MEDIUM_MP,
  KILL_STATUS_MP,
  BIOME_MATCH_MP,
  MP_POOL_MAX,
};
