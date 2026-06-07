# SPEC-A Device Input Ledger -- Backend Integration Implementation Plan (Plan 1/2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend half of the Device Input Ledger -- ingest tier-tagged device events, feed the existing identity stack (MBTI/Conviction/VC) via the live event-log pipeline, and enforce TV-mirror visibility.

**Architecture:** The identity stack is already EVENT-LOG-DRIVEN (`vcScoring.computeRawMetrics(events, units)` -> `computeMbtiAxes` + `evaluateConviction`, telemetry-YAML config). SPEC-A therefore does NOT add a parallel signal-bus: it (a) validates device events against a schema + tier taxonomy, (b) enriches `session.events` with flagged decision-events + behavioral fields, (c) extends `computeRawMetrics` + telemetry weights to consume them, (d) filters the TV-mirror channel to public+aggregated only. Engines stay owner of the math.

**Tech Stack:** Node.js (Express backend, `apps/backend`), existing test harness (`tests/`, `node --test` / run-test-api), YAML telemetry config.

**Scope (decomposed):**

- **Plan 1 (this doc)** = backend: schema/tier module, tier-enforcement filter, conviction event-flag extension, `computeRawMetrics` extension, telemetry weights, consent/decision-only path. Self-contained + testable with synthetic events.
- **Plan 2 (follow-up)** = Godot client (`Game-Godot-v2`): raw capture buffer, on-device derivation, event emission. Depends on Plan 1's wire contract (Task 2 schema).

**Source spec:** `docs/design/evo-tactics-device-input-ledger.md` (MERGED #2616).
**VERIFY done 2026-06-07:** engine APIs confirmed -- `convictionEngine.classifyEvent(event)` reads `event.flags.*` (extension point); `vcScoring.computeRawMetrics(events, units, gridSize)` is the raw-metric derivation; `mbtiSurface.js` is surface-only (do NOT touch for ingest).

---

## File structure (backend)

- Create: `apps/backend/services/deviceInput/eventSchema.js` -- event schema + tier taxonomy + validation (pure, no deps).
- Create: `apps/backend/services/deviceInput/tierFilter.js` -- TV-mirror visibility filter (pure).
- Create: `apps/backend/services/deviceInput/index.js` -- thin `deviceInputLedger` facade (validate -> enrich-event -> hand to existing pipeline).
- Modify: `apps/backend/services/convictionEngine.js` -- extend `classifyEvent` flag handling (after read).
- Modify: `apps/backend/services/vcScoring.js` -- extend `computeRawMetrics` to read behavioral fields (after read).
- Modify: telemetry YAML (path via `vcScoring.DEFAULT_TELEMETRY_PATH`) -- weights for new raw metrics (after read).
- Modify: `apps/backend/routes/session.js` + `services/network/wsSession.js` -- consent flag + decision-only gate + tier-filter on TV broadcast (after read).
- Tests: `tests/services/deviceInput/*.test.js` (+ extensions to existing conviction/vcScoring tests).

---

## Task 1: Amend SPEC-A sez.4 to the verified integration mechanism

The spec's sez.4 describes a "signal-bus routes to engines". The VERIFY proved the real mechanism is event-log enrichment + `computeRawMetrics` extension. Align the canon-adjacent doc before code so implementers don't build the wrong thing.

**Files:**

- Modify: `docs/design/evo-tactics-device-input-ledger.md` (sez. 4.1 component 4 + 4.2 data flow)

- [ ] **Step 1: Edit sez.4.1 component 4** -- replace "instrada i `signal_events` agli engine LIVE come input aggiuntivi" with: "arricchisce `session.events` con decision-events flaggati (`event.flags.*`) + campi behavioral; gli engine LIVE li consumano via la pipeline esistente `vcScoring.computeRawMetrics` -> `computeMbtiAxes` / `evaluateConviction`. Il ledger NON instrada a un bus parallelo."

- [ ] **Step 2: Edit sez.4.2 data flow** -- change `deviceInputLedger { record decision ; route signal -> engine }` to `deviceInputLedger { validate + tier-tag ; enrich session.events } -> vcScoring.computeRawMetrics (pipeline esistente) -> axes/conviction`.

- [ ] **Step 3: Add a note** under sez.10 VERIFY: "RISOLTO 2026-06-07: engine API = event-log-driven (vcScoring.computeRawMetrics + convictionEngine event.flags). Integrazione via enrichment, non routing-bus."

- [ ] **Step 4: Commit**

```bash
git add docs/design/evo-tactics-device-input-ledger.md
git commit -m "docs(spec-a): amend sez.4 to verified event-log enrichment mechanism

Coding-Agent: <agent-id>
Trace-Id: <uuidv7>"
```

---

## Task 2: Event schema + tier taxonomy module

The wire contract. Pure module, fully groundable -- this is also Plan 2's dependency (the Godot client emits to this schema).

**Files:**

- Create: `apps/backend/services/deviceInput/eventSchema.js`
- Test: `tests/services/deviceInput/eventSchema.test.js`

- [ ] **Step 1: Write the failing test**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const {
  TIERS,
  validateDeviceEvent,
  DEFAULT_TIER_BY_CLASS,
} = require('../../../apps/backend/services/deviceInput/eventSchema');

test('TIERS has the 4 canonical tiers', () => {
  assert.deepEqual([...TIERS].sort(), ['aggregated', 'private', 'public', 'secret']);
});

test('valid decision event passes', () => {
  const ev = {
    kind: 'decision',
    type: 'route_vote',
    playerId: 'p1',
    tier: 'public',
    payload: { route: 'A' },
  };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, true);
});

