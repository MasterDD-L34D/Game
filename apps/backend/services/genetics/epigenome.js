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

module.exports = { AXES, accumulateEpigenome, computeOffspringEpigenome };
