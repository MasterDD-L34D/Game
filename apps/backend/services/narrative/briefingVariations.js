// Tutorial briefing variation engine — narrative-design-illuminator P0.
//
// Replaces hardcoded `briefing_pre` / `briefing_post` strings with a
// deterministic, condition-gated weighted picker over a YAML pack of
// variants. Pattern: ink/Tracery hybrid — handcrafted variants (Wildermyth
// style), rule-based selection (Tracery), reproducible seed (mulberry32
// matching `services/forms/packRoller.js`).
//
// Falls back to the original hardcoded scenario string when:
//   - YAML pack missing or malformed
//   - scenario_id not in pack
//   - phase not in pack[scenario_id]
//   - no variants pass the conditions
//
// Backward-compatible: existing `?variant_seed` not provided → original
// behavior. Adding `?variant_seed=N` to `/api/tutorial/<id>` enables variation.
//
// Why not full inkjs? inkjs needs `.ink.json` compiled artifacts
// (inklecate CLI not in the repo). For static briefing variation the
// lighter Tracery-style picker keeps zero new deps and remains compilable
// to ink later (variants → ink alternatives `{a|b|c}`).
//
// References:
//   - .claude/agents/narrative-design-illuminator.md (P0 ink/weave)
//   - data/narrative/tutorial_briefings.yaml (variant pack)
//   - services/forms/packRoller.js (mulberry32 seed pattern)

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PACK_PATH = path.resolve(
  __dirname,
  '../../../../data/narrative/tutorial_briefings.yaml',
);

let _cached = null;

/**
 * Load + memoize the YAML variant pack. Returns null on failure (engine
 * gracefully degrades to fallback).
 */
function loadPack(pathOverride = null) {
  if (pathOverride === null && _cached !== null) return _cached;
  const target = pathOverride || DEFAULT_PACK_PATH;
  try {
    const raw = fs.readFileSync(target, 'utf-8');
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.scenarios) return null;
    if (pathOverride === null) _cached = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/** Test hook — clears the memoized pack so subsequent loads re-read disk. */
function clearCache() {
  _cached = null;
}

/**
 * Mulberry32 deterministic RNG. Same pattern as services/forms/packRoller.js
 * + apps/backend/services/rewards/rewardOffer.js. Returns float ∈ [0, 1).
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
 * Hash a string to a 32-bit integer (FNV-1a). Used so callers can pass
 * `session_id` directly without manually computing a numeric seed.
 */
function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Test variant.conditions against the supplied context. Missing fields on
 * either side are treated permissively (no condition = always pass).
 */
function matchConditions(conditions, ctx = {}) {
  if (!conditions || typeof conditions !== 'object') return true;
  if (conditions.replay === true && !ctx.replay) return false;
  if (conditions.replay === false && ctx.replay) return false;
  if (conditions.biome && ctx.biome !== conditions.biome) return false;
  if (typeof conditions.min_difficulty === 'number') {
    if ((ctx.difficulty || 0) < conditions.min_difficulty) return false;
  }
  if (typeof conditions.max_difficulty === 'number') {
    if ((ctx.difficulty || 0) > conditions.max_difficulty) return false;
  }
  // MBTI axis thresholds: ctx.mbti_axes = { T_F: 0..1, S_N: 0..1, ... } where
  // 0 = pure F/S/I/J and 1 = pure T/N/E/P. We test the high-end thresholds.
  const axes = ctx.mbti_axes || {};
  if (typeof conditions.mbti_t_min === 'number') {
    if ((axes.T_F ?? 0.5) < conditions.mbti_t_min) return false;
  }
  if (typeof conditions.mbti_f_min === 'number') {
    if (1 - (axes.T_F ?? 0.5) < conditions.mbti_f_min) return false;
  }
  if (typeof conditions.mbti_n_min === 'number') {
    if ((axes.S_N ?? 0.5) < conditions.mbti_n_min) return false;
  }
  if (typeof conditions.mbti_s_min === 'number') {
    if (1 - (axes.S_N ?? 0.5) < conditions.mbti_s_min) return false;
  }
  return true;
}

/**
 * Pick a variant by weighted RNG. `variants` is the pre-filtered eligible list.
 * Returns the picked variant object (with id + text + weight + conditions).
 */
function weightedPick(variants, rng) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const weights = variants.map((v) => Math.max(0, Number(v.weight) || 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return variants[0];
  const r = rng() * total;
  let cum = 0;
  for (let i = 0; i < variants.length; i++) {
    cum += weights[i];
    if (r <= cum) return variants[i];
  }
  return variants[variants.length - 1];
}

/**
 * Main API: pick a briefing variant for the given (scenario, phase, ctx).
 *
 * @param {string} scenarioId — e.g. "enc_tutorial_01"
 * @param {string} phase — "pre" or "post"
 * @param {object} ctx
 * @param {number|string} [ctx.seed] — numeric seed OR string hashed via FNV-1a
 * @param {boolean}  [ctx.replay]   — whether the player has played this scenario before
 * @param {string}   [ctx.biome]    — current biome id (for biome-gated variants)
 * @param {number}   [ctx.difficulty]
 * @param {object}   [ctx.mbti_axes] — { T_F, S_N, E_I, J_P } each 0..1
 * @param {string|null} [ctx.fallback] — string to return on miss (default null)
 * @param {object|null} [pack] — preloaded pack; if omitted, default pack is used
 * @returns {{ id: string, text: string, source: 'variation'|'fallback' } | null}
 */
function selectBriefing(scenarioId, phase, ctx = {}, pack = null) {
  const fallback = ctx.fallback ?? null;
  const data = pack || loadPack();
  if (!data?.scenarios?.[scenarioId]?.[phase]) {
    return fallback ? { id: 'fallback', text: fallback, source: 'fallback' } : null;
  }
  const variants = data.scenarios[scenarioId][phase];
  if (!Array.isArray(variants) || variants.length === 0) {
    return fallback ? { id: 'fallback', text: fallback, source: 'fallback' } : null;
  }
  const eligible = variants.filter((v) => matchConditions(v.conditions, ctx));
  if (eligible.length === 0) {
    return fallback ? { id: 'fallback', text: fallback, source: 'fallback' } : null;
  }
  const seed = typeof ctx.seed === 'string' ? hashSeed(ctx.seed) : (ctx.seed ?? 1);
  const rng = createRng(seed);
  const picked = weightedPick(eligible, rng);
  return picked ? { id: picked.id, text: picked.text, source: 'variation' } : null;
}

/**
 * Convenience: lists every variant id available for a scenario/phase. Useful
 * for telemetry and for the route handler to expose discoverability.
 */
function listVariants(scenarioId, phase, pack = null) {
  const data = pack || loadPack();
  const variants = data?.scenarios?.[scenarioId]?.[phase];
  if (!Array.isArray(variants)) return [];
  return variants.map((v) => ({
    id: v.id,
    weight: v.weight ?? 1,
    has_conditions: Boolean(v.conditions),
  }));
}

module.exports = {
  DEFAULT_PACK_PATH,
  clearCache,
  createRng,
  hashSeed,
  loadPack,
  matchConditions,
  selectBriefing,
  listVariants,
  weightedPick,
};
