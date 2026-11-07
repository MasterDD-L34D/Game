# Meta-network expansion PR1 — completability validator + 3-way branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure Dormans completability validator + a true 3-way start branch (DESERTO_CALDO exposes corridor/trophic/seasonal to three distinct nodes), flag-gated, graph never strands.

**Architecture:** Additive. Share the edge-condition evaluator between routing and a new completability module (lock-and-key fixpoint reachability). One data edge (`DESERTO_CALDO → CRYOSTEPPE`, seasonal_bridge, ungated). A dev-surface server-start warn. Flag `META_NETWORK_ROUTING` OFF → zero behavioural change.

**Tech Stack:** Node, `js-yaml`, `node:test` + `supertest`, the existing `metaNetworkResolver`/`metaNetworkRouting` modules + the `meta_network_alpha.yaml` network.

**Invariants (every task):** TDD red→green; worktree `C:/dev/_gamewt-metanet-expand` (prettier 3.8.3 from `npm ci`); AI `node --test tests/ai/*.test.js` 500/500; sim `node --test tests/sim/*.test.js` green (node v24 — use the `*.test.js` GLOB, not a dir arg); ADR-0011 trailer (`Coding-Agent: claude-opus-4.8` + uuidv7 `Trace-Id`, lowercase subject ≤72); owner-gated merge. Touch the YAML → recompute `trace_hash` via the single-file inline `_stable_digest` (NOT the repo-wide tool) + run network validators (`run_all_validators.py`) + `tests/scripts/test_trace_hashes.py`. Touch docs → `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict` (errors=0) + `git checkout -- reports/docs/governance_drift_report.json` before commit. Forbidden: `.github/workflows`, `migrations`, `packages/contracts`, `services/generation`. Spec: [`2026-06-03-meta-network-graph-expansion-design.md`](../specs/2026-06-03-meta-network-graph-expansion-design.md).

---

## File Structure

- Modify `apps/backend/services/worldgen/metaNetworkRouting.js` — export the pure `evalEdgeConditions` (Task 1; today it is the internal `_evalEdgeConditions`).
- Create `apps/backend/services/worldgen/metaNetworkCompletability.js` — pure `checkCompletable` + `completabilityWarning` (Task 2).
- Modify `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml` — +1 edge + trace_hash (Task 3, owner-gated data).
- Modify `apps/backend/app.js` (or the boot module that builds the app) — server-start warn (Task 6).
- Tests: `tests/worldgen/metaNetworkRouting.test.js` (Task 1), `tests/worldgen/metaNetworkCompletability.test.js` (new, Task 2 + 4), `tests/api/campaignMetaNetworkRouting.test.js` (Task 4), `tests/sim/fullLoopRouting.test.js` (Task 5).
- Doc: `docs/playtest/2026-06-03-meta-network-route-report.md` — append a PR1 post-3way section (Task 5).

---

### Task 1: Export the shared `evalEdgeConditions` from routing

**Files:**

- Modify: `apps/backend/services/worldgen/metaNetworkRouting.js` (internal `_evalEdgeConditions` ~`:76`; `module.exports` ~`:197`)
- Test: `tests/worldgen/metaNetworkRouting.test.js`

- [ ] **Step 1: Write the failing test** (append at end of file):

```js
const { evalEdgeConditions } = require('../../apps/backend/services/worldgen/metaNetworkRouting');

test('evalEdgeConditions: exported, shared gate eval (season + prior_node_cleared)', () => {
  // no conditions -> passthrough ok
  assert.deepEqual(evalEdgeConditions(null, {}), { ok: true, blocked_by: null });
  // season gate
  assert.equal(evalEdgeConditions({ season: ['winter'] }, { season: 'winter' }).ok, true);
  assert.equal(evalEdgeConditions({ season: ['winter'] }, { season: 'summer' }).ok, false);
  // prior_node_cleared gate
  assert.equal(evalEdgeConditions({ prior_node_cleared: ['X'] }, { clearedNodes: ['X'] }).ok, true);
  assert.equal(evalEdgeConditions({ prior_node_cleared: ['X'] }, { clearedNodes: [] }).ok, false);
  // unknown key fails closed
  assert.equal(evalEdgeConditions({ min_pressure: 3 }, {}).ok, false);
});
```

