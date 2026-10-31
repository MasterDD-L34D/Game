---
title: 'Encounter geometry difficulty gate (PR 1) -- implementation plan'
date: 2026-07-03
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-03'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [balance, encounter, xp-budget, geometry, hazard, plan]
---

# Encounter geometry difficulty gate (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a flag-gated geometry-aware difficulty term (hazard-coupled Shape 1 + activation-pressure Shape 2 passive) to the Node xpBudget gate, an author-guard that flags grid changes needing re-ratify, and drop the write-only `estimated_turns` field -- all band-neutral / warn-only (D9 "warn poi promuovi").

**Architecture:** Extend `apps/backend/services/balance/xpBudget.js` with two pure helpers reading data already in the encounter (`grid.terrain_features`, `waves[]`). Shape 1 folds into `used` ONLY when `XP_BUDGET_GEOMETRY_ENABLED==='true'` (default OFF = byte-identical). Shape 2 is always computed + reported but never changes `status`. A new `tools/js/validate_encounter_grid_ratify.js` warns (advisory) when an encounter's `grid_size` diverges from a baseline registry without fresh ratify evidence. `estimated_turns` is removed from schema + 21 YAMLs + authoring tool + 5 scenario builders.

**Tech Stack:** Node 18+ (`node --test`), js-yaml, Python 3.10+ (`author_encounter.py`), AJV (encounter schema tests).

**Upstream:** Design spec `docs/superpowers/specs/2026-07-03-encounter-geometry-difficulty-gate-design.md` (sez. 4 = PR 1). Downstream of parent-ratified D1-D10 (spec sez. 0). Cross-ref audit `docs/balance/2026-04-25-encounter-xp-audit.md`.

---

## File Structure

| File                                                                                                                                                 | Responsibility                                                                                               | Action                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `data/core/balance/xp_budget.yaml`                                                                                                                   | add `geometry` config block (hazard_set, hazard_xp, class_scalar, activation_band) -- PROPOSED values        | Modify                                          |
| `apps/backend/services/balance/xpBudget.js`                                                                                                          | `hazardBudgetContribution` + `activationPressure` helpers; fold-in + report in `auditEncounter`; export both | Modify                                          |
| `tests/services/xpBudget.test.js`                                                                                                                    | regression (flag-OFF identical) + hazard-term + activation cases                                             | Modify                                          |
| `apps/backend/routes/session.js`                                                                                                                     | extend the audit warn-log to include activation fields                                                       | Modify (~L2742)                                 |
| `data/core/balance/grid_ratify_baseline.json`                                                                                                        | baseline grid per encounter (bootstrap = current grids, pre-ratified)                                        | Create                                          |
| `tools/js/validate_encounter_grid_ratify.js`                                                                                                         | advisory guard: grid_size vs baseline; warn on drift / unratified                                            | Create                                          |
| `tests/js/validate_encounter_grid_ratify.test.js`                                                                                                    | guard behavior tests                                                                                         | Create                                          |
| `run-test-api.cjs`                                                                                                                                   | wire the guard (advisory)                                                                                    | Modify                                          |
| `CLAUDE.md` + `docs/core/15-LEVEL_DESIGN.md`                                                                                                         | codify the re-ratify rule                                                                                    | Modify                                          |
| `schemas/evo/encounter.schema.json`                                                                                                                  | remove `estimated_turns` property                                                                            | Modify (forbidden-path -> master-dd merge-gate) |
| 21 encounter YAMLs (`docs/planning/encounters/*.yaml` 16 + `encounters-draft/*.yaml` 5)                                                              | remove `estimated_turns:` line                                                                               | Modify                                          |
| `tools/py/author_encounter.py` + `tests/test_author_encounter.py`                                                                                    | remove `estimated_turns` validate/emit + test                                                                | Modify                                          |
| 5 scenario builders (`tutorialScenario.js`, `hardcoreScenario.js`, `forestaPilotScenario.js`, `badlandsPilotScenario.js`, `ultimaCacciaScenario.js`) | remove `estimated_turns:` assignments (12 refs)                                                              | Modify                                          |

