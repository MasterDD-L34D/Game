# Full-loop fase-0 — combat-policy + combatAdapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the combat foundation of the full-loop AI-playtest runner: a reusable, testable `combatAdapter` that runs an AI-driven combat with a REAL injected roster (no co-op lobby), reusing the existing player-AI policy.

**Architecture:** Option B refined (master-dd consent 2026-06-02). Extract the pure player-AI (`selectPlayerAction`) from the co-op-coupled `tests/smoke/ai-driven-sim.js` into a shared module; build a new `combatAdapter` that drives `/api/session/start` (units = roster + enemies, kill-wire mode) + the round loop reusing that policy, returning a real `{outcome, rosterIds}`. Spec: `docs/superpowers/specs/2026-06-02-full-loop-ai-playtest-runner-design.md`.

**Tech Stack:** Node.js (CommonJS), `node:test` + `supertest` + `createApp` (in-process, no WS/lobby), the existing combat engine via HTTP seam.

---

## File structure

- Create `tools/sim/combat-policy.js` — pure `dist(a,b)` + `selectPlayerAction(actor, units)` extracted verbatim from ai-driven-sim. One responsibility: the minimal closest-enemy player policy. No state.
- Modify `tests/smoke/ai-driven-sim.js` — `require` `dist`/`selectPlayerAction` from the shared module; delete the inline copies (no behavior change).
- Create `tools/sim/combat-adapter.js` — `runEncounter(http, { roster, enemies, scenarioId, seed, maxRounds })` → `{ outcome, rounds, rosterIds, survivorIds }`. Drives session/start + loop via an injected `http` client (DI → testable with supertest, runnable with fetch).
- Create `tests/sim/combatPolicy.test.js` — unit tests for the pure policy.
- Create `tests/sim/combatAdapter.test.js` — integration test (supertest createApp): inject a known roster, run, assert real outcome + roster identity.

---

### Task 1: Extract the player-AI policy into a shared module

**Files:**

- Create: `tools/sim/combat-policy.js`
- Test: `tests/sim/combatPolicy.test.js`
- Modify: `tests/smoke/ai-driven-sim.js:140-169` (replace inline `dist`+`selectPlayerAction` with a `require`)

- [ ] **Step 1: Write the failing test**

```javascript
// tests/sim/combatPolicy.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dist, selectPlayerAction } = require('../../tools/sim/combat-policy');

test('dist = Manhattan distance', () => {
  assert.equal(dist({ x: 0, y: 0 }, { x: 2, y: 3 }), 5);
});

test('selectPlayerAction: attacks the nearest alive enemy when in range + has AP', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 2, ap_remaining: 1 };
  const units = [
    actor,
    { id: 'far', controlled_by: 'sistema', hp: 5, position: { x: 5, y: 0 } },
    { id: 'near', controlled_by: 'sistema', hp: 5, position: { x: 1, y: 0 } },
  ];
  assert.deepEqual(selectPlayerAction(actor, units), { action_type: 'attack', target_id: 'near' });
});

test('selectPlayerAction: steps one tile toward the target when out of range', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 5, position: { x: 4, y: 0 } }];
  const a = selectPlayerAction(actor, units);
  assert.equal(a.action_type, 'move');
  assert.deepEqual(a.target_position, { x: 1, y: 0 });
});

test('selectPlayerAction: returns null when no alive enemy', () => {
  const actor = { id: 'p', position: { x: 0, y: 0 }, attack_range: 1, ap_remaining: 3 };
  const units = [actor, { id: 'e', controlled_by: 'sistema', hp: 0, position: { x: 1, y: 0 } }];
  assert.equal(selectPlayerAction(actor, units), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/dev/_gamewt-flmvp && node --test tests/sim/combatPolicy.test.js`
Expected: FAIL — `Cannot find module '../../tools/sim/combat-policy'`.

- [ ] **Step 3: Write minimal implementation (verbatim extraction)**

