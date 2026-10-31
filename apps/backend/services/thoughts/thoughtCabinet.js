// P4 Thought Cabinet — pattern Disco Elysium diegetic reveal.
//
// Evaluates MBTI axes (from buildVcSnapshot per_actor[uid].mbti_axes) and
// unlocks thoughts once a unit's axis value crosses a progressive threshold.
// Cumulative: once unlocked, persists across rounds (session state).
//
// YAML source: data/core/thoughts/mbti_thoughts.yaml (18 thoughts, 3 axes ×
// 2 directions × 3 tiers).
//
// Pure evaluator: no I/O, no mutation. Caller merges `newly` into session
// state (e.g. session.meta.thoughts_unlocked[unit_id]).

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

let _cache = null;
const DEFAULT_YAML_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'thoughts',
  'mbti_thoughts.yaml',
);

function loadThoughts({ filepath = DEFAULT_YAML_PATH, force = false } = {}) {
  if (_cache && !force) return _cache;
  const raw = fs.readFileSync(filepath, 'utf8');
  const parsed = yaml.load(raw) || {};
  _cache = {
    version: parsed.version || '0.0.0',
    thoughts: parsed.thoughts || {},
  };
  return _cache;
}

function resetCache() {
  _cache = null;
}

function thoughtsByAxis(catalog = loadThoughts()) {
  const out = { E_I: [], S_N: [], T_F: [], J_P: [] };
  for (const [id, entry] of Object.entries(catalog.thoughts || {})) {
    if (!out[entry.axis]) continue;
    out[entry.axis].push({ id, ...entry });
  }
  return out;
}

function matchesThreshold(value, direction, threshold) {
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (direction === 'low') return value <= threshold;
  if (direction === 'high') return value >= threshold;
  return false;
}

// Pure evaluator. `alreadyUnlocked` can be Array or Set of thought ids.
function evaluateThoughts(axes, alreadyUnlocked = [], opts = {}) {
  const catalog = opts.catalog || loadThoughts();
  const set = new Set(
    alreadyUnlocked instanceof Set
      ? alreadyUnlocked
      : Array.isArray(alreadyUnlocked)
        ? alreadyUnlocked
        : [],
  );
  const newly = [];
  if (!axes || typeof axes !== 'object') {
    return { unlocked: Array.from(set), newly };
  }
  for (const [id, entry] of Object.entries(catalog.thoughts || {})) {
    if (set.has(id)) continue;
    const axis = axes[entry.axis];
    const value = axis && typeof axis === 'object' ? axis.value : null;
    if (!matchesThreshold(value, entry.direction, entry.threshold)) continue;
    set.add(id);
    newly.push(id);
  }
  return { unlocked: Array.from(set), newly };
}

function describeThought(id, catalog = loadThoughts()) {
  const entry = catalog.thoughts?.[id];
  if (!entry) return null;
  return { id, ...entry };
}

// ──────────────────────────────────────────────────────────────
// Phase 2 — Disco Elysium internalization (research → permanent effect)
//
// Each unit owns a CabinetState:
//   {
//     unlocked:    Set<thoughtId>   — discovered via MBTI threshold (Phase 1)
//     researching: Map<id, {cost_remaining, cost_total, started_at_encounter, mode}>
//     internalized: Set<thoughtId>  — permanent, grants effect_bonus + effect_cost
//     slots_max:   number (default 8 — Sprint 6 round-mode cap)
//   }
//
// Pure state machines: callers read (unlocked) to offer research, call
// startResearch() when player clicks, tickResearch() on round/encounter advance,
// internalize() happens automatically on tick when cost_remaining hits 0,
// forgetThought() frees a slot.
// passiveBonuses() aggregates internalized effects into {bonus, cost} deltas
// for the combat resolver to apply.
//
// Sprint 6 (P4 Disco Tier S #9): round-based cooldown mode.
// `mode='rounds'` scales base cost by RESEARCH_ROUND_MULTIPLIER (default 3),
// turning encounter-pace costs (1/2/3) into round-pace cooldowns (3/6/9).
// roundOrchestrator end-of-round side effects tick all cabinets by 1 round,
// promoting research that hits 0 to internalized + applying passives.

const DEFAULT_SLOTS_MAX = 8;
const RESEARCH_ROUND_MULTIPLIER = 3;

function createCabinetState(opts = {}) {
  const slots = Number.isFinite(opts.slotsMax)
    ? Math.max(1, Math.floor(opts.slotsMax))
    : DEFAULT_SLOTS_MAX;
  return {
    unlocked: new Set(opts.unlocked || []),
    researching: new Map(),
    internalized: new Set(opts.internalized || []),
    slots_max: slots,
  };
}

function slotsUsed(state) {
  return state.internalized.size + state.researching.size;
}

function canResearchMore(state) {
  return slotsUsed(state) < state.slots_max;
}

function resolveResearchCost(entry) {
  if (!entry) return 1;
  const explicit = entry.research_cost_encounters;
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  const tier = Number.isFinite(entry.tier) ? entry.tier : 1;
  return Math.max(1, tier);
}

function mergeUnlocked(state, newlyUnlockedIds) {
  if (!Array.isArray(newlyUnlockedIds) || newlyUnlockedIds.length === 0) return state;
  for (const id of newlyUnlockedIds) state.unlocked.add(id);
  return state;
}