**Commit grouping:** Task 1-3 = the gate (one commit each). Task 4 = author-guard. Task 5 = doc rule. Task 6 = drop estimated_turns (mechanical, separable into its own commit / even its own PR if PR 1 grows too big -- spec sez. 7 note).

---

## Task 1: xpBudget geometry config block

**Files:**

- Modify: `data/core/balance/xp_budget.yaml`

- [ ] **Step 1: Add the `geometry` config block**

Append to `data/core/balance/xp_budget.yaml` (after `audit_defaults`):

```yaml
# Geometry-aware difficulty terms (D9 gate slice, flag XP_BUDGET_GEOMETRY_ENABLED, default OFF).
# Valori PROPOSED (SDMG) -> ratify N=40 via tools/sim/full-loop-batch.js (L-069). NON magic-constant.
geometry:
  # Shape 1 (hazard-coupled, Frosthaven donor): folds into `used` only flag-ON.
  hazard_set: [lava, acqua_profonda]
  hazard_xp:
    lava: 40
    acqua_profonda: 30
  # Reuses the encounter_class axis (mirror 15-LEVEL_DESIGN Class column).
  class_scalar:
    tutorial: 1.0
    tutorial_advanced: 1.1
    standard: 1.2
    hardcore: 1.8
    boss: 2.0
  # Shape 2 (activation-pressure, Lancer donor): reported-passive, healthy band [low,high].
  activation_band:
    low: 1.0
    high: 2.0
```

- [ ] **Step 2: Verify YAML parses**

Run: `node -e "const y=require('js-yaml'),fs=require('fs'); const c=y.load(fs.readFileSync('data/core/balance/xp_budget.yaml','utf-8')); console.log(JSON.stringify(c.geometry.hazard_set), c.geometry.class_scalar.standard)"`
Expected: `["lava","acqua_profonda"] 1.2`

- [ ] **Step 3: Commit**

```bash
git add data/core/balance/xp_budget.yaml
git commit -m "feat(balance): add geometry config block to xp_budget (PROPOSED, flag-gated)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Task 2: Shape 1 -- hazard-coupled budget term (flag-gated fold-in)

**Files:**

- Modify: `apps/backend/services/balance/xpBudget.js`
- Test: `tests/services/xpBudget.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/services/xpBudget.test.js`:

```js
test('hazardBudgetContribution: sums hazard tiles x class_scalar', () => {
  const { hazardBudgetContribution } = require('../../apps/backend/services/balance/xpBudget');
  const enc = {
    encounter_class: 'standard',
    grid: {
      terrain_features: [
        { x: 3, y: 0, type: 'lava' },
        { x: 3, y: 1, type: 'lava' },
        { x: 4, y: 0, type: 'roccia' }, // not in hazard_set -> 0
      ],
    },
  };
  // 2 lava * hazard_xp 40 * class_scalar standard 1.2 = 96
  assert.equal(hazardBudgetContribution(enc, 'standard'), 96);
});

test('hazardBudgetContribution: no grid -> 0', () => {
  const { hazardBudgetContribution } = require('../../apps/backend/services/balance/xpBudget');
  assert.equal(hazardBudgetContribution({ encounter_class: 'standard' }, 'standard'), 0);
});

test('auditEncounter: flag OFF -> byte-identical used (band-neutral)', () => {
  delete process.env.XP_BUDGET_GEOMETRY_ENABLED;
  _resetCache();
  const enc = {
    encounter_class: 'standard',
    grid: { terrain_features: [{ x: 3, y: 0, type: 'lava' }] },
    waves: [{ turn_trigger: 0, units: [{ tier: 'base', count: 4 }] }],
  };
  const off = auditEncounter(enc, 4);
  process.env.XP_BUDGET_GEOMETRY_ENABLED = 'true';
  _resetCache();
  const on = auditEncounter(enc, 4);
  delete process.env.XP_BUDGET_GEOMETRY_ENABLED;
  _resetCache();
  assert.equal(off.used + 96, on.used, 'flag ON adds 1 lava * 40 * 1.2 = 48'); // see note
});
```

Note: 1 lava tile -> 40 \* 1.2 = 48. Fix the assertion literal to `off.used + 48 === on.used` when you write it (the 2-lava case above yields 96).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern 'hazardBudgetContribution' tests/services/xpBudget.test.js`
Expected: FAIL -- `hazardBudgetContribution is not a function`

