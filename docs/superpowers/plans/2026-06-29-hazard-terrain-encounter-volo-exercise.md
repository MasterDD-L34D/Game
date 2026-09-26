# Hazard-terrain Encounter (volo grades exercise) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a loadable lava-wall encounter + a volo-graded mixed roster so the move terrain-cost substrate's g2/g3 flight grades are EXERCISED (not latent), with a deterministic g0>g1>g2>g3 cost proof and an N=40 hazard band probe. Flag `MOVE_TERRAIN_COST_ENABLED` stays OFF.

**Architecture:** Five isolated units -- (0) additive `grid.terrain_features` extension to `encounter.schema.json`; (1) a loadable `docs/planning/encounters/` YAML whose `grid.terrain_features` reaches the runtime grid via `encounter_id`; (2) a reusable JS scenario module that hand-builds a mixed volo-graded roster (Path B: explicit `volo_grade` + `adattamento_volo`); (3) a deterministic moveCost test proving the cost ladder on the encounter's real terrain; (4) an N=40 paired-seed hazard probe + evidence report.

**Tech Stack:** Node 18+/22 (`node --test`), js-yaml, AJV 2020, supertest (in-process Express). Pure combat modules `moveCost.js`/`movementResolver.js`/`movementProfiles.js` (already merged).

---

## File structure

| File                                                                            | Responsibility                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `schemas/evo/encounter.schema.json` (modify)                                    | Add optional `grid` object (`width`/`height`/`terrain_features`). Backward-compatible. **Guardrail path -- flag in PR.** |
| `tests/services/combat/encounterGridSchema.test.js` (create)                    | TDD red->green for the schema extension (a grid-bearing encounter validates).                                            |
| `docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml` (create) | Loadable lava-wall encounter (deserto_caldo, 8x8, full lava+roccia wall).                                                |
| `apps/backend/services/worldgen/desertoCaldoHazardScenario.js` (create)         | Reusable mixed roster (Path B volo grades) + TERRAIN + SCENARIO meta + `buildUnits()`.                                   |
| `tests/services/worldgen/desertoCaldoHazardScenario.test.js` (create)           | Unit test: flyers carry `volo_grade`+`adattamento_volo`; ground don't; TERRAIN is the wall.                              |
| `tests/services/combat/voloHazardEncounterCost.test.js` (create)                | Deterministic cost ladder g0>g1>g2>g3 on the encounter's real terrain.                                                   |
| `tools/sim/move-terrain-hazard-encounter-probe.js` (create)                     | N=40 paired-seed ON-vs-OFF band probe using the scenario module.                                                         |
| `docs/reports/2026-06-29-volo-hazard-encounter-band-evidence.md` (create)       | Probe evidence (band ratify = master-dd, NOT in this PR).                                                                |

---

## Task 0: Additive `grid.terrain_features` schema extension

**Files:**

- Create: `tests/services/combat/encounterGridSchema.test.js`
- Modify: `schemas/evo/encounter.schema.json` (add `grid` property after `grid_size`)

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/combat/encounterGridSchema.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');

const SCHEMA_PATH = path.join(__dirname, '../../../schemas/evo/encounter.schema.json');

function makeValidator() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

const baseEncounter = {
  encounter_id: 'enc_grid_fixture',
  name: 'Grid Fixture',
  biome_id: 'deserto_caldo',
  grid_size: [8, 8],
  objective: { type: 'elimination' },
  player_spawn: [[0, 0]],
  waves: [
    { wave_id: 1, turn_trigger: 0, spawn_points: [[7, 7]], units: [{ species: 'x', count: 1 }] },
  ],
  difficulty_rating: 3,
};

test('encounter schema accepts grid.terrain_features (lava)', () => {
  const validate = makeValidator();
  const data = {
    ...baseEncounter,
    grid: {
      width: 8,
      height: 8,
      terrain_features: [
        { x: 3, y: 0, type: 'lava', defense_mod: 0 },
        { x: 4, y: 0, type: 'roccia', defense_mod: 2 },
      ],
    },
  };
  const valid = validate(data);
  assert.ok(valid, JSON.stringify(validate.errors));
});

test('encounter schema rejects an unknown terrain type', () => {
  const validate = makeValidator();
  const data = {
    ...baseEncounter,
    grid: { width: 8, height: 8, terrain_features: [{ x: 1, y: 1, type: 'plasma' }] },
  };
  assert.equal(validate(data), false);
});

