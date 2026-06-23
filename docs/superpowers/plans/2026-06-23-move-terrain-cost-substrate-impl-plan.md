---
title: 'Move terrain-cost substrate -- implementation plan (impl)'
date: 2026-06-23
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, volo, radici, trait-mechanics, substrate, plan, n40, tdd]
---

# Move terrain-cost substrate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the dormant `terrain_cost_multiplier` into the move-cost calc so `adattamento_volo`
(graded flight) and `radici_ancora_planare` (anchor) have a real mechanic, flag-gated OFF for band-neutrality.

**Architecture:** Three pure resolver units (profile loader / Dijkstra cost / profile resolution) built
TDD with zero runtime impact (phase 0), then a flag-gated wire into the move-gate (player + AI + minion)
that swaps Manhattan-distance for cheapest-path terrain cost when `MOVE_TERRAIN_COST_ENABLED=true` (phase 1).
Volo grades modify the resolved profile (phase 2); radici adds an `ancorato` producer/consumer status with
DR at the existing mitigation seam (phase 3). N=40 band measurement (phase 4) gates an owner flip (phase 5).

**Tech Stack:** Node 22 CommonJS, `node:test` + `node:assert/strict`, `js-yaml`, existing combat-service
patterns (`staminaFatigue.js` flag, `biomeModifiers.js` yaml-load+cache, `cortecciaMemetica.js` DR seam).

