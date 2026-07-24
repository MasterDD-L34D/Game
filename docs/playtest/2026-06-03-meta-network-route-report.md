---
title: 'Meta-network live routing - full-loop route report (flag ON)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-03'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Meta-network live routing — full-loop route report

> Exercise of GAP-C slice A+C ([PR #2582](https://github.com/MasterDD-L34D/Game/pull/2582),
> merged `4bc421c0`) with `META_NETWORK_ROUTING=true` in the full-loop AI sim. Goal: confirm
> graph-routed campaign flow works end-to-end with REAL combat and is **policy-sensitive**
> BEFORE any prod flag flip. The flag stays **OFF** in prod — this is a sim-only exercise.

## Setup

- Runner: `tools/sim/full-loop-runner.js` (`runFullLoop`, flag ON), real combat per node, one
  attempt per mission, Nido recruit on each cleared non-terminal node.
- Graph: `meta_network_alpha.yaml` (5 nodes / 12 edges, schema 2.1). Start node `DESERTO_CALDO`,
  terminal `ROVINE_PLANARI`.
- Roster: 2 starters (dune_stalker + velox, hp30/mod20, job stalker). Deterministic per-policy seed.
- Policies: greedy + 4 MBTI temperaments (one per Keirsey group). Route pick at a multi-candidate
  branch = `policy.chooseRoute(candidates)`.

## Results (5 runs, all completed, 0 invariant violations)

| Policy    | Route (nodes)                                                 | Encounters played                                  | Recruits |
| --------- | ------------------------------------------------------------- | -------------------------------------------------- | -------- |
| greedy    | DESERTO_CALDO → ROVINE_PLANARI                                | savana_01 → tutorial_05                            | 1        |
| ESFP (SP) | DESERTO_CALDO → ROVINE_PLANARI                                | savana_01 → tutorial_05                            | 1        |
| INTJ (NT) | DESERTO_CALDO → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI | savana_01 → tutorial_03 → caverna_02 → tutorial_05 | 3        |
| ENFP (NF) | DESERTO_CALDO → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI | (idem)                                             | 3        |
| ISTJ (SJ) | DESERTO_CALDO → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI | (idem)                                             | 3        |

## Findings

1. **Graph routing is solid end-to-end.** 5/5 runs complete with real combat, zero invariant
   violations. The graph drives the whole loop (campaign → combat → advance → Nido recruit → next).
2. **Routing is policy-sensitive (P4 hook).** Two route clusters emerge from the same start:
   - **Shortcut (2 nodes):** greedy (weight-max) + ESFP/SP (prefers `seasonal_bridge`) → straight to
     the terminal `ROVINE_PLANARI`.
   - **Scenic (4 nodes):** NT / NF / SJ (prefer `corridor`) → DESERTO → BADLANDS → FORESTA → ROVINE.
3. **Emergent meta-loop effect.** The scenic route clears 3 extra nodes → **3 recruits** vs the
   shortcut's **1**. Temperament changes how much the Nido grows — a real P4 signal in the
   meta-loop, not just cosmetic path choice.

## Two notes before a prod flip (graph-topology follow-up)

- **Divergence at the start branch is binary.** `DESERTO_CALDO` only offers `corridor` (BADLANDS) +
  `seasonal_bridge` (ROVINE) — no `trophic_spillover` — so NF cannot diverge from NT/SJ there.
  Richer per-temperament divergence needs branches that expose all three edge types.
- **The shortcut reaches the terminal in 2 nodes**, skipping BADLANDS + FORESTA and arriving at the
  boss cheaply. Design question: should the climax be that cheap to reach?

Both are **data-only** (YAML) tuning and are scoped in
[`docs/superpowers/specs/2026-06-03-meta-network-graph-topology-followup.md`](../superpowers/specs/2026-06-03-meta-network-graph-topology-followup.md).

## Verdict

Routing works and is meaningful for P4. Safe to consider for staging. Recommend the graph-topology
tuning (free, YAML-only) before the prod flag flip, which remains a separate owner verdict.

## Post-tuning update (same PR set — graph-topology follow-up applied)

The two notes above were addressed as **data-only** YAML edits to `meta_network_alpha.yaml`:

- **1A** — added a `trophic_spillover` edge `DESERTO_CALDO → FORESTA_TEMPERATA`, so the start branch
  now exposes `corridor` (BADLANDS) + `trophic_spillover` (FORESTA).
- **2B** — gated the direct `DESERTO_CALDO → ROVINE_PLANARI` edge behind
  `prior_node_cleared: [BADLANDS, FORESTA_TEMPERATA]`, closing the 2-node shortcut to the terminal.
  (Only that edge is gated — gating `FORESTA → ROVINE` too would strand BADLANDS, a dead end, so the
  terminal stays reachable via the arc.)

Re-running the same 5-policy sim (all complete, 0 violations):

| Policy    | Route (nodes)                                                 | Recruits |
| --------- | ------------------------------------------------------------- | -------- |
| greedy    | DESERTO_CALDO → FORESTA_TEMPERATA → ROVINE_PLANARI            | 2        |
| ENFP (NF) | DESERTO_CALDO → FORESTA_TEMPERATA → ROVINE_PLANARI            | 2        |
| ESFP (SP) | DESERTO_CALDO → FORESTA_TEMPERATA → ROVINE_PLANARI            | 2        |
| INTJ (NT) | DESERTO_CALDO → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI | 3        |
| ISTJ (SJ) | DESERTO_CALDO → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI | 3        |

Outcome: **the 2-node shortcut is gone** (every route is now ≥3 nodes and passes through the
mid-arc), and start divergence is `corridor` (NT/SJ → BADLANDS) vs `trophic` (greedy/NF/SP →
FORESTA). Recruit spread tightened to 2-vs-3 (was 1-vs-3). A true simultaneous 3-way branch (all
three edge types eligible at once) is still not present — the sparse 5-node graph can't host it
without a dead-end risk; that is a larger graph-expansion item, not a tuning. **Recommendation:** the
graph is now flip-ready for staging; the prod flag flip remains a separate owner verdict.

## Graph expansion PR1 (3-way branch + completability validator)

The "true 3-way branch" noted above as a graph-expansion item is now implemented (spec
`docs/superpowers/specs/2026-06-03-meta-network-graph-expansion-design.md`): an **ungated
`DESERTO_CALDO → CRYOSTEPPE` seasonal_bridge** so the start node exposes all three edge types at
once, plus a pure **Dormans completability validator** (`metaNetworkCompletability.js`) proving the
graph reaches a terminal in every season. Re-running the sim (all complete, 0 violations):

| Policy    | Route (nodes)                                                              |
| --------- | -------------------------------------------------------------------------- |
| greedy    | DESERTO_CALDO → FORESTA_TEMPERATA → ROVINE_PLANARI                         |
| INTJ (NT) | DESERTO_CALDO → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI              |
| ESFP (SP) | DESERTO_CALDO → CRYOSTEPPE → BADLANDS → FORESTA_TEMPERATA → ROVINE_PLANARI |

Three policies now pick **three different first nodes** (FORESTA / BADLANDS / CRYOSTEPPE) — a true
3-way divergence. PR2 (the Atollo Obsidiana 6th node) follows in a separate PR, gated by the
completability validator. Flag stays OFF; the prod flip awaits the N=40 graph-mode band-verify.

## Graph expansion PR2 (Atollo Obsidiana 6th node)

The 6th canonical biome-node `ATOLLO_OBSIDIANA` is now wired in: `CRYOSTEPPE → ATOLLO_OBSIDIANA`
(ungated seasonal_bridge) + `ATOLLO_OBSIDIANA → ROVINE_PLANARI` (corridor). The completability
validator confirms the 6-node graph reaches the terminal in every season and that Atollo is
reachable. The SP temperament, which already routes to CRYOSTEPPE, now takes the seasonal bridge
to the atoll:

| Policy    | Route (nodes)                                                      |
| --------- | ------------------------------------------------------------------ |
| ESFP (SP) | DESERTO_CALDO → CRYOSTEPPE → **ATOLLO_OBSIDIANA** → ROVINE_PLANARI |

The 6-node graph is now complete (all 4 canonical biomes from the vault canvas are nodes). Flag
stays OFF; next is the N=40 graph-mode band-verify, then the owner-gated prod flip.
