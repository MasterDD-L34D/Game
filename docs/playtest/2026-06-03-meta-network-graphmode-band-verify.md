---
title: 'Meta-network graph-mode band-verify + difficulty re-calibration (staging)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-03'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Meta-network graph-mode band-verify (staging)

> Staging gate before the `META_NETWORK_ROUTING` prod flip. The graph routing + 6-node expansion
> (PR #2582/#2585/#2587) is exercised in the full-loop band-verify (`tools/sim/full-loop-batch.js`,
> N=40, `--isolate`) under graph mode, the difficulty re-calibrated for the shorter graph routes,
> and the graph-mode bands ratified by master-dd. The flag stays **OFF** in prod — this is a
> sim-only calibration; the prod flip remains a separate verdict.

## 1. Why re-calibration was needed

The static-chain calibration (`calibrationScaling` countMult 5 / hpAdd 3, ratified
`docs/playtest/2026-06-02-full-loop-band-report.md`) was tuned over the long cave_path mission
chain. Graph routes are **shorter** (greedy 3 nodes, ESFP 5) so the same enemy scaling left
completion too high — initial graph-mode N=40: greedy **0.9**, ESFP **0.825** (band 0.4-0.7, OOB).

## 2. Calibration sweep (graph-mode greedy, completion_rate vs `hpAdd`)

| hpAdd                 | completion_rate (graph-mode greedy)        | note                           |
| --------------------- | ------------------------------------------ | ------------------------------ |
| 3 (static default)    | 0.9                                        | too easy (short route)         |
| **4 (graph default)** | **0.5 (N=20) / 0.65 (N=40) / 0.85 (N=40)** | band centre, **high variance** |
| 5                     | 0.2                                        | too hard                       |
| 10                    | 0.0                                        | unwinnable                     |

**The HP curve is razor-steep** (1 HP/unit swings completion ~0.3-0.65) so completion has high
run-to-run variance near the band — no integer `hpAdd` pins it tightly. `hpAdd 4` is the band
centre (mean ~0.65) and is shipped as the **graph-mode default** (`META_NETWORK_ROUTING=true`);
the static default stays `3` so the ratified static bands are untouched. Reversible via `FL_ENEMY_*`.

## 3. Ratified graph-mode bands (master-dd, 2026-06-03)

Graph routes legitimately differ from the static chain (shorter ⇒ fewer mission gates + fewer
breeding cycles), so master-dd ratified **wider graph-mode bands** (the bands are PROVISIONAL per
L-069; these supersede the static values for graph-mode runs only):

- **completion_rate: 0.4 – 0.85** (was 0.4-0.7) — absorbs the razor-steep variance + the short-route
  ceiling.
- **lineage_diversity: ≥ 2** (was ≥3) — graph routes accumulate fewer distinct breeding crosses.
- All other bands: unchanged from the static report.

## 4. N=40 placement (graph-mode, hpAdd 4, --isolate) vs the ratified graph-mode bands

| Metric              | Graph band | greedy (3-node route) | ESFP (5-node route) |
| ------------------- | ---------- | --------------------- | ------------------- |
| completion_rate     | 0.4 – 0.85 | 0.65 – 0.85 ✅        | 0.75 ✅             |
| roster_attrition    | 0 – 1      | 0.55 ✅               | 0.51 ✅             |
| economy_flow        | 0.5 – 2    | 1.0 ✅                | 1.0 ✅              |
| relationship        | composite  | ✅                    | ✅                  |
| offspring_viability | ≥ 1        | 0.65 ⚠️               | 1.5 ✅              |
| lineage_diversity   | ≥ 2        | 1 ⚠️                  | 2 ✅                |
| roster_composition  | ≥ 3        | 2 ⚠️                  | 3 ✅                |

## 5. Finding: the greedy short-route floor

Completion is calibrated (both policies in the wider band). The meta-loop **volume** metrics
(offspring / lineage / composition) are **route-length dependent**, not difficulty dependent:

- **ESFP (5-node route via Atollo)** meets every band — the longer route runs more recruit/mate
  cycles.
- **greedy (3-node route)** under-produces offspring (0.65) / lineage (1) / composition (2): the
  shortest route is structurally minimal for breeding + recruiting. This is a property of the
  "rush" policy, not a balance bug — a player who beelines the terminal gets a thinner Nido.

## 6. Recommendation for the prod flip

Graph-mode is **band-OK for richer-route policies** and completion is calibrated. The residual is
the greedy rush-route floor on the meta-loop volume metrics (a design property). Master-dd's flip
decision can weigh: (a) accept the rush-route floor as intended (rush = thin Nido), or (b) defer the
flip until a future tuning nudges greedy onto a slightly longer route. The flip itself
(`META_NETWORK_ROUTING=true` in prod) stays a separate, reversible owner verdict.
