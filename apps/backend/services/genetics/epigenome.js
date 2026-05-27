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

module.exports = { AXES, accumulateEpigenome };
