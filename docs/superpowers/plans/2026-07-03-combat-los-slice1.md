# Combat LOS slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend square-grid integer line-of-sight primitive and wire it as a flag-gated (`COMBAT_LOS_ENABLED`, default OFF) hard-block on ranged attacks (human + AI), with a shared golden-vector fixture for a later Godot parity port.

**Architecture:** New pure `squareLos.js` (integer DDA, endpoints-excluded, symmetric via endpoint-canonicalization, corner-rule pinned). A data-driven `terrainBlocksLos` predicate reads `data/core/balance/los.yaml`. Wiring adds an additional gate after the existing Manhattan range-gate in the production attack-handler (`session.js`), a candidate filter in the AI policy (`services/ai/policy.js`), and a parallel filter in the sim policy (`tools/sim/combat-policy.js`) so the batch-sim ratify measures the same rule. Flag OFF = byte-identical.

**Tech Stack:** Node.js (CommonJS), `node --test`, Prettier, js-yaml (already a dep).

Design spec: `docs/superpowers/specs/2026-07-03-combat-los-slice1-design.md` (rev.2, committed 0e0deeb34).
Branch: `feat/combat-los-slice1` (already created off origin/main).

**Commit trailer (every commit):** end the message with
`Coding-Agent: claude-opus-4-8` and `Trace-Id: <uuidv7>` (generate a fresh v7 per commit; NO Co-Authored-By).
Subject: Conventional Commit, description after `:` lowercase, subject <= 72 chars.

**Ground-truth pins (verified 2026-07-03):**

- `terrainAtFromFeatures(features)` (`apps/backend/services/combat/moveCost.js:10`) returns a **closure**
  `(x,y) => type|null` -- call `terrainAt(x, y)`, NOT `.get()`.
- Attack-handler seam: `apps/backend/routes/session.js:2907` computes `attackDist`, `:2913-2917` is the
  range-gate `if (attackDist > range) return 400`. Insert the LOS gate right AFTER `:2917`, before the
  `handleLegacyAttackViaRound(...)` call at `:2925`. `actor.position`/`target.position` = `{x,y}`;
  `session.grid.terrain_features` is the features array.
- Flag idiom: `process.env.XP_BUDGET_GEOMETRY_ENABLED === 'true'` (`xpBudget.js:205`). Mirror exactly.

---

## Task 0: Ratify-corpus prerequisite (NON-code, blocks the eventual flag-flip only)

**Files:** none (investigation + optional data authoring).

- [ ] **Step 1: Check whether the ratify corpus carries blocker terrain**

Run:

```bash
cd /c/dev/Game
grep -rlE "type:\s*(roccia|vegetazione_densa|obstacle)" docs/planning/encounters/ data/encounters/ 2>/dev/null
node -e "const {loadEncounters}=(()=>{try{return require('./tools/sim/full-loop-batch.js')}catch(e){return {}}})(); console.log('inspect full-loop-batch encounter source manually')"
```

Expected: a list of encounter files containing blocker terrain, OR empty.

- [ ] **Step 2: Record the finding**

If EMPTY: note in `QUALITY.md` (Task 12) that the N=40 flag-flip ratify is BLOCKED until >=1 ratify encounter authors blocker `terrain_features`; authoring that terrain is a follow-up task, NOT part of this slice's merge (flag stays OFF). If non-empty: record which encounters cover it. Either way this does not block merging slice 1 (flag OFF = band-neutral).

No commit (investigation only; the finding lands in QUALITY.md at Task 12).

---

## Task 1: `squareLos.js` -- pure integer line-of-sight

**Files:**