test('encounter schema still accepts an encounter with NO grid key (backward-compat)', () => {
  const validate = makeValidator();
  assert.ok(validate({ ...baseEncounter }), JSON.stringify(validate.errors));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/combat/encounterGridSchema.test.js`
Expected: FAIL -- the first test fails (`additionalProperties` rejects `grid`).

- [ ] **Step 3: Add the `grid` property to the schema**

In `schemas/evo/encounter.schema.json`, inside `"properties"`, immediately after the `"grid_size"` block, insert:

```json
    "grid": {
      "type": "object",
      "additionalProperties": false,
      "description": "Optional terrain grid for the move terrain-cost substrate (move-terrain spec 2026-06-23). grid_size stays the authoritative board bounds; terrain_features carries per-tile types read by moveCost (flag MOVE_TERRAIN_COST_ENABLED, default OFF -> Manhattan, band-neutral).",
      "properties": {
        "width": { "type": "integer", "minimum": 4, "maximum": 20 },
        "height": { "type": "integer", "minimum": 4, "maximum": 20 },
        "terrain_features": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["x", "y", "type"],
            "additionalProperties": false,
            "properties": {
              "x": { "type": "integer", "minimum": 0 },
              "y": { "type": "integer", "minimum": 0 },
              "type": {
                "type": "string",
                "enum": [
                  "roccia",
                  "sabbia",
                  "acqua_profonda",
                  "vegetazione_densa",
                  "ghiaccio",
                  "lava",
                  "radura",
                  "default"
                ]
              },
              "defense_mod": { "type": "integer" }
            }
          }
        }
      }
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/combat/encounterGridSchema.test.js`
Expected: PASS (3/3).

- [ ] **Step 5: Confirm no existing encounter regressed**

Run: `node --test tests/scripts/encounterSchema.test.js`
Expected: PASS (all existing `enc_*.yaml` still validate -- the `grid` key is optional).

- [ ] **Step 6: Commit**

```bash
git add schemas/evo/encounter.schema.json tests/services/combat/encounterGridSchema.test.js
git commit -F .commitmsg.tmp   # see Commit Convention section
```

---

## Task 1: Loadable lava-wall encounter YAML

**Files:**

- Create: `docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml`
- Test: `tests/scripts/encounterSchema.test.js` (auto-discovers) + `tools/js/validate_encounter_difficulty.js`

- [ ] **Step 1: Write the encounter file**

The lava wall is full-height (x=3 lava, x=4 roccia, y=0..7) so there is NO detour -- every left->right path crosses lava+roccia. Spawns are on the left (players) / right (handled by waves as flavor; the AI roster for play comes from the scenario module in Task 2).

```yaml
# Encounter: "Bocche Vulcaniche -- Muro di Lava" (deserto_caldo)
# Esercita la move terrain-cost substrate: muro full-height lava(x=3)+roccia(x=4)
# su 8x8 -> nessuna deviazione. I volatori graduati lo attraversano (g1 paga ancora
# la lava, g2 la dimezza, g3 la azzera); i terrestri pagano il muro pieno.
# Il flag MOVE_TERRAIN_COST_ENABLED resta OFF -> band-neutral (Manhattan).
# Il roster AI-giocato vive in services/worldgen/desertoCaldoHazardScenario.js
# (le waves qui sono flavour/objective per il path encounter_id loadable).
# Schema: schemas/evo/encounter.schema.json (grid.terrain_features est. 2026-06-29)
encounter_id: enc_deserto_caldo_bocche_vulcaniche_01
name: 'Bocche Vulcaniche -- Muro di Lava'
biome_id: deserto_caldo
grid_size: [8, 8]
difficulty_rating: 3
estimated_turns: 16
encounter_class: standard

objective:
  type: elimination

player_spawn:
  - [0, 2]
  - [0, 3]
  - [0, 4]
  - [0, 5]

grid:
  width: 8
  height: 8
  terrain_features:
    - { x: 3, y: 0, type: lava, defense_mod: 0 }
    - { x: 3, y: 1, type: lava, defense_mod: 0 }
    - { x: 3, y: 2, type: lava, defense_mod: 0 }
    - { x: 3, y: 3, type: lava, defense_mod: 0 }
    - { x: 3, y: 4, type: lava, defense_mod: 0 }
    - { x: 3, y: 5, type: lava, defense_mod: 0 }
    - { x: 3, y: 6, type: lava, defense_mod: 0 }
    - { x: 3, y: 7, type: lava, defense_mod: 0 }
    - { x: 4, y: 0, type: roccia, defense_mod: 2 }
    - { x: 4, y: 1, type: roccia, defense_mod: 2 }
    - { x: 4, y: 2, type: roccia, defense_mod: 2 }
    - { x: 4, y: 3, type: roccia, defense_mod: 2 }
    - { x: 4, y: 4, type: roccia, defense_mod: 2 }
    - { x: 4, y: 5, type: roccia, defense_mod: 2 }
    - { x: 4, y: 6, type: roccia, defense_mod: 2 }
    - { x: 4, y: 7, type: roccia, defense_mod: 2 }

waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points:
      - [7, 3]
      - [7, 4]
    units:
      - species: aurora_gull
        count: 1
        tier: base
        ai_profile: aggressive
      - species: rust-scavenger
        count: 2
        tier: base
        ai_profile: defensive

conditions: []
tags: [standard]

didactic_focus:
  - move_terrain_cost
  - volo_traversal
```

- [ ] **Step 2: Run schema validation**

Run: `node --test tests/scripts/encounterSchema.test.js`
Expected: PASS -- a new line `encounter enc_deserto_caldo_bocche_vulcaniche_01.yaml validates against schema`.

- [ ] **Step 3: Run the difficulty validator**

Run: `node tools/js/validate_encounter_difficulty.js`
Expected: `errors=0`. If the new row shows `delta > 2`, adjust `difficulty_rating` to the printed `computed` value (within 1) and re-run until `errors=0`. (The validator only errors on drift > 2 stars.)

- [ ] **Step 4: Commit**

```bash
git add docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml
git commit -F .commitmsg.tmp
```

---

## Task 2: Mixed volo-graded scenario module

**Files:**

- Create: `apps/backend/services/worldgen/desertoCaldoHazardScenario.js`
- Test: `tests/services/worldgen/desertoCaldoHazardScenario.test.js`

The roster is MIXED (master-dd verdict C): flyers + ground on both factions. Path B -- `volo_grade` and `traits:['adattamento_volo']` are set explicitly on flyers (so it is independent of the still-OPEN #3061 species->unit lift). Ground units carry `morphotype:'corazzato'` so the move-gate resolves them to the heavy profile (mirrors the proven `move-terrain-hazard-probe.js`).

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/worldgen/desertoCaldoHazardScenario.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUnits,
  TERRAIN,
  SCENARIO,
} = require('../../../apps/backend/services/worldgen/desertoCaldoHazardScenario');

test('SCENARIO carries the loadable encounter_id + 8x8 grid', () => {
  assert.equal(SCENARIO.encounter_id, 'enc_deserto_caldo_bocche_vulcaniche_01');
  assert.equal(SCENARIO.grid_size, 8);
});

test('TERRAIN is the full-height lava(x=3)+roccia(x=4) wall', () => {
  const lava = TERRAIN.filter((t) => t.type === 'lava');
  const roccia = TERRAIN.filter((t) => t.type === 'roccia');
  assert.equal(lava.length, 8);
  assert.equal(roccia.length, 8);
  assert.ok(lava.every((t) => t.x === 3));
  assert.ok(roccia.every((t) => t.x === 4));
});

test('flyers carry an explicit volo_grade + adattamento_volo; grades cover g1/g2/g3', () => {
  const units = buildUnits();
  const flyers = units.filter(
    (u) => Array.isArray(u.traits) && u.traits.includes('adattamento_volo'),
  );
  assert.equal(flyers.length, 3);
  for (const f of flyers) {
    assert.ok([1, 2, 3].includes(f.volo_grade), `bad grade ${f.volo_grade}`);
  }
  const grades = flyers.map((f) => f.volo_grade).sort();
  assert.deepEqual(grades, [1, 2, 3]);
});

test('roster is mixed on both factions (player + sistema each have a flyer and a ground unit)', () => {
  const units = buildUnits();
  for (const side of ['player', 'sistema']) {
    const sideUnits = units.filter((u) => u.controlled_by === side);
    const hasFlyer = sideUnits.some((u) => (u.traits || []).includes('adattamento_volo'));
    const hasGround = sideUnits.some((u) => !(u.traits || []).includes('adattamento_volo'));
    assert.ok(hasFlyer, `${side} has no flyer`);
    assert.ok(hasGround, `${side} has no ground unit`);
  }
});

test('ground units are heavy-profile (morphotype corazzato) and carry no volo_grade', () => {
  const units = buildUnits();
  const ground = units.filter((u) => !(u.traits || []).includes('adattamento_volo'));
  assert.ok(ground.length >= 3);
  for (const g of ground) {
    assert.equal(g.morphotype, 'corazzato');
    assert.equal(g.volo_grade, undefined);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/worldgen/desertoCaldoHazardScenario.test.js`
Expected: FAIL with "Cannot find module ... desertoCaldoHazardScenario".

- [ ] **Step 3: Write the scenario module**

```javascript
// apps/backend/services/worldgen/desertoCaldoHazardScenario.js
//
// Move terrain-cost substrate -- "Bocche Vulcaniche" hazard scenario (2026-06-29).
//
// A mixed, volo-graded roster that crosses a full-height lava(x=3)+roccia(x=4) wall on
// an 8x8 grid, so the substrate's g1/g2/g3 flight grades are EXERCISED in AI play. Path B:
// volo grade is set EXPLICITLY per unit (volo_grade + adattamento_volo) -- independent of
// the still-open per-species lift (#3061) and registry-free (normaliseUnit whitelists both).
// Ground units are heavy-profile (corazzato) so they pay the full wall (lava/roccia 2.0).
//
// Sized to RESOLVE (winnable, like move-terrain-hazard-probe.js) -- NOT the adapter-derived
// pilot rosters that deadlock. Pairs with the loadable encounter file of the same id
// (the file carries the terrain for the encounter_id path; this module carries the AI roster).
//
// NOT in the gated canonical-suite oracle manifest (mirrors badlands/foresta pilot scenarios).

'use strict';

const VOLO_TRAIT = 'adattamento_volo';

// Full-height lava(x=3)+roccia(x=4) wall on 8x8 -> no detour. Mirrors the encounter file
// docs/planning/encounters/enc_deserto_caldo_bocche_vulcaniche_01.yaml grid.terrain_features.
function buildTerrain() {
  const t = [];
  for (let y = 0; y < 8; y += 1) {
    t.push({ x: 3, y, type: 'lava' });
    t.push({ x: 4, y, type: 'roccia' });
  }
  return t;
}

const TERRAIN = buildTerrain();

const SCENARIO = {
  encounter_id: 'enc_deserto_caldo_bocche_vulcaniche_01',
  name: 'Bocche Vulcaniche -- Muro di Lava',
  biome_id: 'deserto_caldo',
  grid_size: 8,
  objective: { type: 'elimination' },
};

function _flyer(id, species, grade, controlled_by, position, initiative) {
  return {
    id,
    species,
    job: 'skirmisher',
    hp: 18,
    max_hp: 18,
    ap: 3,
    mod: 6,
    dc: 11,
    attack_range: 2,
    initiative,
    position,
    controlled_by,
    traits: [VOLO_TRAIT],
    volo_grade: grade,
    status: {},
  };
}

function _ground(id, species, controlled_by, position, initiative) {
  return {
    id,
    species,
    job: 'vanguard',
    morphotype: 'corazzato',
    hp: 20,
    max_hp: 20,
    ap: 3,
    mod: 6,
    dc: 12,
    attack_range: 1,
    initiative,
    position,
    controlled_by,
    traits: [],
    status: {},
  };
}

// Mixed both-sides roster. Players (left, x<3) close on the sistema (right, x>4); both
// factions field a flyer + a ground unit, so the flag-delta is carried by the ground
// units (flyers are grade-exempt) while the g1/g2/g3 spread is exercised across the wall.
function buildUnits() {
  return [
    // Player faction
    _flyer('p_noctule', 'noctule_termico', 3, 'player', { x: 0, y: 2 }, 16),
    _ground('p_corazza', 'corazza_deserto', 'player', { x: 0, y: 4 }, 14),
    // Sistema faction
    _flyer('e_echo', 'echo_wing', 1, 'sistema', { x: 7, y: 2 }, 13),
    _flyer('e_aurora', 'aurora_gull', 2, 'sistema', { x: 7, y: 3 }, 12),
    _ground('e_scavenger', 'rust-scavenger', 'sistema', { x: 7, y: 5 }, 10),
  ];
}

module.exports = { SCENARIO, TERRAIN, buildUnits, VOLO_TRAIT };
```

Note: the player faction has 1 flyer (g3) + 1 ground; the sistema faction has 2 flyers (g1, g2) + 1 ground. This satisfies "mixed both sides" (each side has a flyer and a ground unit) AND spreads g1/g2/g3 across the roster.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/worldgen/desertoCaldoHazardScenario.test.js`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/worldgen/desertoCaldoHazardScenario.js tests/services/worldgen/desertoCaldoHazardScenario.test.js
git commit -F .commitmsg.tmp
```

---

## Task 3: Deterministic cost-ladder test on the encounter's real terrain

**Files:**

- Create: `tests/services/combat/voloHazardEncounterCost.test.js`

Loads the actual encounter file (via `loadEncounter`), builds `terrainAt` from its `grid.terrain_features`, and asserts the cost to cross the wall is strictly decreasing g0>g1>g2>g3 for a heavy profile. This is the core proof that the substrate fires on THIS content. Deterministic, no flag, no sim.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/services/combat/voloHazardEncounterCost.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadEncounter,
  _resetCache,
} = require('../../../apps/backend/services/combat/encounterLoader');
const {
  moveCost,
  terrainAtFromFeatures,
} = require('../../../apps/backend/services/combat/moveCost');
const { getProfile } = require('../../../apps/backend/services/combat/movementProfiles');
const { applyVoloGrade } = require('../../../apps/backend/services/combat/movementResolver');

