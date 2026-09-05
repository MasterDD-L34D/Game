---
title: 'GAP-C meta-network: live campaign routing + player-vote at the branch (slice A+C)'
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-03'
source_of_truth: false
language: en
review_cycle_days: 30
---

# GAP-C meta-network — live routing + player-vote (slice A+C)

> Brainstormed + master-dd-approved 2026-06-03. Fuses slice **A** (wire the meta-network graph
> into live campaign routing) and slice **C** (player-choice / co-op vote at the branch). Slice
> **B** (Sistema-pressure gates, Q-F Opt2) stays a separate later PR. This spec is the input to
> `writing-plans`; the implementation is TDD, flag-gated, owner-gated merge (data + live-flow).

## 1. Problem / current state (verified on origin/main `a6dd1611`)

The meta-network graph (`meta_network_alpha.yaml`, 5 biome-nodes / 12 edges, schema 2.1) is today
**read-only diagnostic only**: `GET /api/campaign/meta-network/next` (`campaign.js:214`, flag
`META_NETWORK_ROUTING`) returns eligible next-node `candidates[]` via
`metaNetworkRouting.selectNextNodes`, but **the live campaign does not route via the graph**.
`POST /api/campaign/advance` (`campaign.js:248`) advances the **static `act.encounters` chain**
(`chapter_idx`), and `POST /api/campaign/choose` (`:451`) resolves the one authored binary branch
(`branch_key` → `resolveBranch`). The graph nodes carry **no encounter reference** and there is no
node→encounter mapping (spec `2026-05-31-...-meta-network-routing-design.md` §7 stage 2, line 73).

`cave_path` (`default_campaign_mvp`) and the graph were authored independently: the campaign's
biomes (savana / caverna / pozza / rovine / cattedrale-boss) only partially overlap the 5 node
biome_ids → no clean 1:1 retrofit. The encounter ORDER is the substrate of the just-ratified band
calibration (`docs/playtest/2026-06-02-full-loop-band-report.md`), so the static path must stay
byte-identical when the flag is off.

## 2. Goal / scope

When `META_NETWORK_ROUTING=true`, the live campaign **routes via the graph**: each node serves an
encounter, and at a node with >1 eligible next-node the **players choose** (co-op vote or, solo/sim,
the player/policy picks). When the flag is OFF (default), `/advance` + `/choose` behave **exactly as
today** (static chain) — reversible, calibration-safe. Verifiable end-to-end in the full-loop sim.

**In scope (one cohesive PR):** node→encounter data + resolver mapping; graph traversal in
`/advance`; `node_id` choice in `/choose`; choice emission at multi-candidate branches; co-op
`world_vote`→`/choose` reuse; sim + co-op tests.

**Out of scope (deferred):** slice B Sistema-pressure gates (`min/max_pressure`, `campaignPressure`
Q-F Opt2); the PROD flag flip (`META_NETWORK_ROUTING=true` live) = separate owner verdict; Godot
map-ahead UI (fase-3, separate repo); generative grammar (fase-4); multi-encounter-per-node (N>1).

## 3. Approach — graph as a routing LAYER (chosen 2026-06-03, over full re-author)

Additive, flag-gated overlay. The static campaign def is untouched; the graph drives encounter
selection only when the flag is on. The campaign def stays the source of encounter CONTENT; the
graph becomes the routing TOPOLOGY over it.

## 4. Data changes (`meta_network_alpha.yaml`, owner-gated; schema 2.1 already live)

Additive per-node fields (the resolver currently strips unknown fields — must be extended):

- `encounters: [<encounter_id>, ...]` — the encounter(s) the node serves. MVP **N=1** (master-dd
  verdict: node=region 1:N, default N=1) → the first id is the node's encounter.
- `terminal: true` — on the climax node; reaching + clearing it ends the campaign run (reuse the
  existing completion / `exit_condition`).
- `start_node: <node_id>` (network-level, additive) — where a graph-routed run begins. MVP: graph
  mode routes the **5-node main arc**; the onboarding tutorials (`enc_tutorial_01/02`) stay
  static-only (not graph-routed in this slice) — not every encounter lives on the graph.

