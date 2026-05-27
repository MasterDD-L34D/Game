// Fase-3 Epigenome (Lamarck-lite) -- pure engine.
//
// Substrate: vcScoring conviction_axis (utility/liberty/morality, 0-100,
// baseline 50). Makes play-shaped telemetry a partially-heritable DISCRETE
// bias on offspring, with mandatory decay/regression-to-mean (anti-snowball).
//
// Authority: docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md
//   §Layer-3 + docs/research/2026-05-27-epigenome-params-research.md.
// All numeric defaults = START-VALUES; lock = playtest N>=40 at build (L-069).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const AXES = ['utility', 'liberty', 'morality'];
const BASELINE = 0.5;

function clamp01(x) {
  if (!Number.isFinite(x)) return BASELINE;
  return Math.max(0, Math.min(1, x));
}

/**
 * EMA accumulation of a per-session conviction snapshot into a creature's
 * persistent epigenome. conviction_axis is 0-100; epigenome is 0-1.
 *
 * @param {object|null} prevEpi -- { utility, liberty, morality } in 0-1 (null -> 0.5 baseline)
 * @param {object} sessionConviction -- { utility, liberty, morality } in 0-100
 * @param {number} [alpha=0.4] -- EMA responsiveness (start-value)
 * @returns {{utility:number, liberty:number, morality:number}}
 */
function accumulateEpigenome(prevEpi, sessionConviction, alpha = 0.4) {
  const prev = prevEpi && typeof prevEpi === 'object' ? prevEpi : {};
  const out = {};
  for (const axis of AXES) {
    const rawV = sessionConviction ? Number(sessionConviction[axis]) : NaN;
    const sNorm = clamp01((Number.isFinite(rawV) ? rawV : 50) / 100);
    const p = Number.isFinite(prev[axis]) ? prev[axis] : BASELINE;
    out[axis] = clamp01(alpha * sNorm + (1 - alpha) * p);
  }
  return out;
}

/**
 * Ratified 2-parent offspring epigenome (deviation-cap reading -- see plan
 * "Formula interpretation note"). Per axis:
 *   deviation = (parentAvg - mean) * (1-regression) * weight * decay
 *   offspring = clamp01(mean + clamp(deviation, -cap, +cap))
 *
 * @param {object} epiA -- parent A epigenome (0-1; missing axis -> species mean)
 * @param {object} epiB -- parent B epigenome
 * @param {object} speciesMean -- per-axis 0-1 baseline
 * @param {object} params -- { inheritance_weight, decay_per_gen, regression_to_mean, bias_cap }
 * @returns {{utility:number, liberty:number, morality:number}}
 */
function computeOffspringEpigenome(epiA, epiB, speciesMean, params) {
  const p = params || {};
  const w = Number.isFinite(p.inheritance_weight) ? p.inheritance_weight : 0.3;
  const decay = Number.isFinite(p.decay_per_gen) ? p.decay_per_gen : 0.6;
  const reg = Number.isFinite(p.regression_to_mean) ? p.regression_to_mean : 0.3;
  const cap = Number.isFinite(p.bias_cap) ? p.bias_cap : 0.2;
  const out = {};
  for (const axis of AXES) {
    const mean = clamp01(
      speciesMean && Number.isFinite(speciesMean[axis]) ? speciesMean[axis] : BASELINE,
    );
    const pa = clamp01(epiA && Number.isFinite(epiA[axis]) ? epiA[axis] : mean);
    const pb = clamp01(epiB && Number.isFinite(epiB[axis]) ? epiB[axis] : mean);
    const parentAvg = (pa + pb) / 2;
    let deviation = (parentAvg - mean) * (1 - reg) * w * decay;
    deviation = Math.max(-cap, Math.min(cap, deviation));
    out[axis] = clamp01(mean + deviation);
  }
  return out;
}

function _round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Discrete expression: pick the axis with the largest |deviation| from the
 * species mean and map it (hi/lo) to a narrative memoria_ambientale tag.
 * Below min_bias -> no epigenetic expression (memoria stays pure-biome = null).
 *
 * @param {object} offspringEpi -- per-axis 0-1
 * @param {object} speciesMean -- per-axis 0-1
 * @param {object} axisMemoryMap -- { <axis>: { hi, lo } }
 * @param {number} [minBias=0.05]
 * @returns {{memory_id:string|null, axis:string|null, direction:'hi'|'lo'|null, strength:number}}
 */