const ENC_ID = 'enc_deserto_caldo_bocche_vulcaniche_01';

function setup() {
  _resetCache();
  const enc = loadEncounter(ENC_ID);
  assert.ok(enc, `${ENC_ID} not loadable`);
  assert.ok(
    enc.grid && Array.isArray(enc.grid.terrain_features),
    'encounter has no grid.terrain_features',
  );
  const terrainAt = terrainAtFromFeatures(enc.grid.terrain_features);
  const bounds = { width: enc.grid.width, height: enc.grid.height };
  const heavy = getProfile('heavy');
  // Cross the wall on row y=4: enter (3,4)=lava, (4,4)=roccia, (5,4)=default.
  const cost = (g) =>
    moveCost(
      { x: 2, y: 4 },
      { x: 5, y: 4 },
      g > 0 ? applyVoloGrade(heavy, g) : heavy,
      terrainAt,
      bounds,
    );
  return { cost, terrainAt };
}

test('the encounter terrain is the lava(x=3)+roccia(x=4) wall', () => {
  const { terrainAt } = setup();
  assert.equal(terrainAt(3, 4), 'lava');
  assert.equal(terrainAt(4, 4), 'roccia');
  assert.equal(terrainAt(5, 4), null); // default
});

test('crossing cost is strictly decreasing g0 > g1 > g2 > g3 (heavy profile)', () => {
  const { cost } = setup();
  const c0 = cost(0);
  const c1 = cost(1);
  const c2 = cost(2);
  const c3 = cost(3);
  assert.ok(c0 > c1, `g0(${c0}) !> g1(${c1})`);
  assert.ok(c1 > c2, `g1(${c1}) !> g2(${c2})`);
  assert.ok(c2 > c3, `g2(${c2}) !> g3(${c3})`);
});