**Proposed starter assignment** (biome-aligned where it fits, fuzzy otherwise — master-dd ratifies
at the data-gate merge, exactly like #2509's `conditions:` write):

| Node (biome_id)                       | encounter                                                       | note                                    |
| ------------------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| DESERTO_CALDO (savana)                | `enc_savana_01`                                                 | start node (savana)                     |
| BADLANDS (canyons_risonanti)          | `enc_tutorial_03`                                               | "caverna risonante" ~ canyons           |
| FORESTA_TEMPERATA (foresta_miceliale) | `enc_caverna_02`                                                | fuzzy                                   |
| CRYOSTEPPE (mezzanotte_orbitale)      | `enc_tutorial_04`                                               | fuzzy; winter-gated edge already exists |
| ROVINE_PLANARI (rovine_planari)       | `enc_tutorial_05`, then **terminal** `enc_tutorial_06_hardcore` | climax/boss                             |

`trace_hash` recomputed (single-file inline `_stable_digest`, NOT the repo-wide tool — see #2509
gotcha). Network validators (`validate_ecosistema_v2_0.py` + `validate_cross_foodweb_v1_0.py` in `packs/.../tools/py/`) have no `==2.0` pin → 2.1 passes.

## 5. Code changes (`apps/backend`, the allowed zone)

- **`metaNetworkResolver.js`** (mapper ~`:63-70`): add `encounters: n.encounters ?? []` +
  `terminal: !!n.terminal` (mirrors the `conditions` fix from #2509 — the load-bearing strip).
- **`metaNetworkRouting.js`**: a pure helper `encounterForNode(graph, nodeId) -> encounter_id|null`
  (+ `isTerminal`). `selectNextNodes` already returns `candidates[]` — unchanged.
- **`campaign.js` `/advance`** (flag ON only; flag OFF → today's code path verbatim):
  - campaign gains `currentNode` (graph position) + `clearedNodes[]`. On start (flag ON),
    `currentNode = graph.start_node` (authored, §4); the static onboarding chapters are skipped in
    graph mode.
  - on victory at `currentNode`: mark cleared; `selectNextNodes(currentNode, {graph, clearedNodes,
season})` → - `candidates.length === 0` OR `isTerminal(currentNode)` → terminal (reuse completion path); - `=== 1` → auto-advance: `currentNode = candidate`, serve `encounterForNode`; - `> 1` → emit `{ choice_required: true, route_choice: { candidates } }` (reuse the
    `choice_node` response shape) and WAIT for `/choose`.
  - defeat/timeout → existing handling (one-attempt semantics unchanged).
- **`campaign.js` `/choose`**: accept `node_id` (alongside `branch_key`). When `node_id` is a valid
  candidate from the current node → set `currentNode = node_id`, append to a `routeChoices[]`,
  serve `encounterForNode`. `branch_key` path unchanged (back-compat).
- **campaign store**: `currentNode`, `clearedNodes`, `routeChoices` are additive fields, only
  written in flag-ON mode.

## 6. Co-op vote integration (slice C — reuse, don't reinvent)

The co-op `world_vote` / `world_tally` already exist (`coopOrchestrator.js`: `worldVotes` Map,
`worldVote(playerId, scenarioId, accept)` → `worldTally`). Integration is **thin + decoupled**:
the campaign emits `route_choice.candidates`; the co-op layer runs the vote over those candidates
and submits the winning `node_id` to `/campaign/choose`. The campaign routing stays
choice-agnostic (it does not run the tally). Solo / sim resolve the same `/choose` directly (the
chooser is the player or the full-loop policy) → **graph routing is POLICY-SENSITIVE** (greedy vs
mbti pick different nodes → ties into P4 / the band metrics).

## 7. Edge cases / errors

- Flag OFF → **zero behavioural change** (regression-locked by a test asserting the static chain).
- Node with no `encounters` → fail-closed (no serve; surfaced, not a crash).
- `selectNextNodes` 0 candidates with no `terminal` → treat as terminal (run ends) AND log — a
  graph that can strand a run is a data bug; **Dormans completability check** (≥1 non-gated path to
  a terminal node) is a validator/test assertion on the authored graph.
- `/choose node_id` not in the current node's candidates → 400 (invalid route choice).
- Unknown / absent season → season-gated edges fail-closed (already the case, #2509).

## 8. Verification (TDD)

- **Unit** (`metaNetworkResolver`): maps `encounters` + `terminal`; tolerates absent (back-compat).
- **Unit** (`metaNetworkRouting`): `encounterForNode` / `isTerminal`; (re-uses existing
  `selectNextNodes` tests).
- **Integration** (supertest, `createApp({databasePath:null})`):
  - flag ON: `/advance` walks the graph start→terminal; a multi-candidate node emits
    `choice_required`; `/choose node_id` advances to the chosen node + serves its encounter.
  - flag OFF: `/advance` + `/choose` byte-identical to today (regression lock).
  - `/choose node_id` not-a-candidate → 400.
- **Co-op** (supertest/orchestrator): a `worldTally` winner submitted to `/choose` advances the
  route (the vote→route bridge).
- **Sim** (`tools/sim/full-loop-runner` + `meta-network-driver`, #2572): flag ON, the runner walks
  the graph, the **policy** picks at branches (policy-sensitive path), real combat per node, run
  completes at the terminal. Extends the existing routing-coverage harness.
- Baselines preserved: AI 500/500, sim green, prettier + governance + network validators green.

## 9. Flag / rollout

`META_NETWORK_ROUTING` stays OFF by default → live + the ratified band report unchanged. The PROD
flip is a **separate** owner verdict (after this lands + is exercised in the sim). Merge of THIS PR
is owner-gated (data + live-flow change), not auto-L3.

## 10. Open decisions for master-dd (ratify at the data-gate merge)

1. The encounter→node assignment (§4 table) — starter proposal; ratify or edit.
2. Which node is `terminal` (proposed ROVINE_PLANARI with the boss as its terminal encounter).
3. Start node (proposed DESERTO_CALDO / savana).
