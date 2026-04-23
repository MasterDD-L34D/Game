// M12 Phase B — PI pack roller.
// ADR-2026-04-23-m12-phase-a (Phase B extension).
//
// Loads data/packs.yaml and rolls a pack using:
//   1. d20 general table (1-10 standard, 11-15 alt, 16-17 BIAS_FORMA, 18-19 BIAS_JOB, 20 SCELTA)
//   2. d12 form-specific bias table when BIAS_FORMA hits
//   3. job_bias[jobId] 2-pack rotation when BIAS_JOB hits
//
// RNG: caller supplies `rng()` or uses `Math.random`. Deterministic when seeded.
// Returns { pack_key, combo, source, dice: { d20, d12? }, formId?, jobId? }
//
// Cost computation: sum pi_shop.costs[item] across combo (ignoring `PE` entries
// which are literal rewards, not costs).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_PACKS_PATH = path.resolve(__dirname, '../../../../data/packs.yaml');

let _packsCache = null;

function loadPacks(packsPath = DEFAULT_PACKS_PATH) {
  if (_packsCache && _packsCache.__path === packsPath) return _packsCache;
  const raw = fs.readFileSync(packsPath, 'utf-8');
  const data = yaml.load(raw);
  data.__path = packsPath;
  _packsCache = data;
  return data;
}

function resetPacksCache() {
  _packsCache = null;
}

function rollD(rng, sides) {
  return Math.floor(rng() * sides) + 1;
}

function rangeIncludes(rangeStr, n) {
  if (typeof rangeStr !== 'string') return false;
  if (rangeStr.includes('-')) {
    const [a, b] = rangeStr.split('-').map((x) => Number(x));
    return n >= a && n <= b;
  }
  return Number(rangeStr) === n;
}

/**
 * Roll a general d20 pack. Returns the entry matched (may be BIAS_FORMA /
 * BIAS_JOB / SCELTA — caller-specific resolution).
 */
function rollGeneralD20(packs, rng = Math.random) {
  const table = packs.random_general_d20 || [];
  const d20 = rollD(rng, 20);
  for (const entry of table) {
    if (rangeIncludes(entry.range, d20)) {
      return { d20, entry };
    }
  }
  return { d20, entry: null };
}

/**
 * Roll a form-specific d12 pack (A/B/C branch).
 */
function rollFormD12(packs, formId, rng = Math.random) {
  const form = packs.forms?.[formId];
  if (!form) return null;
  const d12 = rollD(rng, 12);
  const bias = form.bias_d12 || {};
  for (const [branch, range] of Object.entries(bias)) {
    if (rangeIncludes(range, d12)) {
      return { d12, branch, combo: form[branch] || [] };
    }
  }
  return { d12, branch: null, combo: [] };
}

/**
 * Compute total PE cost of a combo using pi_shop.costs. Ignores literal PE
 * entries (those are rewards). Returns { cost, items, rewards }.
 */
function computeComboCost(packs, combo) {
  const costs = packs.pi_shop?.costs || {};
  const items = [];
  const rewards = [];
  let cost = 0;
  for (const token of combo || []) {
    if (typeof token !== 'string') continue;
    if (token === 'PE') {
      rewards.push('PE');
      continue;
    }
    // Token can be "key" or "key:value" (e.g., "trait_T1:pianificatore").
    const key = token.includes(':') ? token.split(':')[0] : token;
    const price = Number(costs[key] ?? 0);
    cost += price;
    items.push({ token, key, cost: price });
  }
  return { cost, items, rewards, pe_reward_count: rewards.length };
}

/**
 * Full roll flow: d20 → BIAS_FORMA d12 / BIAS_JOB rotation / SCELTA
 * Returns a structured pack result with combo + cost breakdown.
 */
function rollPack({ packs, formId = null, jobId = null, rng = Math.random } = {}) {
  if (!packs) throw new Error('packs registry required');
  const { d20, entry } = rollGeneralD20(packs, rng);
  if (!entry) {
    return { ok: false, reason: 'no_entry_matched', d20 };
  }
  // Resolve bias / scelta indirections.
  let resolvedEntry = entry;
  let d12 = null;
  let branch = null;
  if (entry.pack === 'BIAS_FORMA') {
    if (!formId) {
      return { ok: false, reason: 'form_id_required_for_bias', d20, entry };
    }
    const formRoll = rollFormD12(packs, formId, rng);
    if (!formRoll) return { ok: false, reason: 'form_not_found', formId, d20 };
    d12 = formRoll.d12;
    branch = formRoll.branch;
    resolvedEntry = { pack: `FORMA:${formId}:${branch}`, combo: formRoll.combo };
  } else if (entry.pack === 'BIAS_JOB') {
    const bias = packs.job_bias?.[jobId] || packs.job_bias?.default;
    if (!bias || bias.length === 0) {
      return { ok: false, reason: 'job_bias_missing', jobId, d20 };
    }
    // Pick among the 2-pack bias rotation uniformly.
    const picked = bias[rollD(rng, bias.length) - 1];
    const pickedEntry = (packs.random_general_d20 || []).find((e) => e.pack === picked);
    if (!pickedEntry) return { ok: false, reason: 'bias_job_pack_missing', picked };
    resolvedEntry = pickedEntry;
  } else if (entry.pack === 'SCELTA') {
    // Caller-driven choice — caller can re-call rollPack with explicit pick.
    return { ok: true, source: 'SCELTA', d20, entry, requires_choice: true };
  }
  const combo = resolvedEntry.combo || [];
  const costBreakdown = computeComboCost(packs, combo);
  return {
    ok: true,
    source: entry.pack,
    resolved_pack: resolvedEntry.pack,
    combo,
    cost: costBreakdown.cost,
    items: costBreakdown.items,
    pe_rewards: costBreakdown.pe_reward_count,
    dice: { d20, d12 },
    form_id: formId,
    job_id: jobId,
    form_branch: branch,
  };
}

/**
 * Deterministic RNG helper (mulberry32) for tests / replay.
 */
function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = {
  loadPacks,
  resetPacksCache,
  rollGeneralD20,
  rollFormD12,
  computeComboCost,
  rollPack,
  seededRng,
  DEFAULT_PACKS_PATH,
};
