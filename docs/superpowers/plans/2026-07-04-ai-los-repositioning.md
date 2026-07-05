# AI LOS-repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When `COMBAT_LOS_ENABLED` is ON and a unit's attack target is line-of-sight-blocked, the unit steps to a 4-neighbor tile that reopens a clear firing line (greedy, deterministic) instead of walking straight at the blocker; falls back to today's behavior when no single step reopens LOS.

**Architecture:** A shared pure helper `stepToRegainLos` (in `apps/backend/services/combat/losReposition.js`) is consumed by BOTH the sim player-proxy (`tools/sim/combat-policy.js selectPlayerAction`) and the prod Sistema AI (`apps/backend/services/ai/declareSistemaIntents.js`), so the batch-sim ratify measures the same AI as production. It is reached only on the LOS-blocked branch, which only exists when `COMBAT_LOS_ENABLED` is ON -> flag OFF is byte-identical.

**Tech Stack:** Node.js (CommonJS), `node --test`, Prettier.

Design spec: `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` (committed e7e50fd).
Branch: `feat/combat-los-repositioning` (already created off main; spec committed).

**Commit trailer (every commit):** end the message with `Coding-Agent: claude-opus-4-8` and `Trace-Id: <uuidv7>` (fresh v7 per commit; NO Co-Authored-By). Conventional Commit, lowercase after `:`, subject <= 72 chars. ASCII-only.

**Ground-truth pins (verified 2026-07-04, main 866ee0d):**

- `losClearOnGrid(grid, from, to, units?)` (`apps/backend/services/combat/losForGrid.js`) returns true=VISIBLE; flag OFF => always true. 3-arg terrain-only form is what this plan uses.
- `combat-policy.js`: `selectPlayerAction(actor, units, objective, opts)` default branch ends with
  `const nearest = enemies.slice().sort(...)[0]; return stepToward(actor, nearest.position);`.
  `occupiedSet(units, selfId)` (line ~47) already builds a `Set<"x,y">` of live OTHER units. `dist(a,b)` = Manhattan.
- `combat-adapter.js:212`: `selectPlayerAction(active, units, objective, { focusFire, terrainFeatures })`; `gridSize` is in scope there (default 6).
- `declareSistemaIntents.js:472`: the attack->approach LOS downgrade
  `policy = { ...policy, intent: 'approach', rule: `${policy.rule || 'REGOLA'}\_LOS_BLOCKED` };`.
  `:527-530`: `const nextPos = policy.intent === 'retreat' ? stepAway(...) : stepTowards(actor.position, target.position);`.
  `session.grid` (with width/height) and `session.units` are in scope in the actor loop.

---

## Task 1: `losReposition.js` -- shared greedy step-to-LOS helper

**Files:**

- Create: `apps/backend/services/combat/losReposition.js`
- Test: `tests/services/losReposition.test.js`

- [ ] **Step 1: Write the failing test** `tests/services/losReposition.test.js`:

