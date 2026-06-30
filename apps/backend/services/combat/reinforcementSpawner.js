// Reinforcement spawn engine — ADR-2026-04-19 (Option B).
//
// Pure module. Consumes reinforcement_budget from the current Sistema tier
// (AI Progress pattern, Park) and spawns SIS units from the scenario-authored
// reinforcement_pool onto reinforcement_entry_tiles, respecting cooldown
// and max_total_spawns.
//
// Contract:
//   tick(session, encounter, opts?) → {
//     spawned: [{ unit_id, spawn_tile, wave_index, tier_at_spawn }],
//     budget_used: integer,
//     skipped: boolean,
//     reason: string,
//   }
//
// Feature flag:
//   encounter.reinforcement_policy.enabled !== true → skip (default OFF).
//
// Side effects (on session):
//   - session.reinforcement_state { total_spawned, last_spawn_round, spawn_history }
//   - session.units += N new units (if spawned)
//
// Emits raw event for /replay + vcScoring:
//   { action_type: 'reinforcement_spawn', turn, actor_id, spawn_tile,
//     wave_index, tier_at_spawn, automatic: true }

'use strict';

const { computeSistemaTier, effectivePressure } = require('../../routes/sessionHelpers');
const { defaultRng } = require('./pseudoRng');
// TKT-WORLDGEN-GAPA (2026-05-29): foodweb whitelist filter for the spawn pool.
const { filterReinforcementPool, applyPopulationToPool } = require('../worldgen/foodwebFilter');
// SPEC-I ER7: cross-run population state shapes the spawn pool (flag-gated OFF).
const biomePopulation = require('../worldgen/biomePopulation');

const DEFAULT_MIN_DISTANCE_FROM_PG = 3; // Manhattan
const TIER_LABEL_ORDER = ['Calm', 'Alert', 'Escalated', 'Critical', 'Apex'];

// SPEC-I ER6 carry-over fork (grilling 2026-06-30). When enabled, the UNSPENT part
// of the overrun budget bonus (opts.budgetBonus that did not convert to a spawn --
// no walkable tile / cooldown / tier-below-min) ACCUMULATES onto the next tick,
// instead of being discarded (the as-built consume-once). Carry state lives on
// session.reinforcement_state.overrun_carry. Default OFF -> never read/written ->
// byte-identical to consume-once. Band PROVISIONAL (W5 sim-harness not built).
const OVERRUN_CARRYOVER_FLAG = 'REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED';
function isOverrunCarryoverEnabled(env = process.env) {
  return Boolean(env) && env[OVERRUN_CARRYOVER_FLAG] === 'true';
}

// #2724 -- position format drift: authored tiles are arrays [x,y], runtime
// round-model units carry {x,y} objects. Normalize both; unknown -> null.
function coordOf(p) {
  if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])];
  if (p && typeof p === 'object' && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) {
    return [Number(p.x), Number(p.y)];
  }
  return null;
}

function manhattanDistance(a, b) {
  const ca = coordOf(a);
  const cb = coordOf(b);
  // unknown coords -> Infinity (= "far"): mirrors the pre-existing permissive
  // `!pg.position` branch in farFromAllPG (absent position never blocks a tile).
  if (!ca || !cb) return Infinity;
  return Math.abs(ca[0] - cb[0]) + Math.abs(ca[1] - cb[1]);
}

function tierMeetsMin(currentLabel, minLabel) {
  const cur = TIER_LABEL_ORDER.indexOf(currentLabel);
  const min = TIER_LABEL_ORDER.indexOf(minLabel);
  if (cur < 0 || min < 0) return true; // unknown → permissive
  return cur >= min;
}

function isWalkable(tile, session) {
  const [x, y] = tile;
  const grid = session.grid || { width: 10, height: 10 };
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return false;
  const occupied = (session.units || []).some((u) => {
    if ((u.hp ?? 0) <= 0) return false;
    const c = coordOf(u.position);
    return !!c && c[0] === x && c[1] === y;
  });
  return !occupied;
}