function startResearch(state, thoughtId, opts = {}) {
  const catalog = opts.catalog || loadThoughts();
  const entry = catalog.thoughts?.[thoughtId];
  if (!entry) return { ok: false, error: 'thought_not_found' };
  if (!state.unlocked.has(thoughtId)) return { ok: false, error: 'not_unlocked' };
  if (state.internalized.has(thoughtId)) return { ok: false, error: 'already_internalized' };
  if (state.researching.has(thoughtId)) return { ok: false, error: 'already_researching' };
  if (!canResearchMore(state)) return { ok: false, error: 'no_free_slot' };
  const baseCost = resolveResearchCost(entry);
  const mode = opts.mode === 'rounds' ? 'rounds' : 'encounters';
  // Sprint 6: round-mode scales by RESEARCH_ROUND_MULTIPLIER so T1 → 3 rounds,
  // T2 → 6, T3 → 9. Resonance still subtracts 1 AFTER scaling (rewards biome
  // affinity even in long round-pace cooldowns).
  const scaledCost = mode === 'rounds' ? baseCost * RESEARCH_ROUND_MULTIPLIER : baseCost;
  // Skiv ticket #4: biome resonance reduces research cost by 1 (min 1).
  // Caller computes resonance via biomeResonance.hasResonance(species, biome_id).
  const resonance = Boolean(opts.resonance);
  const cost = resonance ? Math.max(1, scaledCost - 1) : scaledCost;
  const resonanceApplied = resonance && cost < scaledCost;
  state.researching.set(thoughtId, {
    cost_remaining: cost,
    cost_total: cost,
    base_cost: baseCost,
    scaled_cost: scaledCost,
    mode,
    resonance_applied: resonanceApplied,
    started_at_encounter: Number.isFinite(opts.encounter) ? opts.encounter : null,
    started_at_round: Number.isFinite(opts.round) ? opts.round : null,
  });
  return {
    ok: true,
    state,
    cost_total: cost,
    base_cost: baseCost,
    scaled_cost: scaledCost,
    mode,
    resonance_applied: resonanceApplied,
  };
}

function tickResearch(state, delta = 1) {
  const step = Number.isFinite(delta) && delta > 0 ? Math.floor(delta) : 1;
  const promoted = [];
  for (const [id, entry] of state.researching) {
    const next = entry.cost_remaining - step;
    if (next <= 0) {
      state.researching.delete(id);
      state.internalized.add(id);
      promoted.push(id);
    } else {
      entry.cost_remaining = next;
    }
  }
  return { state, promoted };
}

function forgetThought(state, thoughtId) {
  if (state.internalized.has(thoughtId)) {
    state.internalized.delete(thoughtId);
    return { ok: true, state, freed_from: 'internalized' };
  }
  if (state.researching.has(thoughtId)) {
    state.researching.delete(thoughtId);
    return { ok: true, state, freed_from: 'researching' };
  }
  return { ok: false, error: 'not_active' };
}

function addDeltas(target, deltas) {
  if (!deltas || typeof deltas !== 'object') return;
  for (const [k, v] of Object.entries(deltas)) {
    if (!Number.isFinite(v)) continue;
    target[k] = (target[k] || 0) + v;
  }
}

function passiveBonuses(state, opts = {}) {
  const catalog = opts.catalog || loadThoughts();
  const bonus = {};
  const cost = {};
  for (const id of state.internalized) {
    const entry = catalog.thoughts?.[id];
    if (!entry) continue;
    addDeltas(bonus, entry.effect_bonus);
    addDeltas(cost, entry.effect_cost);
  }
  return { bonus, cost, internalized: Array.from(state.internalized) };
}

function snapshotCabinet(state) {
  return {
    unlocked: Array.from(state.unlocked),
    researching: Array.from(state.researching.entries()).map(([id, e]) => ({
      id,
      cost_remaining: e.cost_remaining,
      cost_total: e.cost_total,
      base_cost: e.base_cost ?? e.cost_total,
      scaled_cost: e.scaled_cost ?? e.cost_total,
      mode: e.mode || 'encounters',
      resonance_applied: Boolean(e.resonance_applied),
      started_at_encounter: e.started_at_encounter ?? null,
      started_at_round: e.started_at_round ?? null,
      progress_pct:
        e.cost_total > 0 ? Math.round(((e.cost_total - e.cost_remaining) / e.cost_total) * 100) : 0,
    })),
    internalized: Array.from(state.internalized),
    slots_max: state.slots_max,
    slots_used: slotsUsed(state),
  };
}

// Sprint 6: bulk tick helper for round-end side effects. Decrements every
// research timer in `bucket` (Map<unitId, CabinetState>) by `delta` rounds
// and returns the per-unit promotion list. Caller is responsible for applying
// passive bonuses on promoted thoughts (see thoughtPassiveApply.updateThoughtPassives).
function tickAllResearch(bucket, delta = 1) {
  if (!bucket || typeof bucket.entries !== 'function') return [];
  const results = [];
  for (const [unitId, state] of bucket.entries()) {
    if (!state || state.researching.size === 0) continue;
    const { promoted } = tickResearch(state, delta);
    if (promoted.length === 0) continue;
    results.push({ unit_id: unitId, promoted });
  }
  return results;
}

module.exports = {
  loadThoughts,
  resetCache,
  evaluateThoughts,
  thoughtsByAxis,
  describeThought,
  matchesThreshold,
  // Phase 2
  DEFAULT_SLOTS_MAX,
  RESEARCH_ROUND_MULTIPLIER,
  createCabinetState,
  slotsUsed,
  canResearchMore,
  resolveResearchCost,
  mergeUnlocked,
  startResearch,
  tickResearch,
  tickAllResearch,
  forgetThought,
  passiveBonuses,
  snapshotCabinet,
};