- Create: `apps/backend/services/grid/squareLos.js`
- Test: `tests/services/squareLos.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// tests/services/squareLos.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lineOfSightClear } = require('../../apps/backend/services/grid/squareLos');

// blocker set helper: cells listed as [x,y] block; everything else is clear.
function blocker(cells) {
  const s = new Set(cells.map(([x, y]) => `${x},${y}`));
  return (x, y) => s.has(`${x},${y}`);
}
const CLEAR = () => false;

test('clear straight line is visible', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 4, y: 0 }, CLEAR), true);
});

test('a blocker strictly between blocks LOS', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 4, y: 0 }, blocker([[2, 0]])), false);
});

test('adjacent target is always clear (no intermediate cells)', () => {
  assert.equal(lineOfSightClear({ x: 1, y: 1 }, { x: 2, y: 1 }, blocker([[2, 1]])), true);
});

test('endpoints are excluded: blocker ON the target does not self-block', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 0 }, blocker([[3, 0]])), true);
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 0 }, blocker([[0, 0]])), true);
});

test('from == to is clear (range-0 / self)', () => {
  assert.equal(lineOfSightClear({ x: 2, y: 2 }, { x: 2, y: 2 }, blocker([[2, 2]])), true);
});

test('symmetry: clear(A,B) == clear(B,A) on a blocked diagonal', () => {
  const b = blocker([
    [1, 1],
    [2, 2],
  ]);
  const ab = lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 3 }, b);
  const ba = lineOfSightClear({ x: 3, y: 3 }, { x: 0, y: 0 }, b);
  assert.equal(ab, ba);
});

test('corner-rule: single diagonal blocker on a corner-grazing ray does NOT block', () => {
  // ray (0,0)->(2,2) grazes the corner shared by (1,0) and (0,1); one blocker only.
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 2, y: 2 }, blocker([[1, 0]])), true);
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 2, y: 2 }, blocker([[0, 1]])), true);
});

test('strict diagonal squeeze: BOTH diagonal cells block -> LOS blocked', () => {
  // both (1,0) and (0,1) block the (0,0)->(2,2) corner.
  assert.equal(
    lineOfSightClear(
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      blocker([
        [1, 0],
        [0, 1],
      ]),
    ),
    false,
  );
});

test('diagonal blocker directly on the diagonal path blocks', () => {
  assert.equal(lineOfSightClear({ x: 0, y: 0 }, { x: 3, y: 3 }, blocker([[1, 1]])), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/services/squareLos.test.js`
Expected: FAIL -- `Cannot find module '.../squareLos'`.

- [ ] **Step 3: Implement `squareLos.js` (integer-only; canonicalized for symmetry; corner-rule)**

```javascript
// apps/backend/services/grid/squareLos.js
'use strict';

// Pure square-grid line-of-sight. Integer-only (no `/`, no float) so a GDScript
// port produces byte-identical results on the shared golden-vectors.
// - endpoints EXCLUDED (a unit on/adjacent-to a blocker stays targetable)
// - symmetric: endpoints are canonicalized (lexicographic) before the walk
// - corner-rule: a ray grazing a lattice corner passes UNLESS both diagonal
//   cells at that corner block ("strict diagonal squeeze").
// blocksCellFn(x, y) -> bool. Returns true when the target is visible.

function lineOfSightClear(from, to, blocksCellFn) {
  // canonicalize endpoint order so clear(A,B) === clear(B,A)
  let a = from;
  let b = to;
  if (b.x < a.x || (b.x === a.x && b.y < a.y)) {
    a = to;
    b = from;
  }
  const x0 = a.x;
  const y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  if (x0 === x1 && y0 === y1) return true; // range-0

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy; // integer error term
  let x = x0;
  let y = y0;

  while (true) {
    const e2 = 2 * err;
    const stepX = e2 > -dy;
    const stepY = e2 < dx;
    if (stepX && stepY) {
      // diagonal step across a lattice corner: the two side cells are the
      // pre-step neighbours (x+sx, y) and (x, y+sy). Strict squeeze only.
      const aBlk = blocksCellFn(x + sx, y);
      const bBlk = blocksCellFn(x, y + sy);
      if (aBlk && bBlk) return false;
    }
    if (stepX) {
      err -= dy;
      x += sx;
    }
    if (stepY) {
      err += dx;
      y += sy;
    }
    if (x === x1 && y === y1) break; // reached endpoint -> excluded
    if (blocksCellFn(x, y)) return false;
  }
  return true;
}

module.exports = { lineOfSightClear };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/services/squareLos.test.js`
Expected: PASS (9/9). If any corner-case fails, the tests are the contract -- adjust the algorithm (not the tests) until green.

