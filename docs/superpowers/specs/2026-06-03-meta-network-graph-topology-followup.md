---
title: 'Meta-network graph-topology follow-up (3-edge branches + shortcut cost)'
doc_status: draft
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-03'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Meta-network graph-topology follow-up

> Scoping (no implementation) for two **data-only** tuning items surfaced by the live-routing route
> report ([`docs/playtest/2026-06-03-meta-network-route-report.md`](../../playtest/2026-06-03-meta-network-route-report.md)).
> Both touch only `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml` (schema
> 2.1) + its `trace_hash`. No engine change. Owner-gated (data + it shapes the live route once the
> flag flips). Master-dd ratifies the verdicts; a follow-up PR implements the chosen options.

## Context (verified on `4bc421c0`)

GAP-C slice A+C wired the graph into live campaign routing (flag `META_NETWORK_ROUTING`, OFF by
default). The route report ran the full-loop sim flag-ON across greedy + 4 MBTI temperaments: all
complete, routing is policy-sensitive (greedy/SP take a 2-node shortcut to the terminal; NT/NF/SJ
take a 4-node scenic route → 3 recruits vs 1). Two topology weaknesses surfaced.

## Item 1 — Start branch can't show 3-way temperament divergence

**Problem.** `DESERTO_CALDO` (start) has 2 outgoing edges: `corridor` → BADLANDS, `seasonal_bridge`
→ ROVINE_PLANARI. The MBTI `chooseRoute` ranks by edge-type preference (NT/SJ → corridor, NF →
trophic_spillover, SP → seasonal_bridge). With no `trophic_spillover` candidate at the start, NF
falls back to its 2nd preference (corridor) and routes identically to NT/SJ. So the start branch
collapses to a binary (corridor-cluster vs seasonal-cluster) — temperament divergence is
under-expressed.

**Goal.** At least one early multi-candidate branch should expose all three edge types
(`corridor` + `seasonal_bridge` + `trophic_spillover`) so NT, NF, SP pick three different nodes.

**Options.**

- **A (recommended).** Add a `trophic_spillover` edge from the start node (or an early node) to a
  third distinct target, so the start branch is genuinely 3-way. Smallest change; directly fixes the
  collapse. Must keep the graph completable (Dormans: ≥1 non-gated path to a terminal).
- **B.** Re-home the start node to a node that already has 3 edge types outgoing (e.g. CRYOSTEPPE has
  corridor + trophic_spillover + seasonal_bridge to BADLANDS/FORESTA). Changes the arc's opening
  biome — bigger narrative ripple.
- **C.** Leave as-is; accept binary start divergence (richer divergence emerges deeper in the graph).

**Gate.** Data-only YAML + `trace_hash` recompute (inline `_stable_digest`); network validators +
`tests/scripts/test_trace_hashes.py`; the resolver/routing tests already assert the field plumbing.
Add a routing test asserting a 3-way branch yields 3 distinct temperament picks.

## Item 2 — Terminal reachable in 2 nodes (cheap shortcut)

**Problem.** `DESERTO_CALDO → ROVINE_PLANARI` is a direct `seasonal_bridge` edge, and ROVINE_PLANARI
is `terminal`. So greedy + SP clear the start encounter then jump straight to the boss — 2 nodes, 2
encounters, 1 recruit — skipping BADLANDS + FORESTA. The climax is reachable very cheaply.

**Goal.** Make reaching the terminal require meaningful progression (unless a fast "speedrun" route
is intentionally desired).

**Options.**

- **A.** Drop the direct `DESERTO_CALDO → ROVINE_PLANARI` edge → the terminal is reached only via the
  BADLANDS/FORESTA arc. Simplest gate; removes the shortcut entirely.
- **B (recommended).** Keep the edge but gate it with an arc-condition (the fase-2 mechanism already
  live): `conditions: { prior_node_cleared: [BADLANDS, FORESTA_TEMPERATA] }` on the ROVINE approach,
  so the terminal opens only after the mid-arc is cleared. Reversible, expressive, reuses
  `_evalEdgeConditions`.
- **C.** Add a `min_cleared` style gate on the terminal node (needs a new condition evaluator =
  small engine change → out of "data-only" scope; defer).
- **D.** Leave as designed — treat the 2-node path as an intentional high-risk speedrun route.

**Gate.** Same as Item 1 (data + trace_hash + validators). Option B is data-only and reuses the
existing condition evaluator; re-run the route report to confirm greedy/SP no longer shortcut and
the band metrics stay sane.

## Open decisions for master-dd

1. Item 1 — option A / B / C?
2. Item 2 — option A / B / C / D? (B recommended: data-only, reversible, reuses arc-conditions.)
3. Sequencing vs the prod flag flip: do these land BEFORE enabling `META_NETWORK_ROUTING` in prod
   (recommended) or after a first staged run?