- [ ] **Step 2: Run** `node --test tests/worldgen/metaNetworkRouting.test.js` → FAIL (`evalEdgeConditions` undefined).
- [ ] **Step 3: Implement** — in `metaNetworkRouting.js`, rename the internal function to a public name and keep behaviour identical. Change the declaration `function _evalEdgeConditions(conditions, ctx) {` to `function evalEdgeConditions(conditions, ctx) {`, update its one caller inside `selectNextNodes` (`const cond = _evalEdgeConditions(e.conditions, ctx);` → `const cond = evalEdgeConditions(e.conditions, ctx);`), and add it to the exports: `module.exports = { selectNextNodes, encounterForNode, isTerminal, evalEdgeConditions };`
- [ ] **Step 4: Run** `node --test tests/worldgen/metaNetworkRouting.test.js` → PASS (new test + all 23 existing routing tests green).
- [ ] **Step 5: Commit** `refactor(worldgen): export shared evalEdgeConditions for completability` (+ ADR-0011 trailer).

---

### Task 2: Completability validator module (pure, fixtures)

**Files:**

- Create: `apps/backend/services/worldgen/metaNetworkCompletability.js`
- Test: `tests/worldgen/metaNetworkCompletability.test.js` (new)

- [ ] **Step 1: Write the failing test** (new file):

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkCompletable,
  completabilityWarning,
} = require('../../apps/backend/services/worldgen/metaNetworkCompletability');

// Completable: start A -> B (corridor) -> T (terminal, no outgoing).
const okGraph = {
  start_node: 'A',
  nodes: [{ id: 'A' }, { id: 'B' }, { id: 'T', terminal: true }],
  edges: [
    { from: 'A', to: 'B', type: 'corridor' },
    { from: 'B', to: 'T', type: 'corridor' },
  ],
};

// Stranded: T only reachable via a prior_node_cleared[Z] gate, but Z is never reachable.
const strandGraph = {
  start_node: 'A',
  nodes: [{ id: 'A' }, { id: 'T', terminal: true }],
  edges: [{ from: 'A', to: 'T', type: 'corridor', conditions: { prior_node_cleared: ['Z'] } }],
};

test('checkCompletable: a graph with a clear path to a terminal -> ok', () => {
  const r = checkCompletable(okGraph, { seasons: [null, 'winter'] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.stranded, []);
});

test('checkCompletable: a graph that can strand a run -> not ok, reports the state', () => {
  const r = checkCompletable(strandGraph, { seasons: [null] });
  assert.equal(r.ok, false);
  assert.equal(r.stranded.length, 1);
  assert.equal(r.stranded[0].start, 'A');
});

test('checkCompletable: no start_node -> ok (graph routing inactive)', () => {
  const r = checkCompletable({ nodes: [{ id: 'A' }], edges: [] }, {});
  assert.equal(r.ok, true);
});

test('completabilityWarning: null when ok, string when stranded', () => {
  assert.equal(completabilityWarning(okGraph, [null]), null);
  const w = completabilityWarning(strandGraph, [null]);
  assert.ok(typeof w === 'string' && /strand/i.test(w));
});
```

- [ ] **Step 2: Run** `node --test tests/worldgen/metaNetworkCompletability.test.js` → FAIL (module not found).
- [ ] **Step 3: Implement** (new file `metaNetworkCompletability.js`):

```js
'use strict';
// Dormans completability validator for the meta-network graph. Pure, no I/O. Guarantees
// (pre-flight) that the campaign can always reach a terminal node from the start under every
// season -- a graph that can strand a run is a data bug. Lock-and-key (Dormans): an edge gated
// by prior_node_cleared opens once its prereq nodes are themselves reachable; we iterate
// reachability to a fixpoint, so a key that is generated before its lock is honoured.

const { evalEdgeConditions } = require('./metaNetworkRouting');

function _norm(v) {
  return String(v == null ? '' : v)
    .trim()
    .toLowerCase();
}

// A node is terminal if flagged `terminal` OR it has no outgoing edges (dead-end climax).
function _isTerminalNode(graph, nodeKey) {
  const n = graph.nodes.find((x) => _norm(x.id) === nodeKey);
  if (n && n.terminal) return true;
  return !graph.edges.some((e) => _norm(e.from) === nodeKey);
}

// Fixpoint reachable set from `start` under `season`. clearedNodes = everything reachable so far
// (sound lock-and-key approximation: a prereq satisfied iff that node is reachable earlier).
function _reachable(graph, start, season) {
  const reach = new Set([_norm(start)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of graph.edges) {
      const from = _norm(e.from);
      const to = _norm(e.to);
      if (!reach.has(from) || reach.has(to)) continue;
      const ctx = { season, clearedNodes: [...reach] };
      if (evalEdgeConditions(e.conditions, ctx).ok) {
        reach.add(to);
        grew = true;
      }
    }
  }
  return reach;
}

// For each (start_node, season) verify a terminal node is reachable. Returns
// { ok, stranded:[{start, season, reachable}], detail }.
function checkCompletable(graph, { seasons = [null] } = {}) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { ok: false, stranded: [{ start: null, season: null }], detail: 'no_graph' };
  }
  const start = graph.start_node;
  if (!start) return { ok: true, stranded: [], detail: 'no start_node (graph routing inactive)' };
  const stranded = [];
  for (const season of seasons) {
    const reach = _reachable(graph, start, season);
    const hitsTerminal = [...reach].some((k) => _isTerminalNode(graph, k));
    if (!hitsTerminal) stranded.push({ start, season, reachable: [...reach] });
  }
  return {
    ok: stranded.length === 0,
    stranded,
    detail: stranded.length ? 'stranded states' : 'completable',
  };
}

