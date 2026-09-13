# Meta-network expansion PR2 — Atollo Obsidiana 6th node Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 6th canonical biome-node `ATOLLO_OBSIDIANA` to the meta-network graph, wired (in from CRYOSTEPPE, out to the terminal ROVINE), reachable + completability-gated, with a policy (SP) actually visiting it.

**Architecture:** Data-only (YAML) — no new code. The PR1 completability validator (`metaNetworkCompletability.js`) is the merge gate. `CRYOSTEPPE → ATOLLO` is an ungated `seasonal_bridge` so the SP temperament (seasonal-first) routes through Atollo; `ATOLLO → ROVINE` (corridor) reaches the terminal. Flag `META_NETWORK_ROUTING` OFF → zero live change.

**Tech Stack:** `meta_network_alpha.yaml` (schema 2.1), `node:test` + `supertest`, the PR1 modules.

**Invariants (every task):** TDD red→green; worktree `C:/dev/_gamewt-metanet-atollo` (prettier 3.8.3); AI 500/500; sim green (node v24 — `*.test.js` GLOB); ADR-0011 trailer (`Coding-Agent: claude-opus-4.8` + uuidv7, lowercase ≤72); owner-gated merge. Touch the YAML → recompute `trace_hash` (inline `_stable_digest`) + `run_all_validators.py` + `test_trace_hashes.py`. Touch docs → governance `--strict` (errors=0) + `git checkout -- reports/docs/governance_drift_report.json`. Forbidden: `.github/workflows`, `migrations`, `packages/contracts`, `services/generation`. Spec: [`2026-06-03-meta-network-graph-expansion-design.md`](../specs/2026-06-03-meta-network-graph-expansion-design.md) §3 PR2 (RATIFIED).

---

### Task 1: Data — ATOLLO_OBSIDIANA node + 2 edges + encounter

**Files:**

- Modify: `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml`
- Test: `tests/worldgen/metaNetworkResolver.test.js`

- [ ] **Step 1: Write the failing test** (append to the resolver spec):

```js
test('getNetwork: ATOLLO_OBSIDIANA is the 6th node, wired in (CRYOSTEPPE) + out (ROVINE)', () => {
  _resetCache();
  const net = getNetwork();
  assert.equal(net.nodes.length, 6, 'six nodes after Atollo');
  const atollo = net.nodes.find((n) => n.id === 'ATOLLO_OBSIDIANA');
  assert.ok(atollo, 'ATOLLO_OBSIDIANA node present');
  assert.equal(atollo.biome_id, 'atollo_obsidiana');
  assert.deepEqual(atollo.encounters, ['enc_tutorial_07_hardcore_pod_rush']);
  // inbound from CRYOSTEPPE (seasonal_bridge, ungated) + outbound to the terminal ROVINE.
  const inEdge = getOutgoingEdges('CRYOSTEPPE').find((e) => e.to === 'ATOLLO_OBSIDIANA');
  assert.ok(inEdge && inEdge.type === 'seasonal_bridge' && inEdge.conditions === null);
  const outEdge = getOutgoingEdges('ATOLLO_OBSIDIANA').find((e) => e.to === 'ROVINE_PLANARI');
  assert.ok(outEdge, 'ATOLLO_OBSIDIANA -> ROVINE_PLANARI present');
});
```

- [ ] **Step 2: Run** `node --test tests/worldgen/metaNetworkResolver.test.js` → FAIL (5 nodes, no Atollo).
- [ ] **Step 3: Implement** — in `meta_network_alpha.yaml`:
  - Add the node to the `nodes:` list:

```yaml
# Expansion PR2: Atollo Obsidiana, the 4th canonical biome (vault canvas C-CANVAS_NPG_BIOMI),
# now the graph's 6th node. Reached from CRYOSTEPPE, exits to the terminal ROVINE.
- id: ATOLLO_OBSIDIANA
  biome_id: atollo_obsidiana
  path: packs/evo_tactics_pack/data/ecosystems/atollo_obsidiana.ecosystem.yaml
  weight: 0.45
  encounters: [enc_tutorial_07_hardcore_pod_rush]
```

- Add two edges to the `edges:` list (before `bridge_species_map:`):

```yaml
# Expansion PR2: CRYOSTEPPE -> ATOLLO seasonal_bridge (ungated) so the SP temperament routes
# through the atoll; ATOLLO -> ROVINE corridor reaches the terminal (>=4 nodes, no shortcut).
- from: CRYOSTEPPE
  to: ATOLLO_OBSIDIANA
  type: seasonal_bridge
  resistance: 0.55
  seasonality: perenne
  notes: Risacca obsidiana incanala i migratori dalle steppe orbitali verso l'atollo.
- from: ATOLLO_OBSIDIANA
  to: ROVINE_PLANARI
  type: corridor
  resistance: 0.6
  seasonality: estate
  notes: Banchi corallini fossili formano un ponte verso le rovine planari.
```

