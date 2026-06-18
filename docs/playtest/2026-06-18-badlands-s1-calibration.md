---
title: 'Badlands S1 calibration -- ferrimordax elite + ambient pair (#2850 follow-up)'
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-18'
language: en
tags: [playtest, calibration, badlands, species, n100, ai-driven]
---

# Badlands S1 calibration -- ferrimordax elite + ambient pair

S1 of the #2850 5-stub calibration (master-dd ratified plan:
`docs/planning/2026-06-18-species-calib-5stub-ratification.md`). Two NEW badlands
scenarios (the ratified pilot `enc_badlands_pilot_01` [0.40,0.60] is left untouched).

Runtime: node 22 (canonical). Seed 424242. Host 127.0.0.1, 4 shards base-port 3400
(prod 3334/3341 untouched). Multi-policy via calibrate_parallel.

## Adapter role-map extension (prereq)

The 5 #2850 species use legacy `role_trofico` (`predatore_terziario`,
`consumatore_primario/secondario`, `decompositore`) absent from the adapter's
`ROLE_TROFICO_MAP` -> all defaulted to `PREDATOR`. Extended the map (blast radius =
only these 5): `predatore_terziario->APEX`, `consumatore_secondario->PREDATOR`,
`consumatore_primario->PREY`, `decompositore->SUPPORT`. Canonical role_trofico kept
(master-dd field); the registry warning is a tracked follow-up. Smoke-verified:
ferrimordax -> APEX (hp 13, T3), rubrospina -> PREDATOR, ferriscroba -> SUPPORT.

## enc_badlands_elite_01 -- ferrimordax (RATIFIED)

Roster: ferrimordax-rutilus (T3 -> APEX, sole anchor) + ferrocolonia-magnetotattica
(PREDATOR) + sand-burrower (PREY) + nano-rust-bloom (T3 HAZARD). Lever =
`badlands_elite.enemy_damage_multiplier`.

| edm  | N   | WR   | note                              |
| ---- | --- | ---- | --------------------------------- |
| 1.5  | 10  | 0.70 | 1-apex too soft                   |
| 1.0  | 10  | 0.00 | 2-apex roster too hard (rejected) |
| 2.0  | 40  | 0.15 | floor                             |
| 1.8  | 40  | 0.30 | ceiling                           |
| 2.0  | 10  | 0.20 | probe                             |
| 1.9  | 100 | 0.16 | floor plateau                     |
| 1.85 | 100 | 0.16 | floor plateau (== 1.9)            |
| 1.8  | 100 | 0.29 | pre-cliff (ceiling)               |

**RATIFIED: edm 1.85 -> WR 0.16, N=100, in-band [0.15,0.30]** (defeat 0.84, kd 1.04).
Chosen on the stable 0.16 plateau (1.85 == 1.9 forensic).

**STEEP LEVER (hc06-style cliff)**: ~13pp WR drop over 0.05 edm (1.8->0.29 vs
1.85->0.16); the band mid (~0.22) is not reachable. Ratified value sits ~1pp from the
0.15 floor. **FOLLOW-UP design-call (master-dd)**: widen the elite band (e.g. [0.10,0.30])
or switch to a flatter knob (enemy HP) for margin -- mirrors the open hc06 steep-lever call.

## enc_badlands_ambient_01 -- rubrospina + ferriscroba (DESIGNED-WINNABLE)

Roster: rubrospina-velox (PREDATOR) + ferriscroba-detrita (SUPPORT) + sand-burrower +
ferrocolonia. **NOT a balance-oracle** (master-dd 2026-06-18): the T1 ambient flavor
pair die before dealing damage -> the party sweeps. WR 1.0 at N=10 AND N=40 even at
edm 2.2; the damage knob barely moves WR (enemies dead before they hit). Re-classified
as designed-winnable (tutorial-01-05 category). edm reset to 1.0 (neutral). The
"calibration" = confirm adapter stats sane (PREDATOR/SUPPORT, no warnings) + the
encounter stays winnable (floor band [0.70,1.00] for smoke). WR 1.0 N=40 -> winnable.

## vc

The 5 species carry heuristic vc (S0). Telemetry-driven vc refinement (N>=50 via
vcScoring) = S3, deferred.
