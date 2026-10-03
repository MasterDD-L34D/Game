# Meta-network live routing + player-vote (slice A+C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When `META_NETWORK_ROUTING=true`, the live campaign routes via the meta-network graph (each node serves an encounter; >1 candidate → player/co-op/policy chooses); flag OFF behaves byte-identical to today.

**Architecture:** Additive, flag-gated overlay. Resolver maps new node fields; routing gains pure helpers; `/advance` traverses the graph (flag ON only); `/choose` accepts `node_id`; co-op `world_vote` and the full-loop sim resolve the choice. Spec: [`2026-06-03-worldgen-gapc-live-routing-player-vote-design.md`](../specs/2026-06-03-worldgen-gapc-live-routing-player-vote-design.md).

**Tech Stack:** Node (Express routes, `js-yaml`), `node:test` + `supertest`, the existing `metaNetworkResolver`/`metaNetworkRouting`/`coopOrchestrator`/`tools/sim` modules.

**Invariants (every task):** TDD red→green; worktree `C:/dev/_gamewt-metanet-ac` (prettier 3.8.3 from `npm ci`); AI 500/500 + sim green; ADR-0011 commit trailer (`Coding-Agent: claude-opus-4.8` + uuidv7 `Trace-Id`, lowercase subject ≤72); owner-gated merge (data + live-flow). Allowed zone: `apps/backend` + `tools/sim` + `tests` + the network YAML. Forbidden: `.github/workflows`, `migrations`, `packages/contracts`, `services/generation`.

---

## File Structure

