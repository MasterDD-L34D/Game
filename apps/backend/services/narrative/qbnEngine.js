// QBN (Quality-Based Narrative) engine — narrative-design-illuminator P0.
//
// Pattern: Failbetter Games / StoryNexus / Fallen London (Emily Short
// 2016 "Beyond Branching"). Events are drawn from a YAML pool, gated by
// player "qualities" (MBTI axes + Ennea archetypes + run state) and a
// per-event cooldown/repeat policy. Selection is deterministic on seed.
//
// Companion of services/narrative/briefingVariations.js (per-encounter
// flavor text). QBN operates at debrief / milestone level — campaign-arc
// scope.
//
// Why YAML + condition gates rather than ink? StoryNexus events benefit
// from declarative, condition-only authorship (Reed 2009 analysis). ink
// excels at branching dialogue inside a scene; QBN excels at picking
// WHICH scene to play, given the player's quality state. Different layer.
//
// History shape (caller-managed, in-memory or Prisma-persisted):
//   {
//     seen: { <event_id>: <count> },
//     last_seen_session: { <event_id>: <session_index> },
//   }
//
// References:
//   - .claude/agents/narrative-design-illuminator.md (P0 QBN)
//   - data/narrative/qbn_events.yaml (event pack)
//   - https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PACK_PATH = path.resolve(__dirname, '../../../../data/narrative/qbn_events.yaml');

let _cached = null;

/** Test hook — clears the memoized pack so subsequent loads re-read disk. */
function clearCache() {
  _cached = null;
}

/**
 * Load and memoize the YAML event pack. Returns null on failure (engine
 * gracefully returns null event in that case).
 */
