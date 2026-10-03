---
title: Methods A/B/C/F smoke validation — Calibration loop optimization tools
date: 2026-05-20
type: smoke-test-results
sprint: post-v44.3-balance-fix-loop
related_research: docs/research/2026-05-20-calibration-knob-patterns-industry.md
related_museum: docs/museum/cards/calibration-n-sample-authority-2026-05-20.md
last_verified: 2026-05-20
---

# Methods A/B/C/F smoke validation — α P0 trio + telemetry

## TL;DR (30s)

Validated 3/3 P0 calibration loop optimization methods (α trio per user verdict). All 3 production-ready:

- **C parallel shards**: 4 backends ports 3341-3344, **~3-4x speedup** (N=8 in 111.6s vs serial ~6min)
- **B SPRT early-stop**: Wilson CI95 sequential test, conservative CONTINUE on marginal signal (saves 0 runs at N=20 marginal — correct behavior)
- **F telemetry expansion**: `player_action_distribution` captured (move/attack/unknown), `trait_used_distribution` empty (backend doesn't expose trait_id in `action.result` — separate gap)

**Bonus discovery L-071**: backend `LOBBY_WS_PORT` defaults 3341 → HTTP/WS port collision on shards using base-port 3341. Fix: `LOBBY_WS_ENABLED=false` env per-shard.

**SPRT print-spam bug** (poll same N repeated): fixed via `last_n_checked` tracking. Only re-evaluate when N advances.

## Method C — Parallel shards

**File**: `tools/py/calibrate_parallel.py`

**Smoke N=8 / 4 shards** (`smoke-c-v2` label):

```
[parallel] http://localhost:3341 ready ~2.0s
[parallel] http://localhost:3342 ready ~2.0s
[parallel] http://localhost:3343 ready ~2.0s
[parallel] http://localhost:3344 ready ~2.0s
[parallel] N=8 distributed: [2, 2, 2, 2]
[parallel] all shards done in 111.6s
[parallel] merged 8 runs from 4 JSONLs
```

**Speedup math**:

- Serial: 8 runs × ~45s/run = ~6min (360s)
- Parallel: 111.6s + ~10s shard startup = 121s
- Actual speedup: ~3x (close to theoretical 4x, overhead = shard startup + merge)

**Production usage**:

```bash
python tools/py/calibrate_parallel.py --scenario hardcore_06 --n 40 --shards 4
# Expected: ~10-12min vs serial ~37min (3-4x)
```

**Bug fix L-071**: `LOBBY_WS_PORT` default 3341 collision. Fixed in `start_shard()`:

```python
env["LOBBY_WS_ENABLED"] = "false"  # avoid HTTP/WS port collision per-shard
```

Without fix: shard on port 3341 returns HTTP 426 "Upgrade Required" on `/api/health` (WS upgrade middleware intercepts). Discovery sequence:

1. Spin shard PORT=3341 → log says "API online" but curl returns 426
2. grep `apps/backend/index.js` finds `LOBBY_WS_PORT default 3341`
3. WS server tries to bind 3341 same as HTTP → conflict
4. Fix: disable WS for shards (batch doesn't use lobby)

## Method B — SPRT early-stop

**File**: `tools/py/calibrate_sprt.py`

**Smoke max-n=20 min-n=5 check-every=5** (`smoke-b` label, hardcore_06 scenario):

```
[sprt] N=  5 WR=  0.0% CI95=[  0.0, 43.5] -> CONTINUE
[sprt] N= 10 WR=  0.0% CI95=[  0.0, 27.8] -> CONTINUE
[sprt] N= 15 WR=  0.0% CI95=[  0.0, 20.4] -> CONTINUE
[sprt] N= 20 WR= 10.0% CI95=[  2.8, 30.1] -> CONTINUE
[sprt] subprocess exit code=0, completed N=20
[sprt] decision=CONTINUE N_final=20 WR=10.0% CI95=[2.8,30.1]
[sprt] elapsed=1113.0s saved=0 runs
```

**Behavior verdict**: CORRECT conservative SPRT.

- N=5: CI [0, 43.5] spans band [15, 25] both edges → CONTINUE
- N=10: CI [0, 27.8] → still spans ceiling → CONTINUE
- N=15: CI [0, 20.4] → spans floor 15 → CONTINUE (won't STOP_LOW)
- N=20: 2 wins → WR jumps 0%→10%, CI [2.8, 30.1] → spans both → CONTINUE

**Why no early-stop**: hardcore_06 signal is marginal (true mean ~15% per iter2 N=40 ratify). Wilson CI95 stays wide. Would need N=80+ to confidently place in band.

**When SPRT shines** (clear OOB cases):

- Iter3 N=40 WR 85% would have triggered OOB_HIGH @ N~15-20 (CI lower bound > ceiling)
- Iter2 baseline WR 0% would have triggered OOB_LOW @ N~10-12 (CI upper < floor)

**Production usage**:

```bash
# Iter3-style overshoot detection
python tools/py/calibrate_sprt.py --scenario hardcore_06 --max-n 80 --min-n 10
# Will stop early if signal extreme (saves 60-70 runs)
# Will run to max-n if signal marginal (no false-confidence early stop)
```

**Print-spam bug fixed**: was re-printing same N when batch slow. Now tracks `last_n_checked`, only re-evaluates when N advances.

## Method F — Telemetry expansion

**Files**: `tools/py/batch_calibrate_hardcore06.py` + `batch_calibrate_hardcore07.py`

**Added per-run fields**:

- `player_action_tally`: action_type → count (move/attack/skip/unknown/etc)
- `trait_used_tally`: trait_id → count (extracted from action.result)

**Added aggregate fields**:

- `player_action_distribution`: aggregated across runs
- `trait_used_distribution`: aggregated across runs

**Iter3 N=40 evidence** (real data):

```json
"player_action_distribution": {
  "move": 2593,
  "unknown": 4736,
  "attack": 2320
}
"trait_used_distribution": {}
```

**Observation**:

- ✅ `player_action_distribution` captured — total 9649 player actions across 40 runs
- ⚠️ "unknown" = 49% of actions — backend `results[]` may not always include `action_type` field
- 🔴 `trait_used_distribution` EMPTY — backend doesn't expose trait_id in `action.result` for this scenario

**Anti-pattern #8 partial closure**: action-level granularity now available. Trait-level still gap — needs backend instrumentation (out of session scope).

**Next step (future)**: extend `apps/backend/services/sessionRoundBridge.js` or `routes/session.js` to populate `result.trait_id` when ability/trait fires during attack.

## Method A — Bayesian Optimization (DEFERRED)

Not yet implemented. P1 backlog. Would require:

- Install `scikit-optimize` or `optuna` (new pip dep)
- Wrap `batch_calibrate_*.py` as Optuna objective function
- Suggest next knob delta from posterior over knob space
- Replaces manual iter1/2/3 ladder with auto-converge

**Effort**: ~4-6h impl + test. Higher value than C/B/F individually but depends on existing infra working first (which it now does).

**Trigger** next session: post hardcore_06 iter4 + hardcore_07 N=40 settled.

## Files shipped

| File                                     | Type | LOC  | Purpose                                 |
| ---------------------------------------- | ---- | ---- | --------------------------------------- |
| `tools/py/calibrate_parallel.py`         | new  | ~280 | C method — parallel shards orchestrator |
| `tools/py/calibrate_sprt.py`             | new  | ~270 | B method — SPRT early-stop wrapper      |
| `tools/py/calibrate_drift_verify.py`     | new  | ~225 | N=10→N=40 escalation wrapper (FASE 3)   |
| `tools/py/batch_calibrate_hardcore06.py` | edit | +148 | F telemetry + scenario-aware turn_limit |
| `tools/py/batch_calibrate_hardcore07.py` | edit | +31  | F telemetry                             |

## Lessons codified

**L-069** (already shipped): N-sample authority (museum + memory + wrapper)

**L-070** (candidate from iter3 retro): multi-knob sequential overshoot anti-pattern. See `docs/playtest/2026-05-20-hardcore-06-iter3-overshoot-retrospective.md` §"Lesson L-070 candidate".

**L-071** (this smoke session): `LOBBY_WS_PORT` collision per-shard. Codified inline in `calibrate_parallel.py:start_shard()` docstring. Discovery sequence:

1. Smoke C v1 fail: shard 3341 returns 426 on /api/health
2. Diagnostic: grep apps/backend/index.js → finds LOBBY_WS_PORT default 3341
3. Fix: `LOBBY_WS_ENABLED=false` per-shard env

## Bundle resume trigger next session

> _"hardcore_06 iter4 path A turn_limit_defeat_override 30 + parallel C N=40 ratify ~10min + hardcore_07 N=40 scenario_overrides + Method A Optuna wrap proof-of-concept"_