- [ ] **Step 5: Prettier + commit**

```bash
npx prettier --write apps/backend/services/grid/squareLos.js tests/services/squareLos.test.js
git add apps/backend/services/grid/squareLos.js tests/services/squareLos.test.js
git commit  # message subject: "feat(combat): square-grid integer line-of-sight primitive"
```

---

## Task 2: LOS blocker config + `terrainBlocksLos`

**Files:**

- Create: `data/core/balance/los.yaml`
- Create: `apps/backend/services/combat/losBlockers.js`
- Test: `tests/services/losBlockers.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/losBlockers.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  terrainBlocksLos,
  unitsBlockLos,
} = require('../../apps/backend/services/combat/losBlockers');

test('rock, dense vegetation, obstacle block LOS', () => {
  assert.equal(terrainBlocksLos('roccia'), true);
  assert.equal(terrainBlocksLos('vegetazione_densa'), true);
  assert.equal(terrainBlocksLos('obstacle'), true);
});

test('elevation, lava, deep water, null do NOT block LOS', () => {
  assert.equal(terrainBlocksLos('elevation'), false);
  assert.equal(terrainBlocksLos('lava'), false);
  assert.equal(terrainBlocksLos('acqua_profonda'), false);
  assert.equal(terrainBlocksLos(null), false);
  assert.equal(terrainBlocksLos(undefined), false);
});

test('units do not block LOS in slice 1', () => {
  assert.equal(unitsBlockLos(), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/losBlockers.test.js`
Expected: FAIL -- module not found.

- [ ] **Step 3: Create the config**

```yaml
# data/core/balance/los.yaml
# LOS blocker terrain types (slice 1). Canonical, shared with the future Godot port.
# Provisional -> master-dd ratify (flag COMBAT_LOS_ENABLED flip is owner-gated post N=40).
blocker_terrain_types:
  - roccia
  - vegetazione_densa
  - obstacle
units_block_los: false
```

- [ ] **Step 4: Implement the predicate**

```javascript
// apps/backend/services/combat/losBlockers.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CFG_PATH = path.join(__dirname, '../../../../data/core/balance/los.yaml');
let _cfg = null;
function _config() {
  if (_cfg) return _cfg;
  const raw = yaml.load(fs.readFileSync(CFG_PATH, 'utf8')) || {};
  _cfg = {
    blockers: new Set(raw.blocker_terrain_types || []),
    unitsBlock: raw.units_block_los === true,
  };
  return _cfg;
}

function terrainBlocksLos(type) {
  if (!type) return false;
  return _config().blockers.has(String(type));
}
function unitsBlockLos() {
  return _config().unitsBlock;
}

module.exports = { terrainBlocksLos, unitsBlockLos };
```

- [ ] **Step 5: Run test + Prettier + commit**

Run: `node --test tests/services/losBlockers.test.js` -> PASS.

```bash
npx prettier --write apps/backend/services/combat/losBlockers.js tests/services/losBlockers.test.js
git add data/core/balance/los.yaml apps/backend/services/combat/losBlockers.js tests/services/losBlockers.test.js
git commit  # "feat(combat): los blocker-terrain config + predicate"
```

---

## Task 3: Shared golden-vector fixture + cross-load test

**Files:**

- Create: `data/core/balance/los_golden_vectors.json`
- Test: `tests/services/losGoldenVectors.test.js`

- [ ] **Step 1: Write the fixture (the parity contract the Godot port will also load)**

