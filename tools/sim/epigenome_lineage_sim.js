#!/usr/bin/env node
// Epigenome lineage propagation sim -- playtest scenario + metric for the Fase-3
// epigenome loop. Imports the SHIPPED engine (no formula reimplementation) and
// breeds `lineages` lineages over `generations`, with parents "playing"
// `sessionsPerGen` sessions of a fixed conviction profile each generation.
// Measures gen-1 perceptibility + anti-snowball convergence. Pure model-level:
// no backend, no DB. Diagnostic per docs/process/2026-04-26-calibration-harness-policy.md.
'use strict';

const eng = require('../../apps/backend/services/genetics/epigenome');

// Play-style profiles = conviction_axis (0-100) the parents play each session.
const PROFILES = {
  neutral: { utility: 50, liberty: 50, morality: 50 },
  strong_utility: { utility: 95, liberty: 50, morality: 50 },
  strong_liberty: { utility: 50, liberty: 95, morality: 50 },
  strong_morality_lo: { utility: 50, liberty: 50, morality: 5 },
};

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPECIES_MEAN = { utility: 0.5, liberty: 0.5, morality: 0.5 };

function maxAxisDev(epi, mean) {
  let m = 0;
  for (const a of eng.AXES) m = Math.max(m, Math.abs((epi[a] ?? 0.5) - (mean[a] ?? 0.5)));
  return m;
}

/**
 * Run the lineage propagation sim.
 * @returns {{profile,generations,sessionsPerGen,lineages,seed,params,by_gen,checks}}
 */
function runLineageSim({
  profile = 'strong_utility',
  generations = 6,
  sessionsPerGen = 5,
  lineages = 40,
  seed = 12345,
} = {}) {
  const cfg = eng.loadEpigenomeConfig();
  const conv = PROFILES[profile] || PROFILES.neutral;
  const rng = mulberry32(seed); // reserved for future stochastic profiles; keeps seed in signature
  void rng;

  const perGen = Array.from({ length: generations }, () => ({
    devs: [],
    expressed: 0,
    grants: 0,
    mem: {},
    n: 0,
  }));

  for (let L = 0; L < lineages; L++) {
    let pa = { ...SPECIES_MEAN };
    let pb = { ...SPECIES_MEAN };
    for (let g = 0; g < generations; g++) {
      for (let s = 0; s < sessionsPerGen; s++) {
        pa = eng.accumulateEpigenome(pa, conv, cfg.accumulation_alpha);
        pb = eng.accumulateEpigenome(pb, conv, cfg.accumulation_alpha);
      }
      const off = eng.computeOffspringEpigenome(pa, pb, SPECIES_MEAN, cfg);
      const mem = eng.deriveEpigeneticMemory(
        off,
        SPECIES_MEAN,
        cfg.axis_memory_map,
        cfg.min_bias_expression,
      );
      const bias = eng.epigenomeBiasStrength(pa, pb, SPECIES_MEAN);
      const grant = eng.computeFragmentGrant(
        bias,
        cfg.fragment_grant_threshold,
        cfg.fragment_grant_amount,
      );
      const rec = perGen[g];
      rec.n += 1;
      rec.devs.push(maxAxisDev(off, SPECIES_MEAN));
      if (mem.memory_id) {
        rec.expressed += 1;
        rec.mem[mem.memory_id] = (rec.mem[mem.memory_id] || 0) + 1;
      }
      if (grant > 0) rec.grants += 1;
      // Offspring becomes the next generation's parent pair (they will re-play).
      pa = { ...off };
      pb = { ...off };
    }
  }

  const mean = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0);
  const round = (x, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
  const by_gen = perGen.map((r, i) => ({
    gen: i + 1,
    n: r.n,
    deviation_avg: round(mean(r.devs)),
    expression_rate: round(r.expressed / (r.n || 1), 3),
    grant_rate: round(r.grants / (r.n || 1), 3),
    memory_hist: r.mem,
  }));

  const dev1 = by_gen[0] ? by_gen[0].deviation_avg : 0;
  const devG = by_gen[generations - 1] ? by_gen[generations - 1].deviation_avg : 0;
  const devPrev = generations >= 2 ? by_gen[generations - 2].deviation_avg : devG;
  const lateDelta = Math.abs(devG - devPrev);
  const cap = cfg.bias_cap;
  const allUnderCap = by_gen.every((g) => g.deviation_avg <= cap + 1e-9);
  const converged = lateDelta < 0.01;

  return {
    profile,
    generations,
    sessionsPerGen,
    lineages,
    seed,
    params: {
      weight: cfg.inheritance_weight,
      decay: cfg.decay_per_gen,
      regression: cfg.regression_to_mean,
      bias_cap: cap,
      alpha: cfg.accumulation_alpha,
      min_bias_expression: cfg.min_bias_expression,
    },
    by_gen,
    checks: {
      gen1_expression_rate: by_gen[0] ? by_gen[0].expression_rate : 0,
      gen1_deviation: dev1,
      genG_deviation: devG,
      deviation_by_gen: by_gen.map((g) => g.deviation_avg),
      late_gen_delta: round(lateDelta),
      converged,
      all_gens_under_cap: allUnderCap,
      // Anti-snowball = bounded fixed point (converged) AND never exceeds cap.
      // NOT monotone-decreasing: continued play re-injects bias each gen, so the
      // sequence plateaus rather than falling. A snowball would grow toward cap.
      anti_snowball: converged && allUnderCap,
    },
  };
}

module.exports = { runLineageSim, PROFILES };

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 ? args[i + 1] : d;
  };
  const report = runLineageSim({
    profile: get('profile', 'strong_utility'),
    generations: Number(get('generations', 6)),
    sessionsPerGen: Number(get('sessions-per-gen', 5)),
    lineages: Number(get('lineages', 40)),
    seed: Number(get('seed', 12345)),
  });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