// Dev-surface startup warning (never throws). Returns a one-line string or null.
function completabilityWarning(graph, seasons = [null, 'spring', 'summer', 'autumn', 'winter']) {
  try {
    const r = checkCompletable(graph, { seasons });
    if (r.ok) return null;
    const states = r.stranded.map((s) => ({ start: s.start, season: s.season }));
    return `[metaNetworkCompletability] WARN: graph can strand a run: ${JSON.stringify(states)}`;
  } catch {
    return null;
  }
}

module.exports = { checkCompletable, completabilityWarning, _reachable, _isTerminalNode };
```

- [ ] **Step 4: Run** `node --test tests/worldgen/metaNetworkCompletability.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(worldgen): Dormans completability validator (pure, lock-and-key)`.

---

### Task 3: Data — `DESERTO_CALDO → CRYOSTEPPE` seasonal_bridge (ungated)

**Files:**

- Modify: `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml`
- Test: `tests/worldgen/metaNetworkResolver.test.js`

- [ ] **Step 1: Write the failing test** (append to the resolver spec):

```js
test('getOutgoingEdges: DESERTO_CALDO has the ungated seasonal_bridge to CRYOSTEPPE (3-way)', () => {
  _resetCache();
  const edges = getOutgoingEdges('DESERTO_CALDO');
  const toCryo = edges.find((e) => e.to === 'CRYOSTEPPE');
  assert.ok(toCryo, 'new DESERTO_CALDO -> CRYOSTEPPE edge present');
  assert.equal(toCryo.type, 'seasonal_bridge');
  assert.equal(toCryo.conditions, null, 'ungated (perennial) so the 3-way works year-round');
  // start node now exposes 3 distinct edge types
  const types = new Set(edges.map((e) => e.type));
  assert.ok(
    types.has('corridor') && types.has('trophic_spillover') && types.has('seasonal_bridge'),
  );
});
```

- [ ] **Step 2: Run** `node --test tests/worldgen/metaNetworkResolver.test.js` → FAIL (no CRYOSTEPPE edge).
- [ ] **Step 3: Implement** — in `meta_network_alpha.yaml`, add this edge to the `edges:` list (after the existing DESERTO_CALDO edges, ASCII notes only):

```yaml
# Expansion PR1 (1A 3-way, ungated): perennial passage savana -> mezzanotte orbitale, so the
# start node exposes corridor(BADLANDS) + trophic(FORESTA) + seasonal_bridge(CRYOSTEPPE) at once
# -> NT/SJ, NF and SP each pick a different node. No `conditions` => always eligible.
- from: DESERTO_CALDO
  to: CRYOSTEPPE
  type: seasonal_bridge
  resistance: 0.6
  seasonality: perenne
  notes: Correnti ascensionali notturne aprono un valico stabile verso la mezzanotte orbitale.