```json
{
  "note": "Shared LOS parity vectors. cells in blockers[] are [x,y]. expected = lineOfSightClear(from,to,blocks). The Godot port must reproduce every result. coords bounded to [0,64].",
  "cases": [
    { "from": [0, 0], "to": [4, 0], "blockers": [], "expected": true },
    { "from": [0, 0], "to": [4, 0], "blockers": [[2, 0]], "expected": false },
    { "from": [1, 1], "to": [2, 1], "blockers": [[2, 1]], "expected": true },
    { "from": [0, 0], "to": [3, 0], "blockers": [[3, 0]], "expected": true },
    { "from": [0, 0], "to": [3, 3], "blockers": [[1, 1]], "expected": false },
    { "from": [0, 0], "to": [2, 2], "blockers": [[1, 0]], "expected": true },
    {
      "from": [0, 0],
      "to": [2, 2],
      "blockers": [
        [1, 0],
        [0, 1]
      ],
      "expected": false
    },
    { "from": [5, 2], "to": [1, 6], "blockers": [[3, 4]], "expected": false },
    { "from": [0, 0], "to": [63, 63], "blockers": [[31, 31]], "expected": false }
  ]
}
```

- [ ] **Step 2: Write + run the failing test**

```javascript
// tests/services/losGoldenVectors.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lineOfSightClear } = require('../../apps/backend/services/grid/squareLos');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/core/balance/los_golden_vectors.json'), 'utf8'),
);

test('every golden vector matches lineOfSightClear', () => {
  for (const c of fixture.cases) {
    const blk = new Set(c.blockers.map(([x, y]) => `${x},${y}`));
    const got = lineOfSightClear(
      { x: c.from[0], y: c.from[1] },
      { x: c.to[0], y: c.to[1] },
      (x, y) => blk.has(`${x},${y}`),
    );
    assert.equal(got, c.expected, `vector ${JSON.stringify(c)}`);
  }
});
```

Run: `node --test tests/services/losGoldenVectors.test.js`
Expected: PASS (squareLos already exists). If a vector mismatches, the vector's `expected` is the design intent from Task 1's corner-rule -- fix the vector to the algorithm's correct output only after confirming the algorithm satisfies Task 1's tests.

- [ ] **Step 3: Prettier + commit**

```bash
npx prettier --write data/core/balance/los_golden_vectors.json tests/services/losGoldenVectors.test.js
git add data/core/balance/los_golden_vectors.json tests/services/losGoldenVectors.test.js
git commit  # "test(combat): los golden-vector parity fixture"
```

---

## Task 4: Wire the HUMAN production seam (`session.js` attack-handler) + regression

**Files:**

- Modify: `apps/backend/routes/session.js` (insert after the range-gate, ~line 2917)
- Test: `tests/api/losAttackGate.test.js`

- [ ] **Step 1: Write the failing integration test (flag ON blocks, flag OFF byte-identical)**

```javascript
// tests/api/losAttackGate.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { losGateBlocks } = require('../../apps/backend/routes/session');

// Pure exported helper (added in Step 3) so we can unit-test the gate without a full HTTP session.
test('flag OFF: gate never blocks (band-neutral)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
});

test('flag ON: ranged shot through a rock is blocked', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: clear shot is allowed', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [] };
  assert.equal(losGateBlocks(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  delete process.env.COMBAT_LOS_ENABLED;
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/api/losAttackGate.test.js`
Expected: FAIL -- `losGateBlocks` not exported.

- [ ] **Step 3: Add the pure gate helper + export it, then call it in the attack-handler**

At the top of `session.js` (with the other requires) add:

```javascript
const { lineOfSightClear } = require('../services/grid/squareLos');
const { terrainAtFromFeatures } = require('../services/combat/moveCost');
const { terrainBlocksLos } = require('../services/combat/losBlockers');

// COMBAT_LOS_ENABLED (default OFF): true iff a terrain blocker sits strictly
// between attacker and target. Pure + exported for testing.
function losGateBlocks(grid, fromPos, toPos) {
  if (process.env.COMBAT_LOS_ENABLED !== 'true') return false;
  const terrainAt = terrainAtFromFeatures((grid && grid.terrain_features) || []);
  return !lineOfSightClear(fromPos, toPos, (x, y) => terrainBlocksLos(terrainAt(x, y)));
}
```

Add `losGateBlocks` to `module.exports`.

