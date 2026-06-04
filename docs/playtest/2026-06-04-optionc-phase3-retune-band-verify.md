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

## N=40 ratify (countMult 3 + hpAdd 2, `--isolate`)

| policy | completion        | vs #2589 ratified band (0.4-0.85) |
| ------ | ----------------- | :-------------------------------: |
| greedy | 30/40 = **0.75**  |                ✅                 |
| ESFP   | 31/40 = **0.775** |                ✅                 |
| INTJ   | 31/40 = **0.775** |                ✅                 |

Consistent ~0.77 across policies (the policy spread is tight at N=40, unlike the N=12 probe). This
sits inside the **#2589-ratified wider band (0.4-0.85)** but **above the 0.4-0.7 PROVISIONAL** still
shown by `meta-band-aggregator` (the aggregator's provisional was never widened to the ratified
number). The razor-steep HP curve (a documented #2589 property) keeps integer knobs from pinning a
tighter centre.

## What shipped + what is owner-gated

- **Shipped (this PR):** `calibrationScaling()` graph-mode default `countMult 5 + hpAdd 4 -> 3 + 2`
  (`tools/sim/full-loop-batch.js`); static default (`countMult 5 + hpAdd 3`) unchanged -> ratified
  static `cave_path` bands hold (graph-only change, test-locked 25/25). Phase 2 dropped.
- **Owner re-ratify (master-dd decision-handoff):** the graph-mode completion centre is ~0.77.
  Ratify it as the band (it is within the already-ratified 0.4-0.85), OR ask for a tighter centre
  (~0.6) -- a slightly harder overlay (e.g. `countMult 3 + hpAdd 3`) would lower it, at the cost of
  the razor-steep variance. Also: update the aggregator's PROVISIONAL_BANDS to the ratified number.
- **Then:** the flip (the only remaining option-C step) + the Godot `graph_mode:true` consumer wire.

## Reproduce

```
META_NETWORK_ROUTING=true FL_ENEMY_COUNT_MULT=3 FL_ENEMY_HP_ADD=2 \
  node tools/sim/full-loop-batch.js --runs 40 --policy greedy --isolate --out <dir>
```

(needs the #2603 real-roster wiring; without `FL_ENEMY_*` the new graph-mode default is the same cm3/hp2.)
