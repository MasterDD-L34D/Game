---
title: 'Handoff next session — K4 Approach B + 4 task autonomous closure 2026-05-09 sera'
workstream: ops-qa
doc_status: active
doc_owner: master-dd
last_verified: 2026-05-09
source_of_truth: true
language: it
review_cycle_days: 7
status: active
owner: master-dd
last_review: 2026-05-09
tags:
  - handoff
  - resume
  - ai
  - balance
  - k4
  - commit-window
  - nightly-cron
  - browser-sync
---

# Handoff next session — K4 Approach B + 4 task autonomous closure 2026-05-09 sera

Sessione 2026-05-09 sera closure complete. **4 PR Game/ shipped main** ~2-2.5h cumulative. Cumulative Day 5 (2026-05-09 mattina+sera) = **13 PR Game/** + 1 Godot v2 + 1 Godot v2 direct main.

## Stato finale

| Item                                                        |                  Stato                  |
| ----------------------------------------------------------- | :-------------------------------------: |
| 4 PR Game/ merged main (#2149 + #2150 + #2151 + #2153)      |                   ✅                    |
| All running processes killed (cloudflared + backend)        |                   ✅                    |
| Game/ HEAD origin/main `ebb04e8f`                           |                   ✅                    |
| Default `aggressive` profile = utility ON + commit_window 2 |                   ✅                    |
| Nightly cron `.github/workflows/ai-sim-nightly.yml` LIVE    | ✅ first run 2026-05-10 02:00 UTC sched |
| Browser sync spectator Playwright harness available         |                   ✅                    |
| Memory + handoff + CLAUDE.md sprint context updated         |                   ✅                    |

## 4 task delivered

### Task #2149 — K4 Approach B commit-window guard (PRIMARY)

Resume PR #2147 K4 Approach A negative result. K4 Approach B implementation:

- Helpers `_moveDirection` / `_isOppositeDir` / `_detectFlip` in `apps/backend/services/ai/declareSistemaIntents.js`
- Guard logic post `selectAiPolicy*`: quando new policy intent reverses last OR direction reversal vs `last_move_direction` → forza intent precedente per `commit_window` turni (=2 default)
- Side-fix critico: state tracking `last_action_type` + `last_move_direction` ora in `apps/backend/routes/sessionRoundBridge.js realResolveAction` post-commit. Pre-PR esisteva solo in `sistemaTurnRunner.js` (legacy DEAD path M17 ADR-2026-04-16) → K4 sticky era no-op nel round flow.

Sweep N=40 evidence:

| Profile                                    | Runs |   V |   D |   T | **Win rate** | Avg rounds |
| ------------------------------------------ | ---: | --: | --: | --: | -----------: | ---------: |
| aggressive (K3 prod baseline, utility OFF) | N=20 |  18 |   2 |   0 |          90% |       25.0 |
| aggressive_with_stickiness 0.15 (PR #2147) | N=20 |  11 |   0 |   9 |          55% |       31.5 |
| aggressive_sticky_30 (PR #2147)            | N=20 |  12 |   1 |   7 |          60% |       30.0 |
| **aggressive_commit_window (NEW)**         | N=40 |  40 |   0 |   0 |     **100%** |   **24.2** |

Guard footprint: 90 firings / 1208 SIS decisions = 7.4%. 9/40 runs ZERO firings.

### Task #2150 — Swap default aggressive profile

Promote K4 Approach B configuration come default profile `aggressive` in `packs/evo_tactics_pack/data/balance/ai_profiles.yaml`:

- `use_utility_brain: false` → `true`
- `commit_window: 2` (new field)

Profile alternativi preservati: `aggressive_no_util`, `aggressive_with_stickiness`, `aggressive_sticky_30`, `aggressive_commit_window`.

### Task T1.3 (#2151) — Browser sync spectator harness

Twin-harness di `tests/smoke/ai-driven-sim.js` ma lato browser:

- `tests/smoke/browser-sync-spectator.js` (~477 LOC) — Playwright chromium headless. Hook `window.__evoLobbyBridge._currentPhase` (poll 200ms), cattura PNG full-page + grid signature 4×4 RGBA su ogni `phase_change`.
- `tools/sim/visual-baseline-compare.js` (~342 LOC) — diff utility CLI 3 modi (`--baseline` / `--compare <A> <B>` / `--compare-baseline`). RGBA L1 distance per cella, threshold default 30.
- `docs/playtest/2026-05-09-fase1-t1-3-browser-sync-handoff.md` — handoff completo.

Smoke validato: 4 PNG cattura + manifest.json + telemetry.jsonl validi.

**Open question master-dd**: phone composer (`/lobby.html`) DOM-only senza `<canvas>` → signature ritorna `error: no_canvas_found`, diff treats as mismatched dims. PNG-only fallback shipped. Verdict: full DOM bbox sample vs PNG-only fallback?

### Task #5 (#2153) — FASE 5 nightly cron

`.github/workflows/ai-sim-nightly.yml` cron 02:00 UTC daily + workflow_dispatch:

1. Boot backend localhost:3334 (no tunnel CI)
2. `tools/sim/batch-ai-runner.js` N=40 × 3 profile (aggressive, balanced, cautious) × `enc_tutorial_01`
3. `tools/sim/check-thresholds.js` aggrega vs `BASELINE_WR` canonical
4. Su regression: GH Issue label `ai-sim-regression,automated` + artifact upload 14d retention

Drift threshold ±10pp WR, completion floor 95%. Baseline canonical (PR #2149):

- `aggressive` 100% WR (utility ON + commit_window 2)
- `balanced` 100% WR
- `cautious` 85% WR

**First scheduled run**: 2026-05-10 02:00 UTC.

## Production state ai_profiles.yaml

```yaml
profiles:
  aggressive:
    use_utility_brain: true # K4 Approach B verdict #2150
    commit_window: 2 # anti-flip guard turns
    overrides: { retreat_hp_pct: 0.15, ... }
  aggressive_no_util: # K3 ablation reproduction
  aggressive_with_stickiness: # K4 sticky 0.15 (negative)
  aggressive_sticky_30: # K4 sticky 0.30 (negative)
  aggressive_commit_window: # K4 Approach B explicit variant
  balanced: # unchanged
  cautious: # unchanged
```

## Resume trigger phrases

### Option A — Verifica primo nightly cron run (RACCOMANDATO se mattina dopo)

> _"verifica primo nightly cron run 2026-05-10 02:00 UTC — fetch artifact `ai-sim-nightly-<run_id>` + threshold-report.md, conferma drift detection works end-to-end. Update BASELINE_WR.cautious post empirical N=40."_

Effort: ~10-15min validation + ~5min eventual fix.

### Option B — Scenario diversity sweep aggressive default

> _"esegui scenario diversity sweep aggressive default × enc_tutorial_02..05 + hardcore-\* — N=20 per scenario per validare consistency 100% WR oltre tutorial_01"_

Effort: ~15-20min batch. Probabile evidenza: scenari più hard ridurranno WR a livello target balanced range (es. hardcore 60-80%).

### Option C — MAP-Elites K4 grid

> _"esegui MAP-Elites K4 grid — sticky × commit_window × softmax temperature behavior cells. 6-9 cells × N=20 each = ~150 runs"_

Effort: ~2-3h cumulative. Esplora Pareto frontier determinismo (commit) vs exploration (softmax).

### Option D — `--with-spectator` flag in batch-ai-runner.js

> _"esegui T1.3 next-iter — add `--with-spectator` flag in batch-ai-runner.js, integration con browser-sync-spectator.js per spawn parallel chromium per ogni run (visual regression baseline expansion)"_

Effort: ~1-2h.

### Option E — Master-dd playtest LIVE

> _"master-dd manual playtest 4-friend live, validate balance default aggressive utility ON + commit_window 2, capture combat 5-round + post-game feedback rubric"_

User-driven. Backend stable, profile production-ready.

### Option F — DOM bbox sample T1.3 phone

> _"esegui T1.3 next-iter — DOM bbox grid sample fallback per phone composer (canvas absent), permette signature regression detection anche su DOM-only views"_

Effort: ~1-2h.

## Stack restart commands

```bash
# Boot deploy-quick fresh:
cd /c/Users/VGit/Desktop/Game-Godot-v2
SKIP_REBUILD=1 GAME_DIR=/c/Users/VGit/Desktop/Game \
  GODOT_BIN="/c/Users/VGit/AppData/Local/Godot/Godot_v4.6.2-stable_win64.exe" \
  bash tools/deploy/deploy-quick.sh

# Run sim N=20 (post-merge profile = utility ON + commit_window 2):
TUNNEL=https://<host>.trycloudflare.com node tools/sim/batch-ai-runner.js \
  --seed-count 20 --concurrency 2 \
  --profiles aggressive,balanced,cautious \
  --max-rounds 40

# Threshold checker dry-run:
node tools/sim/check-thresholds.js \
  --summary /c/tmp/ai-sim-runs/batch-<ISO>/summary.json \
  --completion-floor 0.95 --wr-drift-pp 10 \
  --out /tmp/threshold-report.md

# Browser sync spectator (ALPHA, smoke-only validated):
TUNNEL=http://localhost:3334 node tests/smoke/browser-sync-spectator.js
```

## Files reference

- `apps/backend/services/ai/declareSistemaIntents.js` (commit-window guard logic)
- `apps/backend/routes/sessionRoundBridge.js` (state tracking realResolveAction)
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` (default swap + 4 ablation profiles)
- `tools/sim/check-thresholds.js` (regression detector)
- `tools/sim/visual-baseline-compare.js` (visual diff utility)
- `tests/smoke/browser-sync-spectator.js` (Playwright harness)
- `.github/workflows/ai-sim-nightly.yml` (cron scheduler)
- `docs/research/2026-05-09-k4-commit-window-implementation.md`
- `docs/playtest/2026-05-09-fase1-t1-3-browser-sync-handoff.md`

## Cumulative cross-repo session count

- Day 4 sera (2026-05-08 sera): 14 PR Game/ + 1 Godot v2
- Day 5 mattina (2026-05-09 mattina): 9 PR Game/ + Godot v2 main (B-NEW-14 + B-NEW-7 v2)
- **Day 5 sera (2026-05-09 sera): 4 PR Game/** (#2149 + #2150 + #2151 + #2153)

Phase A monitoring window UTC: ongoing. Phase B trigger gate ≥ 2026-05-15+. Day 5 iter3 (OD-021) schedule: 2026-05-11.