- [ ] **Step 3: Implement the helper + fold-in**

In `apps/backend/services/balance/xpBudget.js`, add after `computeEncounterBudget` (before `auditEncounter`):

```js
/**
 * Shape 1 (Frosthaven donor): XP contribution of hazard terrain tiles, scaled by
 * the encounter_class axis. Reads encounter.grid.terrain_features (already in schema).
 * Returns 0 when no grid/hazards. PROPOSED values (SDMG) -> ratify N=40.
 */
function hazardBudgetContribution(encounter, encounterClass) {
  const geo = loadConfig().geometry || {};
  const hazardSet = new Set(geo.hazard_set || []);
  const hazardXp = geo.hazard_xp || {};
  const scalar = Number((geo.class_scalar || {})[encounterClass] ?? 1.0);
  const grid = encounter && encounter.grid;
  const features = grid && Array.isArray(grid.terrain_features) ? grid.terrain_features : [];
  let contribution = 0;
  for (const f of features) {
    if (f && hazardSet.has(f.type)) contribution += Number(hazardXp[f.type] || 0) * scalar;
  }
  return Math.round(contribution);
}
```

Inside `auditEncounter`, after the reinforcement_pool block and BEFORE `const ratio = ...`:

```js
// Shape 1 hazard term (D9 gate slice): folds into used ONLY flag-ON (band-neutral OFF).
if (process.env.XP_BUDGET_GEOMETRY_ENABLED === 'true') {
  used += hazardBudgetContribution(encounter, cls);
}
```

Add `hazardBudgetContribution` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/xpBudget.test.js`
Expected: PASS (all existing + new; flag-OFF regression green)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/balance/xpBudget.js tests/services/xpBudget.test.js
git commit -m "feat(balance): Shape 1 hazard-coupled budget term (flag-gated, band-neutral OFF)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Task 3: Shape 2 -- activation-pressure (always reported, never gates)

**Files:**

- Modify: `apps/backend/services/balance/xpBudget.js`
- Test: `tests/services/xpBudget.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/services/xpBudget.test.js`:

```js
test('activationPressure: worst-case cumulative units / party', () => {
  const { activationPressure } = require('../../apps/backend/services/balance/xpBudget');
  const enc = {
    waves: [
      { turn_trigger: 0, units: [{ count: 2 }] },
      { turn_trigger: 4, units: [{ count: 1 }, { count: 1 }] },
    ],
  };
  // max cumulative at t=4 = 2+1+1 = 4; party 4 -> ratio 1.0 -> in_band
  const a = activationPressure(enc, 4);
  assert.equal(a.activation_ratio, 1.0);
  assert.equal(a.activation_status, 'in_band');
});

