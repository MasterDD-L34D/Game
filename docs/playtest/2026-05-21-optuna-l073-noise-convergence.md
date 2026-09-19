---
title: Optuna Method A smoke — L-073 optimizer-on-noise negative finding
date: 2026-05-21
type: playtest-methodology
sprint: v44.4
pillar: [P6]
status: methodology-validated-finding-negative
last_verified: 2026-05-21
---

# Optuna Method A — L-073 optimizer-on-noise meta-lesson

## TL;DR (30s)

Method A (Optuna TPE Bayesian) **mechanically validated** — 3-trial smoke
converged + yaml writer fix verified live (boss HP 27 = 40×0.687). BUT
**critical meta-finding L-073**: Optuna optimized on N=20 objective →
converged to NOISE.

Best trial (boss 0.866 + limit 31) reported N=20 WR 15% (in-band). N=40
ratify → **WR 30% OOB-high**. The N=20 trial was lucky-low (3/20). Optimizer
inherited L-069 flaw at the objective level.

**Production decision**: rollback iter5 (Optuna config), restore iter2
(boss 0.65 alone, N=40 WR 15% confirmed). Optuna re-run with n_per_trial>=40
deferred Sprint M14.

## Smoke trail (3 trials, 64.2min)

| Trial        | boss_hp_mult | boss HP | turn_limit | N=20 WR | distance |
| ------------ | ------------ | ------- | ---------- | ------- | -------- |
| 0            | 0.687        | 27      | 35         | 55%     | 0.350    |
| **1 (best)** | 0.866        | 35      | 31         | 15%     | 0.050    |
| 2            | 0.578        | 23      | 26         | 40%     | 0.200    |

TPE behavior CORRECT mechanically:

- Trial 0 WR 55% too high → trial 1 raised boss HP (0.687→0.866) + lowered limit
- Trial 1 hit N=20 WR 15% (lucky-low) → marked best
- Trial 2 explored low-HP region (0.578) → WR 40%

## N=40 ratify of best params (the reveal)

```
Optuna best: boss_hp_multiplier 0.866 + turn_limit_defeat_override 31
N=20 trial WR:  15.0% (3 wins / 20) — IN-BAND (lucky-low)
N=40 ratify WR: 30.0% (12 wins / 40) — OOB-high amber +5pp
defeat:         70.0% (28/40) — RED (target 40-55%, closer than iter2 85%)
timeout:         0.0% — RED
turns_avg:      30.4
boss residual:  13.6 HP on loss
elapsed:        677.2s (parallel C 4x)
```

**Verdict**: RED — WR amber-high, defeat+timeout OOB.

## L-073 META-LESSON — optimizer inherits objective noise

**Anti-pattern**: running Bayesian optimization (Optuna TPE) with N-per-trial
below the ratify threshold = optimizer converges to NOISE, not signal.

**Causal chain**:

1. L-069 established: N=20 CI95 WR ±15-30pp — insufficient for band placement
2. Optuna objective = single N=20 batch per trial
3. TPE posterior built on noisy WR point-estimates
4. "Best" trial = whichever N=20 sample happened to land near target (lucky)
5. N=40 ratify reveals true mean ≠ trial estimate

**Evidence**: Optuna trial 1 N=20 WR 15% → N=40 WR 30% (+15pp = full noise band).

**Fix**: Optuna `--n-per-trial` MUST be >= 40 (ratify-grade). Trade-off:

- N=20 objective: 64min / 3 trials = ~21min/trial → fast but noise-converged
- N=40 objective: ~12min/trial × 8 trials = ~96min → 2x compute, signal-grade
- N=40 objective + parallel C internal: ~3min/trial × 8 = ~24min → BEST (deferred B)

**Generalization**: ANY optimizer (Optuna, MAP-Elites, grid search, manual
ladder) operating on a noisy objective converges to noise. Objective sample
size must exceed the noise floor of the metric being optimized.

**Codify**: anti-pattern catalog #17 candidate (CLAUDE.md). Related family:
L-069 (N-sample authority) + L-070 (multi-knob overshoot) + L-073 (optimizer-
on-noise) form a coherent calibration-rigor cluster.

## Production state post-rollback

| Config                               | N=40 WR | Status                          |
| ------------------------------------ | ------- | ------------------------------- |
| iter2 (boss 0.65 alone)              | 15%     | ✅ in-band primary — PRODUCTION |
| iter5 Optuna (boss 0.866 + limit 31) | 30%     | ❌ OOB-high — REJECTED          |

iter2 restored. Secondary metrics (defeat 85% / timeout 0%) still RED —
deferred Sprint M14 via:

- Optuna n_per_trial>=40 (signal-grade objective)
- OR MAP-Elites QD full surface explore
- OR manual iter6 limit 26 (small extension, N=40 direct)

## Method A status (honest)

**Mechanically**: ✅ VALIDATED

- TPE knob suggestion works
- yaml writer fix verified live (boss HP correct per trial)
- parallel C 4x speedup applies
- Trial history + posterior persisted
- Convergence behavior correct (trial 0 → trial 1 adjustment direction right)

**Methodologically**: 🟡 REQUIRES n_per_trial>=40

- N=20 objective = noise-converged (this finding)
- Production-grade Optuna run needs N=40+ per trial
- Compute: use parallel C internal (deferred B) to make N=40/trial affordable

**Net**: Method A is a VALID tool, but the smoke revealed a usage constraint
(objective sample size). The 64min smoke "wasted" compute BUT delivered L-073
which prevents future noise-converged optimization. Negative finding = positive
methodology value.

## Files

- Optuna report: `docs/playtest/optuna-hardcore_06-smoke-3trials-v2/optuna-report.json`
- N=40 ratify: `docs/playtest/parallel-hardcore_06-iter5-optuna-ratify-merged.json`
- Smoke log: `docs/playtest/optuna-smoke-3trials-v2.log`
- yaml writer fix: `tools/py/calibrate_optuna.py` commit `f47aa07f`

## Lessons cluster (calibration rigor)

- **L-069** N-sample authority — N=10/20 insufficient, N=40 ratify gate
- **L-070** Multi-knob sequential overshoot — joint-effect prediction needed
- **L-071** LOBBY_WS_PORT collision — multi-shard config
- **L-072** (candidate) direction-test smoke pre-N=40
- **L-073** (this) optimizer-on-noise — objective sample size >= ratify threshold

## Bundle resume trigger next session

> _"Optuna re-run n_per_trial=40 (signal-grade) + parallel C internal wrap for affordable compute OR MAP-Elites QD real-evaluator + iter6 manual limit 26 N=40 direct — secondary band convergence hardcore_06"_