- Modify `apps/backend/services/worldgen/metaNetworkResolver.js` — map `encounters`/`terminal` per node + network `start_node` (Task 1).
- Modify `apps/backend/services/worldgen/metaNetworkRouting.js` — add `encounterForNode` + `isTerminal` pure helpers (Task 2).
- Modify `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml` — additive `encounters`/`terminal`/`start_node` + trace_hash (Task 3, owner-gated data).
- Modify `apps/backend/routes/campaign.js` — `/advance` graph traversal + `/choose` `node_id` (Tasks 4-5).
- Test `tests/api/coopWorldVoteRoute.test.js` (or extend co-op tests) — vote→/choose bridge (Task 6).
- Modify `tools/sim/full-loop-runner.js` + `tools/sim/meta-network-driver.js` — graph-routed sim walk (Task 7).
- Tests: `tests/server/metaNetworkResolver.spec.js`, `tests/server/metaNetworkRouting.spec.js` (or wherever the #2483/#2509 tests live — locate with `git grep -l metaNetworkRouting tests`), `tests/api/campaignMetaNetwork*.test.js`, `tests/sim/*.test.js`.

---

### Task 1: Resolver maps `encounters` / `terminal` / `start_node`

**Files:**

- Modify: `apps/backend/services/worldgen/metaNetworkResolver.js` (node map `:58-63`; network object `:89`)
- Test: the existing resolver spec (locate: `git grep -l "metaNetworkResolver" tests`)

- [ ] **Step 1: Write failing tests** — after `_resetCache()`, with a node carrying `encounters` + `terminal` and a network `start_node` in a fixture (or assert against the real YAML once Task 3 lands; for Task 1 use a temp fixture via `_resetCache` + a stubbed read, OR assert the mapper shape on the real file's first node which will gain fields in Task 3 — prefer a unit asserting the MAP logic):

```js
const resolver = require('../../apps/backend/services/worldgen/metaNetworkResolver');
test('resolver maps node.encounters + node.terminal (additive, defaulted)', () => {
  resolver._resetCache();
  const net = resolver.getNetwork();
  const node = net.nodes[0];
  assert.ok(Array.isArray(node.encounters), 'encounters is always an array');
  assert.equal(typeof node.terminal, 'boolean', 'terminal is always boolean');
});
test('resolver exposes network.start_node (string|null)', () => {
  resolver._resetCache();
  const net = resolver.getNetwork();
  assert.ok(net.start_node === null || typeof net.start_node === 'string');
});
```

- [ ] **Step 2: Run** `node --test <resolver-spec>` → FAIL (`encounters` undefined / `start_node` undefined).
- [ ] **Step 3: Implement** — in the node `.map` (`:58-63`) add:

```js
encounters: Array.isArray(n.encounters) ? n.encounters.map((x) => String(x)) : [],
terminal: !!n.terminal,
```

and in the network object (`:89`) add `start_node: net.start_node != null ? String(net.start_node).trim() : null,`.

- [ ] **Step 4: Run** the spec → PASS. Also `node --test tests/server/*.spec.js` (or the worldgen specs) stay green.
- [ ] **Step 5: Commit** `feat(worldgen): resolver maps node encounters/terminal + start_node` (+ ADR-0011 trailer).

---

### Task 2: Routing helpers `encounterForNode` + `isTerminal`

**Files:**

- Modify: `apps/backend/services/worldgen/metaNetworkRouting.js` (add helpers + export)
- Test: the existing routing spec

- [ ] **Step 1: Write failing tests:**

```js
const {
  encounterForNode,
  isTerminal,
} = require('../../apps/backend/services/worldgen/metaNetworkRouting');
const graph = {
  nodes: [
    { id: 'A', encounters: ['enc_x'], terminal: false },
    { id: 'Z', encounters: ['enc_boss'], terminal: true },
  ],
};
test('encounterForNode returns the node primary encounter (N=1)', () => {
  assert.equal(encounterForNode(graph, 'A'), 'enc_x');
  assert.equal(encounterForNode(graph, 'a'), 'enc_x'); // case-insensitive
  assert.equal(encounterForNode(graph, 'MISSING'), null);
});
test('isTerminal reflects node.terminal', () => {
  assert.equal(isTerminal(graph, 'Z'), true);
  assert.equal(isTerminal(graph, 'A'), false);
  assert.equal(isTerminal(graph, 'MISSING'), false);
});
```

- [ ] **Step 2: Run** → FAIL (helpers undefined).
- [ ] **Step 3: Implement** (reuse the module's existing `_norm` if present, else inline lowercase-trim):

```js
function encounterForNode(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes) || !nodeId) return null;
  const n = graph.nodes.find((x) => _norm(x.id) === _norm(nodeId));
  return n && Array.isArray(n.encounters) && n.encounters.length ? n.encounters[0] : null;
}
function isTerminal(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes) || !nodeId) return false;
  const n = graph.nodes.find((x) => _norm(x.id) === _norm(nodeId));
  return !!(n && n.terminal);
}
```

Add both to `module.exports`.

- [ ] **Step 4: Run** → PASS; routing spec green.
- [ ] **Step 5: Commit** `feat(worldgen): encounterForNode + isTerminal routing helpers`.

---

### Task 3: Data — `encounters`/`terminal`/`start_node` in the network YAML (owner-gated)

**Files:**

- Modify: `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml`
- Test: `tests/scripts/test_trace_hashes.py` (only flags literal `to-fill`); network validators `packs/.../tools/py/validate_ecosistema_v2_0.py` + `validate_cross_foodweb_v1_0.py`

- [ ] **Step 1** Add `start_node: DESERTO_CALDO` at the `network:` level. Add per-node (spec §4 starter assignment — master-dd ratifies):
  - DESERTO_CALDO: `encounters: [enc_savana_01]`
  - BADLANDS: `encounters: [enc_tutorial_03]`
  - FORESTA_TEMPERATA: `encounters: [enc_caverna_02]`
  - CRYOSTEPPE: `encounters: [enc_tutorial_04]`
  - ROVINE_PLANARI: `encounters: [enc_tutorial_05, enc_tutorial_06_hardcore]` + `terminal: true`
- [ ] **Step 2** Recompute `trace_hash` via the inline `_stable_digest` pattern (NOT the repo-wide tool — #2509 gotcha): `yaml.safe_load` → strip `trace_hash` recursively → `json.dumps(sort_keys=True, ensure_ascii=False, separators=(',',':'))` → sha256 → Edit the `receipt.trace_hash` line.
- [ ] **Step 3: Run** the network validators (`python packs/evo_tactics_pack/tools/py/run_all_validators.py` or the two validators directly) + `python -m pytest tests/scripts/test_trace_hashes.py` → PASS (2.1 schema, no `==2.0` pin).
- [ ] **Step 4** Resolver re-read assert: `node --test` Task 1 spec now sees real `encounters`/`start_node` on the real file.
- [ ] **Step 5: Commit** `feat(worldgen): node->encounter map + start_node/terminal in meta_network (data-gate)`.

---

### Task 4: `/advance` graph traversal (flag ON), flag-OFF byte-identical

**Files:**

- Modify: `apps/backend/routes/campaign.js` (`/advance` `:248-447`; flag read like `:215`)
- Modify: the campaign store (`getCampaign`/`updateCampaign` — `git grep -n "function updateCampaign" apps/backend`) for additive `currentNode`/`clearedNodes`
- Test: `tests/api/campaignMetaNetworkRouting.test.js` (new)

- [ ] **Step 1: Write failing tests** (supertest, `createApp({databasePath:null})`; set `process.env.META_NETWORK_ROUTING='true'` in one test, unset in the regression test):
  - flag OFF: start a campaign, `/advance` victory → `next_encounter_id` equals the static-chain value (assert it matches today's behaviour exactly — snapshot the response shape).
  - flag ON: start → campaign has `currentNode === 'DESERTO_CALDO'`; `/advance` victory at a single-candidate node → response `next_encounter_id === encounterForNode(next)`; at a multi-candidate node → `choice_required === true` + `route_choice.candidates.length > 1`; at the terminal node → campaign completes.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — guard the new path on `process.env.META_NETWORK_ROUTING === 'true'`. On campaign start (where the campaign record is created), when flag ON set `currentNode = graph.start_node`, `clearedNodes = []`. In `/advance` on `outcome === 'victory'` when flag ON: push `currentNode` to `clearedNodes`; `const r = selectNextNodes(currentNode, { graph, clearedNodes, season })`; if `isTerminal(graph, currentNode)` or `r.candidates.length === 0` → finalize (reuse the existing completion branch); if `1` → `updateCampaign(id, { currentNode: r.candidates[0].<idField> })` + respond `next_encounter_id: encounterForNode(graph, nextNode)`; if `>1` → respond `{ choice_required: true, route_choice: { candidates: r.candidates } }` (do NOT advance currentNode yet). Flag OFF → the existing `act.encounters`/`chapter_idx` code path UNCHANGED. (Verify the candidate id field name from `selectNextNodes` — likely `node_id` or `to`; read `metaNetworkRouting.js:~150-194`.)
- [ ] **Step 4: Run** → PASS; flag-OFF regression test green; `node --test tests/api/*.test.js` green.
- [ ] **Step 5: Commit** `feat(campaign): graph-routed /advance behind META_NETWORK_ROUTING (flag off = static)`.

---

### Task 5: `/choose` accepts `node_id` (back-compat with `branch_key`)

**Files:**

- Modify: `apps/backend/routes/campaign.js` (`/choose` `:451-487`)
- Test: `tests/api/campaignMetaNetworkRouting.test.js`

- [ ] **Step 1: Write failing tests:** flag ON, after a `choice_required` advance, `POST /campaign/choose { id, node_id }` with a valid candidate → campaign `currentNode === node_id`, response `next_encounter_id === encounterForNode(node_id)`; an invalid `node_id` (not a current candidate) → 400; `branch_key` path still works (existing test green).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — at the top of `/choose`, if `req.body.node_id` is present: validate it is a candidate of `currentNode` via `selectNextNodes` (recompute), else 400; on success `updateCampaign(id, { currentNode: node_id, routeChoices: [...] })` + respond `next_encounter_id: encounterForNode(graph, node_id)`. If `node_id` absent → existing `branch_key` logic verbatim.
- [ ] **Step 4: Run** → PASS; existing `/choose` branch_key test green.
- [ ] **Step 5: Commit** `feat(campaign): /choose accepts node_id for graph routing (branch_key back-compat)`.

---

### Task 6: Co-op `world_vote` → `/choose` bridge test (reuse, decoupled)

**Files:**

- Test: `tests/api/coopWorldVoteRouting.test.js` (new) — locate the co-op route + orchestrator: `apps/backend/routes/coop.js`, `apps/backend/services/coop/coopOrchestrator.js`
- (No production change expected if the campaign side is choice-agnostic — this task PROVES the bridge; add a thin adapter only if the test shows a gap.)

- [ ] **Step 1: Write failing test:** drive `coopOrchestrator.worldVote(playerId, node_id, true)` for a quorum → `worldTally` returns the winning `node_id`; submit that to `POST /campaign/choose { id, node_id }` → campaign advances to that node. Assert the winner from `worldTally` is a valid candidate for the campaign's `currentNode`.
- [ ] **Step 2: Run** → FAIL (or reveal the gap).
- [ ] **Step 3: Implement** — if a gap exists, add a thin mapping (candidates → vote options) on the co-op side; otherwise the test documents the reuse. Keep campaign routing choice-agnostic.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `test(coop): world_vote winner resolves a graph route choice via /choose`.

---

### Task 7: Full-loop sim walks the graph (flag ON, policy picks at branches)

**Files:**

- Modify: `tools/sim/full-loop-runner.js` (graph-routed branch) + `tools/sim/meta-network-driver.js` (#2572)
- Test: `tests/sim/fullLoopRunner.test.js` / `tests/sim/metaNetworkDriver.test.js`

- [ ] **Step 1: Write failing test:** with `META_NETWORK_ROUTING='true'`, `runFullLoop` walks the graph: each step serves `encounterForNode(currentNode)` → real combat → on `choice_required`, the injected POLICY picks a candidate `node_id` → `/choose`; run reaches the terminal node + completes. Assert the route (sequence of `currentNode`) is POLICY-SENSITIVE (greedy vs mbti pick a different node at a multi-candidate branch).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** — in `full-loop-runner`, when flag ON, drive `/advance`→ if `choice_required`, call `policy.chooseRoute({ candidates, step })` (add a default `chooseRoute` to greedy = weight-desc/id-asc first; mbti = temperament-ordered by the node's biome/role) → `/choose { node_id }`. Reuse `meta-network-driver` for the graph reads. Keep flag-OFF path (today's static walk) unchanged.
- [ ] **Step 4: Run** `node --test tests/sim/*.test.js` → PASS; AI 500/500 green.
- [ ] **Step 5: Commit** `feat(sim): full-loop walks the meta-network graph (flag on), policy-routed`.

---

## Self-review notes

- Spec coverage: §4 data → Task 3; §5 resolver/routing/advance/choose → Tasks 1,2,4,5; §6 co-op → Task 6; §8 sim → Task 7; §7 edge cases → assertions in Tasks 4-5 (fail-closed, 400, terminal). ✓
- The candidate id field name in `selectNextNodes` output is verified at Task 4 Step 3 (read `metaNetworkRouting.js:150-194` — `node_id` vs `to`). Use that exact field in Tasks 4/5/7.
- `chooseRoute` policy method (Task 7) is NEW on the policy interface; greedy + mbti both implement it; default = weight-desc/id-asc (deterministic).
- Owner-gated: Task 3 (data) + the merge. Flag stays OFF (no PROD flip here).
