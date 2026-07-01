---
title: 'ER6 overrun carry-over -- graded re-ratify (W5 inc-3): band-neutral confirmed'
workstream: ops-qa
category: playtest
doc_status: review_needed
doc_owner: claude-code
last_verified: '2026-07-01'
language: en
tags: [playtest, calibration, spec-i, er6, overrun, carryover, n40, graded, w5, ai-driven]
---

# ER6 overrun carry-over -- graded re-ratify (W5 inc-3)

W5 inc-3, first mechanic. Re-ratifies the ER6 provisional band (SPEC-I N6, PR #3119) with the
**W5 graded metrics** (`enemy_hp_remaining_pct` / `ko_rate` / `hp_remaining_pct`) instead of the
WR-only full-loop meta band. Master-dd direction (2026-07-01 AskUserQuestion): **graded-confirm
band-neutral** -- ER6 is inert on current content, so confirm that with a sharper metric and turn
the band PROVISIONAL -> RATIFIED band-neutral. The "when-exercised" band (a forced-under-spend
scenario) was DEFERRED. Flag stays OFF in prod -- this measures, never flips.

## Why the graded metric (vs #3119 WR-only)

The #3119 band ran on `full-loop-batch` META metrics (completion_rate etc.) and was flat **by
construction** (the +1 overrun bonus almost always converts to a spawn in the same tick, so
carry-over rarely diverges from consume-once). W5's graded metrics read the COMBAT board directly
(enemy HP remaining = damage output, party HP + KO = attrition), so they detect a power/pressure
delta that a binary completion count hides. If the carry did anything on current content, these
would move.

## Method

Paired A/B, same seeds (`seed-base 7000`), in-process (supertest `createApp`, NO prod port,
node 22). Probe: `tools/sim/er6-carryover-graded-probe.js`. Canonical ER6 measurement point
(mirrors `spec-i-gates-probe` `EFFECTS.er6`): scenario `enc_hardcore_reinf_01`, biome
`abisso_vulcanico`, `pressure_start 30` (Alert tier), `--modulation duo_hardcore` (deployed 8 ->
10x10 so the authored reinforcement entry tiles are on-grid), `maxRounds 160`.

**BOTH arms** arm the overrun event (`STRESSWAVE_EVENTS_ENABLED=true`) so the carry path is
reachable. The ONLY between-arm difference is `REINFORCEMENT_OVERRUN_CARRYOVER_ENABLED`
(ON = carry the unspent bonus to the next tick; OFF = consume-once).

## Results (N=40, node 22)

| metric                    | consume-once (OFF) | carry-over (ON) | delta       |
| ------------------------- | ------------------ | --------------- | ----------- |
| win_rate                  | 1.000              | 1.000           | 0           |
| mean_enemy_hp_remaining   | 0.000              | 0.000           | 0           |
| mean_hp_remaining (party) | 0.9867             | 0.9863          | **-0.0004** |
| mean_ko_rate              | 0.000              | 0.000           | 0           |
| avg_rounds                | 36.13              | 36.55           | +0.42       |
| **overrun_rate** (fires)  | 1.000              | 1.000           | 0           |
| mean_spawns               | 4.0                | 4.0             | 0           |

## Read -- band-neutral RATIFIED (owner)

- **Mechanic fires** (anti-pattern #14): `overrun_rate = 1.0` in BOTH arms -- the overrun event
  arms every run and the pool spawns to its `max_total` cap (4). The A/B is NOT vacuous.
- **All graded channels flat**: `enemy_hp_remaining`, `ko_rate`, `win_rate` delta 0; `hp_remaining`
  delta -0.0004 (shrank from -0.0028 at N=6 -> pure run-to-run noise; sim not bit-repro
  cross-version, ~+-0.05). `avg_rounds` +0.42 = noise. Carry-over does NOT move any combat metric.
- **Caveat (honest)**: on this measurement point the party CLEARS the fight (WR 1.0, enemy_hp
  saturated at 0), so the enemy_hp channel alone could not discriminate a small carry effect.
  BUT `hp_remaining` (0.986, NOT saturated -- room to drop if the carry added pressure) and
  `ko_rate` (0 -- room to rise) are ALSO flat, so the band-neutral rests on non-saturated channels
  too. The graded confirm is robust: the carry's one extra delayed spawn is cleared with no
  residual damage/attrition.
- **Verdict**: ER6 carry-over is **band-neutral on current content**, confirmed with a sharper
  metric than #3119 -> **RATIFIED band-neutral** (owner). Mirrors the mechanic's nature (the +1
  bonus converts in-tick; carry only bites on forced under-spend, which current content does not
  produce). The flip stays OWNER-gated + is band-safe by this evidence.

## Deferred (master-dd)

The "when-exercised" band -- a synthetic scenario that FORCES under-spend at overrun time
(congested entry tiles / raised `OVERRUN_BUDGET_BONUS`) to measure what the carry does when it
actually fires -- was deferred (option 2 not taken). Revisit if/when content exercises the carry.

## Reproduce

```
node tools/sim/er6-carryover-graded-probe.js 40
```

See [[project_w5_sim_ai_player_upgrade]] (inc-3), `docs/playtest/2026-06-30-er6-overrun-carryover-n40-evidence.md`
(the #3119 WR-only band this re-ratifies), `docs/planning/2026-06-23-residual-gate-register.md` (N6).
