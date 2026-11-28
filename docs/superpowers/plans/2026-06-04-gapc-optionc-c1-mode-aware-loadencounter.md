---
title: 'GAP-C option-C C1 -- mode-aware loadEncounter (graph-mode draft delivery) implementation plan'
date: 2026-06-04
doc_status: draft
doc_owner: master-dd
workstream: worldgen
source_of_truth: false
language: en
review_cycle_days: 30
tags: [worldgen-gap-c, meta-network, encounters, combat, option-c, tdd]
---

# GAP-C option-C C1 -- mode-aware loadEncounter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make graph-routed combat load the REAL telegraphed encounter for all 6 meta-network nodes (today only 2/6 are real; 4 incl the terminal climax degrade to a fallback), WITHOUT changing the static `cave_path` encounters or its ratified bands.

**Architecture:** Mirror the threat resolver's union pattern in combat's `encounterLoader`. Keep one cache for the static path (`encounters/`-only, byte-identical behavior) and add a second cache for graph mode (`encounters/` UNION `encounters-draft/`, live dir wins on id collision). The session-start handler passes `graphMode` (from `req.body.graph_mode`) into `loadEncounter`. Flag `META_NETWORK_ROUTING` stays OFF in prod -> zero live impact; this only adds a capability the graph-routed call path opts into.

**Tech Stack:** Node.js, `node:test` + `node:assert`, supertest (api tests), js-yaml. Ratified by `docs/superpowers/specs/2026-06-03-worldgen-gapc-option-c-graph-combat-decouple-design.md` section 9 (mechanism C1).