- [ ] **Step 4: Recompute `trace_hash`** — `python -c "import importlib.util,sys; from pathlib import Path; import yaml; spec=importlib.util.spec_from_file_location('uth',Path('tools/py/update_trace_hashes.py')); m=importlib.util.module_from_spec(spec); sys.modules['uth']=m; spec.loader.exec_module(m); p=Path('packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml'); print(m._stable_digest(yaml.safe_load(p.read_text(encoding='utf-8'))))"` → edit the `receipt.trace_hash:` line.
- [ ] **Step 5: Run** resolver test (PASS) + `python packs/evo_tactics_pack/tools/py/run_all_validators.py` (exit 0) + `python -m pytest tests/scripts/test_trace_hashes.py -q` (PASS).
- [ ] **Step 6: Commit** `feat(worldgen): Atollo Obsidiana 6th node (data-gate)`.

---

### Task 2: Completability — validator passes on the 6-node graph

**Files:**

- Test: `tests/worldgen/metaNetworkCompletability.test.js`

- [ ] **Step 1: Write the failing/locking test** (append):

```js
test('checkCompletable: ATOLLO_OBSIDIANA is reachable + the 6-node graph stays completable', () => {
  resolver._resetCache();
  const net = resolver.getNetwork();
  const r = checkCompletable(net, { seasons: [null, 'spring', 'summer', 'autumn', 'winter'] });
  assert.equal(r.ok, true, `6-node graph completable; stranded=${JSON.stringify(r.stranded)}`);
  // ATOLLO is reachable from the start under every season (it is on an ungated path).
  const reach =
    require('../../apps/backend/services/worldgen/metaNetworkCompletability')._reachable(
      net,
      net.start_node,
      null,
    );
  assert.ok([...reach].includes('atollo_obsidiana'), 'ATOLLO_OBSIDIANA reachable from start');
});
```

(NOTE: `_reachable` returns lowercased node keys, so assert the lowercase `'atollo_obsidiana'`.)

- [ ] **Step 2: Run** `node --test tests/worldgen/metaNetworkCompletability.test.js` → PASS (Task 1's edges make Atollo reachable + the graph completable). If it FAILS, the wiring stranded Atollo — fix the edges in Task 1.
- [ ] **Step 3: No new impl** — the PR1 validator already covers this; this task locks the 6-node graph.
- [ ] **Step 4: Commit** `test(worldgen): lock 6-node completability + Atollo reachability`.

---

### Task 3: Sim — SP routes through Atollo + route report

**Files:**

- Test: `tests/sim/fullLoopRouting.test.js`
- Doc: `docs/playtest/2026-06-03-meta-network-route-report.md`

- [ ] **Step 1: Write the failing assertion** — in the ESFP block of `fullLoopRouting.test.js`, after the existing `esfp.route[1] === 'CRYOSTEPPE'` assertion, add:

```js
// PR2: from CRYOSTEPPE the SP temperament takes the ungated seasonal_bridge to the new atoll.
assert.ok(
  esfp.route.includes('ATOLLO_OBSIDIANA'),
  `SP routes through the Atollo node; route=${esfp.route}`,
);
```

- [ ] **Step 2: Run** `node --test tests/sim/fullLoopRouting.test.js` → PASS (with Task 1's seasonal edge, ESFP picks ATOLLO at CRYOSTEPPE). If ESFP does NOT visit Atollo, verify the CRYOSTEPPE→ATOLLO edge type is `seasonal_bridge` (SP prefers seasonal) — log `esfp.route` to confirm.
- [ ] **Step 3: Update the route report** — append a "PR2 (Atollo)" note to `docs/playtest/2026-06-03-meta-network-route-report.md` with the ESFP route now passing through ATOLLO_OBSIDIANA. Run governance `--strict` (errors=0) + `git checkout -- reports/docs/governance_drift_report.json`.
- [ ] **Step 4: Run** `node --test tests/sim/*.test.js` (green) + `node --test tests/ai/*.test.js` (500/500).
- [ ] **Step 5: Commit** `feat(sim): SP routes through the Atollo node + report`.

---

## After all tasks

- Full gate: AI 500/500, sim green, `node --test tests/worldgen/*.test.js tests/api/campaignMetaNetworkRouting.test.js`, prettier `--check` changed files, `run_all_validators.py` exit 0, `test_trace_hashes.py`, governance errors=0 (checkout the drift artifact).
- Open PR (`gh pr create --base main --head claude/meta-network-atollo-node`), link spec + this plan, babysit Codex. Owner-gated merge — build green, then STOP for master-dd.
- After PR2 merges: the **N=40 graph-mode band-verify** (staging) → ratify → **prod flag flip** (separate verdict).

## Self-review notes

- Spec §3 PR2 coverage: node + 2 edges + encounter → Task 1; completability gate → Task 2; sim visit → Task 3. ✓
- `checkCompletable` / `_reachable` defined in PR1, consumed here. `_reachable` returns lowercased keys (asserted lowercase). No placeholders.