Then, in the attack-handler, immediately AFTER the range-gate block that ends at `session.js:2917` (`}` closing `if (attackDist > range)`) and BEFORE the `handleLegacyAttackViaRound(...)` call, insert:

```javascript
if (losGateBlocks(session.grid, actor.position, target.position)) {
  if (session._losWarn) session._losWarn.blocked++;
  return res.status(400).json({
    error: `bersaglio non in linea di vista (LOS ostruita)`,
  });
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/api/losAttackGate.test.js`
Expected: PASS (3/3).

- [ ] **Step 5: Regression -- existing session/attack API tests still green with flag OFF**

Run: `node --test tests/api/session.test.js tests/services/*.test.js`
Expected: PASS, unchanged counts (flag OFF -> `losGateBlocks` returns false before any work).

- [ ] **Step 6: Prettier + commit**

```bash
npx prettier --write apps/backend/routes/session.js tests/api/losAttackGate.test.js
git add apps/backend/routes/session.js tests/api/losAttackGate.test.js
git commit  # "feat(combat): flag-gated LOS hard-block in the human attack path"
```

---

## Task 5: Wire the AI production seam (`services/ai/policy.js`)

**Files:**

- Modify: `apps/backend/services/ai/policy.js` (target/intent selection, ~line 128)
- Test: `tests/services/aiLosFilter.test.js`

- [ ] **Step 1: Read the target-selection function first**

Run: `sed -n '100,175p' apps/backend/services/ai/policy.js` (identify the candidate-target list + where `manhattanDistance`/in-range filtering happens; note the exported function name and how it receives grid/terrain).

- [ ] **Step 2: Write the failing test**

```javascript
// tests/services/aiLosFilter.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { losClearForAi } = require('../../apps/backend/services/ai/policy');

test('flag OFF: AI LOS filter is a no-op (allows all)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losClearForAi(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
});

test('flag ON: AI cannot target through a rock', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const grid = { terrain_features: [{ x: 2, y: 0, type: 'roccia' }] };
  assert.equal(losClearForAi(grid, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  delete process.env.COMBAT_LOS_ENABLED;
});
```

- [ ] **Step 3: Add `losClearForAi` (mirror of the human gate) + use it to filter candidates**

```javascript
// near the top of services/ai/policy.js
const { lineOfSightClear } = require('../grid/squareLos');
const { terrainAtFromFeatures } = require('../combat/moveCost');
const { terrainBlocksLos } = require('../combat/losBlockers');

// COMBAT_LOS_ENABLED (default OFF): true when target is visible. Flag OFF = always true.
function losClearForAi(grid, fromPos, toPos) {
  if (process.env.COMBAT_LOS_ENABLED !== 'true') return true;
  const terrainAt = terrainAtFromFeatures((grid && grid.terrain_features) || []);
  return lineOfSightClear(fromPos, toPos, (x, y) => terrainBlocksLos(terrainAt(x, y)));
}
```

In the candidate-target selection (the in-range filter identified in Step 1), add a `.filter(t => losClearForAi(grid, actor.position, t.position))` on the ranged-attack candidate list (only where the AI is choosing an ATTACK target; leave movement/approach intent unfiltered so a blocked AI still advances). Export `losClearForAi`.

- [ ] **Step 4: Run tests + Prettier + commit**

Run: `node --test tests/services/aiLosFilter.test.js tests/sim/*.test.js` -> PASS.

```bash
npx prettier --write apps/backend/services/ai/policy.js tests/services/aiLosFilter.test.js
git add apps/backend/services/ai/policy.js tests/services/aiLosFilter.test.js
git commit  # "feat(combat): AI target selection respects LOS (flag-gated)"
```

---

## Task 6: Wire the SIM parity seam (`tools/sim/combat-policy.js`)

**Files:**

- Modify: `tools/sim/combat-policy.js` (`pickInRangeTarget`, ~line 106)
- Test: `tests/sim/combatPolicy.test.js` (extend)

- [ ] **Step 1: Add an optional LOS filter to `pickInRangeTarget`**

