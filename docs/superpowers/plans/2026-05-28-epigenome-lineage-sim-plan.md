# Epigenome Lineage Sim — Playtest Scenario + Metric Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Net-new playtest harness for the Fase-3 Epigenome loop. Measures the two properties research §4 (`docs/research/2026-05-27-epigenome-params-research.md`) names as the tuning gate: (1) **gen-1 perceptibility** — does play-style produce a perceptible, expressed bias in offspring; (2) **anti-snowball convergence** — gen-G lineages stay bounded (decay+regression+cap win, no runaway). Diagnostic, not a merge gate (per `docs/process/2026-04-26-calibration-harness-policy.md`).

**Architecture:** A Node sim (`tools/sim/epigenome_lineage_sim.js`) that imports the **SHIPPED** engine `apps/backend/services/genetics/epigenome.js` (no reimplementation → zero formula drift) and runs `lineages × generations` multi-generation breeding under a fixed play-style conviction profile. Pure model-level simulation: NO combat backend, NO Postgres. Seeded RNG for determinism.

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert/strict`. Test in `tests/api/` (CI glob). Tool in `tools/sim/` (precedent: `tools/sim/check-pillar-baselines.js`).

---

## Why this is the right shape

The epigenome loop's heritable-bias propagation is a property of the ratified formula (EMA accumulate → 2-parent deviation-cap → discrete expression) over generations. It is fully exercised by the pure engine fns + synthetic conviction inputs (= play-styles). Combat WR (existing `calibrate_parallel.py`) measures difficulty, NOT this. So the epigenome metric = a separate model-level sim.

## Metric definitions (start-values; diagnostic — lock = live-feel, master-dd, L-069)

- **deviation_avg[gen]** = mean over lineages of `max_axis |offspring_epi − species_mean|`.
- **expression_rate[gen]** = fraction of offspring with a non-null `memoria_ambientale` (engine `deriveEpigeneticMemory` ≥ `min_bias_expression`).
- **grant_rate[gen]** = fraction of matings granting a Frammento (`epigenomeBiasStrength` ≥ `fragment_grant_threshold`).
- **memory_hist[gen]** = histogram of expressed `memory_id` (readability check: strong-utility → `memoria_efficienza` dominant).
- **Checks**: `all_gens_under_cap` = every `deviation_avg <= bias_cap` (bounded); `converged` = `|deviation_avg[G] − deviation_avg[G-1]| < 0.01` (reached a fixed point — late-gen delta shrinks); `anti_snowball` = `converged && all_gens_under_cap`. NOTE: with continued play, parents re-accumulate each gen, so deviation plateaus at a bounded fixed point — it does NOT strictly decrease. Anti-snowball = "bounded fixed point, no runaway toward/past cap", NOT "monotone-decreasing". A snowball would show deviation GROWING each gen toward `bias_cap`. These are diagnostic, never block merge.

These thresholds are start-values consistent with the ratified params; the sim REPORTS the curves so master-dd reads perceptibility-vs-feel. Bands are not hard gates.

---

## Gotchas

- **Branch-first**: `feat/epigenome-lineage-sim` already checked out. No `main` edits. Verify `git branch --show-current`.
- **CI glob**: test in `tests/api/` (`node --test tests/api/*.test.js`).
- **tdd-guard ACTIVE**: one test at a time / Option B Bash heredoc after RED.
- **Use the SHIPPED engine** — `require('../../apps/backend/services/genetics/epigenome')`. Do NOT reimplement the formula.
- Commits: lowercase conventional + trailers `Coding-Agent: claude-opus-4.7` / `Trace-Id: <node -e "console.log(crypto.randomUUID())">`. `git add` only the 2 files (never -A).

## File Structure

| File                                    | Responsibility                                                                      | Action |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| `tools/sim/epigenome_lineage_sim.js`    | Multi-gen breeding sim over shipped engine + CLI + report                           | Create |
| `tests/api/epigenomeLineageSim.test.js` | Engine-backed sim tests (determinism, neutral-control, perceptibility, convergence) | Create |

---

## Task 1: Sim engine (`tools/sim/epigenome_lineage_sim.js`)

- [ ] **Step 1: Write failing test** — create `tests/api/epigenomeLineageSim.test.js` with the FIRST test:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runLineageSim } = require('../../tools/sim/epigenome_lineage_sim');

test('determinism: same seed -> identical report', () => {
  const a = runLineageSim({
    profile: 'strong_utility',
    generations: 4,
    sessionsPerGen: 5,
    lineages: 10,
    seed: 42,
  });
  const b = runLineageSim({
    profile: 'strong_utility',
    generations: 4,
    sessionsPerGen: 5,
    lineages: 10,
    seed: 42,
  });
  assert.deepEqual(a.by_gen, b.by_gen);
});
```

- [ ] **Step 2: Run RED** — `node --test tests/api/epigenomeLineageSim.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `tools/sim/epigenome_lineage_sim.js`:

```js
#!/usr/bin/env node
// Epigenome lineage propagation sim — playtest scenario + metric for the Fase-3
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
```

- [ ] **Step 4: Run GREEN** — `node --test tests/api/epigenomeLineageSim.test.js` → PASS.

- [ ] **Step 5: Commit** — `git add tools/sim/epigenome_lineage_sim.js tests/api/epigenomeLineageSim.test.js` + commit `feat(epigenome): lineage propagation sim (playtest scenario over shipped engine)` + trailers.

---

## Task 2: Metric tests (neutral-control, perceptibility, convergence)

- [ ] **Step 1: Append tests** (one at a time per tdd-guard):

```js
const { PROFILES } = require('../../tools/sim/epigenome_lineage_sim');

test('neutral control: no false bias (expression ~0, deviation ~0)', () => {
  const r = runLineageSim({
    profile: 'neutral',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
  });
  assert.equal(r.by_gen[0].expression_rate, 0, 'neutral play must not express a bias');
  assert.ok(r.by_gen[0].deviation_avg < 1e-6, 'neutral deviation must be ~0');
  assert.equal(r.checks.all_gens_under_cap, true);
});

test('perceptibility: strong play expresses a bias at gen-1 (dominant memoria_efficienza)', () => {
  const r = runLineageSim({
    profile: 'strong_utility',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
  });
  assert.ok(
    r.checks.gen1_deviation > r.params.min_bias_expression - 1e-9,
    'gen-1 deviation must reach the expression threshold',
  );
  assert.ok(r.by_gen[0].expression_rate > 0, 'strong play must express at gen-1');
  const hist = r.by_gen[0].memory_hist;
  const dominant = Object.entries(hist).sort((a, b) => b[1] - a[1])[0];
  assert.equal(dominant[0], 'memoria_efficienza', 'utility-high must map to memoria_efficienza');
});

test('anti-snowball: strong play converges to a bounded fixed point (plateau, under cap)', () => {
  const r = runLineageSim({
    profile: 'strong_utility',
    generations: 6,
    sessionsPerGen: 5,
    lineages: 40,
    seed: 7,
  });
  assert.equal(r.checks.all_gens_under_cap, true, 'no generation may exceed bias_cap');
  assert.equal(
    r.checks.converged,
    true,
    'late-gen deviation delta must be < 0.01 (fixed point reached)',
  );
  assert.ok(
    r.checks.genG_deviation < r.params.bias_cap,
    'plateau must sit well under cap (no runaway)',
  );
  assert.equal(r.checks.anti_snowball, true);
});
```

- [ ] **Step 2-4**: run each RED→GREEN. Full file `node --test tests/api/epigenomeLineageSim.test.js` → all PASS.

> NOTE for implementer: the perceptibility test asserts `gen1_deviation > min_bias_expression`. With ratified params this is borderline (~0.05 vs threshold 0.05). VERIFY empirically by running `node tools/sim/epigenome_lineage_sim.js --profile strong_utility --generations 6 --lineages 40` FIRST. If gen-1 deviation lands just BELOW min_bias_expression (so expression_rate is 0), this is a REAL DIAGNOSTIC FINDING (params give imperceptible gen-1 bias = L-069 tuning signal), NOT a test to force-pass. In that case: change the perceptibility test to assert the measured reality (e.g. `expression_rate === 0` + report the deviation), and FLAG in the report/PR that ratified params yield sub-threshold gen-1 perceptibility — master-dd tuning input. Do NOT fudge numbers to make a green test; the sim's value is the honest measurement.

- [ ] **Step 5: Commit** — `test(epigenome): lineage sim metric tests (neutral/perceptibility/convergence)` + trailers.

---

## Task 3: Smoke run + PR

- [ ] Run `node tools/sim/epigenome_lineage_sim.js --profile strong_utility --generations 6 --lineages 40` and `--profile neutral ...`; capture the by_gen curves into the PR body (the actual perceptibility + convergence numbers).
- [ ] `node --test tests/api/*.test.js` full-suite regression (expect prior 1324 + new sim tests, 0 fail).
- [ ] Push + PR with the measured curves + the honest perceptibility verdict.

## Self-Review

- Uses shipped engine (no drift) ✓ · pure (no DB/backend) ✓ · deterministic (seed) ✓ · diagnostic not gate ✓ · measures both research §4 properties ✓.
- Honest-measurement discipline: if ratified params give sub-threshold gen-1 perceptibility, REPORT it (L-069 signal), don't fake green.

## Deferred

- Stochastic/mixed play profiles (rng wired, unused now). Per-axis convergence detail. Wiring the sim into a CI diagnostic. Live-human playtest remains the true oracle.