function deriveEpigeneticMemory(offspringEpi, speciesMean, axisMemoryMap, minBias = 0.05) {
  let best = null;
  let bestMag = 0;
  for (const axis of AXES) {
    const epiV = clamp01(
      offspringEpi && Number.isFinite(offspringEpi[axis]) ? offspringEpi[axis] : BASELINE,
    );
    const meanV = clamp01(
      speciesMean && Number.isFinite(speciesMean[axis]) ? speciesMean[axis] : BASELINE,
    );
    const dev = epiV - meanV;
    if (Math.abs(dev) > bestMag) {
      bestMag = Math.abs(dev);
      best = { axis, dev };
    }
  }
  if (!best || bestMag < minBias) {
    return { memory_id: null, axis: null, direction: null, strength: 0 };
  }
  const direction = best.dev >= 0 ? 'hi' : 'lo';
  const memory_id =
    (axisMemoryMap && axisMemoryMap[best.axis] && axisMemoryMap[best.axis][direction]) || null;
  return { memory_id, axis: best.axis, direction, strength: _round3(bestMag) };
}

/**
 * Max axis |deviation| of the parent average epigenome from the species mean.
 * Keys the birth-time fragment grant on PARENT play-shaping (not the diluted
 * post-decay offspring deviation).
 */
function epigenomeBiasStrength(epiA, epiB, speciesMean) {
  let mag = 0;
  for (const axis of AXES) {
    const pa = clamp01(epiA && Number.isFinite(epiA[axis]) ? epiA[axis] : BASELINE);
    const pb = clamp01(epiB && Number.isFinite(epiB[axis]) ? epiB[axis] : BASELINE);
    const mean = clamp01(
      speciesMean && Number.isFinite(speciesMean[axis]) ? speciesMean[axis] : BASELINE,
    );
    mag = Math.max(mag, Math.abs((pa + pb) / 2 - mean));
  }
  return _round3(mag);
}

/**
 * Frammenti Genetici grant at birth (reuse skipFragmentStore at the boundary;
 * NO parallel currency). Strong parent bias (>= threshold) -> grant amount.
 */
function computeFragmentGrant(strength, threshold = 0.1, amount = 1) {
  const s = Number(strength);
  return Number.isFinite(s) && s >= threshold ? amount : 0;
}

/**
 * Mean epigenome across registry entries that carry an `epigenome` object.
 * Empty/invalid -> 0.5 baseline per axis.
 */
function computeSpeciesMean(entries) {
  const acc = { utility: 0, liberty: 0, morality: 0 };
  let n = 0;
  for (const e of Array.isArray(entries) ? entries : []) {
    const epi = e && e.epigenome;
    if (!epi || typeof epi !== 'object') continue;
    if (!AXES.every((axis) => Number.isFinite(epi[axis]))) continue;
    for (const axis of AXES) acc[axis] += epi[axis];
    n += 1;
  }
  if (n === 0) return { utility: BASELINE, liberty: BASELINE, morality: BASELINE };
  return { utility: acc.utility / n, liberty: acc.liberty / n, morality: acc.morality / n };
}

// epigenome.js lives at apps/backend/services/genetics/ -> 4 levels to repo root.
const DEFAULT_MATING_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'mating.yaml',
);

const EPIGENOME_DEFAULTS = {
  axes: AXES,
  inheritance_weight: 0.3,
  decay_per_gen: 0.6,
  regression_to_mean: 0.3,
  bias_cap: 0.2,
  accumulation_alpha: 0.4,
  min_bias_expression: 0.05,
  fragment_grant_threshold: 0.1,
  fragment_grant_amount: 1,
  speciation_divergence_threshold: 0.15,
  axis_memory_map: {
    utility: { hi: 'memoria_efficienza', lo: 'memoria_spreco' },
    liberty: { hi: 'memoria_indomita', lo: 'memoria_disciplina' },
    morality: { hi: 'memoria_protettiva', lo: 'memoria_spietata' },
  },
};

/**
 * Load the epigenome: block from mating.yaml, merged over defaults.
 * Missing file/key -> defaults (never throws).
 */
function loadEpigenomeConfig(matingPath = DEFAULT_MATING_PATH) {
  try {
    const parsed = yaml.load(fs.readFileSync(matingPath, 'utf8'));
    const blk =
      parsed && parsed.epigenome && typeof parsed.epigenome === 'object' ? parsed.epigenome : {};
    return {
      ...EPIGENOME_DEFAULTS,
      ...blk,
      axis_memory_map: { ...EPIGENOME_DEFAULTS.axis_memory_map, ...(blk.axis_memory_map || {}) },
    };
  } catch (_) {
    return { ...EPIGENOME_DEFAULTS };
  }
}

module.exports = {
  AXES,
  EPIGENOME_DEFAULTS,
  accumulateEpigenome,
  computeOffspringEpigenome,
  deriveEpigeneticMemory,
  epigenomeBiasStrength,
  computeFragmentGrant,
  computeSpeciesMean,
  loadEpigenomeConfig,
};