```javascript
// tests/services/losReposition.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { stepToRegainLos } = require('../../apps/backend/services/combat/losReposition');

// A vertical wall of roccia at x=2 (y=0..2) blocks a straight horizontal shot but
// leaves the tile above/below the actor open to sidestep and shoot around it.
function grid(features) {
  return { terrain_features: features, width: 6, height: 6 };
}
const WALL = [
  { x: 2, y: 0, type: 'roccia' },
  { x: 2, y: 1, type: 'roccia' },
];

test('flag OFF: helper is a no-op (returns null even when a step would open LOS)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const actor = { position: { x: 0, y: 0 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 0 }, hp: 5 }];
  assert.equal(stepToRegainLos(actor, enemies, grid(WALL), {}), null);
});

test('flag ON: steps to a 4-neighbor tile that reopens LOS to an in-range enemy', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = { position: { x: 0, y: 0 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 0 }, hp: 5 }]; // straight line blocked by the wall
  // Stepping to (0,2) clears the y=0..1 wall (the ray (0,2)->(4,0) misses x=2,y=0..1).
  const dest = stepToRegainLos(actor, enemies, grid(WALL), {});
  assert.ok(dest, 'expected a repositioning tile');
  const { losClearOnGrid } = require('../../apps/backend/services/combat/losForGrid');
  assert.equal(losClearOnGrid(grid(WALL), dest, enemies[0].position), true);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: returns null when no single 4-neighbor step reopens LOS (full wall)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const full = [
    { x: 2, y: 0, type: 'roccia' },
    { x: 2, y: 1, type: 'roccia' },
    { x: 2, y: 2, type: 'roccia' },
    { x: 2, y: 3, type: 'roccia' },
    { x: 2, y: 4, type: 'roccia' },
    { x: 2, y: 5, type: 'roccia' },
  ];
  const actor = { position: { x: 0, y: 0 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 0 }, hp: 5 }];
  assert.equal(stepToRegainLos(actor, enemies, grid(full), {}), null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: excludes occupied + off-board candidate tiles', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = { position: { x: 0, y: 0 }, attack_range: 5 };
  const enemies = [{ position: { x: 4, y: 0 }, hp: 5 }];
  // (0,-1) and (-1,0) are off-board; occupy (0,1) so the only LOS-opening step upward is blocked.
  const dest = stepToRegainLos(actor, enemies, grid(WALL), { occupied: new Set(['0,1']) });
  // With (0,1) occupied, a single legal step cannot reach (0,2), so no reopening step -> null.
  assert.equal(dest, null);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag ON: deterministic tie-break (same input -> same tile)', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = { position: { x: 3, y: 3 }, attack_range: 5 };
  const enemies = [{ position: { x: 5, y: 3 }, hp: 5 }];
  const feats = [{ x: 4, y: 3, type: 'roccia' }];
  const a = stepToRegainLos(actor, enemies, grid(feats), {});
  const b = stepToRegainLos(actor, enemies, grid(feats), {});
  assert.deepEqual(a, b);
  delete process.env.COMBAT_LOS_ENABLED;
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /c/dev/Game && node --test tests/services/losReposition.test.js`
Expected: FAIL -- `Cannot find module '.../losReposition'`.

- [ ] **Step 3: Implement `losReposition.js`**

```javascript
// apps/backend/services/combat/losReposition.js
'use strict';

// Greedy one-tile LOS-repositioning (COMBAT_LOS_ENABLED, default OFF).
// When a unit wants to attack but has no line of sight to any in-range enemy,
// stepToRegainLos returns a 4-neighbor tile that reopens a clear firing line to
// an enemy that would be in attack_range from that tile -- or null if no single
// legal step reopens LOS (caller then falls back to its normal approach: never
// worse than today). Pure + deterministic (tie-break: x then y). Shared by the
// sim player-proxy and the prod Sistema AI so the ratify measures one AI.
const { losClearOnGrid } = require('./losForGrid');

function _manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function stepToRegainLos(actor, enemies, grid, opts) {
  // Flag OFF -> no repositioning (the branch that calls this only exists flag-ON;
  // this guard makes the helper itself safe/no-op when called directly OFF).
  if (process.env.COMBAT_LOS_ENABLED !== 'true') return null;
  if (!actor || !actor.position || !Array.isArray(enemies) || enemies.length === 0) return null;

  const width = (grid && grid.width) || 6;
  const height = (grid && grid.height) || 6;
  const occupied = (opts && opts.occupied) || new Set();
  const range = actor.attack_range ?? 1;
  const live = enemies.filter((e) => e && e.position && (e.hp ?? 1) > 0);
  if (live.length === 0) return null;

  const { x, y } = actor.position;
  // 4-neighbor candidates in deterministic order (x then y ascending after filtering).
  const candidates = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ]
    .filter(
      (c) => c.x >= 0 && c.y >= 0 && c.x < width && c.y < height && !occupied.has(`${c.x},${c.y}`),
    )
    .sort((a, b) => a.x - b.x || a.y - b.y);

  let best = null;
  let bestMetric = Infinity;
  for (const c of candidates) {
    let nearest = Infinity;
    for (const e of live) {
      if (_manhattan(c, e.position) <= range && losClearOnGrid(grid, c, e.position)) {
        const d = _manhattan(c, e.position);
        if (d < nearest) nearest = d;
      }
    }
    if (nearest < bestMetric) {
      bestMetric = nearest;
      best = c;
    }
  }
  return best; // null if no candidate reopened LOS to an in-range enemy
}

module.exports = { stepToRegainLos };
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /c/dev/Game && node --test tests/services/losReposition.test.js`
Expected: PASS (5/5). If a geometry case fails, verify the expected against `losClearOnGrid` directly (the tests are the contract for the interface, but the exact reopening tile depends on `squareLos` geometry -- adjust the test's asserted tile to the algorithm's real output only after confirming the algorithm reopens LOS at all).

