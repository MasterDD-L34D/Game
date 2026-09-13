---
title: 'W5 graded-lane close -- D6 REAL + ER7 re-confirm + G6 built + W6 flip LIVE @1.15'
date: 2026-07-02
sprint: closeout-w5-sim-harness
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-02'
source_of_truth: false
review_cycle_days: 90
---

# W5 graded-lane close (2026-07-01/02)

Continuation of [`2026-07-01-session-handoff-w5-d8-w6-close.md`](2026-07-01-session-handoff-w5-d8-w6-close.md).
Executed: **D6 -> W6-ratify -> N3 ER7 -> G6 build -> W6 flip live**. 10 PR Game + 1 PR GGv2 merged.
The W5 graded lane is **COMPLETE** (register X1 row = DELIVERED-VIA-PIVOT, #3163).

## Done

| lane             | PRs                                                                             | outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D6 imprint grant | #3149 `b99f740f` + #3151 `beeb1f5c`                                             | **REAL band, mapping validated 8/8 LIVE** (fires 45-318, drift floor exactly 0; #3083 near-inert worry REFUTED; ferocia on_kill = exercise-limited, owner KEEP). 🔑 D6's own flag DEAD (W4-collapsed into `FORM_PULSE_TRAIT_V2_ENABLED`) -> subset of the W6 bundle. Evidence `docs/playtest/2026-07-01-d6-imprint-grant-graded-reratify.md`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| W6 anchor ratify | #3152 `47417551` + #3153/#3154                                                  | **Owner RATIFIED 1.15** (offense-null); keys.env staged 1.20->1.15; handoff cascade synced (2 Codex P2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| N3 ER7           | #3156/#3158/#3160/#3162                                                         | **VERIFY-FIRST: marker STALE** -- ER7 already default-ON+ratified 06-11 (`isEnabled = env !== 'false'`); N=40 = re-confirmation (exercise reproduces prey 0.54->0.00; +5.22 rounds = the known differentiated-probe artifact; on_abundant marginal). Nothing staged (no-op). 🔑 3-PR Codex cascade for skipping the probe's evidence-grade protocol -> [[lesson_spec_i_gates_evidence_grade_protocol]] (isolated per-arm procs + --aggregate + matching --seed-base + machine-diff doc vs JSON)                                                                                                                                                                                                                                                                                 |
| G6 engine-AP     | GGv2 [#558](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/558) `4ac491e7` | Divergence-doc sec.5b named follow-up BUILT flag-gated OFF: `_resolve_move` terrain gate via the SAME MoveCostField the telegraph renders (engine == picker; backend #3012 parity: unreachable/insufficient rejects, cost==budget allowed, AP charge latent-additive). 53 GUT, flag-OFF byte-identical, tripwire updated as the conscious decision. Godot flip gated on #3053 + owner                                                                                                                                                                                                                                                                                                                                                                                           |
| **W6 flip**      | prod op (owner-auth)                                                            | **LIVE @ anchor 1.15 + w 0.78 + STAMINA + Postgres persistence.** 🔴 verify-first caught a broken half-flip: the hub session's manual restart (PID 34916, `node index.js`, parent dead) had a PARTIAL env -> offset fired at the DEFAULT 1.4 (measured live ratio 1.429) + no DATABASE_URL (in-memory stub). Fix (owner-authorized): prod checkout `_gamewt-lenovo-host` FF `f859817d`->`bba41fb6` (producer-norm present -- a task restart on the OLD checkout would have made imprint-win ~90%), prisma generate, migrations 19/19 already applied, `Start-ScheduledTask EvoTacticsBackend` (launcher self-heal killed the orphan, sourced keys.env FULL). Post-verify: ratio **1.143** (14->16 = anchor 1.15 exact), Prisma hydrate 5 rooms, WS 3341 up, `/api/meta/npg` 200 |

## Cross-session (3 lanes ran in parallel; boundaries held, 0 conflicts)

- **SPEC-F/closeout session**: merged #3155 (persistence blob, migration 0018) + #3147 (O8 enum) + #3161/#3163/#3165 + #3169 (auth C durability, migration 0019). #3163 synced MY W5 SoT rows (X1 = delivered-via-pivot).
- **Hub session**: merged the #3157 telemetry arc (#3164 F2 outcome-declare / #3166 F1 species canonicalize / #3167 F3 scenario_id / #3168 probes endSession / #3159 dashboard); `spec-i-gates-probe` intentionally excluded from #3168 (shared ER7 campaign). Its manual backend restart caused the half-flip above (fixed).
- Rescue branch `rescue/w5-d6-leftover-a6a0a867` verified fully-merged -> deleted.

## Residual (all owner / gated)

- **Godot MOVE_TERRAIN_COST flip**: N=40 Godot-scope band (#3053, sim AI can't resolve terrain pilots) + owner. Build is DONE (#557 telegraph + #558 engine gate).
- **W6 follow-on**: per-pick imprint power measurement (optional); ko survival-tilt ~-0.06 accepted by design.
- **Human-playtest lane**: N5 A2 floor re-tune / N7 interoception knob / N8 DR2=2 radici.
- **#3157 F-residuals + dashboard**: hub session's lane.
- **Post-flip watch**: W6+STAMINA now live -- watch early playtest signals (imprint-win ~30-40% target, stamina fatigue feel).

## Lessons banked

[[lesson_spec_i_gates_evidence_grade_protocol]] (probe protocol from the start + machine-diff numbers) ·
verify-first x3 this session (ER7 stale marker; D6 flag DEAD; the half-flip's wrong anchor caught by a
live probe before it did damage) · the auto-mode classifier correctly gated the prod migration until the
owner explicitly authorized.

## Next entry point

W5 graded lane CLOSED. Open lanes: hub #3157 residuals (theirs) · SPEC-F cooldown/Opt-C (owner) ·
Godot flip (#3053-gated) · human-playtest batch (owner). Memory: `project_w5_sim_ai_player_upgrade` +
`project_form_pulse_v2_flip_readiness` + `project_move_terrain_cost_substrate`.