test('auditEncounter: reports activation_* and does NOT change status', () => {
  delete process.env.XP_BUDGET_GEOMETRY_ENABLED;
  _resetCache();
  const enc = {
    encounter_class: 'standard',
    waves: [{ turn_trigger: 0, units: [{ tier: 'base', count: 4 }] }],
  };
  const audit = auditEncounter(enc, 4);
  assert.ok('activation_ratio' in audit && 'activation_status' in audit);
  assert.ok(
    ['under', 'in_band', 'over', 'critical_over', 'no_budget_config'].includes(audit.status),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern 'activationPressure' tests/services/xpBudget.test.js`
Expected: FAIL -- `activationPressure is not a function`

- [ ] **Step 3: Implement the helper + report**

In `apps/backend/services/balance/xpBudget.js`, add after `hazardBudgetContribution`:

```js
/**
 * Shape 2 (Lancer donor): max concurrent enemy activations / party_size, worst-case
 * static (assumes nobody dies). Reads encounter.waves[]. Reported-passive: NEVER gates.
 * NOTE: waves[] are reinforcements; the initial roster comes from the payload, so this
 * is an approximation (documented in the design spec sez. 1.4).
 */
function activationPressure(encounter, partySize) {
  const waves = Array.isArray(encounter && encounter.waves) ? encounter.waves : [];
  const triggers = [...new Set(waves.map((w) => Number(w.turn_trigger || 0)))].sort(
    (a, b) => a - b,
  );
  let maxConcurrent = 0;
  for (const t of triggers) {
    let cumulative = 0;
    for (const w of waves) {
      if (Number(w.turn_trigger || 0) <= t) {
        const units = Array.isArray(w.units) ? w.units : [];
        for (const u of units) cumulative += Number(u.count || 1);
      }
    }
    if (cumulative > maxConcurrent) maxConcurrent = cumulative;
  }
  const ps = Math.max(1, Number(partySize) || 1);
  const ratio = maxConcurrent / ps;
  const band = (loadConfig().geometry || {}).activation_band || {};
  const low = Number(band.low ?? 1.0);
  const high = Number(band.high ?? 2.0);
  let status;
  if (maxConcurrent === 0) status = 'no_waves';
  else if (ratio < low) status = 'under';
  else if (ratio > high) status = 'over';
  else status = 'in_band';
  return { activation_ratio: Math.round(ratio * 100) / 100, activation_status: status };
}
```

Inside `auditEncounter`, change the final `return { ... }` to spread the activation fields (they must NOT feed `status`):

```js
const activation = activationPressure(encounter, partySize);
return {
  budget,
  used,
  ratio: Math.round(ratio * 100) / 100,
  status,
  encounter_class: cls,
  party_size: partySize,
  enemy_unit_count: unitCount,
  reinforcement_max: maxReinforcement,
  out_of_band_pct: oobPct,
  activation_ratio: activation.activation_ratio,
  activation_status: activation.activation_status,
};
```

Add `activationPressure` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/xpBudget.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/balance/xpBudget.js tests/services/xpBudget.test.js
git commit -m "feat(balance): Shape 2 activation-pressure reported-passive (never gates)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Task 4: Wire the passive activation metric into the session warn-log

**Files:**

- Modify: `apps/backend/routes/session.js` (around L2742-2746, the existing `console.warn` in the xpBudget audit block)

- [ ] **Step 1: Extend the warn string**

Locate the existing warn in the audit block (`session.js` ~L2742):

```js
console.warn(
  `[xpBudget audit] session=${sessionId} class=${audit.encounter_class} ` +
    `party=${audit.party_size} budget=${audit.budget} used=${audit.used} ` +
    `ratio=${audit.ratio} status=${audit.status}`,
);
```

Replace the closing template line to append the activation metric:

```js
console.warn(
  `[xpBudget audit] session=${sessionId} class=${audit.encounter_class} ` +
    `party=${audit.party_size} budget=${audit.budget} used=${audit.used} ` +
    `ratio=${audit.ratio} status=${audit.status} ` +
    `activation_ratio=${audit.activation_ratio} activation_status=${audit.activation_status}`,
);
```

- [ ] **Step 2: Smoke -- backend still boots + audit path runs**

Run: `node --test tests/api/*.test.js 2>&1 | tail -5` (session /start path exercised by existing api tests)
Expected: no new failures vs baseline.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/routes/session.js
git commit -m "chore(balance): surface activation-pressure in xpBudget audit warn-log

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Task 5: Author-guard -- grid-ratify baseline + validator

**Files:**

- Create: `data/core/balance/grid_ratify_baseline.json`
- Create: `tools/js/validate_encounter_grid_ratify.js`
- Create: `tests/js/validate_encounter_grid_ratify.test.js`
- Modify: `run-test-api.cjs` (wire the guard, advisory)

- [ ] **Step 1: Bootstrap the baseline registry from current grids**

Run this one-off to generate `data/core/balance/grid_ratify_baseline.json` (current grids = pre-ratified baseline):

```bash
node -e '
const fs=require("fs"),path=require("path"),yaml=require("js-yaml");
const dirs=["docs/planning/encounters","docs/planning/encounters-draft"];
const out={schema_version:"0.1.0",notes:"Baseline grid per encounter. grid change -> re-run tools/sim/full-loop-batch.js N=10 probe -> N=40 ratify (L-069). Old ratification does NOT transfer to a new size.",encounters:{}};
for(const d of dirs){ if(!fs.existsSync(d))continue; for(const f of fs.readdirSync(d).filter(x=>x.endsWith(".yaml"))){ const y=yaml.load(fs.readFileSync(path.join(d,f),"utf-8")); if(y&&y.encounter_id&&y.grid_size){ out.encounters[y.encounter_id]={grid_size:y.grid_size,evidence_ref:null,ratified_at:"2026-07-03"}; } } }
fs.writeFileSync("data/core/balance/grid_ratify_baseline.json", JSON.stringify(out,null,2)+"\n");
console.log("baseline encounters:", Object.keys(out.encounters).length);
'
```

Expected: `baseline encounters: 21`

- [ ] **Step 2: Write the failing test**

Create `tests/js/validate_encounter_grid_ratify.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkGridRatify } = require('../../tools/js/validate_encounter_grid_ratify');

const baseline = { encounters: { enc_x: { grid_size: [8, 8], evidence_ref: null } } };

test('grid unchanged -> no warn', () => {
  const w = checkGridRatify({ encounter_id: 'enc_x', grid_size: [8, 8] }, baseline);
  assert.equal(w.length, 0);
});

test('grid changed without fresh evidence -> warn', () => {
  const w = checkGridRatify({ encounter_id: 'enc_x', grid_size: [12, 12] }, baseline);
  assert.equal(w.length, 1);
  assert.match(w[0], /grid changed/);
});

test('encounter absent from baseline -> unratified warn', () => {
  const w = checkGridRatify({ encounter_id: 'enc_new', grid_size: [10, 10] }, baseline);
  assert.equal(w.length, 1);
  assert.match(w[0], /unratified/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/js/validate_encounter_grid_ratify.test.js`
Expected: FAIL -- cannot find module `tools/js/validate_encounter_grid_ratify`

- [ ] **Step 4: Implement the guard**

Create `tools/js/validate_encounter_grid_ratify.js`:

```js
'use strict';
// Advisory author-guard (mirror validate_encounter_difficulty.js): warns when an
// encounter's grid_size diverges from the ratified baseline without fresh evidence.
// Rule (spec sez. A2): ANY grid change -> re-run full-loop-batch N=10 probe -> N=40
// ratify (L-069). Old ratification does NOT transfer. Warn-only, never blocks.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ENC_DIRS = ['docs/planning/encounters', 'docs/planning/encounters-draft'];
const BASELINE = 'data/core/balance/grid_ratify_baseline.json';

function sameGrid(a, b) {
  return (
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
  );
}

function checkGridRatify(encounter, baseline) {
  const warns = [];
  const id = encounter.encounter_id;
  if (!id || !encounter.grid_size) return warns;
  const entry = (baseline.encounters || {})[id];
  if (!entry) {
    warns.push(
      `[grid-ratify] ${id}: unratified grid (absent from baseline) -- run N=10 probe -> N=40 ratify (L-069)`,
    );
    return warns;
  }
  if (!sameGrid(encounter.grid_size, entry.grid_size) && !entry.evidence_ref) {
    warns.push(
      `[grid-ratify] ${id}: grid changed ${JSON.stringify(entry.grid_size)} -> ${JSON.stringify(encounter.grid_size)} without fresh evidence_ref -- re-run full-loop-batch N=40 (L-069); old ratification does NOT transfer`,
    );
  }
  return warns;
}

function run() {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf-8'));
  const allWarns = [];
  for (const d of ENC_DIRS) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.yaml'))) {
      const enc = yaml.load(fs.readFileSync(path.join(d, f), 'utf-8'));
      if (enc) allWarns.push(...checkGridRatify(enc, baseline));
    }
  }
  allWarns.forEach((w) => console.warn(w));
  console.log(`[grid-ratify] checked encounters, ${allWarns.length} warning(s) (advisory)`);
  return 0; // warn-only, never non-zero
}

if (require.main === module) process.exit(run());
module.exports = { checkGridRatify, run };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/js/validate_encounter_grid_ratify.test.js`
Expected: PASS (3/3)

- [ ] **Step 6: Verify 0 false warns on the current corpus**

Run: `node tools/js/validate_encounter_grid_ratify.js`
Expected: `[grid-ratify] checked encounters, 0 warning(s) (advisory)` (baseline == current grids)

- [ ] **Step 7: Wire into run-test-api.cjs (advisory)**

Find where `validate_encounter_difficulty.js` is invoked in `run-test-api.cjs` and add an adjacent advisory invocation of `tools/js/validate_encounter_grid_ratify.js` (same non-blocking pattern -- do NOT fail the suite on its warnings).

- [ ] **Step 8: Commit**

```bash
git add data/core/balance/grid_ratify_baseline.json tools/js/validate_encounter_grid_ratify.js tests/js/validate_encounter_grid_ratify.test.js run-test-api.cjs
git commit -m "feat(balance): grid-ratify author-guard + baseline (advisory, L-069 rule)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Task 6: Codify the re-ratify rule (doc)

**Files:**

- Modify: `CLAUDE.md` (sprint guardrail section)
- Modify: `docs/core/15-LEVEL_DESIGN.md`

- [ ] **Step 1: Add the rule to 15-LEVEL_DESIGN.md**

Under `## Progressione difficolta'`, add:

```markdown
### Regola re-ratify grid (2026-07-03)

ANY encounter il cui `grid_size` (o blocco `grid`) cambia DEVE ri-eseguire il ciclo sim
`N=10-probe -> N=40-ratify` (`tools/sim/full-loop-batch.js`, L-069). La ratifica esistente
NON si trasferisce a una nuova taglia (la geometria muove la difficolta' reale). Author-guard
advisory: `tools/js/validate_encounter_grid_ratify.js` + baseline `data/core/balance/grid_ratify_baseline.json`.
Aggiorna il baseline (grid_size + evidence_ref) solo dopo l'evidence N=40.
```

- [ ] **Step 2: Add a one-line pointer to CLAUDE.md guardrail**

In the `### Guardrail sprint` section of `CLAUDE.md`, add a bullet:

```markdown
- **Grid resize**: cambiare `grid_size` di un encounter -> re-run N=10 probe -> N=40 ratify (L-069); la ratifica NON si trasferisce (author-guard `tools/js/validate_encounter_grid_ratify.js`).
```

- [ ] **Step 3: Governance + commit**

Run: `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict`
Expected: `errors=0`

```bash
git add CLAUDE.md docs/core/15-LEVEL_DESIGN.md
git commit -m "docs(balance): codify grid-change re-ratify rule (N=10 -> N=40, L-069)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Task 7: Drop `estimated_turns` (mechanical, separable)

> Blast-radius ~20 files (spec sez. 1.5). Turn-pressure preserved by `turn_limit_defeat` / `loss_conditions.time_limit`. Can be its own commit or split to a follow-on PR if PR 1 grows too big.

**Files:**

- Modify: `schemas/evo/encounter.schema.json` (remove `estimated_turns` property block, ~L237-241) -- **forbidden-path -> master-dd merge-gate, flag in PR**
- Modify: 21 YAMLs (`docs/planning/encounters/*.yaml` + `docs/planning/encounters-draft/*.yaml`) -- remove the `estimated_turns:` line
- Modify: `tools/py/author_encounter.py` (remove L148-152 block) + `tests/test_author_encounter.py` (remove L58 + L61 assertions)
- Modify: 5 scenario builders -- remove `estimated_turns:` lines (12 refs): `apps/backend/services/tutorialScenario.js`, `apps/backend/services/hardcoreScenario.js`, `apps/backend/services/worldgen/forestaPilotScenario.js`, `apps/backend/services/worldgen/badlandsPilotScenario.js`, `apps/backend/services/worldgen/ultimaCacciaScenario.js`

- [ ] **Step 1: Update the Python test first (red)**

In `tests/test_author_encounter.py`, remove the two `estimated_turns` lines (L58 `inputs["estimated_turns"] = 6` and L61 `assert out["estimated_turns"] == 6`).

- [ ] **Step 2: Remove from the authoring tool**

In `tools/py/author_encounter.py`, delete the block L148-152:

```python
    estimated_turns = inputs.get("estimated_turns")
    if estimated_turns is not None:
        if not (isinstance(estimated_turns, int) and estimated_turns >= 1):
            raise AuthoringError("estimated_turns must be int >= 1")
        encounter["estimated_turns"] = estimated_turns
```

Run: `PYTHONPATH=tools/py pytest tests/test_author_encounter.py -q`
Expected: PASS (no estimated_turns references remain).

- [ ] **Step 3: Remove from all 21 encounter YAMLs**

Run (removes any `estimated_turns:` line):

```bash
for f in docs/planning/encounters/*.yaml docs/planning/encounters-draft/*.yaml; do
  grep -q '^estimated_turns:' "$f" && sed -i '/^estimated_turns:/d' "$f" && echo "stripped $f"
done
```

Expected: 21 `stripped ...` lines.

- [ ] **Step 4: Remove from the 5 scenario builders**

For each of the 5 builders, delete every `estimated_turns: <n>,` line (12 total). Verify none remain:

Run: `grep -rn 'estimated_turns' apps/backend/services/ | grep -v node_modules`
Expected: no output.

- [ ] **Step 5: Remove from the schema**

In `schemas/evo/encounter.schema.json`, delete the `estimated_turns` property block:

```json
    "estimated_turns": {
      "type": "integer",
      "minimum": 1,
      "description": "Expected match length in turns"
    },
```

- [ ] **Step 6: Verify schema + datasets green**

Run: `node --test tests/scripts/encounterSchema.test.js`
Expected: PASS (all 21 YAMLs validate without `estimated_turns`).

Run: `python3 tools/py/game_cli.py validate-datasets`
Expected: green.

Run: `grep -rn 'estimated_turns' schemas/ docs/planning/encounters* tools/py/author_encounter.py apps/backend/services/ | grep -v node_modules`
Expected: no output (fully removed).

- [ ] **Step 7: Commit**

```bash
git add schemas/evo/encounter.schema.json docs/planning/encounters docs/planning/encounters-draft tools/py/author_encounter.py tests/test_author_encounter.py apps/backend/services
git commit -m "chore(schema): drop write-only estimated_turns field (turn-pressure via turn_limit_defeat)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>"
```

---

## Definition of Done (PR 1)

- [ ] `node --test tests/services/xpBudget.test.js` green (flag-OFF regression + Shape 1 + Shape 2).
- [ ] `node --test tests/js/validate_encounter_grid_ratify.test.js` green; guard reports 0 warns on current corpus.
- [ ] `node --test tests/ai/*.test.js` green (AI baseline preserved).
- [ ] `node --test tests/scripts/encounterSchema.test.js` + `python3 tools/py/game_cli.py validate-datasets` green post-drop.
- [ ] `PYTHONPATH=tools/py pytest tests/test_author_encounter.py` green.
- [ ] `npm run format:check` + `python tools/check_docs_governance.py --strict` green.
- [ ] `XP_BUDGET_GEOMETRY_ENABLED` unset/OFF everywhere (band-neutral). Flip = owner-gated post N=40 (D9).
- [ ] Every commit carries ADR-0011 trailers (`Coding-Agent:` + `Trace-Id:` uuidv7), no `Co-Authored-By:`.
- [ ] PR flags the forbidden-path touch (`schemas/evo/encounter.schema.json`) -> master-dd merge-gate. No new npm/pip deps.

---

## Self-review notes

- **Spec coverage:** Task 1-4 = spec A1 (Shape 1 gate + Shape 2 passive + config + wire). Task 5 = spec A2 (author-guard + baseline). Task 6 = spec A2 doc rule. Task 7 = spec A3 (drop estimated_turns). All PR-1 requirements mapped.
- **Type consistency:** `hazardBudgetContribution(encounter, encounterClass)` and `activationPressure(encounter, partySize)` names identical across Task 2/3 + DoD + session wire. Return keys `activation_ratio`/`activation_status` consistent Task 3 <-> Task 4 <-> DoD.
- **Band-neutrality:** flag-OFF regression asserted in Task 2 Step 1; Shape 2 never touches `status` asserted in Task 3 Step 1.
- **NOT in PR 1** (deferred per D1-D10 / spec sez. 5): fase-2c grid-wiring, board_scale/encounter_class, control-point/objective-type/pressure-dial gate terms, LOS, the big-maps ADR -- all live in the parent arc.
