# Fase-3 Epigenome (Lamarck-lite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the net-new Epigenome layer (Layer-3) that makes play-shaped VC telemetry a partially-heritable, DISCRETE bias on offspring — "how you play shapes what you become" — with mandatory decay/regression-to-mean (anti-snowball).

**Architecture:** A pure engine module (`genetics/epigenome.js`) computes (1) per-creature EMA accumulation of `conviction_axis` telemetry, (2) the ratified 2-parent offspring epigenome formula, (3) a DISCRETE `memoria_ambientale` expression pick, (4) a birth-time Frammenti grant. It is wired into the existing `rollMatingOffspring` (opt-in via `context`, fully back-compat), persisted via `recordOffspring`, consumed for emergent speciation in `getTribesEmergent`, and the fragment side-effect is applied at the route boundary (`POST /mating/roll`) by reusing `skipFragmentStore` (NO parallel currency).

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert/strict`, `js-yaml`, `supertest`. Tests live in `tests/api/` (CI runner glob — see Gotchas).

---

## Authority & decisions (do not re-derive)

- **Design SoT**: vault `Spaces/Dev/Evo-Tactics/core/00-SOURCE-OF-TRUTH.md §24` -> `docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md` -> this runtime.
- **Spec**: `docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md` §Layer-3 Epigenome + §5 Decision #2.
- **Params (ratified #2401, 2026-05-27)**: `docs/research/2026-05-27-epigenome-params-research.md`. Start-values; **lock = playtest N>=40 at build** (L-069). DO NOT armchair-final-tune.
- **Master-dd design-gate answers (2026-05-27, in-session)** — these resolve the formula/mechanism choices the spec left open:
  1. **VC axes = Conviction** (`conviction_axis`: `utility`/`liberty`/`morality`, stored 0-100 -> normalize /100; baseline 50 -> `species_mean` default 0.5). NOT MBTI (dead-band/null-prone).
  2. **Discrete expression = `memoria_ambientale` slot** — the dominant biased axis picks WHICH narrative memory tag expresses (Niche-readable, "la prole ha preso la sete del deserto"). NOT continuous stat-drift (P2: "NON sim continuo").
  3. **Per-creature accumulation = EMA per axis** (responsive, bounded, smooths single-session noise).
  4. **Frammenti = grant at birth** — strong parent epigenetic bias grants bonus Frammenti Genetici via `skipFragmentStore.addFragments` (reuse, NO parallel currency).

### Formula interpretation note (CONFIRM at build — single non-degenerate reading)

The research doc writes the formula as:

```
offspring_epi[axis] = clamp(
  species_mean + (parent_avg_epi - species_mean) * (1-regression) * weight * decay,
  -bias_cap, +bias_cap )