**Scope:** This plan is Phase 1 (mechanism C1) only -- it produces working, testable software on its own (graph mode delivers real fights; static path unchanged). Phase 2 (retry-allowance + soft-ramp difficulty structure) and Phase 3 (graph-mode N=40 band-verify + calibrationScaling re-tune + #2589 re-ratify + static N=40 regression) are SEPARATE follow-on plans -- see "Follow-on" at the bottom. C1 is flag-gated so it is safe to land before the band-verify.

---

## File Structure

- `apps/backend/services/combat/encounterLoader.js` (MODIFY) -- add a second (graph) cache + `graphMode` opt to `loadEncounter`/`listEncounters`. Single responsibility: resolve an encounter YAML by id, mode-aware source dirs.
- `apps/backend/routes/session.js` (MODIFY, ~line 1843-1852) -- read `req.body.graph_mode` and pass `{ graphMode }` to `loadEncounter`. One-line behavior add at the existing call site.
- `tests/services/combat/encounterLoaderGraphMode.test.js` (CREATE) -- unit tests for the mode-aware loader.
- `tests/api/sessionEncounterWiringGraphMode.test.js` (CREATE) -- integration test for the session-start wiring (mirrors `tests/api/sessionEncounterWiring.test.js`).

---

## Task 1: Mode-aware encounterLoader

**Files:**

- Modify: `apps/backend/services/combat/encounterLoader.js`
- Test: `tests/services/combat/encounterLoaderGraphMode.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/services/combat/encounterLoaderGraphMode.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadEncounter,
  listEncounters,
  _resetCache,
} = require('../../../apps/backend/services/combat/encounterLoader');

test('static loadEncounter (no opts) stays encounters/-only', () => {
  _resetCache();
  assert.ok(loadEncounter('enc_savana_01'), 'live encounter loads in static mode');
  assert.equal(loadEncounter('enc_tutorial_03'), null, 'draft NOT loaded in static mode');
});

test('graphMode loadEncounter unions encounters-draft/', () => {
  _resetCache();
  const draft = loadEncounter('enc_tutorial_03', { graphMode: true });
  assert.ok(draft, 'draft encounter loads in graph mode');
  assert.equal(draft.encounter_id, 'enc_tutorial_03');
  assert.ok(loadEncounter('enc_savana_01', { graphMode: true }), 'live still loads in graph mode');
});

test('live dir wins on id collision (graph mode resolves the live copy)', () => {
  _resetCache();
  const g = loadEncounter('enc_savana_01', { graphMode: true });
  const s = loadEncounter('enc_savana_01');
  assert.equal(g.encounter_id, s.encounter_id);
});

test('listEncounters graphMode includes drafts; static does not', () => {
  _resetCache();
  assert.equal(listEncounters().includes('enc_tutorial_03'), false);
  assert.equal(listEncounters({ graphMode: true }).includes('enc_tutorial_03'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/combat/encounterLoaderGraphMode.test.js`
Expected: FAIL -- graph-mode test gets `null` for `enc_tutorial_03` (current loader is `encounters/`-only and ignores the opts arg).

- [ ] **Step 3: Write minimal implementation**

Replace the body of `apps/backend/services/combat/encounterLoader.js` (keep the header comment; update the API note) with:

```js
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ENCOUNTER_DIR = path.resolve(__dirname, '../../../../docs/planning/encounters');
const ENCOUNTER_DRAFT_DIR = path.resolve(__dirname, '../../../../docs/planning/encounters-draft');

// Two caches: static (encounters/ only -> byte-identical legacy behavior) and graph
// (encounters/ UNION encounters-draft/). Live dir is scanned first so it wins on an id
// collision (mirrors services/worldgen/encounterThreat.js). Graph mode is opt-in via
// loadEncounter(id, { graphMode: true }); static callers pass nothing -> unchanged.
let _cacheStatic = null;
let _cacheGraph = null;
let _idsStatic = null;
let _idsGraph = null;

function _loadDirs(dirs) {
  const cache = {};
  const ids = [];
  for (const dir of dirs) {
    let files;
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'));
    } catch (err) {
      console.warn('[encounterLoader] dir not found:', dir, err.message);
      continue;
    }
    for (const fname of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, fname), 'utf-8');
        const parsed = yaml.load(raw);
        // First dir wins on collision: skip an id already loaded from an earlier (live) dir.
        if (parsed && parsed.encounter_id && !(parsed.encounter_id in cache)) {
          cache[parsed.encounter_id] = parsed;
          ids.push(parsed.encounter_id);
        }
      } catch (err) {
        console.warn('[encounterLoader] parse failed:', fname, err.message);
      }
    }
  }
  return { cache, ids };
}

function _loadStatic() {
  if (!_cacheStatic) {
    const r = _loadDirs([ENCOUNTER_DIR]);
    _cacheStatic = r.cache;
    _idsStatic = r.ids;
  }
  return _cacheStatic;
}

function _loadGraph() {
  if (!_cacheGraph) {
    const r = _loadDirs([ENCOUNTER_DIR, ENCOUNTER_DRAFT_DIR]);
    _cacheGraph = r.cache;
    _idsGraph = r.ids;
  }
  return _cacheGraph;
}

function loadEncounter(encounterId, opts = {}) {
  if (!encounterId || typeof encounterId !== 'string') return null;
  const all = opts.graphMode ? _loadGraph() : _loadStatic();
  return all[encounterId] || null;
}

function listEncounters(opts = {}) {
  if (opts.graphMode) {
    _loadGraph();
    return _idsGraph ? [..._idsGraph] : [];
  }
  _loadStatic();
  return _idsStatic ? [..._idsStatic] : [];
}

function _resetCache() {
  _cacheStatic = null;
  _cacheGraph = null;
  _idsStatic = null;
  _idsGraph = null;
}

module.exports = { loadEncounter, listEncounters, _resetCache };
```

Also update the header API comment block: `loadEncounter(encounterId, opts?)  -> encounter object | null  (opts.graphMode unions encounters-draft/)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/combat/encounterLoaderGraphMode.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the existing combat suite to confirm no static regression**

Run: `node --test tests/services/combat/*.test.js tests/api/sessionEncounterWiring.test.js`
Expected: PASS (static loader behavior unchanged -- legacy callers pass no opts).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/services/combat/encounterLoader.js tests/services/combat/encounterLoaderGraphMode.test.js
git commit -m "feat(combat): mode-aware loadEncounter unions encounters-draft in graph mode (GAP-C option-C C1)"
```

---

## Task 2: Wire graph_mode at /session/start

**Files:**

- Modify: `apps/backend/routes/session.js` (the encounter-load block, ~line 1842-1852)
- Test: `tests/api/sessionEncounterWiringGraphMode.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api/sessionEncounterWiringGraphMode.test.js`:

```js
'use strict';

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createFlaggedApp, turnEnd, twoUnits } = require('./sessionTestHelpers');

// enc_tutorial_03 is a DRAFT node-encounter (docs/planning/encounters-draft/), elimination
// objective. Static loadEncounter ignores drafts -> no encounter payload -> objective no_objective.
// graph_mode:true unions the draft dir -> the encounter (with its objective) loads.

test('session/start graph_mode:true loads a draft node-encounter', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const res = await request(handle.app)
    .post('/api/session/start')
    .send({ units: twoUnits(), encounter_id: 'enc_tutorial_03', graph_mode: true })
    .expect(200);
  const endRes = await turnEnd(handle.app, res.body.session_id);

  assert.equal(endRes.status, 200);
  assert.notEqual(
    endRes.body.objective_state.reason,
    'no_objective',
    'draft encounter objective loaded in graph mode',
  );
});

test('session/start without graph_mode does NOT load a draft (static path unchanged)', async (t) => {
  const handle = createFlaggedApp('true');
  t.after(async () => {
    handle.restore();
    if (typeof handle.close === 'function') await handle.close().catch(() => {});
  });

  const res = await request(handle.app)
    .post('/api/session/start')
    .send({ units: twoUnits(), encounter_id: 'enc_tutorial_03' }) // no graph_mode
    .expect(200);
  const endRes = await turnEnd(handle.app, res.body.session_id);

  assert.equal(endRes.status, 200);
  assert.equal(
    endRes.body.objective_state.reason,
    'no_objective',
    'draft NOT loaded without graph_mode -> no encounter payload',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api/sessionEncounterWiringGraphMode.test.js`
Expected: FAIL -- the first test gets `objective_state.reason === 'no_objective'` because the call site still calls `loadEncounter(encounterIdFromBody)` with no graphMode, so the draft never loads.

- [ ] **Step 3: Write minimal implementation**

In `apps/backend/routes/session.js`, change the encounter-load block (currently ~line 1842-1852) from:

```js
let encounterPayload = req.body?.encounter ?? null;
const encounterIdFromBody = req.body?.encounter_id;
if (!encounterPayload && encounterIdFromBody) {
  try {
    const { loadEncounter } = require('../services/combat/encounterLoader');
    const loaded = loadEncounter(encounterIdFromBody);
    if (loaded) encounterPayload = loaded;
  } catch (err) {
    console.warn('[session/start] encounterLoader failed:', err.message);
  }
}
```

to:

```js
let encounterPayload = req.body?.encounter ?? null;
const encounterIdFromBody = req.body?.encounter_id;
// GAP-C option-C C1: a graph-routed session opts into the draft node-encounters
// (encounters-draft/) via body.graph_mode. Static/legacy callers omit it -> encounters/-only.
const graphMode = req.body?.graph_mode === true;
if (!encounterPayload && encounterIdFromBody) {
  try {
    const { loadEncounter } = require('../services/combat/encounterLoader');
    const loaded = loadEncounter(encounterIdFromBody, { graphMode });
    if (loaded) encounterPayload = loaded;
  } catch (err) {
    console.warn('[session/start] encounterLoader failed:', err.message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api/sessionEncounterWiringGraphMode.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the session-start regression suite**

Run: `node --test tests/api/sessionEncounterWiring.test.js tests/api/sessionEncounterWiringStep2.test.js`
Expected: PASS (the static path is unchanged -- omitting `graph_mode` keeps `loadEncounter(id, { graphMode: false })` == `encounters/`-only).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/routes/session.js tests/api/sessionEncounterWiringGraphMode.test.js
git commit -m "feat(session): pass graph_mode to loadEncounter so graph routes deliver real fights (GAP-C option-C C1)"
```

---

## Task 3: Full-suite gate + DoD evidence

**Files:** none (verification only)

- [ ] **Step 1: Run the AI/session baseline (must stay >= 382, target 500)**

Run: `node --test tests/ai/*.test.js`
Expected: PASS, count unchanged from baseline.

- [ ] **Step 2: Run format check**

Run: `npm run format:check`
Expected: PASS (or run `npm run format` then re-check).

- [ ] **Step 3: Capture the 6/6 real-fight evidence (Gate-5)**

Run a flag-on smoke (the worktree already proved the routing): boot `META_NETWORK_ROUTING=true ... node apps/backend/index.js` on a spare PORT, then for each draft node-encounter id (`enc_tutorial_03`, `enc_tutorial_04`, `enc_tutorial_05`, `enc_tutorial_06_hardcore`, `enc_tutorial_07_hardcore_pod_rush`) `POST /api/session/start { units, encounter_id, graph_mode: true }` and assert the response/`turn/end` carries the encounter's objective (not `no_objective`). Record the 5/5 result in `docs/playtest/2026-06-04-gapc-optionc-c1-real-fight-smoke.md`.
Expected: all 5 drafts load a real encounter in graph mode; 0 in static mode.

- [ ] **Step 4: Commit the evidence**

```bash
git add docs/playtest/2026-06-04-gapc-optionc-c1-real-fight-smoke.md
git commit -m "docs(playtest): GAP-C option-C C1 real-fight smoke (5/5 drafts load in graph mode)"
```

---

## Follow-on (NOT in this plan -- separate plans, owner-gated cadence)

- **Phase 2 -- difficulty structure (retry-allowance + soft-ramp).** Ratified (spec section 9.1). Retry-allowance = graph mode permits re-attempt/reroute on a lost node (a meta-loop run-structure rule; the campaign `/advance` defeat path today does "retry same" -- extend for graph reroute). Soft-ramp = mostly already in the data via `prior_node_cleared` edge gates. Needs its own plan + tests; meta-loop surface.
- **Phase 3 -- band-verify (mandatory before any flip-with-real-fights).** Graph-mode N=40 via `tools/sim/meta-network-driver.js` + `batch-ai-runner` + `meta-band-aggregator`; re-tune `calibrationScaling` graph-mode knobs (sim-only, reversible via `FL_ENEMY_*`); re-ratify the #2589 wider graph-mode band (master-dd decision-handoff); static `cave_path` N=40 unchanged regression. Capture in a playtest report. THE FLIP stays gated on this + master-dd go.

## Wiring note (cross-repo, small)

The Godot route-choice consumer (#401 single-player, #404 co-op) must pass `graph_mode: true` in its `/session/start` request when starting a fight reached via a meta-network route. This is the client counterpart of Task 2 (mirrors how #2597's coop follow-up wired the vote consumer). Track in Game-Godot-v2.