function farFromAllPG(tile, session, minDist) {
  const pgs = (session.units || []).filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0);
  if (pgs.length === 0) return true;
  return pgs.every((pg) => !pg.position || manhattanDistance(tile, pg.position) >= minDist);
}

function pickEntryTile(entryTiles, session, minDist) {
  const candidates = entryTiles.filter(
    (t) => isWalkable(t, session) && farFromAllPG(t, session, minDist),
  );
  return candidates.length > 0 ? candidates[0] : null;
}

function pickPoolEntry(pool, session, rng, biomeConfig = null, alienaEnforcement = null) {
  const history = session.reinforcement_state?.spawn_history || [];
  const counts = history.reduce((m, h) => {
    m[h.unit_id] = (m[h.unit_id] || 0) + 1;
    return m;
  }, {});
  const eligible = pool.filter((entry) => {
    const cap = Number(entry.max_spawns) || Infinity;
    return (counts[entry.unit_id] || 0) < cap;
  });
  if (eligible.length === 0) return null;
  // V7 Biome-aware spawn bias (ADR-2026-04-26): augment weights if biomeConfig
  // provided. Backward compatible: biomeConfig=null → unchanged behavior.
  let weighted = eligible;
  if (biomeConfig) {
    try {
      const { applyBiomeBias } = require('./biomeSpawnBias');
      weighted = applyBiomeBias(eligible, biomeConfig, {
        alienaEnforcement,
        canonicalPool: pool,
      });
    } catch {
      weighted = eligible;
    }
  }
  const totalWeight = weighted.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  if (totalWeight <= 0) return weighted[0];
  let r = rng() * totalWeight;
  for (const entry of weighted) {
    r -= Number(entry.weight) || 0;
    if (r <= 0) return entry;
  }
  return weighted[weighted.length - 1];
}

function ensureReinforcementState(session) {
  if (!session.reinforcement_state) {
    session.reinforcement_state = {
      total_spawned: 0,
      last_spawn_round: -Infinity,
      spawn_history: [],
    };
  }
  return session.reinforcement_state;
}

// §21 ALIENA diagnostic buffer (ALIENA-B). Opt-in via
// encounter.reinforcement_policy.aliena_coherence_telemetry === true.
// Tail-truncated to bound memory on long sessions.
const ALIENA_TELEMETRY_MAX = 500;
function ensureAlienaTelemetry(session) {
  if (!Array.isArray(session.aliena_coherence_telemetry)) {
    session.aliena_coherence_telemetry = [];
  }
  return session.aliena_coherence_telemetry;
}

// `applyBiomeBias` return value is intentionally discarded: this pre-pass is
// invoked for the per-entry `emitAlienaCoherence` callback side-effect only;
// the bias-applied weights are not consumed at this site.
function emitAlienaPoolSnapshot(session, pool, biomeConfig, round) {
  if (!Array.isArray(pool) || pool.length === 0 || !biomeConfig) return;
  const buffer = ensureAlienaTelemetry(session);
  try {
    const { applyBiomeBias } = require('./biomeSpawnBias');
    applyBiomeBias(pool, biomeConfig, {
      canonicalPool: pool,
      emitAlienaCoherence: (sample) => {
        buffer.push({ ...sample, round });
        // Tail-truncate per push so a burst pool >MAX never transiently
        // allocates beyond the cap (harsh-review PR #2417 follow-up).
        if (buffer.length > ALIENA_TELEMETRY_MAX) {
          buffer.shift();
        }
      },
    });
  } catch {
    /* best-effort; never blocks spawn */
  }
}