```

Read literally, the clamp bounds the whole sum to `[-0.2, +0.2]`; since the sum hovers near `species_mean (~0.5)`, it would always clamp to `0.2` (degenerate). The **anti-snowball proof** ("bias_cap bounded -> impossibile accumulo runaway") only makes sense if `bias_cap` bounds the **deviation from `species_mean`**. This plan implements the **deviation-cap** reading:

```
deviation     = (parent_avg_epi - species_mean) * (1-regression) * weight * decay
deviation_cap = clamp(deviation, -bias_cap, +bias_cap)
offspring_epi = clamp01(species_mean + deviation_cap)
```

This is the only coherent reading; flagged here for master-dd confirmation at build, not silently locked.

---

## Gotchas (load-bearing — read before starting)

- **Branch-first**: Game commits on `main` are blocked by husky ("use a patch branch"). Create the feature branch BEFORE any edit (Task 0).
- **CI test glob**: `scripts/run-test-api.cjs` runs `node --test tests/api/*.test.js` (+ named files + `tests/play/*`). `tests/services/` and `tests/routes/` are NOT in any runner glob. **All new tests go in `tests/api/`**, importing the service directly (glob is by location, not content).
- **tdd-guard Write/Edit hook IS INSTALLED**. It blocks (a) adding multiple tests in one Write ("add one at a time"), (b) "premature implementation" of cohesive new functions. Honor it: add ONE test via Edit-append, run it RED, then implement. For a cohesive multi-function module where the hook fights a from-scratch file, **Option B is authorized**: write the file via `Bash`/python heredoc AFTER capturing the RED run, and declare it in the PR. Pytest-style guard uses absolute `tdd_guard_project_root` + cwd-within; this plan is pure Node so the Write/Edit JS path applies.
- **Single test run**: `node --test tests/api/<file>.test.js` (whole file) or `node --test --test-name-pattern="<substr>" tests/api/<file>.test.js` (one test).
- **Merge flow**: PRs need head up-to-date with base. After each merge `main` moves -> next PR stale. Use `gh pr update-branch` -> watch checks -> `gh pr merge --squash`. **`--admin` is BLOCKED by the auto-mode classifier** — do not rely on it.
- **Backend boot for e2e** (only if running the supertest/route task against a live DB): see memory `ryzen_game_backend_boot.md` (standalone PG17 + `@game/*` junctions). The supertest in Task 9 uses `createApp()` in-process and does not require Postgres for the fragment-store path (in-memory `skipFragmentStore`).

---

## File Structure

| File                                          | Responsibility                                                                                                                                                                      | Action     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `apps/backend/services/genetics/epigenome.js` | Pure engine: EMA accumulation, offspring formula, discrete memory pick, bias strength, fragment grant, species mean, config loader. Zero side-effects.                              | **Create** |
| `data/core/mating.yaml`                       | Add `epigenome:` config block (4 ratified params + accumulation/expression/grant/speciation start-values + `axis_memory_map`). Update `memoria_ambientale` comment.                 | **Modify** |
| `apps/backend/services/metaProgression.js`    | Wire epigenome into `rollMatingOffspring` (opt-in, back-compat); persist `epigenome` in `recordOffspring`; add `epigenetic_divergence` + `is_distinct_form` to `getTribesEmergent`. | **Modify** |
| `apps/backend/routes/meta.js`                 | `POST /mating/roll`: inject `epigenomeConfig` into context; apply birth-time Frammenti grant via `addFragments` (boundary side-effect).                                             | **Modify** |
| `tests/api/epigenome.test.js`                 | Pure engine unit tests (Tasks 1-5).                                                                                                                                                 | **Create** |
| `tests/api/epigenomeMatingWire.test.js`       | `rollMatingOffspring` integration + `recordOffspring` persistence (Tasks 6-7).                                                                                                      | **Create** |
| `tests/api/epigenomeSpeciation.test.js`       | `getTribesEmergent` divergence (Task 8).                                                                                                                                            | **Create** |
| `tests/api/epigenomeRoute.test.js`            | `POST /mating/roll` fragment grant supertest (Task 9).                                                                                                                              | **Create** |

**Module surface (`epigenome.js` exports — referenced across tasks):**
`accumulateEpigenome`, `computeOffspringEpigenome`, `deriveEpigeneticMemory`, `epigenomeBiasStrength`, `computeFragmentGrant`, `computeSpeciesMean`, `loadEpigenomeConfig`, `AXES`, `EPIGENOME_DEFAULTS`.

---

## Task 0: Feature branch

- [ ] **Step 1: Create the branch**

```bash
cd C:/dev/Game
git checkout main
git pull
git checkout -b feat/epigenome-fase3
```

Expected: `Switched to a new branch 'feat/epigenome-fase3'`.

---

## Task 1: EMA accumulation (`accumulateEpigenome`)

**Files:**

- Create: `apps/backend/services/genetics/epigenome.js`
- Test: `tests/api/epigenome.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/epigenome.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { accumulateEpigenome } = require('../../apps/backend/services/genetics/epigenome');

test('accumulateEpigenome: EMA blends session conviction (0-100) into prev epi (0-1)', () => {
  const prev = { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const session = { utility: 90, liberty: 50, morality: 10 };
  const out = accumulateEpigenome(prev, session, 0.4);
  // utility: 0.4*0.9 + 0.6*0.5 = 0.66 ; liberty: 0.5 ; morality: 0.4*0.1 + 0.6*0.5 = 0.34
  assert.ok(Math.abs(out.utility - 0.66) < 1e-9);
  assert.ok(Math.abs(out.liberty - 0.5) < 1e-9);
  assert.ok(Math.abs(out.morality - 0.34) < 1e-9);
});

test('accumulateEpigenome: null prev -> 0.5 baseline; axis value 0 is honored (not coerced)', () => {
  const out = accumulateEpigenome(null, { utility: 100, liberty: 0, morality: 50 }, 0.4);
  // utility: 0.4*1.0 + 0.6*0.5 = 0.7 ; liberty: 0.4*0 + 0.6*0.5 = 0.3 ; morality: 0.5
  assert.ok(Math.abs(out.utility - 0.7) < 1e-9);
  assert.ok(Math.abs(out.liberty - 0.3) < 1e-9);
  assert.ok(Math.abs(out.morality - 0.5) < 1e-9);
});
```

> tdd-guard: this adds two assertions for ONE function. If the hook objects to two `test(...)` blocks in one Write, append the second `test` via a follow-up Edit after the first runs RED. Both target the same unit `accumulateEpigenome`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api/epigenome.test.js`
Expected: FAIL — `Cannot find module '.../genetics/epigenome'`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/backend/services/genetics/epigenome.js`:

```js
// Fase-3 Epigenome (Lamarck-lite) — pure engine.
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
 * @param {object|null} prevEpi — { utility, liberty, morality } in 0-1 (null -> 0.5 baseline)
 * @param {object} sessionConviction — { utility, liberty, morality } in 0-100
 * @param {number} [alpha=0.4] — EMA responsiveness (start-value)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenome.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/genetics/epigenome.js tests/api/epigenome.test.js
git commit -m "feat(epigenome): EMA per-creature accumulation of conviction telemetry"
```

---

## Task 2: Offspring epigenome formula (`computeOffspringEpigenome`)

**Files:**

- Modify: `apps/backend/services/genetics/epigenome.js`
- Test: `tests/api/epigenome.test.js`

- [ ] **Step 1: Append the failing test**

Append to `tests/api/epigenome.test.js`:

```js
const { computeOffspringEpigenome } = require('../../apps/backend/services/genetics/epigenome');

const RATIFIED = {
  inheritance_weight: 0.3,
  decay_per_gen: 0.6,
  regression_to_mean: 0.3,
  bias_cap: 0.2,
};

test('computeOffspringEpigenome: gen-1 retains ~0.063 of parent deviation (ratified params)', () => {
  const epiA = { utility: 1.0, liberty: 0.5, morality: 0.5 };
  const epiB = { utility: 1.0, liberty: 0.5, morality: 0.5 };
  const mean = { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const out = computeOffspringEpigenome(epiA, epiB, mean, RATIFIED);
  // deviation = (1.0-0.5)*0.7*0.3*0.6 = 0.063 -> offspring 0.563
  assert.ok(Math.abs(out.utility - 0.563) < 1e-9);
  assert.ok(Math.abs(out.liberty - 0.5) < 1e-9);
});

test('computeOffspringEpigenome: bias_cap bounds DEVIATION from species_mean', () => {
  const epiA = { utility: 1.0, liberty: 0.0, morality: 0.5 };
  const epiB = { utility: 1.0, liberty: 0.0, morality: 0.5 };
  const mean = { utility: 0.5, liberty: 0.5, morality: 0.5 };
  // inflate so raw deviation exceeds cap -> clamps to mean +/- cap
  const big = {
    inheritance_weight: 1.0,
    decay_per_gen: 1.0,
    regression_to_mean: 0.0,
    bias_cap: 0.2,
  };
  const out = computeOffspringEpigenome(epiA, epiB, mean, big);
  // utility raw dev = (1.0-0.5)*1*1*1 = 0.5 > 0.2 -> 0.5 + 0.2 = 0.7
  assert.ok(Math.abs(out.utility - 0.7) < 1e-9);
  // liberty raw dev = (0.0-0.5) = -0.5 -> -0.2 -> 0.5 - 0.2 = 0.3
  assert.ok(Math.abs(out.liberty - 0.3) < 1e-9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="computeOffspringEpigenome" tests/api/epigenome.test.js`
Expected: FAIL — `computeOffspringEpigenome is not a function`.

- [ ] **Step 3: Add the implementation**

In `apps/backend/services/genetics/epigenome.js`, add before `module.exports`:

```js
/**
 * Ratified 2-parent offspring epigenome (deviation-cap reading — see plan
 * "Formula interpretation note"). Per axis:
 *   deviation = (parentAvg - mean) * (1-regression) * weight * decay
 *   offspring = clamp01(mean + clamp(deviation, -cap, +cap))
 *
 * @param {object} epiA — parent A epigenome (0-1; missing axis -> species mean)
 * @param {object} epiB — parent B epigenome
 * @param {object} speciesMean — per-axis 0-1 baseline
 * @param {object} params — { inheritance_weight, decay_per_gen, regression_to_mean, bias_cap }
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
```

Update `module.exports` to: `module.exports = { AXES, accumulateEpigenome, computeOffspringEpigenome };`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenome.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/genetics/epigenome.js tests/api/epigenome.test.js
git commit -m "feat(epigenome): ratified offspring formula with deviation-cap anti-snowball"
```

---

## Task 3: Discrete memory expression (`deriveEpigeneticMemory`)

**Files:**

- Modify: `apps/backend/services/genetics/epigenome.js`
- Test: `tests/api/epigenome.test.js`

- [ ] **Step 1: Append the failing test**

Append to `tests/api/epigenome.test.js`:

```js
const { deriveEpigeneticMemory } = require('../../apps/backend/services/genetics/epigenome');

const MEMORY_MAP = {
  utility: { hi: 'memoria_efficienza', lo: 'memoria_spreco' },
  liberty: { hi: 'memoria_indomita', lo: 'memoria_disciplina' },
  morality: { hi: 'memoria_protettiva', lo: 'memoria_spietata' },
};
const NEUTRAL_MEAN = { utility: 0.5, liberty: 0.5, morality: 0.5 };

test('deriveEpigeneticMemory: dominant hi-deviation axis picks hi memory tag', () => {
  const m = deriveEpigeneticMemory(
    { utility: 0.7, liberty: 0.52, morality: 0.5 },
    NEUTRAL_MEAN,
    MEMORY_MAP,
    0.05,
  );
  assert.equal(m.axis, 'utility');
  assert.equal(m.direction, 'hi');
  assert.equal(m.memory_id, 'memoria_efficienza');
  assert.ok(Math.abs(m.strength - 0.2) < 1e-9);
});

test('deriveEpigeneticMemory: lo-deviation axis picks lo memory tag', () => {
  const m = deriveEpigeneticMemory(
    { utility: 0.5, liberty: 0.5, morality: 0.25 },
    NEUTRAL_MEAN,
    MEMORY_MAP,
    0.05,
  );
  assert.equal(m.axis, 'morality');
  assert.equal(m.direction, 'lo');
  assert.equal(m.memory_id, 'memoria_spietata');
});

test('deriveEpigeneticMemory: all axes below min_bias -> pure biome (null)', () => {
  const m = deriveEpigeneticMemory(
    { utility: 0.52, liberty: 0.49, morality: 0.5 },
    NEUTRAL_MEAN,
    MEMORY_MAP,
    0.05,
  );
  assert.equal(m.memory_id, null);
  assert.equal(m.axis, null);
  assert.equal(m.strength, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="deriveEpigeneticMemory" tests/api/epigenome.test.js`
Expected: FAIL — `deriveEpigeneticMemory is not a function`.

- [ ] **Step 3: Add the implementation**

In `epigenome.js`, add before `module.exports`:

```js
function _round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Discrete expression: pick the axis with the largest |deviation| from the
 * species mean and map it (hi/lo) to a narrative memoria_ambientale tag.
 * Below min_bias -> no epigenetic expression (memoria stays pure-biome = null).
 *
 * @param {object} offspringEpi — per-axis 0-1
 * @param {object} speciesMean — per-axis 0-1
 * @param {object} axisMemoryMap — { <axis>: { hi, lo } }
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
```

Add `deriveEpigeneticMemory` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenome.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/genetics/epigenome.js tests/api/epigenome.test.js
git commit -m "feat(epigenome): discrete memoria_ambientale expression from dominant biased axis"
```

---

## Task 4: Bias strength, fragment grant, species mean

**Files:**

- Modify: `apps/backend/services/genetics/epigenome.js`
- Test: `tests/api/epigenome.test.js`

- [ ] **Step 1: Append the failing test**

Append to `tests/api/epigenome.test.js`:

```js
const {
  epigenomeBiasStrength,
  computeFragmentGrant,
  computeSpeciesMean,
} = require('../../apps/backend/services/genetics/epigenome');

test('epigenomeBiasStrength: max axis deviation of parent avg from species mean', () => {
  const s = epigenomeBiasStrength(
    { utility: 1.0, liberty: 0.5, morality: 0.5 },
    { utility: 1.0, liberty: 0.5, morality: 0.5 },
    { utility: 0.5, liberty: 0.5, morality: 0.5 },
  );
  assert.ok(Math.abs(s - 0.5) < 1e-9);
});

test('computeFragmentGrant: strength >= threshold grants amount', () => {
  assert.equal(computeFragmentGrant(0.2, 0.1, 1), 1);
  assert.equal(computeFragmentGrant(0.05, 0.1, 1), 0);
  assert.equal(computeFragmentGrant(0, 0.1, 1), 0);
});

test('computeSpeciesMean: averages stored epigenomes; defaults 0.5 when empty', () => {
  assert.deepEqual(computeSpeciesMean([]), { utility: 0.5, liberty: 0.5, morality: 0.5 });
  const mean = computeSpeciesMean([
    { epigenome: { utility: 0.6, liberty: 0.4, morality: 0.5 } },
    { epigenome: { utility: 0.8, liberty: 0.6, morality: 0.5 } },
    { epigenome: null }, // skipped
  ]);
  assert.ok(Math.abs(mean.utility - 0.7) < 1e-9);
  assert.ok(Math.abs(mean.liberty - 0.5) < 1e-9);
  assert.ok(Math.abs(mean.morality - 0.5) < 1e-9);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="epigenomeBiasStrength|computeFragmentGrant|computeSpeciesMean" tests/api/epigenome.test.js`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Add the implementation**

In `epigenome.js`, add before `module.exports`:

```js
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
```

Add `epigenomeBiasStrength`, `computeFragmentGrant`, `computeSpeciesMean` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenome.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/genetics/epigenome.js tests/api/epigenome.test.js
git commit -m "feat(epigenome): parent bias strength + fragment grant + species mean helpers"
```

---

## Task 5: Config block + loader (`mating.yaml` + `loadEpigenomeConfig`)

**Files:**

- Modify: `data/core/mating.yaml`
- Modify: `apps/backend/services/genetics/epigenome.js`
- Test: `tests/api/epigenome.test.js`

- [ ] **Step 1: Append the failing test**

Append to `tests/api/epigenome.test.js`:

```js
const { loadEpigenomeConfig } = require('../../apps/backend/services/genetics/epigenome');

test('loadEpigenomeConfig: reads ratified params + memory map from mating.yaml', () => {
  const cfg = loadEpigenomeConfig();
  assert.equal(cfg.inheritance_weight, 0.3);
  assert.equal(cfg.decay_per_gen, 0.6);
  assert.equal(cfg.regression_to_mean, 0.3);
  assert.equal(cfg.bias_cap, 0.2);
  assert.equal(cfg.accumulation_alpha, 0.4);
  assert.equal(cfg.min_bias_expression, 0.05);
  assert.equal(cfg.fragment_grant_threshold, 0.1);
  assert.equal(cfg.fragment_grant_amount, 1);
  assert.equal(cfg.speciation_divergence_threshold, 0.15);
  assert.equal(cfg.axis_memory_map.morality.hi, 'memoria_protettiva');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="loadEpigenomeConfig" tests/api/epigenome.test.js`
Expected: FAIL — `loadEpigenomeConfig is not a function`.

- [ ] **Step 3a: Add the `epigenome:` block to `data/core/mating.yaml`**

Append at the END of `data/core/mating.yaml` (top-level key, after `hybrid_rules`):

```yaml
epigenome:
  # Fase-3 Lamarck-lite. Params ratified #2401 (2026-05-27); START-VALUES, lock =
  # playtest N>=40 al build (L-069). Substrato = vcScoring conviction_axis
  # (utility/liberty/morality, 0-100 -> /100; baseline 50 -> species_mean 0.5).
  axes: [utility, liberty, morality]
  inheritance_weight: 0.3 # bias non copia (< gene-slot 0.4-0.8)
  decay_per_gen: 0.6 # bio transient ~3 gen (0.6^3 ~= 0.22)
  regression_to_mean: 0.3 # tira 30% verso media-specie
  bias_cap: 0.2 # hard-bound DEVIAZIONE da species_mean (anti-runaway)
  accumulation_alpha: 0.4 # EMA reattivita' per-creatura (start-value)
  min_bias_expression: 0.05 # sotto soglia -> memoria_ambientale resta pura-bioma
  fragment_grant_threshold: 0.1 # |deviazione| parent dominante >= soglia -> grant
  fragment_grant_amount: 1 # Frammenti Genetici bonus (riusa skipFragmentStore)
  speciation_divergence_threshold: 0.15 # tribe epi-divergence >= soglia -> is_distinct_form
  # asse dominante x direzione -> memoria_ambientale espressa (tag narrativo,
  # content re-authorable da master-dd; mechanism-default minimale).
  axis_memory_map:
    utility: { hi: memoria_efficienza, lo: memoria_spreco }
    liberty: { hi: memoria_indomita, lo: memoria_disciplina }
    morality: { hi: memoria_protettiva, lo: memoria_spietata }
```

Also update the `memoria_ambientale` slot comment (currently line ~454) from:

```yaml
inheritance_weight: 0.0 # sempre generata dal bioma, non ereditata
```

to:

```yaml
inheritance_weight: 0.0 # gene-slot pick: mai (rigenerata bioma). Espressione epigenetica governata dal blocco `epigenome:` (Fase-3, weight 0.3)
```

- [ ] **Step 3b: Add the loader to `epigenome.js`**

In `epigenome.js`, add near the top (after the `require`s) and before `module.exports`:

```js
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
 * Load the `epigenome:` block from mating.yaml, merged over defaults.
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
  } catch {
    return { ...EPIGENOME_DEFAULTS };
  }
}
```

Add `loadEpigenomeConfig` and `EPIGENOME_DEFAULTS` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenome.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add data/core/mating.yaml apps/backend/services/genetics/epigenome.js tests/api/epigenome.test.js
git commit -m "feat(epigenome): mating.yaml config block + loader (ratified start-values)"
```

---

## Task 6: Wire into `rollMatingOffspring` (opt-in, back-compat)

**Files:**

- Modify: `apps/backend/services/metaProgression.js` (require at top; epigenome block before the `return` of `rollMatingOffspring`, ~line 657)
- Test: `tests/api/epigenomeMatingWire.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/epigenomeMatingWire.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { rollMatingOffspring } = require('../../apps/backend/services/metaProgression');
const { loadEpigenomeConfig } = require('../../apps/backend/services/genetics/epigenome');

test('rollMatingOffspring: epigenome INERT without context.epigenomeConfig (back-compat)', () => {
  const r = rollMatingOffspring({
    parentA: { id: 'a', epigenome: { utility: 0.9, liberty: 0.5, morality: 0.5 } },
    parentB: { id: 'b', epigenome: { utility: 0.9, liberty: 0.5, morality: 0.5 } },
    biomeId: 'dune',
  });
  assert.equal(r.success, true);
  assert.equal(r.offspring.epigenome, undefined);
  assert.equal(r.offspring.epigenetic_memory, undefined);
});

test('rollMatingOffspring: with config + parent epigenomes -> offspring epigenome + discrete memory + grant', () => {
  const cfg = loadEpigenomeConfig();
  const r = rollMatingOffspring({
    parentA: { id: 'a', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
    parentB: { id: 'b', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
    biomeId: 'dune',
    context: { epigenomeConfig: cfg, speciesMean: { utility: 0.5, liberty: 0.5, morality: 0.5 } },
  });
  assert.equal(r.success, true);
  assert.ok(Math.abs(r.offspring.epigenome.utility - 0.563) < 1e-9);
  assert.equal(r.offspring.epigenetic_memory.memory_id, 'memoria_efficienza');
  assert.equal(r.offspring.memoria_ambientale.source, 'epigenome');
  // parent bias strength = 0.5 >= grant_threshold 0.1 -> grant 1
  assert.equal(r.offspring.epigenome_fragment_grant, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api/epigenomeMatingWire.test.js`
Expected: FAIL — second test fails (`r.offspring.epigenome` is `undefined`).

- [ ] **Step 3: Add the wire**

In `apps/backend/services/metaProgression.js`, add at the top with the other requires:

```js
const {
  computeOffspringEpigenome,
  deriveEpigeneticMemory,
  epigenomeBiasStrength,
  computeFragmentGrant,
} = require('./genetics/epigenome');
```

Then inside `rollMatingOffspring`, immediately BEFORE the final `return { success: true, offspring, ... }` (after `offspring` is fully built and after the optional gene-encoder block, ~line 656), insert:

```js
// Fase-3 Epigenome (Lamarck-lite). Opt-in: requires context.epigenomeConfig
// + at least one parent epigenome. Pure: attaches offspring.epigenome,
// .epigenetic_memory, .epigenome_fragment_grant (caller applies the fragment
// side-effect at the route boundary). Fully inert otherwise (back-compat).
if (context.epigenomeConfig && (parentA.epigenome || parentB.epigenome)) {
  const epiCfg = context.epigenomeConfig;
  const speciesMean = context.speciesMean || { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const offspringEpi = computeOffspringEpigenome(
    parentA.epigenome,
    parentB.epigenome,
    speciesMean,
    epiCfg,
  );
  const epiMemory = deriveEpigeneticMemory(
    offspringEpi,
    speciesMean,
    epiCfg.axis_memory_map,
    epiCfg.min_bias_expression,
  );
  const parentBias = epigenomeBiasStrength(parentA.epigenome, parentB.epigenome, speciesMean);
  offspring.epigenome = offspringEpi;
  offspring.epigenetic_memory = epiMemory;
  offspring.epigenome_fragment_grant = computeFragmentGrant(
    parentBias,
    epiCfg.fragment_grant_threshold,
    epiCfg.fragment_grant_amount,
  );
  // Discrete expression on the narrative slot: if a memory expressed, surface
  // it as memoria_ambientale (else stays pure-biome = absent).
  if (epiMemory.memory_id) {
    offspring.memoria_ambientale = {
      source: 'epigenome',
      memory_id: epiMemory.memory_id,
      axis: epiMemory.axis,
      direction: epiMemory.direction,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenomeMatingWire.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Regression check — existing meta tests still green**

Run: `node --test tests/api/*.test.js`
Expected: PASS (no regression in existing mating/meta tests).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/services/metaProgression.js tests/api/epigenomeMatingWire.test.js
git commit -m "feat(epigenome): wire into rollMatingOffspring (opt-in, back-compat)"
```

---

## Task 7: Persist epigenome in `recordOffspring`

**Files:**

- Modify: `apps/backend/services/metaProgression.js` (`recordOffspring` normalized object, ~line 1003)
- Test: `tests/api/epigenomeMatingWire.test.js`

> The `rollOffspring`->`recordOffspring` bridge (Sprint C) is the call-site that materializes a rolled offspring into the lineage graph. When that bridge runs, it must pass `epigenome: offspring.epigenome` so speciation (Task 8) can read it. This task makes `recordOffspring` carry the field; if the bridge omits it, the field defaults to `null` (no break).

- [ ] **Step 1: Append the failing test**

Append to `tests/api/epigenomeMatingWire.test.js`:

```js
const {
  recordOffspring,
  _resetLineageRegistry,
} = require('../../apps/backend/services/metaProgression');

test('recordOffspring: persists epigenome field (default null)', () => {
  _resetLineageRegistry();
  const e1 = recordOffspring({ unit_id: 'u1', lineage_id: 'L1' });
  assert.equal(e1.epigenome, null);
  const e2 = recordOffspring({
    unit_id: 'u2',
    lineage_id: 'L1',
    epigenome: { utility: 0.7, liberty: 0.5, morality: 0.5 },
  });
  assert.deepEqual(e2.epigenome, { utility: 0.7, liberty: 0.5, morality: 0.5 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="recordOffspring: persists epigenome" tests/api/epigenomeMatingWire.test.js`
Expected: FAIL — `e1.epigenome` is `undefined` (not `null`).

- [ ] **Step 3: Add the field**

In `recordOffspring`, add to the `normalized` object (after `born_at_biome`):

```js
    epigenome: entry.epigenome && typeof entry.epigenome === 'object' ? entry.epigenome : null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenomeMatingWire.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/metaProgression.js tests/api/epigenomeMatingWire.test.js
git commit -m "feat(epigenome): persist epigenome on lineage registry entries"
```

---

## Task 8: Emergent speciation by epigenetic divergence (`getTribesEmergent`)

**Files:**

- Modify: `apps/backend/services/metaProgression.js` (`getTribesEmergent`, ~line 1047; uses `computeSpeciesMean` from epigenome.js)
- Test: `tests/api/epigenomeSpeciation.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/epigenomeSpeciation.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  recordOffspring,
  getTribesEmergent,
  _resetLineageRegistry,
} = require('../../apps/backend/services/metaProgression');

const MEAN = { utility: 0.5, liberty: 0.5, morality: 0.5 };

test('getTribesEmergent: tribe epigenome diverged beyond threshold -> is_distinct_form', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++) {
    recordOffspring({
      unit_id: `d${i}`,
      lineage_id: 'DIV',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.75, liberty: 0.5, morality: 0.5 },
    });
  }
  const tribes = getTribesEmergent({ speciesMean: MEAN, divergenceThreshold: 0.15 });
  const t = tribes.find((x) => x.tribe_id === 'DIV');
  assert.ok(t);
  assert.ok(Math.abs(t.epigenetic_divergence - 0.25) < 1e-9);
  assert.equal(t.is_distinct_form, true);
});

test('getTribesEmergent: tribe near species mean -> not distinct form', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++) {
    recordOffspring({
      unit_id: `n${i}`,
      lineage_id: 'NEAR',
      generation: i,
      born_at_biome: 'dune',
      epigenome: { utility: 0.52, liberty: 0.5, morality: 0.5 },
    });
  }
  const tribes = getTribesEmergent({ speciesMean: MEAN, divergenceThreshold: 0.15 });
  const t = tribes.find((x) => x.tribe_id === 'NEAR');
  assert.ok(t);
  assert.equal(t.is_distinct_form, false);
});

test('getTribesEmergent: no args still works (defaults; back-compat with getTribeForUnit)', () => {
  _resetLineageRegistry();
  for (let i = 0; i < 3; i++) {
    recordOffspring({ unit_id: `z${i}`, lineage_id: 'Z', generation: i, born_at_biome: 'dune' });
  }
  const tribes = getTribesEmergent();
  const t = tribes.find((x) => x.tribe_id === 'Z');
  assert.ok(t);
  // no epigenome on members -> tribe mean = species default 0.5 -> divergence 0
  assert.equal(t.is_distinct_form, false);
  assert.equal(t.epigenetic_divergence, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api/epigenomeSpeciation.test.js`
Expected: FAIL — `t.epigenetic_divergence` / `t.is_distinct_form` undefined.

- [ ] **Step 3: Extend `getTribesEmergent`**

In `metaProgression.js`, ensure `computeSpeciesMean` is imported (extend the Task 6 require):

```js
const {
  computeOffspringEpigenome,
  deriveEpigeneticMemory,
  epigenomeBiasStrength,
  computeFragmentGrant,
  computeSpeciesMean,
} = require('./genetics/epigenome');
```

Change the signature `function getTribesEmergent() {` to:

```js
function getTribesEmergent(opts = {}) {
  const _speciesMean = opts.speciesMean || { utility: 0.5, liberty: 0.5, morality: 0.5 };
  const _divThreshold = Number.isFinite(opts.divergenceThreshold)
    ? opts.divergenceThreshold
    : 0.15;
```

Inside the `for (const [lineageId, members] of byLineage.entries())` loop, after `lineage_root_unit_id` is resolved and BEFORE `tribes.push({...})`, add:

```js
// Fase-3 — emergent speciation by epigenetic divergence. Tribe mean
// epigenome vs species mean; beyond threshold = distinct "specie-forma".
const tribeMean = computeSpeciesMean(members);
let epigeneticDivergence = 0;
for (const axis of ['utility', 'liberty', 'morality']) {
  const tv = Number.isFinite(tribeMean[axis]) ? tribeMean[axis] : 0.5;
  const sv = Number.isFinite(_speciesMean[axis]) ? _speciesMean[axis] : 0.5;
  epigeneticDivergence = Math.max(epigeneticDivergence, Math.abs(tv - sv));
}
epigeneticDivergence = Math.round(epigeneticDivergence * 1000) / 1000;
```

Then add the two fields to the `tribes.push({ ... })` object:

```js
      epigenetic_divergence: epigeneticDivergence,
      is_distinct_form: epigeneticDivergence >= _divThreshold,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenomeSpeciation.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Regression — tribe/lineage tests still green**

Run: `node --test tests/api/*.test.js`
Expected: PASS (existing tribe tests + `getTribeForUnit` unaffected).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/services/metaProgression.js tests/api/epigenomeSpeciation.test.js
git commit -m "feat(epigenome): emergent speciation by epigenetic divergence in getTribesEmergent"
```

---

## Task 9: Frammenti grant at the route boundary (`POST /mating/roll`)

**Files:**

- Modify: `apps/backend/routes/meta.js` (top requires; `/mating/roll` handler, ~line 233-254)
- Test: `tests/api/epigenomeRoute.test.js`

> Verify the mount prefix before writing the test: search for where the meta router is mounted (e.g. `grep "createMetaRouter\|/api/meta" apps/backend/app.js`). The test below assumes `/api/meta`; adjust the request path if the app mounts it elsewhere.

- [ ] **Step 1: Write the failing test**

Create `tests/api/epigenomeRoute.test.js`:

```js
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../../apps/backend/app');
const {
  _resetStore,
  getFragments,
} = require('../../apps/backend/services/rewards/skipFragmentStore');

test('POST /api/meta/mating/roll: strong parent epigenetic bias grants Frammento at birth', async () => {
  _resetStore();
  const app = createApp();
  const res = await request(app)
    .post('/api/meta/mating/roll')
    .send({
      campaign_id: 'camp1',
      parent_a: { id: 'pa', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
      parent_b: { id: 'pb', epigenome: { utility: 1.0, liberty: 0.5, morality: 0.5 } },
      biome_id: 'dune',
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.offspring.epigenome_fragment_grant, 1);
  assert.equal(getFragments('camp1').count, 1);
});

test('POST /api/meta/mating/roll: neutral parents grant nothing (no fragment)', async () => {
  _resetStore();
  const app = createApp();
  const res = await request(app)
    .post('/api/meta/mating/roll')
    .send({
      campaign_id: 'camp2',
      parent_a: { id: 'pa', epigenome: { utility: 0.5, liberty: 0.5, morality: 0.5 } },
      parent_b: { id: 'pb', epigenome: { utility: 0.5, liberty: 0.5, morality: 0.5 } },
      biome_id: 'dune',
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.offspring.epigenome_fragment_grant, 0);
  assert.equal(getFragments('camp2').count, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api/epigenomeRoute.test.js`
Expected: FAIL — `epigenome_fragment_grant` undefined / fragment count 0 in first test.

- [ ] **Step 3: Wire the route**

In `apps/backend/routes/meta.js`, add to the top requires:

```js
const { addFragments } = require('../services/rewards/skipFragmentStore');
const { loadEpigenomeConfig } = require('../services/genetics/epigenome');
```

In the `POST /mating/roll` handler, change the `store.rollOffspring(...)` call to inject the config and apply the grant. Replace lines ~242-250 with:

```js
const geneSlotsSchema = loadMatingSchema();
const mutationCatalog = loadCatalog();
const epigenomeConfig = loadEpigenomeConfig();
const result = await store.rollOffspring({
  parentA: parent_a,
  parentB: parent_b,
  biomeId: biome_id || null,
  context: { geneSlotsSchema, mutationCatalog, epigenomeConfig },
});
// Fase-3 — Frammenti Genetici grant at birth (strong parent epigenetic
// bias). NO parallel currency: reuse skipFragmentStore. species_mean
// defaults to 0.5 inside rollMatingOffspring (species-specific running
// mean = tuning follow-up).
const campaignId = (req.body && req.body.campaign_id) || opts.campaignId || null;
const grant = (result && result.offspring && result.offspring.epigenome_fragment_grant) || 0;
if (campaignId && grant > 0) {
  addFragments(campaignId, grant, {
    reason: 'epigenome_birth',
    lineage_id: result.offspring.lineage_id,
  });
}
res.json(result);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/epigenomeRoute.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Full API suite regression**

Run: `node scripts/run-test-api.cjs`
Expected: PASS (full CI runner green; no regression).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/routes/meta.js tests/api/epigenomeRoute.test.js
git commit -m "feat(epigenome): grant Frammenti Genetici at birth via skipFragmentStore (route wire)"
```

---

## Task 10: PR + cognitive-protocols footer

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin feat/epigenome-fase3
gh pr create --title "feat(epigenome): Fase-3 Lamarck-lite layer (engine + mating wire + speciation + Frammenti)" --body "$(cat <<'EOF'
## Summary
- Net-new Epigenome engine (genetics/epigenome.js): EMA accumulation of conviction telemetry, ratified 2-parent offspring formula (deviation-cap anti-snowball), discrete memoria_ambientale expression, parent bias strength, fragment grant, species mean, config loader.
- mating.yaml `epigenome:` config block (ratified start-values; lock = playtest N>=40, L-069).
- Wired into rollMatingOffspring (opt-in via context, back-compat), persisted in recordOffspring, consumed for emergent speciation in getTribesEmergent.
- Frammenti Genetici grant at birth via skipFragmentStore (NO parallel currency).

## Design authority
- Spec §Layer-3 + research 2026-05-27 params (#2401) + master-dd design-gate answers (axes=Conviction, expression=memoria_ambientale, accumulation=EMA, frammenti=grant-at-birth).
- Formula interpretation (deviation-cap) flagged for confirm at build — see plan.

## Test plan
- [x] tests/api/epigenome.test.js (pure engine, 11 tests)
- [x] tests/api/epigenomeMatingWire.test.js (mating wire + recordOffspring, 3 tests)
- [x] tests/api/epigenomeSpeciation.test.js (divergence, 3 tests)
- [x] tests/api/epigenomeRoute.test.js (fragment grant supertest, 2 tests)
- [x] node scripts/run-test-api.cjs green (full CI runner)

## Cognitive protocols applied
- harsh-reviewer invoked? N (consider before merge — net-new sub-system)
- brainstorming skill applied? N (design pre-settled across spec+ADR+params; writing-plans used)
- Coding-Agent: claude-opus-4.7

## NOT in scope (deferred)
- Per-creature epigenome persistence pipeline (where accumulateEpigenome is called post-encounter) — needs a session->creature write-back wire.
- Species-specific running species_mean (start uses 0.5 baseline).
- memoria_ambientale narrative tag authoring (mechanism uses minimal default map).
- Playtest N>=40 param lock (L-069) — start-values only.
EOF
)"
```

- [ ] **Step 2: Update branch + watch checks + squash merge**

```bash
gh pr update-branch
gh pr checks --watch
gh pr merge --squash
```

(Do NOT use `--admin`; it is blocked by the auto-mode classifier.)

---

## Self-Review (run after writing/executing)

**1. Spec coverage:**

- §Layer-3 "VC-appreso parzialmente ereditabile" -> Tasks 1-2-6 (accumulation + formula + wire). ✓
- "decay/regression obbligatori, anti-snowball" -> Task 2 (formula + deviation-cap), proof in research §Anti-snowball. ✓
- "espressione/unlock DISCRETI (memoria_ambientale)" -> Task 3 + Task 6 (memoria_ambientale surface). ✓
- "Economy: alimenta Frammenti, NON currency parallela" -> Tasks 4+9 (reuse skipFragmentStore). ✓
- "Speciazione: estendere getTribesEmergent con soglia" -> Task 8. ✓
- Resume scope (3 items: VC->discrete bias / wire Frammenti / speciazione soglia) -> all covered. ✓

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". All code blocks are complete.

**3. Type consistency:** `epigenome` = `{utility,liberty,morality}` (0-1) everywhere; `epigenetic_memory` = `{memory_id,axis,direction,strength}` (Tasks 3/6); config keys identical across Task 5 YAML + `EPIGENOME_DEFAULTS` + consumers; `computeFragmentGrant(strength:number,...)` matches the `epigenomeBiasStrength` number it is fed in Task 6. ✓

## Deferred / out of scope (tracked, not built here)

1. **Per-creature accumulation pipeline** — `accumulateEpigenome` exists + tested, but the post-encounter call-site that reads a session's `conviction_axis` and writes back the creature's persistent epigenome is a separate wire (touches session-end / debrief). Needed for the loop to actually accumulate across runs.
2. **rollOffspring->recordOffspring epigenome bridge** — Task 7 makes the field persist; confirm the live bridge passes `epigenome: offspring.epigenome` so speciation sees real data.
3. **Species-specific running `species_mean`** — start uses 0.5 baseline; `computeSpeciesMean` is ready to compute it from registry once species filtering is added.
4. **Narrative tag authoring** (`axis_memory_map` 6 tags) — mechanism default; master-dd re-authors content.
5. **Param lock via playtest N>=40** (L-069) — all values are start-values.
6. **Godot consumption** (genetics_api.gd #356) — backend canonical; Godot read-side after backend ships.
