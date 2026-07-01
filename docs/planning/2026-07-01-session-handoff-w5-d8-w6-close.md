---
title: 'W5 continuation close -- D8 NULL + W6 form-pulse graded ratify + staged-latent flip'
date: 2026-07-01
sprint: closeout-w5-sim-harness
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
review_cycle_days: 90
---

# W5 continuation close -- D8 + W6 (graded re-ratify lane)

Continuation of the W5 sim-harness program (kickoff handoff
[`2026-07-01-session-handoff-w5-inc123.md`](2026-07-01-session-handoff-w5-inc123.md)). Executed the
grilling-decided plan: **D8 -> W6**. **3 PR merged, 0 open, prod untouched, nothing flipped live.**

## Done this session

| lane | PR                                                       | commit     | outcome                                                                                                         |
| ---- | -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| D8   | [#3136](https://github.com/MasterDD-L34D/Game/pull/3136) | `31c07902` | chain-lightning graded re-ratify = **NULL by non-exercise** (flag inert in sim). Autonomous on NULL (Q2).       |
| W6   | [#3139](https://github.com/MasterDD-L34D/Game/pull/3139) | `92e52636` | form-pulse v2 graded cross-biome A/B (the power-differential payoff) + **producer party-normalization** (prod). |
| W6   | [#3143](https://github.com/MasterDD-L34D/Game/pull/3143) | `a0a9cce1` | numeric-seed fix (Codex #3139 P1) + D8 fire-count error-guard (Codex #3136 P2). All 3 Codex threads resolved.   |

## The two headline results

1. **The graded metric bites ONLY on power-differential mechanics.** D8 (like ER6) is a NULL --
   structurally inert in the AI sim (neither faction emits a water/lightning channel, so
   `tile_state_map` never electrifies; the fire-count reads 0 across N=40, proven by an instrument
   self-test). W6 form-pulse is the REAL one: the flag MOVES the graded channels.
2. **W6: the enemy-HP offset over-compensates OFFENSE** (paired net enemy_hp **+0.12** at the as-built
   anchor 1.4, all 5 biomes, drift floor exactly 0.000) while leaving an **irreducible survival tilt**
   (ko_rate negative at every anchor -- a single HP knob can't null a 2-D offense+survival buff). The
   producer is now **party-normalized** (`sqrt(nPlayers)`) so ONE imprint weight `w~0.78` hits the
   30-40% imprint-win target across party sizes.

## Completed plans / evidence (links)

- D8 evidence: [`docs/playtest/2026-07-01-d8-chain-lightning-graded-reratify.md`](../playtest/2026-07-01-d8-chain-lightning-graded-reratify.md)
- W6 evidence (incl. the seed-fix CORRECTION section): [`docs/playtest/2026-07-01-w6-form-pulse-v2-graded-cross-biome.md`](../playtest/2026-07-01-w6-form-pulse-v2-graded-cross-biome.md)
- W5 SoT plan: [`docs/superpowers/plans/2026-07-01-w5-sim-ai-player-upgrade.md`](../superpowers/plans/2026-07-01-w5-sim-ai-player-upgrade.md)
- Form-pulse build-spec (W1-W6): [`docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md`](2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md)
- Cross-session SoT: [`2026-06-29-closeout-master-plan.md`](2026-06-29-closeout-master-plan.md) (X1 + Godot G6 lane) + [`2026-06-23-residual-gate-register.md`](2026-06-23-residual-gate-register.md) (W5 row + N3/N5/N7/N8 + D6/D8)
- Prior W5 handoff: [`2026-07-01-session-handoff-w5-inc123.md`](2026-07-01-session-handoff-w5-inc123.md)

## Staged-latent (prod INTACT -- the agent did NOT restart)

`~/.config/api-keys/keys.env` (CODEMASTERDD), inert until restart:

```
export FORM_PULSE_TRAIT_V2_ENABLED=true
export FORM_PULSE_V2_ENEMY_HP_OFFSET=1.20
export FORM_PULSE_IMPRINT_WEIGHT=0.78
```

Prod backend 3334 verified UP (200) + unchanged (the running process holds the old env). Reversible:
delete the 3 lines (OFF = byte-identical).

## OWNER TODO (2 decisions, owner-sequenced)

1. **Anchor 1.20 vs 1.15.** The staged value is **1.20** (master-dd's explicit round-3 pick). AFTER the
   Codex seed-fix, the PAIRED anchor sweep moved the offense-null (net enemy_hp ~0) to **~1.15** (1.20 =
   +0.038, mild over-comp). The agent LEFT 1.20 and surfaced 1.15 -- the auto-mode classifier correctly
   blocked substituting a re-derived value on an armed prod-flip param. If offense-null is the goal,
   change the keys.env anchor to 1.15 before restart. (The irreducible ~-0.06 ko survival tilt exists at
   any anchor -- v2 = "leave a mark".)
2. **The flip = deploy + restart (owner).** Prod must be deployed to main `>= 92e52636` (the producer
   party-normalization -- else `w=0.78` unnormalized makes imprint win ~90%), THEN restart the backend.
   The chip never restarts prod.

## Residual inventory (next lanes -- owner-gated / chip-executable)

- **Graded-sim lane (chip)**: **D6** axis->trait grant re-ratify (imprint grant
  `dilatazione_temporale_percettiva` extra_damage; same paired graded approach) · **N3** SPEC-I ER7
  flag-ON N=40 (`BIOME_POPULATION_ENABLED`, build shipped #2723).
- **Godot cross-repo (chip)**: **G6** move-terrain engine-AP-enforcement (Game-Godot-v2, dep X1/#3053) --
  N=40 Godot-scope + parity vs `moveCost.js`. Verify PC identity before cross-PC action.
- **Human-playtest (owner, surfaced)**: N5 A2 floor re-tune (upward-only), N7 interoception knob, N8
  DR2=2 radici ratify -- need HUMAN playtest, not sim.
- **W6 follow-on**: per-pick imprint power measurement (if the picks need power-balancing); a
  higher-attrition point already un-masked the defensive buff (attrition artifact).

## Lessons banked (durable)

- **Numeric seeds for paired sim** (`lesson_numeric_seeds_paired_sim`): `/api/session/start` seeds the
  combat RNG only when `Number(seed)` is finite (session.js:2102) -- a STRING seed = `Math.random` =
  arms NOT paired + non-reproducible. Verify by rerunning twice -> byte-identical.
- **Graded metric adds value ONLY on power-differential mechanics** -- inert flags (D8/ER6) reduce to a
  behavioral-non-exercise proof (fire-count), NOT a graded band.
- **Drift control on same-process A/B** -- a paired numeric seed makes the drift floor exactly 0; a
  low-SNR residual (e.g. an anchor null point) can shift under the fix, so re-verify pinned values.
- **The auto-mode classifier is a real guardrail** -- it blocked substituting a re-derived value for
  the owner's explicit prod-flip parameter. Surface, don't substitute.

## Next entry point

The continuation chip (spawned this session): **D6 graded re-ratify -> N3 ER7 flag-ON N=40 -> G6
move-terrain Godot**, plus the W6 owner follow-through (anchor decision + prod deploy/restart).
Memory: `project_w5_sim_ai_player_upgrade` + `project_form_pulse_v2_flip_readiness` +
`lesson_numeric_seeds_paired_sim`.