test('signal event gets default tier when omitted', () => {
  const ev = { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 1200 };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, true);
  assert.equal(r.event.tier, DEFAULT_TIER_BY_CLASS.signal); // 'secret'
});

test('raw events are rejected on the wire', () => {
  const ev = { kind: 'raw', type: 'tap', playerId: 'p1' };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, false);
  assert.match(r.error, /raw/i);
});

test('invalid tier is rejected', () => {
  const ev = { kind: 'signal', type: 'x', playerId: 'p1', tier: 'banana' };
  const r = validateDeviceEvent(ev);
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/deviceInput/eventSchema.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```js
// apps/backend/services/deviceInput/eventSchema.js
const TIERS = new Set(['public', 'private', 'aggregated', 'secret']);

// Default tier per event class (override allowed via explicit ev.tier).
const DEFAULT_TIER_BY_CLASS = {
  decision: 'public', // group decisions are public by default
  signal: 'secret', // behavioral signals feed engines, hidden from humans
};

const VALID_KINDS = new Set(['decision', 'signal']); // 'raw' never crosses the wire

function validateDeviceEvent(ev) {
  if (!ev || typeof ev !== 'object') return { ok: false, error: 'event must be an object' };
  if (ev.kind === 'raw')
    return { ok: false, error: 'raw events must not cross the wire (edge-first)' };
  if (!VALID_KINDS.has(ev.kind)) return { ok: false, error: `invalid kind: ${ev.kind}` };
  if (typeof ev.type !== 'string' || !ev.type) return { ok: false, error: 'type required' };
  if (typeof ev.playerId !== 'string' || !ev.playerId)
    return { ok: false, error: 'playerId required' };
  const tier = ev.tier == null ? DEFAULT_TIER_BY_CLASS[ev.kind] : ev.tier;
  if (!TIERS.has(tier)) return { ok: false, error: `invalid tier: ${tier}` };
  return { ok: true, event: { ...ev, tier } };
}

module.exports = { TIERS, DEFAULT_TIER_BY_CLASS, validateDeviceEvent };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/deviceInput/eventSchema.test.js`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/deviceInput/eventSchema.js tests/services/deviceInput/eventSchema.test.js
git commit -m "feat(device-input): event schema + tier taxonomy + validation

Coding-Agent: <agent-id>
Trace-Id: <uuidv7>"
```

---

## Task 3: TV-mirror tier-enforcement filter

Pure function: the TV broadcast may only carry `public` + `aggregated`. Fully groundable.

**Files:**

- Create: `apps/backend/services/deviceInput/tierFilter.js`
- Test: `tests/services/deviceInput/tierFilter.test.js`

- [ ] **Step 1: Write the failing test**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const {
  filterForTvMirror,
  TV_VISIBLE_TIERS,
} = require('../../../apps/backend/services/deviceInput/tierFilter');

test('TV sees only public + aggregated', () => {
  assert.deepEqual([...TV_VISIBLE_TIERS].sort(), ['aggregated', 'public']);
});

test('private and secret are stripped from TV payload', () => {
  const events = [
    { type: 'a', tier: 'public' },
    { type: 'b', tier: 'private' },
    { type: 'c', tier: 'aggregated' },
    { type: 'd', tier: 'secret' },
  ];
  const out = filterForTvMirror(events);
  assert.deepEqual(
    out.map((e) => e.type),
    ['a', 'c'],
  );
});

test('missing tier is treated as not-TV-visible (fail-closed)', () => {
  const out = filterForTvMirror([{ type: 'x' }]);
  assert.equal(out.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/services/deviceInput/tierFilter.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

```js
// apps/backend/services/deviceInput/tierFilter.js
const TV_VISIBLE_TIERS = new Set(['public', 'aggregated']);

// Fail-closed: anything not explicitly TV-visible is stripped.
function filterForTvMirror(events) {
  if (!Array.isArray(events)) return [];
  return events.filter((e) => e && TV_VISIBLE_TIERS.has(e.tier));
}

module.exports = { TV_VISIBLE_TIERS, filterForTvMirror };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/services/deviceInput/tierFilter.test.js`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/services/deviceInput/tierFilter.js tests/services/deviceInput/tierFilter.test.js
git commit -m "feat(device-input): TV-mirror tier-enforcement filter (fail-closed)

Coding-Agent: <agent-id>
Trace-Id: <uuidv7>"
```

---

## Task 4: convictionEngine event-flag extension

`classifyEvent` already has an explicit extension point for `event.flags.mercy/refuse`. Map the relevant decision-events (`risk_posture`, `choice_consistency` semantics) to conviction flags.

**Files:**

- Modify: `apps/backend/services/convictionEngine.js` (`classifyEvent`, ~line 106)
- Test: extend `tests/services/convictionEngine.test.js` (or the existing conviction test)

- [ ] **Step 1: READ FIRST (no placeholder).** Read `apps/backend/services/convictionEngine.js` lines 106-246 (`classifyEvent` body + `DELTA` table at line 54). Identify how existing events map to {utility, liberty, morality} deltas and the exact shape `classifyEvent` returns (delta object or null). Record the existing flag handling.

- [ ] **Step 2: Write the failing test** -- after the read, write a test asserting that a decision-event carrying `flags.refuse_order` produces a positive `liberty` delta and `flags.sacrifice`/`flags.mercy` produce a `morality` delta, using the SAME return shape observed in Step 1. (Write the concrete assertions against the real `evaluateConviction`/`classifyEvent` signature.)

- [ ] **Step 3: Run test -- expect FAIL** (flags not yet honored).

- [ ] **Step 4: Implement** -- extend `classifyEvent` to read `event.flags.{refuse_order, sacrifice, mercy}` and emit the corresponding bounded delta (reuse the existing `DELTA` magnitudes; do NOT invent new scales). Keep null-return for events without semantics.

- [ ] **Step 5: Run test -- expect PASS** + run the full conviction suite to confirm no regression.

- [ ] **Step 6: Commit** (`feat(conviction): honor explicit event.flags for liberty/morality deltas` + ADR-0011 trailers).

---

## Task 5: computeRawMetrics extension for behavioral signals

Feed `commit_latency` / `hesitation_score` / `preview_dwell` (carried on signal-events in the log) into the raw-metric layer that `computeMbtiAxes` consumes.

**Files:**

- Modify: `apps/backend/services/vcScoring.js` (`computeRawMetrics`, ~line 132; `computeMbtiAxes`, ~line 524)
- Modify: telemetry YAML (`DEFAULT_TELEMETRY_PATH` near line 86)
- Test: extend `tests/api/` vcScoring/mbti coverage

- [ ] **Step 1: READ FIRST.** Read `apps/backend/services/vcScoring.js` lines 132-260 (`computeRawMetrics`) + 503-675 (`computeAggregateIndices`, `computeMbtiAxes`, `computeMbtiAxesIter2`). Read the telemetry YAML at `DEFAULT_TELEMETRY_PATH`. Record: the exact `raw` object shape, how weights are keyed, and which axes map J/P + S/N + E/I.

- [ ] **Step 2: Write the failing test** -- assert that an events array containing signal-events with `commit_latency` (high) raises the raw metric used for the J/P axis in the direction documented in SPEC-A (long deliberation -> P). Use the real `computeRawMetrics`/`computeMbtiAxes` signatures from Step 1.

- [ ] **Step 3: Run test -- expect FAIL.**

- [ ] **Step 4: Implement** -- in `computeRawMetrics`, accumulate the behavioral fields from signal-events into new raw keys (e.g. `raw.avgCommitLatency`, `raw.hesitationRate`, `raw.previewDwell`); add their weights to the telemetry YAML so `computeAggregateIndices`/`computeMbtiAxes` fold them. Keep deterministic; bound contributions (anti-noise, mirror existing dead-band logic at line 610).

- [ ] **Step 5: Run test -- expect PASS** + full vcScoring/mbti suite green (no regression on existing axes).

- [ ] **Step 6: Commit** (`feat(vcScoring): fold device behavioral signals into raw metrics + telemetry weights` + trailers).

---

## Task 6: Consent opt-in + decision-only graceful-degrade

`secret` behavioral profiling is opt-in; opt-out runs the ledger in decision-only mode (decision-events still score; behavioral signals dropped) and the game stays playable.

**Files:**

- Create: `apps/backend/services/deviceInput/index.js` (facade: `ingest(sessionEvents, deviceEvent, { profilingConsent })`)
- Test: `tests/services/deviceInput/ingest.test.js`
- Modify (after read): `apps/backend/routes/session.js` / `wsSession.js` to call the facade + carry the consent flag.

- [ ] **Step 1: Write the failing test**

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { ingest } = require('../../../apps/backend/services/deviceInput');

test('decision events are always ingested', () => {
  const log = [];
  const r = ingest(
    log,
    { kind: 'decision', type: 'route_vote', playerId: 'p1', tier: 'public' },
    { profilingConsent: false },
  );
  assert.equal(r.accepted, true);
  assert.equal(log.length, 1);
});

test('signal events dropped when consent is false (decision-only)', () => {
  const log = [];
  const r = ingest(
    log,
    { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 900 },
    { profilingConsent: false },
  );
  assert.equal(r.accepted, false);
  assert.equal(r.reason, 'profiling-opt-out');
  assert.equal(log.length, 0);
});

test('signal events ingested when consent is true', () => {
  const log = [];
  const r = ingest(
    log,
    { kind: 'signal', type: 'commit_latency', playerId: 'p1', value: 900 },
    { profilingConsent: true },
  );
  assert.equal(r.accepted, true);
  assert.equal(log.length, 1);
});

test('invalid (raw) event is rejected regardless of consent', () => {
  const log = [];
  const r = ingest(log, { kind: 'raw', type: 'tap', playerId: 'p1' }, { profilingConsent: true });
  assert.equal(r.accepted, false);
  assert.match(r.reason, /raw|invalid/i);
});
```

- [ ] **Step 2: Run test -- expect FAIL** (module not found).

- [ ] **Step 3: Implement**

```js
// apps/backend/services/deviceInput/index.js
const { validateDeviceEvent } = require('./eventSchema');

// Thin facade: validate -> consent-gate -> enrich the existing session event log.
// Engines consume `log` via the existing vcScoring.computeRawMetrics pipeline.
function ingest(sessionEvents, deviceEvent, { profilingConsent = false } = {}) {
  const v = validateDeviceEvent(deviceEvent);
  if (!v.ok) return { accepted: false, reason: `invalid: ${v.error}` };
  if (v.event.kind === 'signal' && !profilingConsent) {
    return { accepted: false, reason: 'profiling-opt-out' };
  }
  sessionEvents.push(v.event);
  return { accepted: true, event: v.event };
}

module.exports = { ingest };
```

- [ ] **Step 4: Run test -- expect PASS** (4/4).

- [ ] **Step 5: Commit** (`feat(device-input): ingest facade with consent gate + decision-only degrade` + trailers).

- [ ] **Step 6: Wire into routes (after read).** Read the WS drain handlers in `services/network/wsSession.js` + `routes/session.js`, then route incoming device events through `ingest(...)`, apply `filterForTvMirror(...)` on the TV broadcast path, and thread `profilingConsent` from session/onboarding state. Add a route-level integration test mirroring the existing `tests/api/session*Wire.test.js` pattern.

---

## Self-review

- **Spec coverage:** sez.4 architecture -> T1+T2+T6; sez.5 tiers -> T2 (taxonomy) + T3 (TV enforcement); sez.6 signals -> T4 (conviction) + T5 (mbti); sez.7 retention/consent -> T6; sez.8 error-handling -> T2/T6 validation + fail-closed T3; sez.9 testing -> every task is TDD. Raw-retention (sez.7.1) is a Plan 2 (device) concern -- noted.
- **No placeholders:** T2/T3/T6 carry complete code. T4/T5 + T6.Step6 are deliberately read-first (engine/route bodies unread at plan time -- VERIFY confirmed signatures only); fabricating exact diffs there would be the placeholder. Each read-first step names exact file+line ranges.
- **Type consistency:** `validateDeviceEvent` returns `{ ok, event|error }`; `ingest` returns `{ accepted, reason|event }`; `filterForTvMirror` takes/returns event arrays. Consistent across tasks.

## Open dependencies

- **Plan 2 (Godot client)** consumes Task 2's schema as the emission contract. Do not finalize Plan 2 until Task 2 lands.
- **Telemetry YAML weights (T5)** may need a calibration pass (full-loop runner N=40) once signals flow -- out of scope for Plan 1, flagged for SPEC-A full-loop-metric follow-up.