Read `tools/sim/combat-policy.js:100-160`. `pickInRangeTarget(actor, enemies, focusFire)` filters by `dist(actor.position, e.position) <= range`. Extend it to accept an optional `losFn` and, when provided, also require `losFn(actor.position, e.position)`:

```javascript
function pickInRangeTarget(actor, enemies, focusFire, losFn) {
  const inRange = enemies.filter(
    (e) =>
      dist(actor.position, e.position) <= (actor.attack_range ?? 1) &&
      (typeof losFn !== 'function' || losFn(actor.position, e.position)),
  );
  // ... existing focus-fire / nearest logic unchanged ...
}
```

Thread the same `losClearForAi(grid, ...)`-shaped predicate from `selectPlayerAction` (build it there from the sim's grid/terrain), so the batch-sim ratify measures the same rule as production. Flag OFF -> the sim builds no `losFn` (or one that returns true) -> byte-identical sim behavior.

- [ ] **Step 2: Extend the sim test**

Add a case to `tests/sim/combatPolicy.test.js`: with a `losFn` that blocks the only in-range enemy, `pickInRangeTarget` returns none (or the next reachable), matching the production gate.

- [ ] **Step 3: Run + Prettier + commit**

Run: `node --test tests/sim/combatPolicy.test.js` -> PASS.

```bash
npx prettier --write tools/sim/combat-policy.js tests/sim/combatPolicy.test.js
git add tools/sim/combat-policy.js tests/sim/combatPolicy.test.js
git commit  # "feat(sim): LOS-aware target pick for ratify parity (flag-gated)"
```

---

## Task 7: QUALITY.md + full-suite green + DoD

**Files:**

- Create: `docs/quality/2026-07-03-combat-los-slice1-QUALITY.md`

- [ ] **Step 1: Run the full backend gate**

Run: `npm run test:backend`
Expected: green, no new failures (flag OFF everywhere -> band-neutral).

- [ ] **Step 2: Write QUALITY.md (3-step gate + the 2 known gaps)**

Document: (1) Smoke -- squareLos 9/9 + golden-vectors + flag-OFF regression (paste outputs); (2) Ricerca -- the edge cases covered (corner-grazing, strict-diagonal, endpoints, bounds); (3) Tuning -- blocker-set choice + the Task-0 ratify-corpus finding. Then the TWO known-degraded interims (shoot-through-allies; reaction/bond/intercept ungated) with their follow-up pointers. State: `COMBAT_LOS_ENABLED` OFF at merge; flip is owner-gated post N=40 and BLOCKED until the ratify corpus carries blocker terrain (Task 0).

- [ ] **Step 3: Prettier + commit**

```bash
npx prettier --write docs/quality/2026-07-03-combat-los-slice1-QUALITY.md
git add docs/quality/2026-07-03-combat-los-slice1-QUALITY.md
git commit  # "docs(quality): combat LOS slice-1 quality gate + known-gap ledger"
```

- [ ] **Step 4: Push + open PR (merge = Eduardo)**

```bash
git push -u origin feat/combat-los-slice1
gh pr create -R MasterDD-L34D/Game --base main --head feat/combat-los-slice1 \
  --title "feat(combat): LOS slice 1 -- flag-gated square-grid line-of-sight" --body-file <PR body>
```

PR body: summary, the 3 wired seams, flag-OFF band-neutral, the 2 known gaps, the ratify-flip pre-conditions. Forbidden-path note if `data/core/balance/` counts as master-dd-gated.

---

## Notes for the executor

- **Flag discipline:** never set `COMBAT_LOS_ENABLED=true` outside a test (`delete` it after). The merge ships OFF.
- **Do not touch** `resolveAttack` (`sessionHelpers.js:270`) or `performAttack` internals -- the gate is a pre-check in the caller.
- **Tests are the contract** for the corner-rule; if the algorithm disagrees with a Task-1 test, fix the algorithm.
- **Integer-only:** if you ever reach for `/`, `Math.hypot`, or a float, stop -- it breaks the Godot parity guarantee.