**Spec:** `docs/superpowers/specs/2026-06-23-move-terrain-cost-substrate-design.md`
**Skeleton plan (origin):** `docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-plan.md` (#2997)

**Ground-truth (origin/main 9d22a904):** move = teleport, budget = AP (`session.js:2806` player,
`:3286` AI, `abilityExecutor.js:610` minion). `movement_profiles.yaml` + `grid.terrain_features` =
0-consumer. Extension-point `evaluateMovementTraits` (`traitEffects.js:866`). Flag/transient pattern
`_tiles_voluntary_round` (`session.js:2855`). DR seam `computeCortecciaDR` (`session.js:913`).

**Coordination:** `session.js` + `abilityExecutor.js` are core files the live trait-mechanics session edits.
Phase 0 touches NEITHER (only new files) -> safe NOW. Phases 1+ touch the move-gate -> sequence AFTER the
trait kit closes (9.5/12 -> 12/12) or coordinate the exact move-gate region. Rebase the worktree frequently.

---

## File Structure

- Create `apps/backend/services/combat/movementProfiles.js` -- yaml loader + `getProfile(name)` + constants. Pure.
- Create `apps/backend/services/combat/moveCost.js` -- pure Dijkstra `moveCost` + `terrainAtFromFeatures` +
  flag `isMoveTerrainCostEnabled` + integration helper. (Flag colocated with the wire logic, mirroring `staminaFatigue.js`.)
- Create `apps/backend/services/combat/movementResolver.js` -- `resolveMovementProfile` + `deriveProfile` +
  `applyVoloGrade` + `evaluateVoloGrade`. Pure.
- Create `apps/backend/services/combat/anchorState.js` -- radici: `applyAnchorAtActivation` / `breakAnchor` /
  `computeAnchorDR` + constants.
- Modify `apps/backend/routes/session.js` -- player move-gate (~2826-2836), AI move (~3313), DR seam (~913),
  unit-activation hook, PERSISTENT_STATUS_KEYS.
- Modify `apps/backend/services/abilityExecutor.js` -- minion move-gate (~610).
- Data `data/core/traits/active_effects.yaml` (+ 5-gate stubs) -- `adattamento_volo` (grade) +
  `radici_ancora_planare` (anchor).
- Tests `tests/services/combat/{movementProfiles,moveCost,movementResolver,anchorState,moveTerrainWire}.test.js`.
- Docs `docs/hubs/combat.md` (move-gate section).

---

## Phase 0 -- Pure resolvers (zero runtime impact, executable NOW)

### Task 1: movementProfiles loader

**Files:**
- Create: `apps/backend/services/combat/movementProfiles.js`
- Test: `tests/services/combat/movementProfiles.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/combat/movementProfiles.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getProfile,
  DEFAULT_PROFILE,
  PROFILE_NAMES,
} = require('../../../apps/backend/services/combat/movementProfiles');

test('loads the three W6 profiles from yaml', () => {
  assert.deepEqual(PROFILE_NAMES.sort(), ['heavy', 'light', 'medium']);
  assert.equal(DEFAULT_PROFILE, 'medium');
});

test('heavy profile prices roccia 2.0 and default 1.0', () => {
  const p = getProfile('heavy');
  assert.equal(p.terrain_cost_multiplier.roccia, 2.0);
  assert.equal(p.terrain_cost_multiplier.default, 1.0);
});

test('light profile has only default 1.0 (no penalty)', () => {
  const p = getProfile('light');
  assert.equal(p.terrain_cost_multiplier.default, 1.0);
  assert.equal(p.terrain_cost_multiplier.roccia ?? 1.0, 1.0);
});

test('unknown profile name falls back to the default profile', () => {
  assert.deepEqual(getProfile('nope'), getProfile(DEFAULT_PROFILE));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:/dev/_gamewt-move-terrain && node --test tests/services/combat/movementProfiles.test.js`
Expected: FAIL ("Cannot find module .../movementProfiles").

- [ ] **Step 3: Write minimal implementation**

```javascript
// apps/backend/services/combat/movementProfiles.js
'use strict';

// W6 movement-profile loader (pattern: biomeModifiers.js). Pure: load once, cache,
// soft-fail to a SAFE light-ish default if the yaml is missing/malformed. Consumed by
// movementResolver -> moveCost. Substrate flag-gated at the wire (MOVE_TERRAIN_COST_ENABLED).

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_YAML = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'movement_profiles.yaml',
);

const SAFE_DEFAULT_NAME = 'medium';
const SAFE_PROFILES = Object.freeze({
  heavy: { terrain_cost_multiplier: { default: 1.0 } },
  medium: { terrain_cost_multiplier: { default: 1.0 } },
  light: { terrain_cost_multiplier: { default: 1.0 } },
});

let _cache = null;

function load(yamlPath = DEFAULT_YAML, logger = console) {
  if (_cache !== null) return _cache;
  try {
    const text = fs.readFileSync(yamlPath, { encoding: 'utf8' });
    const parsed = yaml.load(text) || {};
    const profiles =
      parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {};
    _cache = {
      profiles: Object.keys(profiles).length ? profiles : SAFE_PROFILES,
      default_profile: typeof parsed.default_profile === 'string'
        ? parsed.default_profile
        : SAFE_DEFAULT_NAME,
    };
  } catch (err) {
    if (logger && logger.warn) logger.warn(`[movementProfiles] load failed: ${err.message}`);
    _cache = { profiles: SAFE_PROFILES, default_profile: SAFE_DEFAULT_NAME };
  }
  return _cache;
}

function _ensureMult(profile) {
  const m = (profile && profile.terrain_cost_multiplier) || {};
  return { terrain_cost_multiplier: { default: 1.0, ...m } };
}

function getProfile(name) {
  const { profiles, default_profile } = load();
  const chosen = profiles[name] || profiles[default_profile] || SAFE_PROFILES.medium;
  return _ensureMult(chosen);
}

function _resetCache() {
  _cache = null;
}

const DEFAULT_PROFILE = load().default_profile;
const PROFILE_NAMES = Object.keys(load().profiles);

module.exports = { getProfile, load, DEFAULT_PROFILE, PROFILE_NAMES, _resetCache, DEFAULT_YAML };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/combat/movementProfiles.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/combat/movementProfiles.js tests/services/combat/movementProfiles.test.js
git commit -F <msg-file>   # subject <=72; trailers Coding-Agent: claude-code + Trace-Id: <uuidv7>
```

### Task 2: moveCost pure Dijkstra

**Files:**
- Create: `apps/backend/services/combat/moveCost.js`
- Test: `tests/services/combat/moveCost.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/combat/moveCost.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  moveCost,
  terrainAtFromFeatures,
} = require('../../../apps/backend/services/combat/moveCost');

const bounds = { width: 6, height: 6 };
const flat = () => null; // no terrain anywhere -> all default

const medium = { terrain_cost_multiplier: { roccia: 1.5, default: 1.0 } };

test('all-default terrain: cost equals Manhattan distance', () => {
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 3, y: 0 }, medium, flat, bounds), 3);
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 2, y: 2 }, medium, flat, bounds), 4);
});

test('routes around a costly tile when cheaper', () => {
  // roccia (mult 1.5) at (1,0); going (0,0)->(2,0). Straight path enters (1,0)+(2,0)=1.5+1=2.5.
  // Detour (0,0)->(0,1)->(1,1)->(2,1)->(2,0) enters 4 default tiles = 4. Straight is cheaper -> 2.5.
  const terrainAt = terrainAtFromFeatures([{ x: 1, y: 0, type: 'roccia' }]);
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 }, medium, terrainAt, bounds), 2.5);
});

test('detours around an expensive wall of tiles', () => {
  // lava (mult 5) blocks the straight corridor at (1,0); detour cheaper.
  const lavaProfile = { terrain_cost_multiplier: { lava: 5, default: 1.0 } };
  const terrainAt = terrainAtFromFeatures([
    { x: 1, y: 0, type: 'lava' },
  ]);
  // (0,0)->(2,0): straight enters lava(5)+default(1)=6; detour via y=1 = 4 default tiles = 4.
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 }, lavaProfile, terrainAt, bounds), 4);
});

test('source equals dest -> cost 0', () => {
  assert.equal(moveCost({ x: 2, y: 2 }, { x: 2, y: 2 }, medium, flat, bounds), 0);
});

test('out-of-bounds dest -> Infinity', () => {
  assert.equal(moveCost({ x: 0, y: 0 }, { x: 9, y: 9 }, medium, flat, bounds), Infinity);
});

test('terrainAtFromFeatures returns type at coords, null elsewhere', () => {
  const at = terrainAtFromFeatures([{ x: 4, y: 3, type: 'vegetazione_densa' }]);
  assert.equal(at(4, 3), 'vegetazione_densa');
  assert.equal(at(0, 0), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/combat/moveCost.test.js`
Expected: FAIL ("Cannot find module .../moveCost").

- [ ] **Step 3: Write minimal implementation**

```javascript
// apps/backend/services/combat/moveCost.js
'use strict';

// Pure cheapest-path move cost (Q-B verdict 2026-06-23: Dijkstra on the grid, terrain-only).
// Cost to ENTER a tile = profile.terrain_cost_multiplier[type] ?? default. Source tile not
// counted. 4-neighbour grid. Ignores intermediate units (matches the engine's teleport, which
// only checks the destination tile for occupancy). All-default terrain -> cost == Manhattan,
// so the wire is band-neutral even flag-ON until a map carries typed terrain.

function terrainAtFromFeatures(features) {
  const map = new Map();
  for (const f of Array.isArray(features) ? features : []) {
    if (f && Number.isFinite(f.x) && Number.isFinite(f.y) && f.type) {
      map.set(`${f.x},${f.y}`, String(f.type));
    }
  }
  return (x, y) => map.get(`${x},${y}`) || null;
}

function _enterCost(profile, type) {
  const m = (profile && profile.terrain_cost_multiplier) || {};
  const base = m.default ?? 1.0;
  if (!type) return base;
  return m[type] ?? base;
}

function _inBounds(x, y, bounds) {
  return x >= 0 && y >= 0 && x < bounds.width && y < bounds.height;
}

function moveCost(from, dest, profile, terrainAt, bounds) {
  if (!from || !dest || !bounds) return Infinity;
  if (!_inBounds(dest.x, dest.y, bounds) || !_inBounds(from.x, from.y, bounds)) return Infinity;
  if (from.x === dest.x && from.y === dest.y) return 0;

  const key = (x, y) => `${x},${y}`;
  const dist = new Map([[key(from.x, from.y), 0]]);
  // Simple array-based priority frontier (grid is tiny, perf is a non-issue).
  const frontier = [{ x: from.x, y: from.y, c: 0 }];
  const NEIGHBORS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (frontier.length) {
    let bi = 0;
    for (let i = 1; i < frontier.length; i += 1) {
      if (frontier[i].c < frontier[bi].c) bi = i;
    }
    const cur = frontier.splice(bi, 1)[0];
    if (cur.x === dest.x && cur.y === dest.y) return cur.c;
    const curKey = key(cur.x, cur.y);
    if (cur.c > (dist.get(curKey) ?? Infinity)) continue;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!_inBounds(nx, ny, bounds)) continue;
      const stepCost = _enterCost(profile, terrainAt(nx, ny));
      const nc = cur.c + stepCost;
      const nKey = key(nx, ny);
      if (nc < (dist.get(nKey) ?? Infinity)) {
        dist.set(nKey, nc);
        frontier.push({ x: nx, y: ny, c: nc });
      }
    }
  }
  return Infinity;
}

module.exports = { moveCost, terrainAtFromFeatures, _enterCost };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/combat/moveCost.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit** (same trailer convention as Task 1).

### Task 3: movementResolver (profile resolution + volo modifier)

**Files:**
- Create: `apps/backend/services/combat/movementResolver.js`
- Test: `tests/services/combat/movementResolver.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/combat/movementResolver.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveMovementProfile,
  deriveProfile,
  applyVoloGrade,
  evaluateVoloGrade,
  HAZARD_TERRAIN,
} = require('../../../apps/backend/services/combat/movementResolver');