- [ ] **Step 5: Prettier + commit**

```bash
cd /c/dev/Game && npx prettier --write apps/backend/services/combat/losReposition.js tests/services/losReposition.test.js
cd /c/dev/Game && git add apps/backend/services/combat/losReposition.js tests/services/losReposition.test.js && git commit  # "feat(combat): greedy step-to-LOS repositioning helper"
```

---

## Task 2: Wire the sim player-proxy (`combat-policy.js`) + regression

**Files:**

- Modify: `tools/sim/combat-policy.js` (`selectPlayerAction` default branch)
- Modify: `tools/sim/combat-adapter.js:212` (thread `gridSize` into opts)
- Test: `tests/sim/combatPolicy.test.js` (extend)

- [ ] **Step 1: Write the failing test** -- append to `tests/sim/combatPolicy.test.js` (match the file's existing actor/enemy shape):

```javascript
test('flag ON: LOS-blocked ranged attacker repositions instead of walking at the wall', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  const actor = {
    id: 'p1',
    position: { x: 0, y: 0 },
    attack_range: 5,
    ap_remaining: 2,
    controlled_by: 'player',
  };
  const enemy = { id: 'e1', position: { x: 4, y: 0 }, hp: 10, controlled_by: 'sistema' };
  const units = [actor, enemy];
  const opts = {
    terrainFeatures: [
      { x: 2, y: 0, type: 'roccia' },
      { x: 2, y: 1, type: 'roccia' },
    ],
    gridSize: 6,
  };
  const action = selectPlayerAction(actor, units, null, opts);
  // Not an attack (LOS blocked) and not a plain step toward the enemy row (y stays 0);
  // it should move to a tile that reopens LOS (y changes) rather than stepToward(nearest).
  assert.equal(action.action_type, 'move');
  assert.notEqual(action.target_position.y, 0);
  delete process.env.COMBAT_LOS_ENABLED;
});

test('flag OFF: same setup is byte-identical (attacks or steps toward as before)', () => {
  delete process.env.COMBAT_LOS_ENABLED;
  const actor = {
    id: 'p1',
    position: { x: 0, y: 0 },
    attack_range: 5,
    ap_remaining: 2,
    controlled_by: 'player',
  };
  const enemy = { id: 'e1', position: { x: 4, y: 0 }, hp: 10, controlled_by: 'sistema' };
  const units = [actor, enemy];
  const opts = { terrainFeatures: [{ x: 2, y: 0, type: 'roccia' }], gridSize: 6 };
  const action = selectPlayerAction(actor, units, null, opts);
  assert.equal(action.action_type, 'attack'); // flag OFF -> LOS ignored -> in-range attack
  delete process.env.COMBAT_LOS_ENABLED;
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /c/dev/Game && node --test tests/sim/combatPolicy.test.js`
Expected: FAIL on the flag-ON case (currently returns a `stepToward` with `y===0`).

- [ ] **Step 3: Add the require + wire the fallback.** At the top of `combat-policy.js` (near the losForGrid require):

```javascript
const { stepToRegainLos } = require('../../apps/backend/services/combat/losReposition');
```

In `selectPlayerAction`, the default branch currently ends:

```javascript
// None in range (or no AP): approach the nearest.
const nearest = enemies
  .slice()
  .sort((a, b) => dist(actor.position, a.position) - dist(actor.position, b.position))[0];
return stepToward(actor, nearest.position);
```

Replace that tail with (LOS-repositioning before the plain approach):

```javascript
// COMBAT_LOS_ENABLED (default OFF): if the reason nothing is attackable is that
// in-range enemies are LOS-blocked, try a one-tile step that reopens a firing
// line before falling back to a plain approach. Flag OFF -> losFn is a no-op so
// no enemy is ever LOS-blocked -> this block is skipped (byte-identical).
const gridForLos = {
  terrain_features: (opts && opts.terrainFeatures) || [],
  width: (opts && opts.gridSize) || 6,
  height: (opts && opts.gridSize) || 6,
};
const losBlockedInRange = enemies.some(
  (e) =>
    dist(actor.position, e.position) <= (actor.attack_range || 1) &&
    !losFn(actor.position, e.position),
);
if (losBlockedInRange) {
  const repos = stepToRegainLos(actor, enemies, gridForLos, {
    occupied: occupiedSet(units, actor.id),
  });
  if (repos) return { action_type: 'move', target_position: repos };
}
// None in range (or no AP): approach the nearest.
const nearest = enemies
  .slice()
  .sort((a, b) => dist(actor.position, a.position) - dist(actor.position, b.position))[0];
return stepToward(actor, nearest.position);
```

- [ ] **Step 4: Thread `gridSize` from the adapter.** In `tools/sim/combat-adapter.js:212` change
      `selectPlayerAction(active, units, objective, { focusFire, terrainFeatures })` to
      `selectPlayerAction(active, units, objective, { focusFire, terrainFeatures, gridSize })`.
      Confirm `gridSize` is the in-scope identifier there (grep `gridSize` in the file; it is used in the start-body terrain block ~line 98).

- [ ] **Step 5: Run tests + regression**

Run: `cd /c/dev/Game && node --test tests/sim/combatPolicy.test.js tests/sim/combatAdapter.test.js` -> PASS (new cases + existing unchanged; flag OFF byte-identical).

- [ ] **Step 6: Prettier + commit**

```bash
cd /c/dev/Game && npx prettier --write tools/sim/combat-policy.js tools/sim/combat-adapter.js tests/sim/combatPolicy.test.js
cd /c/dev/Game && git add tools/sim/combat-policy.js tools/sim/combat-adapter.js tests/sim/combatPolicy.test.js && git commit  # "feat(sim): player-proxy repositions to regain LOS (flag-gated)"
```

---

## Task 3: Wire the prod Sistema AI (`declareSistemaIntents.js`) + regression

**Files:**

- Modify: `apps/backend/services/ai/declareSistemaIntents.js` (downgrade site ~:472 + move resolution ~:527)
- Test: `tests/services/aiLosDowngrade.test.js` (extend)

- [ ] **Step 1: Write the failing test** -- append to `tests/services/aiLosDowngrade.test.js` (reuse its session builder). Assert that when the attack->approach downgrade fires under a wall, the emitted move goes to a LOS-reopening tile (off the straight line), not straight toward the target:

```javascript
test('flag ON: LOS-downgraded Sistema approaches a LOS-reopening tile, not straight at the target', () => {
  process.env.COMBAT_LOS_ENABLED = 'true';
  // Build a session (reuse the file's helper): SIS attacker at (0,0) range 5,
  // player target at (4,0), a roccia wall at (2,0)+(2,1) between them.
  // Expect the emitted move for the SIS to have y !== 0 (stepped to reopen LOS),
  // and its decision rule to carry the _LOS_BLOCKED suffix.
  // ... construct via the same makeSession/buildDeclare helpers already in this file ...
  delete process.env.COMBAT_LOS_ENABLED;
});
```

(Construct the scenario with the file's existing `makeSession`/`buildDeclare` DI helpers -- SIS `attack_range: 5`, player at (4,0), wall `roccia` at (2,0) and (2,1); grid width/height 6. Assert the SIS `move` intent's destination `y !== 0` and the decision `rule` matches `/_LOS_BLOCKED$/`. If the harness only exposes decisions not raw move coords, assert on the decision fields it does expose plus that no `attack` intent was emitted for the SIS.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd /c/dev/Game && node --test tests/services/aiLosDowngrade.test.js`
Expected: FAIL (today the downgrade approaches straight toward the target).

- [ ] **Step 3: Add the require + compute the reposition at the downgrade + honor it at the move.**

Add to the existing policy require or near the top of `declareSistemaIntents.js`:

```javascript
const { stepToRegainLos } = require('../combat/losReposition');
```

At the downgrade site (currently ~:470-472):

```javascript
if (
  policy &&
  policy.intent === 'attack' &&
  !losClearForAi(session.grid, actor.position, target.position, session.units)
) {
  const foes = (session.units || []).filter(
    (u) => u && u.position && (u.hp ?? 1) > 0 && u.controlled_by !== actor.controlled_by,
  );
  const occupied = new Set(
    (session.units || [])
      .filter((u) => u && u.position && (u.hp ?? 1) > 0 && u.id !== actor.id)
      .map((u) => `${u.position.x},${u.position.y}`),
  );
  const reposition = stepToRegainLos(actor, foes, session.grid, { occupied });
  policy = {
    ...policy,
    intent: 'approach',
    rule: `${policy.rule || 'REGOLA'}_LOS_BLOCKED`,
    reposition_to: reposition || undefined,
  };
}
```

At the approach/retreat move resolution (currently ~:527-530):

```javascript
// intent='approach' o 'retreat' -> move
const positionFrom = { ...actor.position };
const nextPos =
  policy.intent === 'retreat'
    ? stepAway(actor.position, target.position, effectiveGrid)
    : policy.reposition_to || stepTowards(actor.position, target.position);
```

(Only the `approach` branch changes: when `reposition_to` is present it moves there; otherwise the current `stepTowards`. `retreat` is untouched.)

- [ ] **Step 4: Run tests + regression**

Run: `cd /c/dev/Game && node --test tests/services/aiLosDowngrade.test.js tests/services/aiLosFilter.test.js tests/ai/declareSistemaIntents.test.js tests/api/roundExecute.test.js` -> PASS (new case + existing unchanged; flag OFF byte-identical -> the downgrade branch never runs, so `reposition_to` is never set).

- [ ] **Step 5: Prettier + commit**

```bash
cd /c/dev/Game && npx prettier --write apps/backend/services/ai/declareSistemaIntents.js tests/services/aiLosDowngrade.test.js
cd /c/dev/Game && git add apps/backend/services/ai/declareSistemaIntents.js tests/services/aiLosDowngrade.test.js && git commit  # "feat(combat): Sistema AI repositions to regain LOS (flag-gated)"
```

---

## Task 4: Re-probe validation + QUALITY.md + PR

**Files:**

- Create: `docs/quality/2026-07-04-ai-los-repositioning-QUALITY.md`

- [ ] **Step 1: Full backend + sim gate**

Run: `cd /c/dev/Game && npm run test:api` and `cd /c/dev/Game && node --test tests/sim/*.test.js`
Expected: green (flag OFF everywhere -> band-neutral / byte-identical).

- [ ] **Step 2: Re-run the LOS ratify direction probe (validation)**

Run: `cd /c/dev/Game && node tools/sim/los-n-probe.js 10 2>&1 | tail -30`
Record the new `wr_delta` and `avg_rounds_delta`. Compare to the pre-repositioning baseline (flag_on WR 0.70 vs OFF 1.00, wr_delta -0.30, +3 timeouts). Expected: the WR gap SHRINKS and timeouts drop (the player-proxy now sidesteps the wall). If the gap does NOT shrink, that is a finding (either the wiring is not engaging or the greedy one-tile step is insufficient for this wall) -- report it rather than hiding it. Paste both before/after numbers.

- [ ] **Step 3: Write QUALITY.md**

Document: (1) Smoke -- losReposition 5/5 + the two consumer integration tests + flag-OFF regression (paste outputs); (2) Ricerca -- edge cases (no-step-reopens -> null/fallback, occupied/off-board exclusion, determinism, both consumers); (3) Tuning -- the greedy 4-neighbor + graceful-fallback choice + the before/after re-probe delta. Then the SDMG governance note: the heuristic is self-designed -> external falsification (harsh-reviewer on the method + game-design-validator on the AI behavior) is REQUIRED before the production flip is ratified; the flip stays owner-gated post N=40.

- [ ] **Step 4: Prettier + commit + push + PR (merge = Eduardo)**

```bash
cd /c/dev/Game && npx prettier --write docs/quality/2026-07-04-ai-los-repositioning-QUALITY.md
cd /c/dev/Game && git add docs/quality/2026-07-04-ai-los-repositioning-QUALITY.md && git commit  # "docs(quality): ai los-repositioning gate + re-probe delta"
cd /c/dev/Game && git push -u origin feat/combat-los-repositioning
cd /c/dev/Game && gh pr create -R MasterDD-L34D/Game --base main --head feat/combat-los-repositioning --title "feat(combat): AI LOS-repositioning (greedy step-to-LOS, flag-dormant)" --body-file <PR body>
```

PR body: summary; the shared helper + both wired consumers; flag-OFF band-neutral; the before/after re-probe delta; the SDMG external-falsification requirement before any flip; forbidden-path note if applicable. Merge = Eduardo.

---

## Notes for the executor

- **Flag discipline:** never set `COMBAT_LOS_ENABLED=true` outside a test (`delete` after). The merge ships with the flag OFF -- this slice only makes the (dormant) mechanic smarter.
- **Parity:** the sim and prod consumers MUST call the same `stepToRegainLos` with the same semantics -- do not fork the heuristic.
- **Determinism:** if you reach for `Math.random`/`Date` or a non-deterministic sort, stop -- the ratify depends on determinism.
- **Never worse than today:** the fallback (no reopening step -> plain approach) is load-bearing; keep it.