```

- [ ] **Step 4: Recompute `trace_hash`** — run:

```bash
python -c "import importlib.util,sys; from pathlib import Path; import yaml; spec=importlib.util.spec_from_file_location('uth',Path('tools/py/update_trace_hashes.py')); m=importlib.util.module_from_spec(spec); sys.modules['uth']=m; spec.loader.exec_module(m); p=Path('packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml'); pl=yaml.safe_load(p.read_text(encoding='utf-8')); print(m._stable_digest(pl))"
```

Edit the `receipt.trace_hash:` line to the printed digest.

- [ ] **Step 5: Run** the resolver test (PASS) + network validators + trace_hash pytest:

```bash
node --test tests/worldgen/metaNetworkResolver.test.js
python packs/evo_tactics_pack/tools/py/run_all_validators.py >/dev/null; echo "validators exit=$?"
python -m pytest tests/scripts/test_trace_hashes.py -q
```

Expected: resolver PASS; validators exit 0; pytest all passed.

- [ ] **Step 6: Commit** `feat(worldgen): DESERTO->CRYOSTEPPE seasonal edge for a 3-way start (data-gate)`.

---

### Task 4: Integration — 3-way `/advance` + completability on the real graph

**Files:**

- Test: `tests/api/campaignMetaNetworkRouting.test.js`, `tests/worldgen/metaNetworkCompletability.test.js`

- [ ] **Step 1: Write the failing tests.** In `tests/worldgen/metaNetworkCompletability.test.js` add (top: `const resolver = require('../../apps/backend/services/worldgen/metaNetworkResolver');`):

```js
test('checkCompletable: the REAL alpha graph reaches a terminal in every season', () => {
  resolver._resetCache();
  const net = resolver.getNetwork();
  const r = checkCompletable(net, { seasons: [null, 'spring', 'summer', 'autumn', 'winter'] });
  assert.equal(r.ok, true, `alpha graph completable; stranded=${JSON.stringify(r.stranded)}`);
});
```

In `tests/api/campaignMetaNetworkRouting.test.js`, update the multi-candidate test (currently asserts BADLANDS + FORESTA_TEMPERATA, length 2) to the 3-way:

```js
// 3-way start (expansion PR1): corridor(BADLANDS) + trophic(FORESTA) + seasonal(CRYOSTEPPE).
assert.equal(ids.length, 3, 'DESERTO_CALDO -> BADLANDS + FORESTA_TEMPERATA + CRYOSTEPPE');
assert.ok(
  ids.includes('BADLANDS') && ids.includes('FORESTA_TEMPERATA') && ids.includes('CRYOSTEPPE'),
);
assert.ok(!ids.includes('ROVINE_PLANARI'), 'terminal shortcut still gated (2B)');
```

- [ ] **Step 2: Run** `node --test tests/worldgen/metaNetworkCompletability.test.js tests/api/campaignMetaNetworkRouting.test.js` → the completability-real test PASSES (edge from Task 3); the campaign 3-way test FAILS only if Task 3 not applied — with Task 3 applied it PASSES. If the campaign test still expects length 2, fix the assertion as above.
- [ ] **Step 3: No new impl** — Task 3's data already produces the 3rd candidate; this task locks it. Confirm the flag-OFF regression test in the same file is untouched and green.
- [ ] **Step 4: Run** `node --test tests/api/*.test.js` → green (campaign regression byte-identical with flag OFF).
- [ ] **Step 5: Commit** `test(worldgen): lock 3-way start branch + real-graph completability`.

---

### Task 5: Sim — full-loop 3-way policy divergence + route report

**Files:**

- Test: `tests/sim/fullLoopRouting.test.js`
- Doc: `docs/playtest/2026-06-03-meta-network-route-report.md`

- [ ] **Step 1: Write/extend the failing test.** In `tests/sim/fullLoopRouting.test.js`, after the greedy + INTJ runs, add an ESFP (SP) run and assert SP diverges to CRYOSTEPPE (add `makeMbtiPolicy` is already imported):

```js
const esfp = await runGraph(app, {
  playerId: 'fl_route_esfp',
  seed: 'route-e',
  policy: makeMbtiPolicy('ESFP'),
});
assert.equal(
  esfp.completed,
  true,
  `SP graph run completes; chapters=${JSON.stringify(esfp.chapters)}`,
);
assert.equal(esfp.route[0], 'DESERTO_CALDO');
// SP prefers the seasonal_bridge -> CRYOSTEPPE: a THIRD distinct first pick (greedy->FORESTA,
// NT->BADLANDS, SP->CRYOSTEPPE) = a true 3-way branch.
assert.equal(esfp.route[1], 'CRYOSTEPPE', `SP prefers the seasonal route; route=${esfp.route}`);
assert.ok(
  new Set([greedy.route[1], intj.route[1], esfp.route[1]]).size === 3,
  'three policies pick three different first nodes (3-way)',
);
```

(Also: greedy.route[1] stays `FORESTA_TEMPERATA`; intj.route[1] stays `BADLANDS` — both unchanged by the new ungated edge since neither prefers seasonal.)

- [ ] **Step 2: Run** `node --test tests/sim/fullLoopRouting.test.js` → FAIL first if the run doesn't reach CRYOSTEPPE; then with Task 3's edge it PASSES. Verify the route empirically if needed by logging `esfp.route`.
- [ ] **Step 3: Update the route report** — append a "PR1 3-way" section to `docs/playtest/2026-06-03-meta-network-route-report.md` with the new ESFP route (DESERTO_CALDO -> CRYOSTEPPE -> ...). Then run governance: `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict` (errors=0) and `git checkout -- reports/docs/governance_drift_report.json`.
- [ ] **Step 4: Run** `node --test tests/sim/*.test.js` (green) + `node --test tests/ai/*.test.js` (500/500).
- [ ] **Step 5: Commit** `feat(sim): full-loop 3-way policy divergence (SP -> CRYOSTEPPE) + report`.

---

### Task 6: Server-start completability warn (dev surface, never throws)

**Files:**

- Modify: `apps/backend/app.js` (locate `createApp`: `git grep -n "function createApp\|createApp =" apps/backend/app.js`)
- Test: `tests/worldgen/metaNetworkCompletability.test.js` (the pure `completabilityWarning` is already covered in Task 2 — this task only wires the call)

- [ ] **Step 1: Confirm the pure helper is tested** (Task 2 Step 1 already asserts `completabilityWarning` returns null/string). No new test for the `console.warn` side-effect (untestable cheaply); the wiring is a thin guarded call.
- [ ] **Step 2: Implement the wiring** — near the top of `createApp` (after requires, before returning the app), add:

```js
// Dev-surface guard (Gate-5): warn once at boot if the shipped meta-network graph can strand a
// graph-routed run. Never throws, no request-path impact; the flag-gated routing is unaffected.
try {
  const { completabilityWarning } = require('./services/worldgen/metaNetworkCompletability');
  const metaNetworkResolver = require('./services/worldgen/metaNetworkResolver');
  const warn = completabilityWarning(metaNetworkResolver.getNetwork());
  if (warn) console.warn(warn);
} catch {
  /* boot-time best-effort only */
}
```

(If `metaNetworkResolver` / a worldgen module is already required at the top of `app.js`, reuse that require instead of a local one.)

- [ ] **Step 3: Run** the full app test suite to confirm no boot regression: `node --test tests/api/*.test.js` → green (the warn is null for the real graph, so nothing prints).
- [ ] **Step 4: Verify no stray output** — the real alpha graph is completable (Task 4), so boot prints nothing. Optionally confirm by temporarily breaking the graph in a scratch test (not committed).
- [ ] **Step 5: Commit** `feat(backend): warn at boot if the meta-network graph can strand a run`.

---

## After all tasks

- Full gate: `node --test tests/ai/*.test.js` (500/500), `node --test tests/sim/*.test.js`, `node --test tests/worldgen/*.test.js tests/api/campaignMetaNetworkRouting.test.js`, prettier `--check` on changed files, `run_all_validators.py` exit 0, `test_trace_hashes.py`, governance errors=0 (checkout the drift artifact).
- Open PR (`gh pr create --base main --head claude/meta-network-graph-expansion`), link the spec + this plan, babysit Codex (~2 nudges; address P1/P2; reply on-thread + resolve). Owner-gated merge — build green + Codex-clean, then STOP and hand back for master-dd.
- **PR2 (Atollo node)** gets its own plan after PR1 merges (it depends on the post-PR1 graph + the validator as its merge gate).

## Self-review notes

- Spec coverage: §3 PR1 data → Task 3; validator → Task 2 (+ shared eval Task 1); 3-way → Tasks 3-5; completability real-graph → Task 4; server-start warn → Task 6; sim divergence + report → Task 5. ✓
- `evalEdgeConditions` is defined/exported in Task 1 and consumed in Task 2 (same name). `checkCompletable`/`completabilityWarning` defined in Task 2, consumed in Tasks 4/6. ✓
- No placeholders: all test + impl code is inline. Owner-gated data = the one new edge (Task 3) + (PR2) the node.
