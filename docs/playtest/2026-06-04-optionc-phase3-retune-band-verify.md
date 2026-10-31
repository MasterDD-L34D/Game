---
title: 'Option-C Phase 3 -- graph-mode re-tune band-verify (real rosters)'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-04'
source_of_truth: false
language: en
review_cycle_days: 30
---

# Option-C Phase 3 -- graph-mode re-tune band-verify (2026-06-04)

## The disambiguation (why the 0/10 happened)

The earlier graph-mode probe (N=10 greedy) returned **completion 0/10** with the real draft rosters
(#2603 wiring). This doc disambiguates: was it the terminal-climax gate (-> needs Phase 2
retry-allowance) or a stale calibration overlay?

`calibrationScaling()` applied **countMult 5 + hpAdd 4** -- a graph-mode default tuned for the
WEAK-FIXED fallback enemies (#2589, pre-#2603). Applied to the REAL authored rosters that #2603 now
loads, that is `5x` an authored hardcore roster -> brutal -> 0/10.

**Neutralising the overlay isolates the cause:**

| overlay (graph-mode, greedy)     | completion | reading                                                |
| -------------------------------- | ---------- | ------------------------------------------------------ |
| countMult 1 + hpAdd 0 (authored) | **10/10**  | the real rosters incl the terminal climax are WINNABLE |
| countMult 3 + hpAdd 2            | ~0.6-0.75  | band-landing                                           |
| countMult 4 + hpAdd 0            | 0.1        | too hard                                               |
| countMult 5 + hpAdd 4 (stale)    | **0**      | the artifact                                           |

→ **The 0/10 was a CALIBRATION ARTIFACT, not an inherent climax gate.** The terminal climax is
winnable (10/10 at authored). **Therefore retry-allowance (option-C Phase 2) is NOT needed and is
dropped.** The fix is a single knob: the graph-mode overlay drops to `countMult 3 + hpAdd 2`.

## N=40 ratify (countMult 3 + hpAdd 2 + dcAdd 1, `--isolate`)

master-dd chose the TIGHTER ~0.6 centre over the easy ~0.77. The razor-steep HP curve cannot pin a
tight centre (`hpAdd 2 -> 3` jumps ~0.77 -> ~0.2), so the fine knob is **`dcAdd`** (enemy defense;
sim-only -- does NOT change the encounter telegraph or the actual game combat):

| overlay (cm3 + hp2 +) | greedy    | ESFP     | INTJ     | centre            |
| --------------------- | --------- | -------- | -------- | ----------------- |
| dcAdd 0               | 0.75      | 0.775    | 0.775    | ~0.77 (easy)      |
| **dcAdd 1 (ADOPTED)** | **0.675** | **0.70** | **0.60** | **~0.66 (tight)** |
| dcAdd 2               | 0.375     | 0.575    | 0.45     | ~0.47 (hard)      |

**Adopted `dcAdd 1`:** N=40 greedy 0.675 / ESFP 0.70 / INTJ 0.60 -- all inside the tight **0.4-0.7**
band, INTJ right at the ~0.6 target. (`0.6` exactly is not pinnable; the integer-knob distribution
is the QD-healthy reality the #2589 razor-steep property predicts.)

## What shipped + what is owner-gated

- **Shipped (this PR):** `calibrationScaling()` graph-mode default `countMult 5 + hpAdd 4 -> countMult
3 + hpAdd 2 + dcAdd 1` (`tools/sim/full-loop-batch.js`); static default (`countMult 5 + hpAdd 3 +
dcAdd 0`) unchanged -> ratified static `cave_path` bands hold (graph-only, test-locked 25/25).
  option-C Phase 2 (retry-allowance) dropped.
- **Owner re-ratify (master-dd):** completion centre ~0.66, inside the tight 0.4-0.7 band (the chosen
  target). Update the `meta-band-aggregator` PROVISIONAL_BANDS to ratify it.
- **Then:** merge; the Godot `graph_mode` consumer -- 🔴 the Godot game runs combat LOCALLY
  (`round_orchestrator` + D20Resolver), NOT via the backend `/session/start`, so the routed draft
  encounters need Godot-side loading (a GDScript C1 equivalent) -- NOT a one-line body flag, scope
  separately before the flip; then the flip.

## Reproduce

```
META_NETWORK_ROUTING=true FL_ENEMY_COUNT_MULT=3 FL_ENEMY_HP_ADD=2 \
  node tools/sim/full-loop-batch.js --runs 40 --policy greedy --isolate --out <dir>
```

(needs the #2603 real-roster wiring; without `FL_ENEMY_*` the new graph-mode default is the same cm3/hp2.)