test('explicit species movement_profile wins', () => {
  const p = resolveMovementProfile({ morphotype: 'corazzato' }, { movement_profile: 'light' });
  assert.equal(p.terrain_cost_multiplier.roccia ?? 1.0, 1.0); // light => no roccia penalty
});

test('derives heavy from a heavy morphotype when no explicit field', () => {
  const p = resolveMovementProfile({ morphotype: 'corazzato' }, null);
  assert.equal(p.terrain_cost_multiplier.roccia, 2.0);
});

test('derives light from a flyer morphotype', () => {
  assert.equal(deriveProfile('volante', null), 'light');
  assert.equal(deriveProfile('alato', null), 'light');
});

test('orphan with no morphotype/form falls back to medium', () => {
  assert.equal(deriveProfile(null, null), 'medium');
  const p = resolveMovementProfile({}, null);
  assert.equal(p.terrain_cost_multiplier.roccia, 1.5); // medium roccia
});

test('form nudges toward light when morphotype is absent', () => {
  assert.equal(deriveProfile(null, 'agile'), 'light');
});

test('volo grade 1 frees normal terrain but not hazard', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, lava: 2.0, default: 1.0 } };
  const g1 = applyVoloGrade(heavy, 1);
  assert.equal(g1.terrain_cost_multiplier.roccia, 1.0);
  assert.equal(g1.terrain_cost_multiplier.lava, 2.0); // hazard unchanged
});