function tick(session, encounter, opts = {}) {
  const rng = typeof opts.rng === 'function' ? opts.rng : defaultRng;
  const carryEnabled = isOverrunCarryoverEnabled(opts.env || process.env);
  const policy = encounter?.reinforcement_policy;
  if (!policy || policy.enabled !== true) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'policy_disabled' };
  }
  // TKT-WORLDGEN-GAPA: filter the spawn pool to the encounter biome's foodweb
  // (Caves of Qud whitelist). `pool` is bound to the filtered result, so both
  // the ALIENA snapshot and the spawn loop below consume it. Kill switch:
  // policy.foodweb_filter === false. Filter never empties the pool (fallback),
  // so off-foodweb scenario pools (e.g. synthetic hardcore units) pass through
  // unchanged -> WR bands unaffected.
  const rawPool = encounter?.reinforcement_pool;
  const foodwebBiomeId = encounter?.biome_id || encounter?.biome || session?.biome_id || null;
  let foodwebMeta;
  let pool;
  if (policy.foodweb_filter === false) {
    foodwebMeta = { applied: false, biome_id: foodwebBiomeId, excluded: [], reason: 'disabled' };
    pool = rawPool;
  } else {
    foodwebMeta = filterReinforcementPool(rawPool, foodwebBiomeId);
    pool = foodwebMeta.pool;
  }
  if (foodwebMeta.reason === 'filtered' || foodwebMeta.reason === 'all_excluded_fallback') {
    // Gate-5 surface: developer/replay-visible record of foodweb pool shaping.
    console.log(
      JSON.stringify({
        component: 'reinforcement-foodweb-filter',
        biome_id: foodwebBiomeId,
        reason: foodwebMeta.reason,
        excluded: foodwebMeta.excluded,
      }),
    );
  }
  // SPEC-I ER7 (flag-gated OFF): second-stage shaping by the cross-run biome
  // population (depleted role excluded, abundant weighted up). Best-effort +
  // band-safe (applyPopulationToPool never empties the pool). Zero new code path
  // when the flag is off.
  if (biomePopulation.isEnabled() && foodwebBiomeId && session && session.campaign_id) {
    try {
      const { getCampaign } = require('../campaign/campaignStore');
      const camp = getCampaign(session.campaign_id);
      const biomePop = camp && camp.biomePopulation ? camp.biomePopulation[foodwebBiomeId] : null;
      if (biomePop) {
        const shaped = applyPopulationToPool(pool, foodwebBiomeId, biomePop);
        if (shaped.applied) {
          pool = shaped.pool;
          console.log(
            JSON.stringify({
              component: 'reinforcement-population-shape',
              biome_id: foodwebBiomeId,
              reason: shaped.reason,
              excluded: shaped.excluded,
              boosted: shaped.boosted,
            }),
          );
        }
      }
    } catch {
      /* best-effort; never blocks spawn */
    }
  }
  const entryTiles = encounter?.reinforcement_entry_tiles;
  if (!Array.isArray(pool) || pool.length === 0) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'no_pool' };
  }
  if (!Array.isArray(entryTiles) || entryTiles.length === 0) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'no_entry_tiles' };
  }

  // ER6 carry-over: the effective overrun bonus = the freshly-armed stresswave
  // bonus (opts.budgetBonus) PLUS any prior unspent bonus carried on the state
  // (flag-gated; read defensively -- state may not be ensured yet on this path).
  const budgetBonus = Math.max(0, Number(opts.budgetBonus) || 0);
  const carriedIn = carryEnabled
    ? Math.max(0, Number(session.reinforcement_state?.overrun_carry) || 0)
    : 0;
  const effectiveBonus = budgetBonus + carriedIn;

  // A2: floor the budget-driving pressure with the per-encounter tier floor
  // (flag OFF -> effectivePressure returns the input unchanged = back-compat).
  const tier = computeSistemaTier(
    effectivePressure(session.pressure ?? 0, session.pressure_tier_floor),
  );
  const minTier = policy.min_tier || 'Alert';
  if (!tierMeetsMin(tier.label, minTier)) {
    // ER6 carry-over: pressure is below min_tier -> the overrun waits for it to rise.
    if (carryEnabled) ensureReinforcementState(session).overrun_carry = effectiveBonus;
    return {
      spawned: [],
      budget_used: 0,
      skipped: true,
      reason: `tier_below_min (${tier.label} < ${minTier})`,
    };
  }

  const state = ensureReinforcementState(session);
  const round = session.round ?? session.turn ?? 0;
  const cooldownRounds = Number(policy.cooldown_rounds) || 0;
  if (round - state.last_spawn_round < cooldownRounds) {
    // ER6 carry-over: spawner on cooldown -> the overrun waits for the next window.
    if (carryEnabled) state.overrun_carry = effectiveBonus;
    return { spawned: [], budget_used: 0, skipped: true, reason: 'cooldown_active' };
  }

  const maxTotal = Number(policy.max_total_spawns) || Infinity;
  const remaining = maxTotal - state.total_spawned;
  if (remaining <= 0) {
    // ER6 carry-over: spawn cap reached = terminal -> drop the carry (no future
    // spawn can ever consume it, so accumulating would leak unbounded).
    if (carryEnabled) state.overrun_carry = 0;
    return { spawned: [], budget_used: 0, skipped: true, reason: 'max_total_reached' };
  }

  // SPEC-I ER6 -- overrun: effectiveBonus (opts.budgetBonus + any carried-over
  // unspent bonus, computed above) extends the tier budget for THIS tick. Still
  // bounded by max_total_spawns (`remaining`). Carry-over flag OFF -> effectiveBonus
  // == budgetBonus == the consume-once value -> byte-identical.
  const baseBudget = Number(tier.reinforcement_budget) || 0;
  const budget = Math.min(baseBudget + effectiveBonus, remaining);
  if (budget <= 0) {
    if (carryEnabled) state.overrun_carry = 0;
    return { spawned: [], budget_used: 0, skipped: true, reason: 'tier_budget_zero' };
  }

  const spawned = [];
  const minDist = Number(policy.min_distance_from_pg) || DEFAULT_MIN_DISTANCE_FROM_PG;
  // V7 Biome-aware spawn bias: pass encounter biome config to pickPoolEntry.
  // Sprint 2 §II (2026-04-27) — universal initial wave fix: derive biomeConfig
  // from encounter.biome_id (YAML schema canonical) when explicit `biome` object
  // not provided. Closes Engine-LIVE/Surface-DEAD anti-pattern: biome_pools.json
  // role_templates were never loaded because biomeConfig was always null.
  let biomeConfig = opts.biomeConfig || encounter?.biome || null;
  if (!biomeConfig && encounter?.biome_id) {
    biomeConfig = {
      biome_id: encounter.biome_id,
      affixes: Array.isArray(encounter.affixes) ? encounter.affixes : [],
      npc_archetypes: encounter.npc_archetypes || null,
    };
  }

  // §21 ALIENA enforcement (config-gated, default-OFF). When
  // policy.aliena_enforcement = { enabled:true, strength:>0 }, thread a
  // normalized strength knob into pickPoolEntry → applyBiomeBias so spawn
  // weights are modulated by per-entry ALIENA coherence. Absent/disabled →
  // null → byte-identical spawns vs the diagnostic-only baseline.
  const enfCfg = policy.aliena_enforcement;
  const alienaEnforcement =
    enfCfg && enfCfg.enabled === true && Number(enfCfg.strength) > 0
      ? { strength: Math.max(0, Math.min(1, Number(enfCfg.strength))) }
      : null;

  // §21 ALIENA diagnostic pre-pass (ALIENA-B). One-shot per tick, full pool.
  if (policy.aliena_coherence_telemetry === true) {
    emitAlienaPoolSnapshot(session, pool, biomeConfig, round);
  }

  for (let i = 0; i < budget; i += 1) {
    const tile = pickEntryTile(entryTiles, session, minDist);
    if (!tile) {
      spawned.push({ skipped: true, reason: 'no_walkable_entry' });
      break;
    }
    const entry = pickPoolEntry(pool, session, rng, biomeConfig, alienaEnforcement);
    if (!entry) {
      spawned.push({ skipped: true, reason: 'pool_exhausted' });
      break;
    }
    const unitId = `reinf_${state.total_spawned + spawned.filter((s) => !s.skipped).length + 1}_${entry.unit_id}`;
    const newUnit = {
      id: unitId,
      species: entry.unit_id,
      // GAP-C #418: carry the canonical species_id when the pool entry authors
      // one (empty otherwise -> the no-canonical-species path, same contract as
      // the initial-wave units). Lets a recruit/species consumer resolve the
      // real creature instead of the archetype label.
      species_id: entry.species_id || '',
      controlled_by: 'sistema',
      // #2724: spawn in the SESSION's position format (object when the round
      // model is live) so downstream distance/attack math stays coherent.
      position: (session.units || []).some((u) => u && u.position && !Array.isArray(u.position))
        ? { x: tile[0], y: tile[1] }
        : tile,
      hp: Number(entry.hp) || 8,
      hp_max: Number(entry.hp) || 8,
      ap: 2,
      mod: Number(entry.mod) || 0,
      dc: Number(entry.dc) || 12,
      ai_profile: entry.ai_profile || 'defensive',
      reinforcement: true,
    };
    (session.units || (session.units = [])).push(newUnit);
    const record = {
      unit_id: entry.unit_id,
      spawned_unit_id: unitId,
      spawn_tile: tile,
      wave_index: state.spawn_history.length + 1,
      tier_at_spawn: tier.label,
      round,
    };
    state.spawn_history.push(record);
    state.total_spawned += 1;
    state.last_spawn_round = round;
    spawned.push(record);
  }

  const effective = spawned.filter((s) => !s.skipped);
  if (carryEnabled) {
    // Codex #3119 P2: pool exhaustion is TERMINAL within an encounter (per-unit
    // max_spawns never refill), so a shortfall from `pool_exhausted` must NOT carry
    // -- otherwise repeated overruns on an exhausted pool accumulate the carry
    // unbounded (if the pool's summed caps are below max_total, max_total_reached
    // never fires to drop it). A `no_walkable_entry` shortfall DOES carry (a tile
    // can free up next round).
    const poolExhausted = spawned.some((s) => s.skipped && s.reason === 'pool_exhausted');
    if (poolExhausted) {
      state.overrun_carry = 0;
    } else {
      // Unspent overrun = the part of effectiveBonus that never became a spawn. The
      // base budget is spent first (early loop iterations), so the bonus is what is
      // short when fewer than `budget` units fit (e.g. no walkable tile). baseIntended
      // is itself capped by `remaining`.
      const baseIntended = Math.min(baseBudget, remaining);
      const bonusSpent = Math.max(0, effective.length - baseIntended);
      state.overrun_carry = Math.max(0, effectiveBonus - bonusSpent);
    }
  }
  return {
    spawned: effective,
    budget_used: effective.length,
    skipped: effective.length === 0,
    reason: effective.length === 0 ? 'no_tile_or_pool' : 'spawned',
    tier_at_tick: tier.label,
    foodweb_filter: {
      applied: foodwebMeta.applied,
      biome_id: foodwebMeta.biome_id,
      excluded: foodwebMeta.excluded,
      reason: foodwebMeta.reason,
    },
  };
}

module.exports = {
  tick,
  OVERRUN_CARRYOVER_FLAG,
  isOverrunCarryoverEnabled,
  // exported for unit tests
  _internals: {
    manhattanDistance,
    tierMeetsMin,
    isWalkable,
    farFromAllPG,
    pickEntryTile,
    pickPoolEntry,
  },
};
