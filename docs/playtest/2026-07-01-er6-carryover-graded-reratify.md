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
band-neutral** -- ER6 is inert on current content, so confirm that and turn the band PROVISIONAL
-> RATIFIED band-neutral. **The confirm is a behavioral-inertness proof** (the flag is a structural
no-op on this content -- see Read), not a "graded channels absorbed the carry" story. The
"when-exercised" band (a forced-under-spend scenario) was DEFERRED. Flag stays OFF in prod -- this
measures, never flips.

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

Three arms: OFF (consume-once), **OFF2** (consume-once REPLICATE = same-process + run-to-run noise
floor), ON (carry-over). The carry effect is real only if `on-off` EXCEEDS the `off2-off` floor
(Codex P1: same-process arms can drift via module-global state -- #3119 off/off2 methodology).

| metric                    | OFF    | OFF2   | ON     | **ER6 effect (on-off)** | noise floor (off2-off) |
| ------------------------- | ------ | ------ | ------ | ----------------------- | ---------------------- |
| win_rate                  | 1.000  | 1.000  | 1.000  | 0                       | 0                      |
| mean_enemy_hp_remaining   | 0.000  | 0.000  | 0.000  | 0                       | 0                      |
| mean_hp_remaining (party) | 0.9896 | 0.9900 | 0.9887 | **-0.0009**             | +0.0004                |
| mean_ko_rate              | 0.000  | 0.000  | 0.000  | 0                       | 0                      |
| **overrun_rate** (fires)  | 1.000  | 1.000  | 1.000  | --                      | --                     |
| mean_spawns               | 4.0    | 4.0    | 4.0    | --                      | --                     |

**The ER6 effect (`on-off` hp_remaining -0.0009) is the SAME magnitude as the noise floor
(`off2-off` +0.0004)** -- both ~+-0.001, indistinguishable. Every other channel is exactly 0 in
all three arms. The carry flag produces NO effect beyond the same-process / run-to-run noise.

## Read -- flag INERT on current content (behavioral-identity null)

> Framing corrected after adversarial review (2026-07-01): the flatness here is **behavioral
> identity**, NOT the party absorbing added carry-pressure. Instrumentation of the spawner
> (`reinforcementSpawner`) confirms `overrun_carry` is **NEVER nonzero** on this content -- so the
> two arms spawn identical units at identical ticks, and every metric is flat **by construction**.

- **Mechanic fires** (anti-pattern #14): `overrun_rate = 1.0` in BOTH arms -- the overrun event
  arms every run and the pool spawns to its `max_total` cap (4). `mean_spawns = 4.0` **identical**
  in both arms. The A/B is NOT vacuous (the overrun happens), but the CARRY path is structurally
  never taken.
- **Why behaviorally identical**: on every overrun tick the +1 bonus is spent IN THE SAME tick
  (base budget 1 + bonus 1 = 2 units spawned; the r9 tick has not yet hit the cap), so nothing is
  left over. The carry-accumulation branch (store the unspent bonus on
  `session.reinforcement_state.overrun_carry`, fold into the next tick) is never reached with a
  nonzero value. => ON == OFF, so all graded channels (enemy_hp, hp_remaining, ko_rate, WR) are
  flat by construction, not by attrition-absorption. (`hp_remaining` delta -0.0004 / `avg_rounds`
  +0.42 = pure noise; sim not bit-repro cross-version, ~+-0.05.)
- **Same-process drift ruled out (Codex P1)**: the arms run sequentially in one process, which can
  drift via module-global combat state. The `off2` control replicate (same flag + seeds as off)
  quantifies that drift as a floor: `off2-off` hp_remaining = +0.0004, i.e. the `on-off` "effect"
  (-0.0009) is the SAME magnitude as the noise floor and every other channel is 0. So the carry
  flag produces nothing beyond same-process noise. (The behavioral-inertness proof -- identical
  spawns + `overrun_carry == 0` from instrumentation -- is process-INDEPENDENT and is the stronger
  core; the floor is belt-and-braces.)
- **Honest scope -- what the graded metric did and did NOT do**: it did NOT add discriminating
  power over #3119 here, because there is **no behavioral differential to detect** -- a plain
  spawn-diff shows the same identity. The graded metric's discriminating value (inc-2:
  `enemy_hp_remaining` 0.71 -> 0.21 on a real power delta) is for POWER-differential mechanics
  (e.g. form-pulse W6), NOT for a flag that is structurally inert on the current content. This
  re-ratify's real product is the **behavioral-inertness proof**, delivered by the identical
  spawns + the `overrun_carry == 0` instrumentation, not by "robust graded channels".
- **Verdict**: ER6 carry-over is **INERT on current content** -- the flag is behaviorally a no-op
  because the +1 bonus always spends in-tick. **RATIFIED band-neutral = flag-safe to keep OFF, and
  band-safe if flipped ON on today's content (it changes nothing)**. This is NOT a clearance of the
  carry's ACTIVE behavior (when a tick under-spends) -- that is deferred (below) and, if future
  content forces under-spend, this evidence says nothing about it. Owner ratifies.

## Deferred (master-dd) -- where the graded metric WOULD add value

The "when-exercised" band -- a synthetic scenario that FORCES under-spend at overrun time
(congested entry tiles / raised `OVERRUN_BUDGET_BONUS`) so the carry actually accumulates
(`overrun_carry > 0`, an extra delayed spawn) -- was deferred (option 2 not taken). THAT is the
scenario where the graded metrics would genuinely discriminate (a real behavioral differential ->
more enemy pressure -> `enemy_hp_remaining` / attrition move). Revisit if/when content exercises
the carry.

## Note for the remaining inc-3 mechanics (D8, D6)

ER6 taught that a graded re-ratify of a mechanic that is **structurally inert on current content**
reduces to a behavioral-inertness proof (arms byte-identical), where the graded metric adds no
discriminating power over a spawn/behavior diff. If D8 (chain-lightning, needs electrified terrain)
and D6 (imprint grant) are likewise inert on the encounters that reach them, expect the same
behavioral-identity null. The graded metric's payoff is the POWER-differential lane (form-pulse W6).

## Reproduce

```
node tools/sim/er6-carryover-graded-probe.js 40
```

See [[project_w5_sim_ai_player_upgrade]] (inc-3), `docs/playtest/2026-06-30-er6-overrun-carryover-n40-evidence.md`
(the #3119 WR-only band this re-ratifies), `docs/planning/2026-06-23-residual-gate-register.md` (N6).
