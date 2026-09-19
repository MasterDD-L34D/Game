---
title: 'W5 inc-1 -- focus-fire A/B evidence (band-neutral: survival lever, not speed lever)'
date: 2026-07-01
sprint: closeout-w5-sim-harness
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# W5 inc-1 -- focus-fire A/B evidence

> First W5 increment. Probe: `tools/sim/focus-fire-ab-probe.js` (paired-seed OFF vs ON,
> in-process supertest, node 22, NO prod). Plan: `docs/superpowers/plans/2026-07-01-w5-sim-ai-player-upgrade.md`.
> **Result: focus-fire is band-NEUTRAL on both tested setups.** Not a failure -- a scouting
> result that falsifies focus-fire as the primary Gap-A lever and redirects inc-2 to positioning.

## 1. What shipped (inc-1)

- **Graded calibration metrics** (`combat-adapter.js`): `hp_remaining_pct` (mean survivor HP
  fraction) + `units_lost`, additive to the run result. AI-independent. The Gap-C measurement
  surface (master-dd Q2) -- a team-power delta that binary win/lose collapses (cakewalk vs
  limped-in) is now readable. PROVEN live (populate in every probe run).
- **F1 focus-fire** (`combat-policy.js selectPlayerAction`, `opts.focusFire`): among IN-RANGE
  enemies, target the lowest-HP (finish-off) instead of the nearest. Default OFF = byte-identical.
  First factor of the ratified utility-AI (Q1). Unit-tested (5 cases, RED-GREEN); 214/214 sim green.

## 2. A/B results (paired seed, OFF vs ON)

### 2a. Hardcore -- `enc_badlands_ultima_caccia_01` wave-1 (canonical badlands party)

| Metric                | N=20 OFF | N=20 ON | N=40 OFF | N=40 ON |
| --------------------- | -------- | ------- | -------- | ------- |
| win_rate              | 0.000    | 0.000   | 0.025    | 0.025   |
| creature_ko_rate      | 0.3625   | 0.3625  | 0.3563   | 0.3563  |
| mean_hp_remaining_pct | 0.958    | 0.965   | 0.958    | 0.957   |
| avg_rounds            | 40.0     | 40.0    | 39.83    | 39.83   |
| timeouts              | 20/20    | 20/20   | 39/40    | 39/40   |

**wr_delta = 0, ko_rate_delta = 0.** Timeout-bound (39-40/40 hit the round cap); survivors sit
at ~96% HP. The party neither wins (can't finish 5 hardcore foes in 40 rounds) nor loses (barely
takes damage). Focus-fire changes nothing.

### 2b. Synthetic elimination cluster (4p vs 5 staggered-HP foes, no objective)

| Metric                | N=20 OFF | N=20 ON |
| --------------------- | -------- | ------- |
| win_rate              | 1.000    | 1.000   |
| avg_rounds            | 27.20    | 27.25   |
| mean_hp_remaining_pct | 1.000    | 1.000   |

Both arms win every run; avg_rounds identical (27.2 vs 27.25); players take 0 damage. Focus-fire
changes nothing here either.

## 3. Finding -- focus-fire is a SURVIVAL lever, not a speed lever

Killing all N enemies requires the same TOTAL damage regardless of the order you kill them in ->
focus-fire does NOT reduce time-to-eliminate-all. Its only benefit is removing an enemy's future
INCOMING damage sooner (a dead foe stops hitting you). So it moves a metric ONLY when the player
party is under sustained attrition. On BOTH tested setups the party was not being ground down
(survivors 96-100% HP) -> kill-order was outcome-neutral.

Corollary for W5: the Gap-A saturation on these encounters is **timeout / positioning-driven**
(can't close + finish; or concentrated-burst deaths), **NOT target-selection-driven**. A smarter
target picker is the wrong lever here.

## 4. Redirect (drives inc-2)

- **Elevate F3 positioning to the primary Gap-A/B lever** (was inc-2, now evidence-motivated):
  terrain-cost-aware movement + threat-avoidance (don't end in a high-incoming-threat tile; close
  distance efficiently). Test whether better positioning converts the hardcore timeouts into
  decisions AND surfaces the volo/radici terrain power (Gap B -> G6).
- **Revisit the timeout structure**: 40-round cap + the party's inability to finish is itself a
  calibration artifact worth checking (is `maxRounds` too tight, or is player DPR too low for the
  hardcore roster?). A follow-up probe should separate "can't win because timeout" from "can't
  win because wiped".
- **Keep focus-fire** as the utility-scorer scaffold (byte-identical OFF, correct, foundation for
  F2/F3/F4). Do NOT flip its default; its value will materialize once the party is under real
  attrition (a wipe-prone encounter) -- re-measure then.

## 5. Reproduce

```
node tools/sim/focus-fire-ab-probe.js 40 hardcore     # 2a
node tools/sim/focus-fire-ab-probe.js 20 synthetic    # 2b
```

Sim is NOT bit-repro cross node-version (calibrate + read on node 22; variance ~+-0.05). The
shipped code is byte-identical with `focusFire` OFF (the default), so inc-1 is inherently
band-safe for the existing harness + bands.
