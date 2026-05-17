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

function pickPoolEntry(pool, session, rng, biomeConfig = null) {
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
      weighted = applyBiomeBias(eligible, biomeConfig);
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

function tick(session, encounter, opts = {}) {
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const policy = encounter?.reinforcement_policy;
  if (!policy || policy.enabled !== true) {
    return { spawned: [], budget_used: 0, skipped: true, reason: 'policy_disabled' };
  }
  const pool = encounter?.reinforcement_pool;
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

  for (let i = 0; i < budget; i += 1) {
    const tile = pickEntryTile(entryTiles, session, minDist);
    if (!tile) {
      spawned.push({ skipped: true, reason: 'no_walkable_entry' });
      break;
    }
    const entry = pickPoolEntry(pool, session, rng, biomeConfig);
    if (!entry) {
      spawned.push({ skipped: true, reason: 'pool_exhausted' });
      break;
    }
    const unitId = `reinf_${state.total_spawned + spawned.filter((s) => !s.skipped).length + 1}_${entry.unit_id}`;
    const newUnit = {
      id: unitId,
      species: entry.unit_id,
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