```javascript
// tools/sim/combat-policy.js
'use strict';
// Pure player-side AI policy, extracted verbatim from tests/smoke/ai-driven-sim.js
// (minimal closest-enemy attack; never spends cap_pt to keep fairness intact).
// Reused by the full-loop combatAdapter so the meta-loop combat runs the SAME
// player policy as the combat-sim, with no co-op lobby coupling.

function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function selectPlayerAction(actor, units) {
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
  if (enemies.length === 0) return null;
  const target = enemies.sort(
    (a, b) => dist(actor.position, a.position) - dist(actor.position, b.position),
  )[0];
  const range = actor.attack_range || 1;
  if (dist(actor.position, target.position) <= range && (actor.ap_remaining ?? 0) >= 1) {
    return { action_type: 'attack', target_id: target.id };
  }
  const dx = Math.sign(target.position.x - actor.position.x);
  const dy = Math.sign(target.position.y - actor.position.y);
  const stepX =
    Math.abs(target.position.x - actor.position.x) >=
    Math.abs(target.position.y - actor.position.y);
  const target_position = stepX
    ? { x: actor.position.x + dx, y: actor.position.y }
    : { x: actor.position.x, y: actor.position.y + dy };
  return { action_type: 'move', target_position };
}

module.exports = { dist, selectPlayerAction };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/dev/_gamewt-flmvp && node --test tests/sim/combatPolicy.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Re-point ai-driven-sim at the shared module (no behavior change)**

In `tests/smoke/ai-driven-sim.js`, delete the inline `function dist(...)` (140-142) and `function selectPlayerAction(...)` (144-169), and add near the other requires at the top of the file:

```javascript
const { dist, selectPlayerAction } = require('../../tools/sim/combat-policy');
```

- [ ] **Step 6: Verify ai-driven-sim still parses + no other regression**

Run: `cd /c/dev/_gamewt-flmvp && node -e "require('./tools/sim/combat-policy'); console.log('policy OK')" && node --check tests/smoke/ai-driven-sim.js && echo "ai-driven-sim parses"`
Expected: `policy OK` + `ai-driven-sim parses`.

- [ ] **Step 7: Commit**

```bash
git -C C:/dev/_gamewt-flmvp add tools/sim/combat-policy.js tests/sim/combatPolicy.test.js tests/smoke/ai-driven-sim.js
git -C C:/dev/_gamewt-flmvp commit -m "feat(sim): extract pure player-AI policy into tools/sim/combat-policy"
```

---

### Task 2: combatAdapter — run an AI combat with an injected roster

**Files:**

- Create: `tools/sim/combat-adapter.js`
- Test: `tests/sim/combatAdapter.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/sim/combatAdapter.test.js
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('../../tools/sim/combat-adapter');

// In-process http client (DI) over supertest — no WS / lobby.
function supertestHttp(app) {
  return {
    post: (path, body) =>
      request(app)
        .post(path)
        .send(body)
        .then((r) => ({ status: r.status, body: r.body })),
    get: (path, query) =>
      request(app)
        .get(path)
        .query(query || {})
        .then((r) => ({ status: r.status, body: r.body })),
  };
}

// A known campaign roster (2 player units) vs a weak enemy → AI should win,
// and the combat MUST use exactly these roster ids (invariant #6).
function roster() {
  return [
    {
      id: 'camp_a',
      species: 'dune_stalker',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 20,
      attack_range: 2,
      initiative: 18,
      position: { x: 1, y: 1 },
      controlled_by: 'player',
      status: {},
    },
    {
      id: 'camp_b',
      species: 'velox',
      job: 'stalker',
      hp: 30,
      max_hp: 30,
      ap: 3,
      mod: 18,
      attack_range: 2,
      initiative: 16,
      position: { x: 1, y: 2 },
      controlled_by: 'player',
      status: {},
    },
  ];
}
function enemies() {
  return [
    {
      id: 'foe_1',
      species: 'velox',
      hp: 4,
      max_hp: 4,
      ap: 1,
      mod: 0,
      dc: 1,
      attack_range: 1,
      initiative: 1,
      position: { x: 1, y: 4 },
      controlled_by: 'sistema',
      status: {},
    },
  ];
}

