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

const { computeSistemaTier } = require('../../routes/sessionHelpers');
const { defaultRng } = require('./pseudoRng');
// TKT-WORLDGEN-GAPA (2026-05-29): foodweb whitelist filter for the spawn pool.
const { filterReinforcementPool } = require('../worldgen/foodwebFilter');

const DEFAULT_MIN_DISTANCE_FROM_PG = 3; // Manhattan
const TIER_LABEL_ORDER = ['Calm', 'Alert', 'Escalated', 'Critical', 'Apex'];

function manhattanDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
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
  const occupied = (session.units || []).some(
    (u) => (u.hp ?? 0) > 0 && u.position && u.position[0] === x && u.position[1] === y,
  );
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
  const entryTiles = encounter?.reinforcement_entry_tiles;
  if (!Array.isArray(pool) || pool.length === 0) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'no_pool' };
  }
  if (!Array.isArray(entryTiles) || entryTiles.length === 0) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'no_entry_tiles' };
  }

  const tier = computeSistemaTier(session.pressure ?? 0);
  const minTier = policy.min_tier || 'Alert';
  if (!tierMeetsMin(tier.label, minTier)) {
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
    return { spawned: [], budget_used: 0, skipped: true, reason: 'cooldown_active' };
  }

  const maxTotal = Number(policy.max_total_spawns) || Infinity;
  const remaining = maxTotal - state.total_spawned;
  if (remaining <= 0) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'max_total_reached' };
  }

  const budget = Math.min(Number(tier.reinforcement_budget) || 0, remaining);
  if (budget <= 0) {
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
      position: tile,
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