function loadPack(pathOverride = null) {
  if (pathOverride === null && _cached !== null) return _cached;
  const target = pathOverride || DEFAULT_PACK_PATH;
  try {
    const raw = fs.readFileSync(target, 'utf-8');
    const parsed = yaml.load(raw);
    if (!parsed?.events || !Array.isArray(parsed.events)) return null;
    if (pathOverride === null) _cached = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Mulberry32 deterministic RNG (matches packRoller.js / briefingVariations.js).
 */
function createRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distill quality-vector from a VC snapshot + run state.
 *
 * @param {object} input — { vcSnapshot, runState }
 *   vcSnapshot.per_actor[uid].mbti_axes  → averaged across actors
 *   vcSnapshot.per_actor[uid].ennea_archetypes → union across actors
 *   runState.turns_played, runState.victories
 *
 * @returns {object} qualities — { mbti_t, mbti_f, ..., ennea_set, turns_played, victories }
 */
function extractQualities(input = {}) {
  const vc = input.vcSnapshot || {};
  const runState = input.runState || {};
  const perActor = vc.per_actor || {};
  const actors = Object.values(perActor);

  // Average MBTI axes across actors. If no actors, default 0.5.
  const axisSums = { T_F: 0, S_N: 0, E_I: 0, J_P: 0 };
  let count = 0;
  const enneaSet = new Set();
  for (const a of actors) {
    const axes = a.mbti_axes || {};
    if (typeof axes.T_F === 'number') {
      axisSums.T_F += axes.T_F;
      axisSums.S_N += axes.S_N ?? 0.5;
      axisSums.E_I += axes.E_I ?? 0.5;
      axisSums.J_P += axes.J_P ?? 0.5;
      count++;
    }
    for (const arc of a.ennea_archetypes || []) enneaSet.add(Number(arc));
  }
  const avg = count ? axisSums : { T_F: 0.5, S_N: 0.5, E_I: 0.5, J_P: 0.5 };
  const div = count || 1;

  return {
    mbti_t: avg.T_F / div,
    mbti_f: 1 - avg.T_F / div,
    mbti_n: avg.S_N / div,
    mbti_s: 1 - avg.S_N / div,
    mbti_e: avg.E_I / div,
    mbti_i: 1 - avg.E_I / div,
    mbti_j: avg.J_P / div,
    mbti_p: 1 - avg.J_P / div,
    ennea_set: enneaSet,
    turns_played: Number(runState.turns_played) || Number(vc.turns_played) || 0,
    victories: Number(runState.victories) || 0,
  };
}

/**
 * Test event.conditions against extracted qualities + history.
 * Returns true if event is eligible.
 */
function matchConditions(event, qualities, history = {}) {
  const cond = event.conditions || {};
  const q = qualities;

  // MBTI axis thresholds.
  for (const key of [
    'mbti_t_min',
    'mbti_f_min',
    'mbti_n_min',
    'mbti_s_min',
    'mbti_e_min',
    'mbti_i_min',
    'mbti_j_min',
    'mbti_p_min',
  ]) {
    if (typeof cond[key] === 'number') {
      const axis = key.replace('_min', '');
      if ((q[axis] ?? 0) < cond[key]) return false;
    }
  }

  // Ennea archetypes.
  if (Array.isArray(cond.ennea_any) && cond.ennea_any.length > 0) {
    if (!cond.ennea_any.some((e) => q.ennea_set?.has(Number(e)))) return false;
  }
  if (Array.isArray(cond.ennea_all) && cond.ennea_all.length > 0) {
    if (!cond.ennea_all.every((e) => q.ennea_set?.has(Number(e)))) return false;
  }

  // Run-state thresholds.
  if (typeof cond.min_turns_played === 'number') {
    if (q.turns_played < cond.min_turns_played) return false;
  }
  if (typeof cond.min_victories === 'number') {
    if (q.victories < cond.min_victories) return false;
  }

  // Repeat / cooldown / sequencing constraints (history-driven).
  const seen = history.seen || {};
  const lastSeenSession = history.last_seen_session || {};
  const sessionIndex = Number(history.session_index) || 0;

  if (typeof cond.max_repeats === 'number') {
    if ((seen[event.id] || 0) >= cond.max_repeats) return false;
  }
  if (typeof event.cooldown === 'number' && event.cooldown > 0) {
    const last = lastSeenSession[event.id];
    if (last !== undefined && sessionIndex - last < event.cooldown) return false;
  }
  if (Array.isArray(cond.requires_seen)) {
    for (const req of cond.requires_seen) {
      if (!(seen[req] > 0)) return false;
    }
  }
  if (Array.isArray(cond.excludes_seen)) {
    for (const ex of cond.excludes_seen) {
      if (seen[ex] > 0) return false;
    }
  }

  return true;
}

/**
 * Weighted pick over eligible events. Returns event or null when empty.
 */
function weightedPick(events, rng) {
  if (!Array.isArray(events) || events.length === 0) return null;
  const weights = events.map((e) => Math.max(0, Number(e.weight) || 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return events[0];
  const r = rng() * total;
  let cum = 0;
  for (let i = 0; i < events.length; i++) {
    cum += weights[i];
    if (r <= cum) return events[i];
  }
  return events[events.length - 1];
}

/**
 * Main API: draw one event for the current quality state and history.
 *
 * @param {object} input
 * @param {object} input.vcSnapshot — VC snapshot (per_actor.mbti_axes, ennea_archetypes)
 * @param {object} [input.runState] — { turns_played, victories }
 * @param {object} [input.history]  — { seen, last_seen_session, session_index }
 * @param {number|string} [input.seed] — RNG seed; string is hashed (FNV-1a)
 * @param {object|null}   [pack]    — preloaded pack; falls back to default
 * @returns {{ event: object, eligible_count: number } | { event: null, reason: string }}
 */
function drawEvent(input = {}, pack = null) {
  const data = pack || loadPack();
  if (!data?.events) return { event: null, reason: 'pack_missing' };

  const qualities = extractQualities(input);
  const history = input.history || {};
  const eligible = data.events.filter((e) => matchConditions(e, qualities, history));
  if (eligible.length === 0) {
    return { event: null, reason: 'no_eligible_events', eligible_count: 0 };
  }

  const seed = typeof input.seed === 'string' ? hashSeed(input.seed) : (input.seed ?? 1);
  const rng = createRng(seed);
  const picked = weightedPick(eligible, rng);
  return { event: picked, eligible_count: eligible.length };
}

/**
 * Apply player choice + bookkeeping side-effects to a history object.
 * Returns the NEW history (immutable) — caller persists it.
 */
function applyChoice(history, eventId, choiceId, sessionIndex) {
  const seen = { ...(history?.seen || {}) };
  seen[eventId] = (seen[eventId] || 0) + 1;
  const lastSeen = { ...(history?.last_seen_session || {}) };
  lastSeen[eventId] = Number(sessionIndex) || 0;
  return {
    ...(history || {}),
    seen,
    last_seen_session: lastSeen,
    last_choice: choiceId ? { event_id: eventId, choice_id: choiceId } : history?.last_choice,
    session_index: sessionIndex,
  };
}

/** FNV-1a hash → 32-bit unsigned int. */
function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Returns event ids in pack (testing / introspection helper). */
function listEventIds(pack = null) {
  const data = pack || loadPack();
  if (!data?.events) return [];
  return data.events.map((e) => e.id);
}

module.exports = {
  DEFAULT_PACK_PATH,
  applyChoice,
  clearCache,
  createRng,
  drawEvent,
  extractQualities,
  hashSeed,
  listEventIds,
  loadPack,
  matchConditions,
  weightedPick,
};