test('exact crossing costs match the profile math (lava 2.0 / roccia 2.0 / default 1.0)', () => {
  const { cost } = setup();
  assert.equal(cost(0), 5.0); // 2.0 + 2.0 + 1.0
  assert.equal(cost(1), 4.0); // 2.0 (hazard unchanged) + 1.0 (roccia freed) + 1.0
  assert.equal(cost(2), 3.5); // 1.5 (hazard halved) + 1.0 + 1.0
  assert.equal(cost(3), 3.0); // 1.0 (hazard freed) + 1.0 + 1.0
});
```

- [ ] **Step 2: Run test to verify it fails (or passes if Task 1 already landed)**

Run: `node --test tests/services/combat/voloHazardEncounterCost.test.js`
Expected: PASS once Task 1's encounter file exists. (If run before Task 1, FAIL: "not loadable".) Confirm green.

- [ ] **Step 3: Commit**

```bash
git add tests/services/combat/voloHazardEncounterCost.test.js
git commit -F .commitmsg.tmp
```

---

## Task 4: N=40 hazard band probe + evidence

**Files:**

- Create: `tools/sim/move-terrain-hazard-encounter-probe.js`
- Create: `docs/reports/2026-06-29-volo-hazard-encounter-band-evidence.md`

Paired-seed ON-vs-OFF over the Task-2 scenario roster + terrain, node 22, in-process. Reuses the scenario module so roster/terrain have ONE source.

- [ ] **Step 1: Write the probe**

```javascript
'use strict';
// Move terrain-cost substrate -- "Bocche Vulcaniche" hazard ENCOUNTER band probe.
//
// Paired-seed ON-vs-OFF over the mixed volo-graded roster (desertoCaldoHazardScenario),
// crossing a full-height lava+roccia wall on 8x8. Measures wr_delta + rounds_delta when
// the flag flips. In-process (supertest, NO prod), node 22. Terrain is inlined (the probe
// path mirrors move-terrain-hazard-probe.js); the loadable encounter file of the same id
// carries the same wall for the encounter_id runtime path.
//
// Usage: node tools/sim/move-terrain-hazard-encounter-probe.js [N] [enemyScale]

