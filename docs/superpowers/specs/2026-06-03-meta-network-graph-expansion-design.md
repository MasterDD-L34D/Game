---
title: 'Meta-network graph expansion (3-way branch + Atollo node + completability)'
doc_status: draft
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-03'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Meta-network graph expansion

> Brainstormed + master-dd-approved 2026-06-03. Expands the GAP-C meta-network beyond the
> data-only tuning (#2584): a **true 3-way branch**, a **new canonical biome-node**
> (Atollo Obsidiana), and a **Dormans completability validator** so a bigger/gated graph can
> never strand a run. Delivered as **2 sequenced PRs**. Flag `META_NETWORK_ROUTING` stays
> **OFF**; the prod flip is a later owner verdict gated on a fresh graph-mode band-verify.
> Input to `writing-plans`. TDD, owner-gated merges (data + live-flow).

## 1. Problem / current state (verified on origin/main `93c20e5c`)

The live-routing graph (`meta_network_alpha.yaml`, 5 nodes / 13 edges after #2584) routes the
campaign when the flag is on. Two limits remain, surfaced by the route report
(`docs/playtest/2026-06-03-meta-network-route-report.md`):

- **Divergence is at most 2-way.** The start node `DESERTO_CALDO` offers `corridor` (BADLANDS) +
  `trophic_spillover` (FORESTA) — only two edge types — so the MBTI `chooseRoute` (NT/SJ→corridor,
  NF→trophic, SP→seasonal) collapses SP onto the trophic cluster. No node exposes all three edge
  types eligible at once.
- **No completability guarantee.** There is no validator that the graph can always reach a terminal
  from the start under every season; a mis-gated edge (e.g. a new node with all-gated inbounds) can
  strand a run. `metaNetworkRouting` returns `all_blocked`/`all_cleared` at runtime but nothing
  checks the whole graph up front (ADR-2026-05-31 cites Dormans lock-and-key only as a reference).

The vault canon (`Spaces/Dev/Evo-Tactics/appendici/C-CANVAS_NPG_BIOMI.md`) defines **4 canonical
biomes**: Canyons Risonanti (=BADLANDS), Foresta Miceliale (=FORESTA_TEMPERATA), Mezzanotte Orbitale
(=CRYOSTEPPE), and **Atollo Obsidiana** — the only canonical biome not yet a graph node. Its
ecosystem YAML (`atollo_obsidiana.ecosystem.yaml`, `biome_id: atollo_obsidiana`) already exists. The
vault roadmap (`evo-state-roadmap-2026-05-26.md`) frames biome-add as infrastructure-gated, not
content-gated.

## 2. Goal / scope

Richer, more legible routing that stays band-safe and never strands. Concretely:

- A **true 3-way branch** at the start so NT/SJ, NF, and SP each pick a different node.
- A **6th node** (Atollo Obsidiana) wired into the graph, completing the canonical roster.
- A **completability validator** (pure, pre-flight) proving every (start, season) reaches a terminal.

**Out of scope (deferred):** the PROD flag flip (separate owner verdict after a graph-mode
band-verify); new encounter CONTENT for Atollo (it serves an authored existing encounter, owner-
ratified); `min/max_pressure` arc-conditions (ADR-2026-05-31 v1.1); a 7th+ node.

Design patterns (games-source-index): Dead Cells concept-graph (typed multi-edges from one node),
Dormans lock-and-key + completability (the validator), Spelunky guaranteed-path.

## 3. Approach — 2 sequenced PRs (data + 1 pure validator)

Additive, flag-gated, owner-gated merges. Flag OFF → zero behavioural change (regression-locked).

### PR1 — completability validator + 3-way start branch (existing 5 nodes)

- **Data:** add edge `DESERTO_CALDO → CRYOSTEPPE`, `type: seasonal_bridge`, **ungated**
  (`seasonality` is flavor only — an ungated seasonal_bridge is established practice, e.g. the
  pre-#2584 DESERTO→ROVINE edge). The start node then exposes three edge types to three distinct
  nodes: `corridor`→BADLANDS, `trophic_spillover`→FORESTA, `seasonal_bridge`→CRYOSTEPPE. The gated
  `DESERTO_CALDO → ROVINE_PLANARI` (2B, #2584) is unchanged → the terminal shortcut stays closed.
- **Code:** new `apps/backend/services/worldgen/metaNetworkCompletability.js` (pure, no I/O):
  `checkCompletable(graph, { seasons }) -> { ok, stranded:[{start, season}], detail }`. For each
  start (default `graph.start_node`) and each season in `seasons` (the `seasonalEngine` enum +
  `null`), run a **lock-and-key fixpoint reachability**: a node is reachable if an edge into it
  passes `season` AND its `prior_node_cleared` prereqs are already in the reachable set; iterate to
  a fixpoint; the (start, season) is completable iff a terminal node (`terminal === true` or no
  outgoing edges) is in the reachable set. Reuses the same condition semantics as
  `metaNetworkRouting._evalEdgeConditions` (extract a shared `evalEdgeConditions` or replicate the
  two Stage-1 evaluators — decide in the plan; prefer extract-and-share).
- **Wiring (Gate-5, no behaviour change):** the validator runs in tests; optionally a server-start
  `console.warn` if the shipped graph is non-completable (dev surface only, never throws).

### PR2 — Atollo Obsidiana node

- **Data:** add node `ATOLLO_OBSIDIANA` (`biome_id: atollo_obsidiana`, weight ~0.45, `encounters:
[<authored>]` — owner-ratified). Wire ≥1 in + ≥1 out edge so it is neither isolated nor a
  dead-end and the terminal stays reachable: proposed `CRYOSTEPPE → ATOLLO_OBSIDIANA` (corridor or
  trophic) + `ATOLLO_OBSIDIANA → ROVINE_PLANARI` (corridor). The PR1 validator MUST pass with the
  node added (that is the merge gate).
- **No code change** — the resolver already maps any node; the validator from PR1 guards it.

Both PRs: recompute `trace_hash` (inline `_stable_digest`, NOT the repo-wide tool); network
validators + `test_trace_hashes`; re-run the route report; AI 500/500 + sim green.

## 4. Data changes (`meta_network_alpha.yaml`, owner-gated; schema 2.1 already live)

- PR1: +1 edge (`DESERTO_CALDO → CRYOSTEPPE`, seasonal_bridge, ungated). 13 → 14 edges.
- PR2: +1 node (`ATOLLO_OBSIDIANA`) + 2 edges (in + out). 5 → 6 nodes, 14 → 16 edges.
- `trace_hash` recomputed per PR. `bridge_species_map` updated only if Atollo participates in
  cross-biome dispersal (optional, owner call).

## 5. Code changes (`apps/backend/services/worldgen`, allowed zone)

- **New** `metaNetworkCompletability.js` — pure `checkCompletable(graph, { seasons })`. Lock-and-key
  fixpoint reachability; returns the strand report. No I/O, no RNG, deterministic.
- **`metaNetworkRouting.js`** — if the plan extracts the shared condition evaluator, export
  `evalEdgeConditions` (pure) so both routing and completability agree on gate semantics (single
  source of truth). Otherwise the validator replicates the two Stage-1 evaluators (season,
  prior_node_cleared) verbatim with a test asserting parity.

## 6. Edge cases / errors

- Flag OFF → zero behavioural change (regression test on the static chain).
- 3-way branch: an ungated `seasonal_bridge` is always eligible (only `conditions.season` gates).
  Confirm SP picks the seasonal target (CRYOSTEPPE), NT/SJ the corridor (BADLANDS), NF the trophic
  (FORESTA).
- Completability: a `prior_node_cleared` lock whose key node is itself only reachable past the lock
  = unsatisfiable cycle → the fixpoint never adds the terminal → reported stranded (the bug we want
  to catch). Atollo with a single gated inbound and no key path = stranded → caught by PR1 validator
  before PR2 merges.
- Unknown/absent season → season-gated edges fail closed (existing #2509 behaviour, preserved).

## 7. Verification (TDD)

- **Unit** (`metaNetworkCompletability`): a completable fixture → `ok:true`; a synthetic strand
  graph (terminal only reachable via an unsatisfiable gate) → `ok:false` with the stranded
  (start, season); the REAL alpha graph (PR1 then PR2) → `ok:true` for every season.
- **Routing** (`metaNetworkRouting` / campaign): the start branch yields 3 candidates
  (BADLANDS+FORESTA+CRYOSTEPPE); flag-OFF regression byte-identical.
- **Sim** (`fullLoopRouting`): under graph mode, greedy/NT/NF/SP walk and the routes are 3-way
  policy-sensitive (SP now diverges to CRYOSTEPPE); all complete, 0 violations. Re-run the 5-policy
  route report; update the report doc.
- Baselines: AI 500/500, sim green, prettier + governance + network validators + trace_hash green.

## 8. Flag / rollout / sequencing

`META_NETWORK_ROUTING` stays OFF. After BOTH PRs merge: run the **N=40 graph-mode band-verify**
(the "staging") → if bands hold, master-dd ratifies → **then** the PROD flag flip (separate PR/verdict;
reversible by setting the flag OFF). Each PR is owner-gated (data + live-flow), not auto-L3.

## 9. Open decisions for master-dd (ratify at the data-gate merges)

1. PR1: the `DESERTO_CALDO → CRYOSTEPPE` seasonal_bridge being **ungated** (perennial) vs gated by a
   non-winter season — ungated is required for a year-round 3-way; confirm.
2. PR2: Atollo's **encounter** (authored from the existing pool, e.g. a hardcore/pod-rush or a fuzzy
   tutorial id) + its **weight** + which node it attaches to (proposed CRYOSTEPPE in / ROVINE out).
3. Whether the completability validator should also **warn at server start** (dev surface) or stay
   test-only.
