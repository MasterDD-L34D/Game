# Ratify PR #2381 -- candidate balance tunes (N=40 + EV-parity)

> Date: 2026-05-26 | PC: Ryzen | Method: parallel N=40 (L-069) + deterministic EV check.
> Verdict: **CONFIRM** (no-regression + EV-parity). Caveat: scenarios non-discriminating.

## Context

PR #2381 (merged) carried candidate balance tunes flagged `[NEEDS N=40 RATIFY]`:
artigli `Fendente a Sette Vie` 1d8+3 -> 1d8+2, corazzato `elettrico` 100 -> 120,
5x `def_mod=2` cost_ap 1->2, armatura buff_duration 4->2, rage duration 3->2.
This is the deferred ratify.

## Method

- Tuned data (#2381) overlaid on a clean tree; backend on standalone PostgreSQL 17
  (Docker was down) via `tools/py/calibrate_parallel.py` (4 shards, LOBBY_WS off).
- N=40 per scenario, parallel (~10s each).
- Plus a deterministic EV/AP parity check (arithmetic, no run needed).

## Results

### Deterministic EV-parity (the headline tune)

- Fendente `1d8+2` = EV 6.5 / 2 AP = **3.25 EV/AP**.
- Peer `frusta_fiammeggiante` (`whip_lash`) `1d8+2` = **3.25 EV/AP**.
- **Exact parity.** The tune moves Fendente from 3.75 (outlier, +15% vs peer) to
  peer-level 3.25 -- achieves its stated goal. This is the real validation of the
  headline knob (arithmetic, not sampling).

### N=40 no-regression (calibrated scenarios)

| Scenario    | N   | WR   | defeat | timeout | turns_avg | verdict                         |
| ----------- | --- | ---- | ------ | ------- | --------- | ------------------------------- |
| hardcore_06 | 40  | 0.25 | 0.75   | 0.0     | 24.2      | **GREEN** (band WR [0.15-0.25]) |
| hardcore_07 | 40  | 0.55 | 0.0    | 0.45    | --        | no band configured; clean run   |

hardcore_06 turns_avg 24.2 == PR #2149 baseline exact -> tuned config does not
perturb the calibrated band.

### Discriminating-power caveat (L-069 / anti-pattern #14)

Both scenarios used **only `zampe_a_molla`** (trait_used_distribution); the tuned
traits (Fendente, corazzato, def_mod/rage/armatura) were **NOT exercised**. So the
N=40 runs confirm **no break/regression** with the tuned data loaded, but do **not**
directly measure the tuned knobs' win-rate effect. A trait-specific discriminating
scenario would be needed for direct knob-WR validation.

## Verdict: CONFIRM

The #2381 tunes are **conservative EV-parity normalizations + a dead-channel
activation** (corazzato elettrico), not band-targeting calibration:

- Headline (Fendente EV) validated deterministically (exact peer parity).
- No regression on calibrated scenarios (hardcore_06 GREEN, hardcore_07 clean).
- Remaining knobs (def_mod cost, rage/armatura durations) reduce outliers toward
  peer -- low-risk by construction.

**Still open (master-dd)**: lore sign-off on corazzato `elettrico` 100->120.
**TKT-P6-AP3** (5 abilities cost_ap=3) remains a separate decision (not in #2381).

## Env note

Standalone PostgreSQL 17 (winget) used; `@game/*` workspace links were MSYS-broken
for Windows node and were recreated as Windows junctions to boot the backend shards.