test('volo grade 2 reduces hazard but keeps it >1', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, lava: 2.0, default: 1.0 } };
  const g2 = applyVoloGrade(heavy, 2);
  assert.equal(g2.terrain_cost_multiplier.roccia, 1.0);
  assert.equal(g2.terrain_cost_multiplier.lava, 1.5);
});

test('volo grade 3 frees everything incl. hazard', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, lava: 2.0, default: 1.0 } };
  const g3 = applyVoloGrade(heavy, 3);
  assert.equal(g3.terrain_cost_multiplier.roccia, 1.0);
  assert.equal(g3.terrain_cost_multiplier.lava, 1.0);
});

test('volo grade 0 / no trait leaves the profile unchanged', () => {
  const heavy = { terrain_cost_multiplier: { roccia: 2.0, default: 1.0 } };
  assert.deepEqual(applyVoloGrade(heavy, 0), heavy);
  assert.equal(evaluateVoloGrade({}, { traits: [] }), 0);
});

test('evaluateVoloGrade reads grade from the registry, default 1 when present', () => {
  const registry = { adattamento_volo: { effect: { grade: 3 } } };
  assert.equal(evaluateVoloGrade(registry, { traits: ['adattamento_volo'] }), 3);
  assert.equal(evaluateVoloGrade({ adattamento_volo: {} }, { traits: ['adattamento_volo'] }), 1);
});

