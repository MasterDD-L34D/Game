---
title: Session handoff v44.5 FINAL — Calibration toolkit complete + both hardcore in-band
date: 2026-05-21
type: session-handoff
sprint: v44.4 -> v44.5
pillar: [P6]
status: complete
supersedes: docs/planning/2026-05-21-session-handoff.md
last_verified: 2026-05-21
---

# Session handoff v44.5 FINAL — Calibration methodology complete

## TL;DR (30s)

**7 PRs merged main** (2026-05-20/21). Both P6 hardcore scenarios primary metric
in-band. Full calibration methodology toolkit shipped (6 tools). 5-lesson
anti-pattern cluster codified (L-069/070/071/072/073, catalog #14-18). Issue
#2356 (production clobber) structurally resolved via staging-writer. Optuna
Bayesian opt now affordable at ratify-grade N=40 via per-trial 4x parallel-internal.

## PRs merged (7)

| PR    | Topic                                                         | Key result                                      |
| ----- | ------------------------------------------------------------- | ----------------------------------------------- |
| #2354 | scenario_overrides infra + α P0 trio (C+B+F) + Optuna + L-073 | per-scenario knob layer + 3 calibration methods |
| #2355 | Codex audit cross-PR sweep                                    | ionico mirror + XSS + doc fixes                 |
| #2357 | MAP-Elites Method D real evaluator                            | QD explorer (real backend)                      |
| #2358 | staging-writer fix (issue #2356)                              | production never clobbered                      |
| #2359 | hardcore_07 edm 2.1                                           | WR 60% -> 45% IN-BAND                           |
| #2360 | L-072 auto-enforce (drift_verify)                             | prior-baseline inversion guard                  |
| #2361 | Optuna parallel-internal                                      | per-trial 4x (24min -> 6min)                    |

## Pillar P6 final state (main HEAD 315c463a)

| Scenario    | Knob                                 | WR (N=40 ratified) | Status                                                |
| ----------- | ------------------------------------ | ------------------ | ----------------------------------------------------- |
| hardcore_06 | boss_hp_multiplier 0.65              | 15%                | 🟢 primary in-band [15-25%], secondary defeat 85% RED |
| hardcore_07 | enemy_damage_multiplier_override 2.1 | 45%                | 🟢 IN-BAND [30-50%]                                   |

hardcore_07 secondary (defeat 0% / timeout 55%) scenario-appropriate (pod-rush timer).

## Calibration toolkit (all tools/py/, on main)

| Tool                                | Method                     | Status                                                |
| ----------------------------------- | -------------------------- | ----------------------------------------------------- |
| `calibrate_parallel.py`             | C — 4-shard parallel       | 4x verified; `start_shard(curves_path)` staging-aware |
| `calibrate_sprt.py`                 | B — Wilson CI95 early-stop | conservative-correct                                  |
| `calibrate_optuna.py`               | A — Bayesian TPE           | `--parallel` 4x + `--n-per-trial 40` + staging-writer |
| `calibrate_map_elites.py`           | D — QD real evaluator      | stub + real (N=40 default)                            |
| `calibrate_drift_verify.py`         | N=10->N=40 escalation      | `--prior-baseline` L-072 inversion guard              |
| `check_trait_mirror_consistency.py` | trait mirror validator     | pre-commit + CI integrated                            |

## scenario_overrides knobs (damage_curves.yaml + damageCurves.js)

| Knob                             | Apply site                             | Note                                        |
| -------------------------------- | -------------------------------------- | ------------------------------------------- |
| boss_hp_multiplier               | build (hardcoreScenario.js)            | 0.65 hc06 shipped                           |
| turn_limit_defeat_override       | sessionRoundBridge.js                  | scenario-aware                              |
| enemy_count_modifier             | build                                  | infra (hc07 iter1 rejected, kept available) |
| enemy_damage_multiplier_override | session.js /start (needs encounter.id) | 2.1 hc07 shipped, REPLACES class            |

Backend `DAMAGE_CURVES_PATH` env -> staging-writer (production untouched pre-ratify).

## Anti-pattern catalog (user-global CLAUDE.md #14-18)

- #14 L-069 N=10 lucky-sample false in-band (N=40 ratify gate)
- #15 L-070 Multi-knob sequential overshoot (single-knob bisection)
- #16 L-071 LOBBY_WS_PORT collision (LOBBY_WS_ENABLED=false per shard)
- #17 L-073 Optimizer-on-noise (objective N >= ratify threshold)
- #18 L-072 Direction-test N=10 probe pre-N=40 (auto-enforced drift_verify)

## Method discipline proven (hc07 iter2 clean run)

L-072 direction probe (N=10 WR 60->30 toward) -> L-070 single-knob bisection
(edm 2.2 overshoot 27.5% -> 2.1 in-band 45%) -> L-069 N=40 ratify gate -> Method C
parallel 4x. Zero wasted runs (vs iter1 which ran N=40 direct on inverted knob).

## Cross-repo status

- codemasterdd-ai-station: clean (no open PR)
- Game-Godot-v2: clean (no open PR)
- Game-Database: #151 OPEN (pg_trgm fuzzy search Fase 2) — OTHER session/domain,
  NOT calibration-related, not blocking.

## Memory saved (PC-local)

- `feedback_n_sample_authority.md` (L-069)
- `feedback_calibration_toolkit_2026_05_21.md` (toolkit + L-070/071/072/073 + state)
- `MEMORY.md` index updated (2 entries)

## Outstanding next session (1 item, ALL tooling ready)

**hardcore_06 secondary band convergence** (defeat 85% -> target 40-55%):

- Primary metric (WR 15%) already in-band; only defeat/timeout split RED.
- Multi-knob joint needed (boss_hp + turn_limit) — single-knob iters overshot.
- NOW affordable: `calibrate_optuna.py --scenario hardcore_06 --parallel
--n-per-trial 40 --n-trials 8` (~48min, staging-safe, N=40-objective per L-073).
- Alternative: MAP-Elites real run (full knob surface, ~17h, Sprint M14+).

No tooling gaps. Next session = pure calibration run.

## Cleanup notes

- main locked by worktree clever-brattain-ce2046 (gh merge git-switch errors
  cosmetic; remote merges succeeded all 7 PRs).
- Stale merged branches local (claude/optuna-parallel-internal etc) — prunable.

## RESUME PASTE (next session)

```
hardcore_06 secondary band convergence: lancia
calibrate_optuna.py --scenario hardcore_06 --parallel --n-per-trial 40
--n-trials 8 (multi-knob boss_hp_multiplier + turn_limit_defeat_override joint,
~48min staging-safe). Target: defeat 85% -> 40-55%, timeout 0% -> 15-25%,
mantieni WR primary in-band [15-25%]. Best params N=40 ratify pre-ship (L-069).
Se Optuna converge -> ship PR scenario_overrides update. Leggi memory
feedback_calibration_toolkit_2026_05_21.md per toolkit + L-069/070/071/072/073.
main HEAD 315c463a, 7 PR merged, entrambi hardcore primary in-band.
```