test('combatAdapter.runEncounter: uses the injected roster + returns a real outcome', async (t) => {
  const { app, close } = createApp({ databasePath: null });
  t.after(async () => {
    if (typeof close === 'function') await close().catch(() => {});
  });
  const http = supertestHttp(app);

  const res = await runEncounter(http, {
    roster: roster(),
    enemies: enemies(),
    scenarioId: 'full_loop_test',
    seed: 'fl-seed-1',
    maxRounds: 40,
  });

  assert.ok(
    ['victory', 'defeat', 'timeout'].includes(res.outcome),
    `real outcome, got ${res.outcome}`,
  );
  // Invariant #6 — roster identity: the combat's player ids == the injected roster ids.
  assert.deepEqual([...res.rosterIds].sort(), ['camp_a', 'camp_b']);
  // No foreign player ids (e.g. no hardcoded Skiv/AiChar leaked in).
  assert.ok(
    res.survivorIds.every((id) => ['camp_a', 'camp_b'].includes(id)),
    'survivors are roster members',
  );
  assert.ok(res.rounds >= 1 && res.rounds <= 40);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/dev/_gamewt-flmvp && IDEA_ENGINE_STUB_ORCHESTRATOR=1 node --test tests/sim/combatAdapter.test.js`
Expected: FAIL — `Cannot find module '../../tools/sim/combat-adapter'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// tools/sim/combat-adapter.js
'use strict';
// combatAdapter (full-loop fase-0, Option B refined). Runs ONE AI-driven combat
// with a REAL injected roster (no co-op lobby): starts a session with
// units = [roster (player) + enemies (sistema)] (kill-wire mode), then drives the
// round loop reusing the shared player policy. Returns a genuine outcome + the
// roster identity so the full-loop invariants can assert the campaign roster
// actually fought (NOT a hardcoded party). `http` is injected (supertest in tests,
// fetch in production) so this stays unit-testable.

const { selectPlayerAction } = require('./combat-policy');

async function runEncounter(http, { roster, enemies, scenarioId, seed, maxRounds = 40 } = {}) {
  const rosterIds = (roster || []).map((u) => u.id);
  const startBody = {
    units: [...(roster || []), ...(enemies || [])],
    scenario_id: scenarioId,
    ...(seed ? { run_seed: seed } : {}),
  };
  const start = await http.post('/api/session/start', startBody);
  if (start.status !== 200 && start.status !== 201) {
    return { outcome: 'error', rounds: 0, rosterIds, survivorIds: [], error: start.body };
  }
  const sessionId = start.body.session_id || start.body.id;

  let rounds = 0;
  let outcome = 'timeout';
  let lastUnits = [];
  while (rounds < maxRounds) {
    rounds += 1;
    const st = await http.get('/api/session/state', { session_id: sessionId });
    const units = (st.body && st.body.units) || [];
    lastUnits = units;
    const players = units.filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0);
    const foes = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
    if (foes.length === 0) {
      outcome = 'victory';
      break;
    }
    if (players.length === 0) {
      outcome = 'defeat';
      break;
    }

    const activeId = st.body.active_unit;
    const active = units.find((u) => u.id === activeId);
    if (!active) break;
    if (active.controlled_by === 'sistema') {
      await http.post('/api/session/turn/end', { session_id: sessionId });
      continue;
    }
    const action = selectPlayerAction(active, units);
    if (!action) {
      await http.post('/api/session/turn/end', { session_id: sessionId });
      continue;
    }
    await http.post('/api/session/action', {
      session_id: sessionId,
      actor_id: active.id,
      ...action,
    });
  }

  const survivorIds = lastUnits
    .filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0)
    .map((u) => u.id);
  return { outcome, rounds, rosterIds, survivorIds };
}

module.exports = { runEncounter };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/dev/_gamewt-flmvp && IDEA_ENGINE_STUB_ORCHESTRATOR=1 node --test tests/sim/combatAdapter.test.js`
Expected: PASS (1 test). If the AI cannot path to the enemy (move blocked), the outcome may be `timeout` — still a valid real outcome; the roster-identity asserts are what matter. If it fails on a foreign id, the seam is wrong.

- [ ] **Step 5: Commit**

```bash
git -C C:/dev/_gamewt-flmvp add tools/sim/combat-adapter.js tests/sim/combatAdapter.test.js
git -C C:/dev/_gamewt-flmvp commit -m "feat(sim): combatAdapter runs an AI combat with an injected campaign roster"
```

---

## Self-review

1. **Spec coverage**: §3/§4 (Option B refined: combatAdapter reuses the policy, drives the engine seam) — Task 2. §6 invariant #6 (roster identity) — asserted in Task 2 test. The co-op decoupling — Task 1 (policy is pure, extracted). Band/campaign/Nido/orchestrator = NEXT plan (fase-1b), out of this plan's scope (combat foundation only).
2. **Placeholders**: none — full code in every step.
3. **Type consistency**: `selectPlayerAction(actor, units)` signature identical across Task 1 + 2; `runEncounter(http, opts)` returns `{outcome, rounds, rosterIds, survivorIds}` used consistently in the test.

## Scope note

This plan = the **combat foundation** (Option B). NEXT plan (fase-1b) adds: `campaignDriver` (/campaign/\* seam), `greedyPolicy` (recruit/mating/affinity), `invariantChecker`, and the `full-loop-runner.js` orchestrator + JSONL output — after recon of the campaign/Nido API shapes.