test('HAZARD_TERRAIN is the lava/acqua_profonda set', () => {
  assert.ok(HAZARD_TERRAIN.has('lava'));
  assert.ok(HAZARD_TERRAIN.has('acqua_profonda'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/combat/movementResolver.test.js`
Expected: FAIL ("Cannot find module .../movementResolver").

- [ ] **Step 3: Write minimal implementation**

```javascript
// apps/backend/services/combat/movementResolver.js
'use strict';

// Profile resolution (Q-A verdict): explicit species field > derive(morphotype, form) > default.
// Volo modifier (Q-D verdict = graded): g1 frees normal terrain, g2 also halves hazard,
// g3 frees hazard too. HAZARD = lava/acqua_profonda. Pure; no runtime wire here.

const { getProfile, DEFAULT_PROFILE, PROFILE_NAMES } = require('./movementProfiles');

const HAZARD_TERRAIN = new Set(['lava', 'acqua_profonda']);
const FLYER_MORPHOTYPES = new Set(['aereo', 'volante', 'alato', 'flyer', 'volatore']);
const HEAVY_MORPHOTYPES = new Set(['corazzato', 'massiccio', 'pesante', 'armored', 'colosso']);
const AGILE_FORMS = new Set(['agile', 'aereo', 'scattante', 'light']);
const HEAVY_FORMS = new Set(['corazzato', 'massiccio', 'pesante']);
const VOLO_TRAIT = 'adattamento_volo';

function deriveProfile(morphotype, form) {
  const m = morphotype ? String(morphotype).toLowerCase() : '';
  if (FLYER_MORPHOTYPES.has(m)) return 'light';
  if (HEAVY_MORPHOTYPES.has(m)) return 'heavy';
  const f = form ? String(form).toLowerCase() : '';
  if (AGILE_FORMS.has(f)) return 'light';
  if (HEAVY_FORMS.has(f)) return 'heavy';
  return DEFAULT_PROFILE;
}

function resolveMovementProfile(unit, speciesRecord) {
  const explicit = speciesRecord && speciesRecord.movement_profile;
  if (explicit && PROFILE_NAMES.includes(explicit)) return getProfile(explicit);
  return getProfile(deriveProfile(unit && unit.morphotype, unit && unit.form));
}

function applyVoloGrade(profile, grade) {
  const g = Number(grade) || 0;
  if (g <= 0) return profile;
  const src = (profile && profile.terrain_cost_multiplier) || { default: 1.0 };
  const out = {};
  for (const [type, mult] of Object.entries(src)) {
    if (type === 'default') {
      out.default = Math.min(Number(mult) || 1.0, 1.0);
      continue;
    }
    const isHazard = HAZARD_TERRAIN.has(type);
    if (!isHazard) {
      out[type] = 1.0; // g1+ frees normal terrain
    } else if (g >= 3) {
      out[type] = 1.0; // g3 frees hazard
    } else if (g === 2) {
      out[type] = Math.max(1.0, Number(mult) / 2); // g2 halves hazard
    } else {
      out[type] = Number(mult); // g1 leaves hazard unchanged
    }
  }
  if (!('default' in out)) out.default = 1.0;
  return { terrain_cost_multiplier: out };
}

function evaluateVoloGrade(registry, actor) {
  const traits = actor && Array.isArray(actor.traits) ? actor.traits : [];
  if (!traits.includes(VOLO_TRAIT)) return 0;
  const def = registry && registry[VOLO_TRAIT];
  const grade = def && def.effect && Number(def.effect.grade);
  return Number.isFinite(grade) && grade > 0 ? grade : 1;
}

module.exports = {
  resolveMovementProfile,
  deriveProfile,
  applyVoloGrade,
  evaluateVoloGrade,
  HAZARD_TERRAIN,
  VOLO_TRAIT,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/combat/movementResolver.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Run prettier + the whole combat suite, then commit**

```bash
npm run format:check   # or: npx prettier --check "apps/backend/services/combat/movement*.js" "apps/backend/services/combat/moveCost.js" tests/services/combat/move*.test.js
node --test tests/services/combat/movementProfiles.test.js tests/services/combat/moveCost.test.js tests/services/combat/movementResolver.test.js
git add apps/backend/services/combat/movementResolver.js tests/services/combat/movementResolver.test.js
git commit -F <msg-file>
```

> **Phase 0 exit:** three pure modules, ~21 tests green, ZERO files outside the new modules touched ->
> nothing in the move-gate changed -> band-neutral and collision-free with the live trait session.

---

## Phase 1 -- Wire move-gate flag-gated (touches shared core; sequence after trait kit)

> Adds the flag `MOVE_TERRAIN_COST_ENABLED` (colocated in `moveCost.js`) and swaps Manhattan for terrain
> cost ONLY in the movement path. Ability ranges stay Manhattan. Default OFF = identical to today.

### Task 4: flag + integration helper in moveCost.js

**Files:** Modify `apps/backend/services/combat/moveCost.js`; Test `tests/services/combat/moveTerrainWire.test.js`.

- [ ] **Step 1: failing test** -- assert flag default OFF + helper math.

```javascript
// tests/services/combat/moveTerrainWire.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isMoveTerrainCostEnabled,
  moveApDistance,
} = require('../../../apps/backend/services/combat/moveCost');

test('flag is OFF by default and ON only when "true"', () => {
  assert.equal(isMoveTerrainCostEnabled({}), false);
  assert.equal(isMoveTerrainCostEnabled({ MOVE_TERRAIN_COST_ENABLED: 'true' }), true);
  assert.equal(isMoveTerrainCostEnabled({ MOVE_TERRAIN_COST_ENABLED: '1' }), false);
});

test('moveApDistance returns ceil(moveCost) with terrain', () => {
  const profile = { terrain_cost_multiplier: { roccia: 1.5, default: 1.0 } };
  const at = require('../../../apps/backend/services/combat/moveCost').terrainAtFromFeatures([
    { x: 1, y: 0, type: 'roccia' },
  ]);
  const d = moveApDistance(
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { profile, terrainAt: at, bounds: { width: 6, height: 6 } },
  );
  assert.equal(d, 2); // ceil(1.5)
});

test('moveApDistance returns Infinity when unreachable', () => {
  const d = moveApDistance(
    { x: 0, y: 0 },
    { x: 9, y: 9 },
    { profile: { terrain_cost_multiplier: { default: 1.0 } }, terrainAt: () => null, bounds: { width: 6, height: 6 } },
  );
  assert.equal(d, Infinity);
});
```

- [ ] **Step 2: run -> FAIL** (`isMoveTerrainCostEnabled` undefined).
- [ ] **Step 3: add to `moveCost.js`:**

```javascript
const FLAG = 'MOVE_TERRAIN_COST_ENABLED';
function isMoveTerrainCostEnabled(env = process.env) {
  return Boolean(env) && env[FLAG] === 'true';
}
function moveApDistance(from, dest, { profile, terrainAt, bounds }) {
  const c = moveCost(from, dest, profile, terrainAt, bounds);
  return Number.isFinite(c) ? Math.ceil(c) : Infinity;
}
// extend module.exports with: isMoveTerrainCostEnabled, moveApDistance, FLAG
```

- [ ] **Step 4: run -> PASS.**
- [ ] **Step 5: commit.**

### Task 5: wire player move-gate (`session.js` ~2826-2836)

**Files:** Modify `apps/backend/routes/session.js`.

- [ ] **Step 1:** add requires at the move-imports block (near the `evaluateMovementTraits` import):

```javascript
const { isMoveTerrainCostEnabled, moveApDistance, terrainAtFromFeatures } = require('../services/combat/moveCost');
const { resolveMovementProfile, applyVoloGrade, evaluateVoloGrade } = require('../services/combat/movementResolver');
```

- [ ] **Step 2:** replace the player move distance calc (currently
`const dist = manhattanDistance(actor.position, dest);` ... `const apCost = Math.max(1, dist - movTraits.move_bonus);`):

```javascript
const movTraits = evaluateMovementTraits({ registry: traitRegistry, actor });
let dist = manhattanDistance(actor.position, dest);
if (isMoveTerrainCostEnabled()) {
  const profile = applyVoloGrade(
    resolveMovementProfile(actor, actor.speciesRecord || null),
    evaluateVoloGrade(traitRegistry, actor),
  );
  const bounds = { width: session.grid?.width || GRID_SIZE, height: session.grid?.height || GRID_SIZE };
  const terrainAt = terrainAtFromFeatures(session.grid?.terrain_features || []);
  const cost = moveApDistance(actor.position, dest, { profile, terrainAt, bounds });
  if (!Number.isFinite(cost)) {
    return res.status(400).json({ error: 'destinazione irraggiungibile (terreno)' });
  }
  dist = cost;
}
const apCost = Math.max(1, dist - movTraits.move_bonus);
```

- [ ] **Step 3:** add an integration test that drives `POST /api/session/:id/action` (move) on a session
seeded with a `roccia` tile under the path, with `MOVE_TERRAIN_COST_ENABLED=true`, asserting the AP cost is
higher than the OFF baseline; and a second case with the flag OFF asserting parity with today. Place in
`tests/api/` mirroring an existing session-action test. Verify it FAILS first, then PASSES.
- [ ] **Step 4:** run `node --test tests/api/<file>.test.js` + the combat suite. Re-run prettier +
`npm run lint:stack` (late test edits) per the trait-session lesson.
- [ ] **Step 5:** commit.

### Task 6: wire AI move (`session.js` ~3313) + minion (`abilityExecutor.js` ~610)

**Files:** Modify `apps/backend/routes/session.js`, `apps/backend/services/abilityExecutor.js`.

- [ ] **Step 1:** AI move -- replace `const dist = manhattanDistance(actor.position, dest); actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - dist);`
with the same flag-gated cost (no `move_bonus`; AI is trusted, so an unreachable result skips the move:
`if (!Number.isFinite(cost)) { results.push({ actor_id: actor.id, skipped: 'unreachable_terrain' }); continue; }`).
- [ ] **Step 2:** minion -- replace `if (manhattanDistance(minion.position, dest) > (Number(minion.mobility) || 1))`
with a flag-gated `moveApDistance(minion.position, dest, {...}) > mobility` (profile resolved from the minion).
- [ ] **Step 3:** tests: extend the move integration test with an AI-move case + a minion `pack_command` case.
FAIL -> PASS.
- [ ] **Step 4:** run combat + api + AI suites (`node --test tests/ai/*.test.js`).
- [ ] **Step 5:** commit. **Update `docs/hubs/combat.md`** move-gate section (DoD rule 6).

---

## Phase 2 -- Volo grades (trait authoring + already-built resolver modifier)

> The resolver modifier (`applyVoloGrade` / `evaluateVoloGrade`) is built in phase 0. Phase 2 AUTHORS the
> trait so a real unit carries it and the wire reads its grade.

### Task 7: author `adattamento_volo`

**Files:** `data/core/traits/active_effects.yaml` (+ `add_trait_stub` -> per-trait DB file + index + glossary).

- [ ] **Step 1:** run `add_trait_stub` for `adattamento_volo` (the 5-gate flow: schema-lenient /
template_validator-STRICT / style-i18n-refs / coverage / QA-baseline export:qa). Validate with
`template_validator` + `style_check` (NOT schema_gate) per the reproducibility lesson.
- [ ] **Step 2:** define the active-effect entry: `trigger.action_type: movement`, `effect.kind: move_terrain`,
`effect.grade: 1` (default; per-creature kits override grade 2/3 where flight is stronger),
IT description + refs. (Mirror an existing movement-trait entry shape; `evaluateVoloGrade` already reads
`effect.grade`.)
- [ ] **Step 3:** test: a combat/integration case where a unit with `adattamento_volo` grade 3 moves across
`lava` at cost 1/tile while a non-flyer pays the hazard cost. FAIL -> PASS.
- [ ] **Step 4:** run combat suite + the trait-data validators (`template_validator`, `style_check`).
- [ ] **Step 5:** commit. (Trait-data PRs may need the catalog re-baseline path -- see register bucket 5;
do NOT hand-edit derived `species_catalog.json` / `trait_abilities`; regenerate deterministically.)

---

## Phase 3 -- Radici anchor (producer/consumer status + DR seam)

### Task 8: anchorState module

**Files:** Create `apps/backend/services/combat/anchorState.js`; Test `tests/services/combat/anchorState.test.js`.

- [ ] **Step 1: failing test:**

```javascript
// tests/services/combat/anchorState.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyAnchorAtActivation,
  breakAnchor,
  computeAnchorDR,
  ANCORATO,
  ANCHOR_DR,
  RADICI_TRAIT,
} = require('../../../apps/backend/services/combat/anchorState');

const carrier = (extra = {}) => ({ id: 'treant', hp: 20, status: {}, traits: [RADICI_TRAIT], ...extra });

test('activation anchors a carrier when enabled', () => {
  const u = carrier();
  applyAnchorAtActivation(u, { MOVE_TERRAIN_COST_ENABLED: 'true' });
  assert.ok(u.status[ANCORATO]);
  assert.equal(computeAnchorDR(u), ANCHOR_DR);
});

test('no anchor when flag OFF (band-neutral)', () => {
  const u = carrier();
  applyAnchorAtActivation(u, {});
  assert.ok(!u.status[ANCORATO]);
  assert.equal(computeAnchorDR(u), 0);
});

test('non-carrier never anchors', () => {
  const u = carrier({ traits: [] });
  applyAnchorAtActivation(u, { MOVE_TERRAIN_COST_ENABLED: 'true' });
  assert.ok(!u.status[ANCORATO]);
});

test('breakAnchor clears the status and DR', () => {
  const u = carrier();
  applyAnchorAtActivation(u, { MOVE_TERRAIN_COST_ENABLED: 'true' });
  breakAnchor(u);
  assert.ok(!u.status[ANCORATO]);
  assert.equal(computeAnchorDR(u), 0);
});
```

- [ ] **Step 2: run -> FAIL.**
- [ ] **Step 3: implement** (mirror `cortecciaMemetica.js` shape; status map on `unit.status`):

```javascript
// apps/backend/services/combat/anchorState.js
'use strict';
// radici_ancora_planare (Q-C verdict): producer sets `ancorato` (DR2) at activation; a `move`
// breaks the anchor (consumer at the move-gate). DR realized at the mitigation seam like
// computeCortecciaDR. Flag-gated on MOVE_TERRAIN_COST_ENABLED -> band-neutral OFF.
const RADICI_TRAIT = 'radici_ancora_planare';
const ANCORATO = 'ancorato';
const ANCHOR_DR = 2;
const { isMoveTerrainCostEnabled } = require('./moveCost');

function hasTrait(u) {
  return Array.isArray(u && u.traits) && u.traits.includes(RADICI_TRAIT);
}
function applyAnchorAtActivation(unit, env = process.env) {
  if (!unit || !hasTrait(unit) || !isMoveTerrainCostEnabled(env)) return;
  if (!unit.status || typeof unit.status !== 'object') unit.status = {};
  unit.status[ANCORATO] = ANCHOR_DR;
}
function breakAnchor(unit) {
  if (unit && unit.status && unit.status[ANCORATO]) delete unit.status[ANCORATO];
}
function computeAnchorDR(target) {
  return target && target.status && target.status[ANCORATO] ? ANCHOR_DR : 0;
}
module.exports = { applyAnchorAtActivation, breakAnchor, computeAnchorDR, ANCORATO, ANCHOR_DR, RADICI_TRAIT, hasTrait };
```

- [ ] **Step 4: run -> PASS.** **Step 5: commit.**

### Task 9: wire anchor into session.js (activation + break-on-move + DR seam + persistence)

**Files:** Modify `apps/backend/routes/session.js`.

- [ ] **Step 1:** at unit activation/turn-start, call `applyAnchorAtActivation(unit)` for each unit (find the
turn-start loop; mirror where other per-activation status refreshes run).
- [ ] **Step 2:** in BOTH move handlers (player ~2826, AI ~3313), call `breakAnchor(actor)` at the start of
the move branch (when the flag is ON) so moving forfeits the DR for the round.
- [ ] **Step 3:** at the DR mitigation seam (next to `computeCortecciaDR`, ~913): add
`const anchorDr = computeAnchorDR(target); if (anchorDr > 0) { const reduced = Math.min(anchorDr, damageDealt); damageDealt -= reduced; }`
(mirror the corteccia block exactly).
- [ ] **Step 4:** add `ANCORATO` to `PERSISTENT_STATUS_KEYS` (the anchor must survive the end-of-round wipe;
the WIPE not the decay loop -- see slice-7 pigmenti lesson). Grep `PERSISTENT_STATUS_KEYS` to find it.
- [ ] **Step 5:** test (integration): a treant with `radici_ancora_planare`, flag ON, that does NOT move
takes 2 less damage; a treant that DOES move takes full damage that round. FAIL -> PASS. Run combat + api suites.
- [ ] **Step 6:** commit. Update `docs/hubs/combat.md`.

### Task 10: author `radici_ancora_planare` trait (5-gate)

- [ ] Same flow as Task 7: `add_trait_stub`, active-effect entry (difensivo T2, DR-on-anchor description),
validators, commit. The engine reads the trait id via `hasTrait`; no `effect.grade` needed.

---

## Phase 4 -- N=40 band measurement (gate, not code-TDD)

- [ ] Run the in-process combat harness paired-seed on `enc_foresta_temperata_radici` (real typed terrain),
flag ON vs OFF, N>=40, node 22 (calibrate + gate on the SAME node version -- combat sim is not bit-deterministic
cross node-version; see canonical-forensic lesson). NO prod backend.
- [ ] Record win-rate delta + reachability delta in `docs/reports/YYYY-MM-DD-move-terrain-n40-evidence.md`.
- [ ] master-dd ratifies the band (SDMG). If out-of-band -> tune profile multipliers / volo grades, re-measure.

## Phase 5 -- Flip (owner-gated, master-dd hands)

- [ ] Gate: N=40 in-band ratified AND volo/radici player-visible (Gate-5; build the Godot cost-telegraph
surface if needed -- cross-repo chip). Until then the flag stays OFF.
- [ ] Flip = `export MOVE_TERRAIN_COST_ENABLED=true` in `~/.config/api-keys/keys.env` + restart the prod task.
Reversible. NOT autonomous.

---

## Self-review

- **Spec coverage:** A -> Task 3 (`resolveMovementProfile`/`deriveProfile`); B -> Task 2 (`moveCost`);
  C -> Tasks 8-9 (`anchorState` + seam); D -> Task 3 (`applyVoloGrade`) + Task 7 (grade authoring);
  E -> Phase 4. Move-gate wire (player/AI/minion) -> Tasks 5-6. Flag -> Task 4. Range-stay-Manhattan ->
  Task 5 (only the move branch changed; ability range-checks untouched). Flip -> Phase 5. No gaps.
- **Placeholder scan:** phases 0-1 + tasks 8-9 carry complete code. Tasks 7/10 (trait authoring) +
  phases 4-5 are process/data gates that intentionally route through the 5-gate flow and the N=40/flip
  owner-gates rather than inline code -- they reference exact tools and patterns, not "TBD".
- **Type consistency:** `moveCost(from,dest,profile,terrainAt,bounds)` and `moveApDistance(from,dest,{profile,terrainAt,bounds})`
  used identically in Tasks 2/4/5/6. `applyVoloGrade(profile,grade)` + `evaluateVoloGrade(registry,actor)`
  consistent Tasks 3/5/7. `computeAnchorDR`/`breakAnchor`/`applyAnchorAtActivation`/`ANCORATO` consistent
  Tasks 8/9. Flag name `MOVE_TERRAIN_COST_ENABLED` consistent throughout.