const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');
const {
  buildUnits,
  TERRAIN,
} = require('../../apps/backend/services/worldgen/desertoCaldoHazardScenario');

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

function supertestHttp(app) {
  return {
    post: (p, body) =>
      request(app)
        .post(p)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (p, query) =>
      request(app)
        .get(p)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

function split(scale) {
  const all = buildUnits().map((u) =>
    u.controlled_by === 'sistema'
      ? {
          ...u,
          hp: Math.round(u.hp * scale),
          max_hp: Math.round(u.max_hp * scale),
          mod: Math.round(u.mod * scale),
        }
      : u,
  );
  return {
    roster: all.filter((u) => u.controlled_by === 'player'),
    enemies: all.filter((u) => u.controlled_by === 'sistema'),
  };
}

async function runArm(flagOn, seed, scale) {
  if (flagOn) process.env.MOVE_TERRAIN_COST_ENABLED = 'true';
  else delete process.env.MOVE_TERRAIN_COST_ENABLED;
  const { app, close } = createApp({ databasePath: null });
  try {
    const http = supertestHttp(app);
    const { roster, enemies } = split(scale);
    const r = await runEncounter(http, {
      roster,
      enemies,
      seed,
      maxRounds: 30,
      terrainFeatures: TERRAIN,
      gridSize: 8,
    });
    return { outcome: r.outcome, rounds: r.rounds };
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

function summarize(arr) {
  const wins = arr.filter((r) => r.outcome === 'victory').length;
  const avgRounds = arr.reduce((s, r) => s + (r.rounds || 0), 0) / (arr.length || 1);
  return {
    wins,
    defeats: arr.filter((r) => r.outcome === 'defeat').length,
    timeouts: arr.filter((r) => r.outcome === 'timeout').length,
    win_rate: Number((wins / arr.length).toFixed(4)),
    avg_rounds: Number(avgRounds.toFixed(2)),
  };
}

async function main() {
  const N = Number(process.argv[2]) || 40;
  const scale = Number(process.argv[3]) || 1.0;
  const on = [];
  const off = [];
  for (let s = 1; s <= N; s += 1) {
    on.push(await runArm(true, s, scale));
    off.push(await runArm(false, s, scale));
    if (s % 10 === 0) process.stderr.write(`  ${s}/${N}\n`);
  }
  const sOn = summarize(on);
  const sOff = summarize(off);
  console.log(
    JSON.stringify(
      {
        N,
        enemyScale: scale,
        scenario: 'bocche-vulcaniche (lava x3 + roccia x4, mixed volo roster, 8x8)',
        flag_on: sOn,
        flag_off: sOff,
        wr_delta: Number((sOn.win_rate - sOff.win_rate).toFixed(4)),
        avg_rounds_delta: Number((sOn.avg_rounds - sOff.avg_rounds).toFixed(2)),
        node: process.version,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run the probe (node 22) and capture output**

Run: `node tools/sim/move-terrain-hazard-encounter-probe.js 40 1.0`
Expected: a JSON blob with `flag_on`/`flag_off`/`wr_delta`/`avg_rounds_delta`. Verify the encounter RESOLVES (wins+defeats dominate; not all `timeout`). If it is structurally a timeout (both factions stuck), tune enemy `hp`/positions in the scenario module until it resolves, re-run, and update the module's commit.

- [ ] **Step 3: Write the evidence report**

Create `docs/reports/2026-06-29-volo-hazard-encounter-band-evidence.md` with the frontmatter block below, then paste the probe JSON and a 3-4 line reading (does the flag shift WR / pace; is it band-neutral or a measured shift). Band ratify = master-dd (NOT decided in this PR).

```markdown
---
title: 'Volo hazard encounter -- N=40 band evidence (bocche vulcaniche)'
date: 2026-06-29
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-29'
source_of_truth: false
review_cycle_days: 90
tags: [combat, move-terrain, volo, hazard, n40, evidence]
---

# Volo hazard encounter -- N=40 band evidence

Probe: `tools/sim/move-terrain-hazard-encounter-probe.js` (paired-seed ON-vs-OFF, node 22,
in-process). Roster/terrain: `apps/backend/services/worldgen/desertoCaldoHazardScenario.js`
(mixed volo g1/g2/g3 + heavy ground, full lava+roccia wall 8x8).

## Result

<paste the probe JSON here>

## Reading

<3-4 lines: did the flag shift WR / pace? band-neutral or measured shift? caveat SDMG.>
Flip stays owner-gated; this is band evidence only.
```

- [ ] **Step 4: Commit**

```bash
git add tools/sim/move-terrain-hazard-encounter-probe.js docs/reports/2026-06-29-volo-hazard-encounter-band-evidence.md
git commit -F .commitmsg.tmp
```

---

## Task 5: Full-suite gates + docs governance

- [ ] **Step 1: Run the affected suites**

```bash
node --test tests/services/combat/encounterGridSchema.test.js tests/services/combat/voloHazardEncounterCost.test.js tests/services/worldgen/desertoCaldoHazardScenario.test.js tests/scripts/encounterSchema.test.js
node tools/js/validate_encounter_difficulty.js
```

Expected: all PASS; difficulty `errors=0`.

- [ ] **Step 2: Datasets sanity + format + governance**

```bash
python3 tools/py/game_cli.py validate-datasets
npm run format:check
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

Expected: validate-datasets OK; format clean (run `npm run format` if not, but the YAML is prettier-ignored under packs/ -- the encounter + report + js are not); governance strict pass (register the new spec/plan/report docs in `docs_registry.json` if the check flags them as unregistered).

- [ ] **Step 3: Final commit (governance registry, if touched)**

```bash
git add docs/governance/docs_registry.json
git commit -F .commitmsg.tmp
```

---

## Commit Convention (ADR-0011, every commit)

Write each message to a worktree-local `.commitmsg.tmp` via a bash heredoc (PowerShell adds a BOM; heredoc-to-/tmp breaks the `-F` path on Windows), then `git commit -F .commitmsg.tmp`. Generate a fresh Trace-Id per commit: `python -c "import uuid;print(uuid.uuid4())"`. Body MUST include `Coding-Agent:` + `Trace-Id:`; MUST NOT include `Co-Authored-By:`. Lowercase type prefix (`feat:`/`test:`/`chore:`). Example:

```bash
cat > .commitmsg.tmp <<'EOF'
feat(combat): add grid.terrain_features schema for loadable hazard terrain

Additive, backward-compatible. Existing encounters (no grid key) still validate.

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7-here>
EOF
git commit -F .commitmsg.tmp
```

---

## Guardrails

- `schemas/evo/encounter.schema.json` is a flagged guardrail path (schema:lint / contracts-adjacent). The change is additive + backward-compatible, but the PR must call it out for master-dd merge-gate.
- Flag `MOVE_TERRAIN_COST_ENABLED` stays OFF for the whole PR -- band-neutral. The flip is owner-gated and NOT part of this work.
- No new npm/pip deps. No edits to `migrations/`, `packages/contracts/`, `services/generation/`, `.github/workflows/`.

---

## Self-review (done)

- **Spec coverage:** schema ext (Task 0), loadable encounter (Task 1), mixed volo roster scenario (Task 2), deterministic g0>g1>g2>g3 proof (Task 3), N=40 probe + evidence (Task 4), gates (Task 5). All §3 architecture units mapped.
- **Placeholders:** none -- all code blocks are complete; the only empirical steps (difficulty drift adjust, probe resolve-tuning, evidence paste) have concrete fallback actions.
- **Type consistency:** `buildUnits`/`TERRAIN`/`SCENARIO`/`VOLO_TRAIT` exports match across Task 2, its test, and Task 4's probe. `loadEncounter`/`terrainAtFromFeatures`/`moveCost`/`getProfile`/`applyVoloGrade` signatures match the merged modules. `volo_grade` + `traits` are the normaliseUnit-preserved fields (verified).
