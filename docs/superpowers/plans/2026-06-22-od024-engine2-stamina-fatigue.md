# OD-024 engine #2 — stamina/fatica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `propriocezione` "fatica sprint" subsystem — a unit that over-commits a round to movement tires; fatigue costs −1 AP next round; `propriocezione` bearers tire later. Flag-gated OFF (band-neutral).

**Architecture:** One pure module (`staminaFatigue.js`) + a persisted `unit.fatica` integer (flag-gated) + a transient per-round `_tiles_voluntary_round` accumulator, wired at three verified integration points: move-tally (session.js move handlers), accrue/decay (`applyEndOfRoundSideEffects`), penalty (`applyApRefill`). All behind `STAMINA_FATIGUE_ENABLED`.

**Tech Stack:** Node (CommonJS), `node --test`, repo runner `scripts/run-test-api.cjs`. Python launcher `C:/Users/edusc/AppData/Local/Programs/Python/Python312/python.exe`. Worktree `C:/dev/_gamewt-noci`, branch `od024-stamina-fatigue` (off main; spec committed `c6c73bb9`; draft PR #2937).

Spec (SoT): `docs/superpowers/specs/2026-06-22-od024-engine2-stamina-fatigue-design.md`.

**Commit trailer (every commit, ADR-0011):**

```
Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>
```

Generate the uuidv7 with:

```bash
node -e 'const c=require("crypto");const ts=Date.now();const b=c.randomBytes(16);b.writeUIntBE(Math.floor(ts/0x100000000),0,2);b.writeUIntBE(ts%0x100000000,2,4);b[6]=(b[6]&0x0f)|0x70;b[8]=(b[8]&0x3f)|0x80;const h=b.toString("hex");console.log(`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`)'
```

NO `Co-Authored-By`. Lowercase subject prefix, subject ≤72 chars.

## File structure

- **Create** `apps/backend/services/combat/staminaFatigue.js` — pure fatigue logic (constants + 6 functions). Single responsibility: the fatigue model. No IO.
- **Create** `tests/services/staminaFatigue.test.js` — unit tests for the module.
- **Modify** `apps/backend/routes/sessionHelpers.js` — `normaliseUnit` (flag-gated `fatica` field, ~before its `return unit;`) + `applyApRefill` (penalty, before `unit.ap_remaining = cap;` at `:853`).
- **Modify** `apps/backend/routes/session.js` — move-tally at the two move-charge sites (`:2603` per-action, `:3059` round-path).
- **Modify** `apps/backend/routes/sessionRoundBridge.js` — accrue/decay loop in `applyEndOfRoundSideEffects` (before its return, after the bleeding loop).
- **Modify** `tests/api/sessionHelpers.nido.test.js` OR a new `tests/api/staminaFatigueRefill.test.js` — penalty + normaliseUnit integration.

`publicSessionView` needs **NO change**: `fatica` is only ever written when the flag is ON (normaliseUnit + accrueOrDecay both guard on the flag), so the `...u` spread emits it only when ON.

---

### Task 1: Pure `staminaFatigue` module + unit tests

**Files:**

- Create: `apps/backend/services/combat/staminaFatigue.js`
- Test: `tests/services/staminaFatigue.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/services/staminaFatigue.test.js`:

```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sf = require('../../apps/backend/services/combat/staminaFatigue');

const FLAG_ON = { STAMINA_FATIGUE_ENABLED: 'true' };
const FLAG_OFF = {};

test('isFatigueEnabled: only "true" enables', () => {
  assert.equal(sf.isFatigueEnabled(FLAG_ON), true);
  assert.equal(sf.isFatigueEnabled(FLAG_OFF), false);
  assert.equal(sf.isFatigueEnabled({ STAMINA_FATIGUE_ENABLED: '1' }), false);
});

test('isSprintRound: all AP on movement + >=2 tiles', () => {
  assert.equal(sf.isSprintRound({ ap: 2, ap_remaining: 0, _tiles_voluntary_round: 2 }), true);
  // partial move (AP left) -> not a sprint
  assert.equal(sf.isSprintRound({ ap: 2, ap_remaining: 1, _tiles_voluntary_round: 1 }), false);
  // 0 AP but <2 tiles (e.g. AP spent elsewhere) -> not a sprint
  assert.equal(sf.isSprintRound({ ap: 2, ap_remaining: 0, _tiles_voluntary_round: 1 }), false);
});

test('accrueOrDecay: sprint -> +1, resets tally', () => {
  const u = { fatica: 0, ap_remaining: 0, ap: 2, _tiles_voluntary_round: 2 };
  sf.accrueOrDecay(u);
  assert.equal(u.fatica, 1);
  assert.equal(u._tiles_voluntary_round, 0);
});

test('accrueOrDecay: non-sprint -> decay -1, floor 0', () => {
  const u = { fatica: 1, ap_remaining: 2, ap: 2, _tiles_voluntary_round: 0 };
  sf.accrueOrDecay(u);
  assert.equal(u.fatica, 0);
  const u0 = { fatica: 0, ap_remaining: 2, ap: 2 };
  sf.accrueOrDecay(u0);
  assert.equal(u0.fatica, 0); // never negative
});

test('penaltyThreshold: 1 default, 2 with propriocezione', () => {
  assert.equal(sf.penaltyThreshold({ traits: [] }), 1);
  assert.equal(sf.penaltyThreshold({ traits: ['propriocezione'] }), 2);
});

test('fatiguePenalty: fires at threshold, propriocezione tolerates 1 sprint', () => {
  assert.equal(sf.fatiguePenalty({ fatica: 1, traits: [] }), 1);
  assert.equal(sf.fatiguePenalty({ fatica: 0, traits: [] }), 0);
  // propriocezione: fatica 1 < threshold 2 -> no penalty; fatica 2 -> penalty
  assert.equal(sf.fatiguePenalty({ fatica: 1, traits: ['propriocezione'] }), 0);
  assert.equal(sf.fatiguePenalty({ fatica: 2, traits: ['propriocezione'] }), 1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/services/staminaFatigue.test.js`
Expected: FAIL — `Cannot find module '.../staminaFatigue'`.

- [ ] **Step 3: Write the module**

Create `apps/backend/services/combat/staminaFatigue.js`:

```javascript
'use strict';

// OD-024 engine #2 (D6) -- stamina/fatica sprint subsystem. Pure module.
// Spec: docs/superpowers/specs/2026-06-22-od024-engine2-stamina-fatigue-design.md
//
// A unit that over-commits a round to movement ("sprint" = ended the round with all
// AP spent on >=2 voluntary tiles) accrues 1 fatica; at/over a per-unit threshold the
// unit loses 1 AP next round; fatica decays 1 per non-sprint round. `propriocezione`
// bearers get +1 tolerance (penalised one sprint later -- hardier, NOT immune).
//
// Flag-gated OFF (STAMINA_FATIGUE_ENABLED): callers guard on isFatigueEnabled, so with
// the flag OFF nothing accrues, no penalty applies, and `unit.fatica` is never written
// -> band-neutral incl. serialization (the publicSessionView spread emits it only when
// the field exists). The four numeric knobs are RATIFIED-PROVISIONAL (master-dd ratifies
// on PR); YAML-promotion path noted in spec sez.8.

const FLAG = 'STAMINA_FATIGUE_ENABLED';
const SPRINT_MIN_TILES = 2; // with ap_remaining==0 -> "all-AP-on-move" sprint
const FATIGUE_PENALTY_THRESHOLD = 1; // fatica >= threshold -> -1 AP next round
const PROPRIOCEZIONE_TOLERANCE = 1; // propriocezione: threshold +1 (hardier, not immune)
const FATIGUE_DECAY = 1; // -1 fatica per non-sprint round
const AP_PENALTY = 1; // -1 AP next round when over threshold

function isFatigueEnabled(env = process.env) {
  return Boolean(env) && env[FLAG] === 'true';
}

function hasPropriocezione(unit) {
  return Array.isArray(unit && unit.traits) && unit.traits.includes('propriocezione');
}

// Sprint = ended the round having spent ALL AP on movement, >=2 voluntary tiles.
function isSprintRound(unit) {
  if (!unit) return false;
  const apRemaining = Number(unit.ap_remaining ?? unit.ap ?? 0);
  const tiles = Number(unit._tiles_voluntary_round || 0);
  return apRemaining === 0 && tiles >= SPRINT_MIN_TILES;
}

// Round-boundary update: +1 on a sprint round, else decay; always reset the per-round
// voluntary-tile accumulator. Clamps fatica >= 0.
function accrueOrDecay(unit) {
  if (!unit) return;
  const current = Number(unit.fatica || 0);
  const next = isSprintRound(unit) ? current + 1 : Math.max(0, current - FATIGUE_DECAY);
  unit.fatica = Math.max(0, next);
  unit._tiles_voluntary_round = 0;
}

function penaltyThreshold(unit) {
  return FATIGUE_PENALTY_THRESHOLD + (hasPropriocezione(unit) ? PROPRIOCEZIONE_TOLERANCE : 0);
}

function fatiguePenalty(unit) {
  if (!unit) return 0;
  return Number(unit.fatica || 0) >= penaltyThreshold(unit) ? AP_PENALTY : 0;
}

module.exports = {
  FLAG,
  SPRINT_MIN_TILES,
  FATIGUE_PENALTY_THRESHOLD,
  PROPRIOCEZIONE_TOLERANCE,
  FATIGUE_DECAY,
  AP_PENALTY,
  isFatigueEnabled,
  hasPropriocezione,
  isSprintRound,
  accrueOrDecay,
  penaltyThreshold,
  fatiguePenalty,
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/services/staminaFatigue.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/combat/staminaFatigue.js tests/services/staminaFatigue.test.js
git commit -m "$(cat <<'EOF'
feat(combat): staminaFatigue pure module (OD-024 engine #2)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>
EOF
)"
```

---

### Task 2: Penalty injection in `applyApRefill` + normaliseUnit field

**Files:**

- Modify: `apps/backend/routes/sessionHelpers.js` (`applyApRefill` ~`:853`; `normaliseUnit` before its `return unit;`)
- Test: `tests/api/staminaFatigueRefill.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/api/staminaFatigueRefill.test.js`:

```javascript
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { applyApRefill, normaliseUnit } = require('../../apps/backend/routes/sessionHelpers');

const FLAG = 'STAMINA_FATIGUE_ENABLED';
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

test('applyApRefill: fatigued unit (flag ON) refills to max(1, cap-1)', () => {
  withFlag('true', () => {
    const unit = { ap: 2, fatica: 1, traits: [], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 1); // 2 - 1
  });
});

test('applyApRefill: fatigue penalty floors at 1, never 0', () => {
  withFlag('true', () => {
    const unit = { ap: 1, fatica: 5, traits: [], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 1); // max(1, 1-1) = 1, never a full turn loss
  });
});

test('applyApRefill: propriocezione tolerates fatica 1 (no penalty)', () => {
  withFlag('true', () => {
    const unit = { ap: 2, fatica: 1, traits: ['propriocezione'], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 2); // threshold 2 not reached
  });
});

test('applyApRefill: flag OFF -> no fatigue penalty (byte-identical refill)', () => {
  withFlag(undefined, () => {
    const unit = { ap: 2, fatica: 5, traits: [], status: {} };
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 2);
  });
});

test('normaliseUnit: fatica present (0) when flag ON, absent when OFF', () => {
  const onUnit = withFlag('true', () => normaliseUnit({ id: 'x', traits: [] }, 0));
  assert.equal(onUnit.fatica, 0);
  const offUnit = withFlag(undefined, () => normaliseUnit({ id: 'y', traits: [] }, 0));
  assert.equal('fatica' in offUnit, false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/api/staminaFatigueRefill.test.js`
Expected: FAIL (penalty not applied; `fatica` absent when ON).

- [ ] **Step 3: Add the penalty to `applyApRefill`**

In `apps/backend/routes/sessionHelpers.js`, inside `applyApRefill`, immediately BEFORE the final `unit.ap_remaining = cap;` (currently `:853`), insert:

```javascript
// OD-024 engine #2: fatigue -1 AP at refill when over the per-unit threshold
// (flag-gated; floor 1 so fatigue never costs a whole turn -- death-spiral guard).
// Lazy require mirrors the wound read-apply block above. Flag OFF (default) = no-op.
try {
  const stamina = require('../services/combat/staminaFatigue');
  if (stamina.isFatigueEnabled()) {
    const apPenalty = stamina.fatiguePenalty(unit);
    if (apPenalty > 0) cap = Math.max(1, cap - apPenalty);
  }
} catch {
  /* stamina optional; never block the refill */
}
```

- [ ] **Step 4: Add the flag-gated `fatica` field to `normaliseUnit`**

In `apps/backend/routes/sessionHelpers.js`, in `normaliseUnit`, immediately BEFORE `return unit;` (find the line that returns the constructed `unit` object), insert:

```javascript
// OD-024 engine #2: persist `fatica` ONLY when the stamina flag is ON, so flag-OFF
// keeps the unit shape (and the publicSessionView `...u` spread) byte-identical. The
// `_tiles_voluntary_round` accumulator is transient (round-scoped, never persisted).
try {
  if (require('../services/combat/staminaFatigue').isFatigueEnabled()) {
    unit.fatica = Number.isFinite(Number(input.fatica))
      ? Math.max(0, Math.trunc(Number(input.fatica)))
      : 0;
  }
} catch {
  /* stamina optional */
}
```

(Note: `normaliseUnit` may post-process `unit` after the literal; place this just before whatever `return` hands the unit back. If the function returns the literal directly, assign to a `const unit = {...}` first — it already does, see `:80`.)

- [ ] **Step 5: Run to verify it passes**

Run: `node --test tests/api/staminaFatigueRefill.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/routes/sessionHelpers.js tests/api/staminaFatigueRefill.test.js
git commit -m "$(cat <<'EOF'
feat(combat): fatigue -1 AP penalty + flag-gated fatica field (OD-024 #2)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>
EOF
)"
```

---

### Task 3: Voluntary-move tally (both flows)

**Files:**

- Modify: `apps/backend/routes/session.js` (`:2603` per-action move; `:3059` round-path move)
- Test: `tests/services/staminaFatigue.test.js` (extend — accumulator semantics already covered by isSprintRound; add a sum test)

- [ ] **Step 1: Add a failing accumulator-sum assertion**

Append to `tests/services/staminaFatigue.test.js`:

```javascript
test('isSprintRound: split moves accumulate (1+1 tiles, 0 AP) -> sprint', () => {
  // session.js increments _tiles_voluntary_round by `dist` per move; two 1-tile moves
  // that drain AP must register as a sprint.
  const u = { ap: 2, ap_remaining: 0, _tiles_voluntary_round: 1 + 1 };
  assert.equal(sf.isSprintRound(u), true);
});
```

- [ ] **Step 2: Run to verify it passes already (sanity)**

Run: `node --test tests/services/staminaFatigue.test.js`
Expected: PASS — this asserts the module contract the wiring must feed. (It passes now; the wiring in Step 3 makes the contract real in the live flow.)

- [ ] **Step 3: Wire the per-action move tally**

In `apps/backend/routes/session.js`, immediately AFTER `actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - apCost);` (currently `:2603`), insert:

```javascript
// OD-024 engine #2: tally voluntary movement tiles this round (sprint detect).
// Only actor-issued `move` actions reach here -> forced displacement excluded.
actor._tiles_voluntary_round = Number(actor._tiles_voluntary_round || 0) + dist;
```

(`dist` is in scope from `:2577` `const dist = manhattanDistance(actor.position, dest);`.)

- [ ] **Step 4: Wire the round-path move tally**

In `apps/backend/routes/session.js`, in the round-path move branch, immediately AFTER `actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - dist);` (currently `:3059`), insert:

```javascript
// OD-024 engine #2: voluntary-move tile tally (round-path), see per-action site.
actor._tiles_voluntary_round = Number(actor._tiles_voluntary_round || 0) + dist;
```

(`dist` is in scope from `:3058`.)

- [ ] **Step 5: Run the move + round suites (no regression)**

Run: `node --test tests/services/roundOrchestrator.test.js tests/services/staminaFatigue.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/routes/session.js tests/services/staminaFatigue.test.js
git commit -m "$(cat <<'EOF'
feat(combat): voluntary-move tile tally for fatigue sprint (OD-024 #2)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>
EOF
)"
```

---

### Task 4: Accrue/decay at round boundary

**Files:**

- Modify: `apps/backend/routes/sessionRoundBridge.js` (`applyEndOfRoundSideEffects`, after the bleeding loop, before the function's return)
- Test: `tests/api/staminaFatigueRefill.test.js` (extend with a round-loop integration)

- [ ] **Step 1: Write the failing integration test**

Append to `tests/api/staminaFatigueRefill.test.js` (helper `withFlag` already defined above):

```javascript
const {
  applyEndOfRoundSideEffectsForTest,
} = require('../../apps/backend/routes/sessionRoundBridge');

test('round end: sprint accrues +1 fatica then next refill costs -1 AP (flag ON)', async () => {
  await withFlag('true', async () => {
    const unit = {
      id: 'u',
      hp: 10,
      ap: 2,
      ap_remaining: 0,
      traits: [],
      status: {},
      position: { x: 0, y: 0 },
      _tiles_voluntary_round: 2,
    };
    const session = { session_id: 's', turn: 1, units: [unit], damage_taken: {}, hazard_tiles: [] };
    await applyEndOfRoundSideEffectsForTest(session);
    assert.equal(unit.fatica, 1, 'sprint -> +1 fatica');
    assert.equal(unit._tiles_voluntary_round, 0, 'accumulator reset');
    applyApRefill(unit);
    assert.equal(unit.ap_remaining, 1, 'fatigued next round -> -1 AP');
  });
});
```

> If `applyEndOfRoundSideEffects` is a closure not exported, export a thin test handle. In `sessionRoundBridge.js`, where the bridge object is returned/exported, add `applyEndOfRoundSideEffectsForTest: applyEndOfRoundSideEffects` to the exported surface (it is an inner `async function`, so expose it via the returned API object). If the module exports a factory, attach it to the returned object. Confirm the exact export shape first with: `grep -n "return {" apps/backend/routes/sessionRoundBridge.js | tail` and `grep -n "module.exports" apps/backend/routes/sessionRoundBridge.js`.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/api/staminaFatigueRefill.test.js`
Expected: FAIL — `fatica` stays 0 (no accrual wired) / export missing.

- [ ] **Step 3: Add the accrue/decay loop**

In `apps/backend/routes/sessionRoundBridge.js`, inside `applyEndOfRoundSideEffects`, AFTER the `bleedingEvents` loop and BEFORE the function returns, insert:

```javascript
// OD-024 engine #2 (D6): stamina/fatica accrue-or-decay per unit at round end
// (flag-gated). The move-tally accumulator was filled during the round; here we
// resolve it to +1 (sprint) or decay, and reset. Default OFF = no-op no-touch.
try {
  const stamina = require('../services/combat/staminaFatigue');
  if (stamina.isFatigueEnabled()) {
    for (const unit of session.units || []) {
      if (!unit) continue;
      stamina.accrueOrDecay(unit);
    }
  }
} catch {
  /* stamina optional; never block round end */
}
```

Then expose the test handle on the bridge's exported/returned object (see Step 1 note).

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/api/staminaFatigueRefill.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/routes/sessionRoundBridge.js tests/api/staminaFatigueRefill.test.js
git commit -m "$(cat <<'EOF'
feat(combat): accrue/decay fatigue at round boundary (OD-024 #2)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>
EOF
)"
```

---

### Task 5: Band-neutrality + full regression

**Files:** none new — verification + a neutrality assertion.

- [ ] **Step 1: Add a flag-OFF neutrality test**

Append to `tests/api/staminaFatigueRefill.test.js`:

```javascript
const { publicSessionView } = require('../../apps/backend/routes/sessionHelpers');

test('band-neutral: flag OFF -> fatica absent from publicSessionView units', () => {
  withFlag(undefined, () => {
    const unit = normaliseUnit({ id: 'u', traits: [] }, 0);
    const session = { session_id: 's', turn: 1, units: [unit], grid: { width: 6, height: 6 } };
    const view = publicSessionView(session);
    assert.equal('fatica' in view.units[0], false);
  });
});
```

- [ ] **Step 2: Run the neutrality test**

Run: `node --test tests/api/staminaFatigueRefill.test.js`
Expected: PASS.

- [ ] **Step 3: Full backend regression (flag OFF default — must be green + unchanged)**

Run: `node scripts/run-test-api.cjs`
Expected: `# fail 0`. The `synergyCombo` test is a known pre-existing probabilistic flake (task_53fd90bd) — if and only if that single test fails, re-run once; any other failure is a real regression to fix.

- [ ] **Step 4: Combat/round unit suites**

Run: `node --test tests/services/roundOrchestrator.test.js tests/services/statusModifiers.test.js tests/services/staminaFatigue.test.js`
Expected: PASS.

- [ ] **Step 5: Format check (the lint-staged hook will also run on commit)**

Run: `npx prettier --check apps/backend/services/combat/staminaFatigue.js apps/backend/routes/sessionHelpers.js apps/backend/routes/session.js apps/backend/routes/sessionRoundBridge.js tests/services/staminaFatigue.test.js tests/api/staminaFatigueRefill.test.js`
Expected: all pass (or `npx prettier --write` the listed files, then re-run).

- [ ] **Step 6: Commit + mark PR ready**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test(combat): band-neutrality + regression for fatigue engine (OD-024 #2)

Coding-Agent: claude-opus-4-8
Trace-Id: <uuidv7>
EOF
)"
git push
gh pr ready 2937 --repo MasterDD-L34D/Game
```

Then verify CI green on PR #2937 (`gh pr checks 2937`). Not auto-merge-L3 (test files >50 LOC outside `apps/backend`) → master-dd manual merge.

---

## Self-review (author)

- **Spec coverage:** §3 sprint def → Task 1 `isSprintRound` + Task 3 tally; §4.2 module → Task 1; §4.1 `fatica` field/allowlist → Task 2; §4.3 hooks → Tasks 2 (penalty), 3 (tally), 4 (accrue); §5 loop → Task 4 integration; §6 band-neutrality → Task 5; §7 edge (split moves, forced excluded) → Task 3 (only `move` handlers) + Task 3 Step 1 sum test; §10 testing → Tasks 1–5. All covered.
- **Placeholders:** none — every step has concrete code/commands. `<uuidv7>` is intentionally generated per the header command.
- **Type/name consistency:** `_tiles_voluntary_round`, `fatica`, `isFatigueEnabled`, `fatiguePenalty`, `accrueOrDecay`, `penaltyThreshold` identical across module, wiring, and tests.
- **One known unknown (flagged, not a placeholder):** the exact export mechanism for the `applyEndOfRoundSideEffects` test handle (Task 4 Step 1 note) — resolve by inspecting the bridge's return/exports first. If exposing it is awkward, drive the round-end via the `/turn/end` HTTP path in the test instead (the sim uses it).
