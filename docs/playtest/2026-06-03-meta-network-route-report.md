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
