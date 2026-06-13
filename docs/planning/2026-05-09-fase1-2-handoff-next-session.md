---
title: 'Handoff next session — FASE 1+2 AI sim closure 2026-05-09'
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
  - fase1
  - fase2
  - sprint-q-plus
---

# Handoff next session — FASE 1+2 AI sim closure 2026-05-09

Sessione 2026-05-09 closure complete. 9 PR Game/ + 1 Godot v2 main shipped Day 4-5. Backend AI infra + sim harness + balance signal end-to-end + K3 production fix + K4 negative result.

## Stato finale

| Item                                             |                     Stato                     |
| ------------------------------------------------ | :-------------------------------------------: |
| 9 PR Game/ merged main (#2140-#2147)             |                      ✅                       |
| Godot v2 #216 + 7b92724 direct main              |                      ✅                       |
| All running processes killed                     | ✅ (0 cloudflared, 0 backend, 0 deploy-quick) |
| Game/ HEAD origin/main `736b5782`                |                      ✅                       |
| 5 batch run dirs preserved `/c/tmp/ai-sim-runs/` |                      ✅                       |
| Memory save + MEMORY.md updated                  |                      ✅                       |

## Balance signal arc completo

| Stage                       | aggressive WR | Notes                                  |
| --------------------------- | ------------: | -------------------------------------- |
| Pre-fix N=43                |         53.5% | utility ON, oscillation timeout 47%    |
| K3 ablation utility OFF     |           95% | direct test — utility brain root cause |
| **K3 prod validation N=20** |       **90%** | production state, timeout 0%, defeat 2 |
| K4 sticky 0.15              |           55% | -30pp insufficient                     |
| K4 sticky 0.30              |           60% | -25pp insufficient                     |

**RCA**: 2-unit kite oscillation (UTILITY_AI ↔ REGOLA_001 alternation, 1-tile up/down loops). Approach A additive sticky cannot dominate Distance/TargetHealth/SelfHealth weighted sum.

## Production state ai_profiles.yaml

```yaml
profiles:
  aggressive:
    use_utility_brain: false # K3 fix #2146
    overrides: { retreat_hp_pct: 0.15, kite_buffer: 0, ... }
  aggressive_no_util: # K3 ablation reproduction
  aggressive_with_stickiness: # K4 sticky 0.15 (negative)
  aggressive_sticky_30: # K4 sticky 0.30 (negative)
  balanced: # unchanged
  cautious: # unchanged
```

## Resume trigger phrases

### Option A — K4 Approach B commit-window (RACCOMANDATO)

> _"esegui K4 Approach B commit-window — declareSistemaIntents.js anti-flip guard. Force previous action repeat 1-2 turns when direction reversal detected. N=40 vs 90% baseline, target +15-25pp recovery."_

Effort: ~1h implementation + ~5min batch sweep N=40.

### Option B — K4 Approach C softmax temperature

> _"esegui K4 Approach C softmax temperature — selectAction stochastic. Replace argmax with softmax(scores/T). N=40 vs 90% baseline, T=0.5 + T=1.0 sweep."_

Effort: ~1h impl + ~10min sweep N=80.

### Option C — MAP-Elites K4 grid

> _"esegui MAP-Elites K4 grid — sticky × commit-window × softmax behavior cells. 6-9 cells × N=20 each = ~150 runs."_

Effort: ~2-3h cumulative.

### Option D — FASE 5 nightly cron

> _"esegui FASE 5 nightly cron + Slack/email alert — .github/workflows/ai-sim-nightly.yml cron 02:00 UTC, alert on completion < 95% OR profile winrate shift > ±10%."_

Effort: ~2-3h infra setup.

### Option E — FASE 1 T1.3 browser sync spectator

> _"esegui FASE 1 T1.3 browser sync spectator — Chrome MCP screenshots per phase_change event, canvas-grid visual regression baseline."_

Effort: ~2-3h browser MCP integration.

### Option F — Master-dd hardware retry phone

> _"master-dd retry deploy-quick + smoke 4-friends real, validate B-NEW-14 + B-NEW-7 v2 cross-device WAN, capture combat 5-round p95 + airplane reconnect"_

User-driven. Backend stable, Godot phone fixes shipped.

## Stack restart commands

```bash
# Boot deploy-quick fresh:
cd /c/Users/VGit/Desktop/Game-Godot-v2
SKIP_REBUILD=1 GAME_DIR=/c/Users/VGit/Desktop/Game \
  GODOT_BIN="/c/Users/VGit/AppData/Local/Godot/Godot_v4.6.2-stable_win64.exe" \
  bash tools/deploy/deploy-quick.sh

# Run sim N=20:
TUNNEL=https://<host>.trycloudflare.com node tools/sim/batch-ai-runner.js \
  --seed-count 20 --concurrency 2 \
  --profiles aggressive,balanced,cautious \
  --max-rounds 40
```

## Files reference

- `tests/smoke/ai-driven-sim.js` (FASE 1 harness, sistema_decision capture)
- `tools/sim/batch-ai-runner.js` (FASE 2 parallel batch)
- `apps/backend/services/ai/utilityBrain.js` (stickiness branch shipped)
- `apps/backend/services/ai/declareSistemaIntents.js` (per-profile sticky merge)
- `apps/backend/services/ai/sistemaTurnRunner.js` (last_action state tracking)
- `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` (4 aggressive variants)
- `docs/research/2026-05-09-aggressive-profile-calibration.md`
- `docs/research/2026-05-09-aggressive-h1-validation-oscillation.md`
- `docs/research/2026-05-09-k3-fix-shipped-k4-audit.md`
- `docs/research/2026-05-09-k4-stickiness-implementation.md`

## Cumulative cross-repo session count

- Day 4 sera (2026-05-08): 14 PR Game/ + 1 Godot v2
- Day 5 (2026-05-09): 9 PR Game/ + Godot v2 main (B-NEW-14 + B-NEW-7 v2)

Phase A monitoring window UTC: ongoing. Phase B trigger gate ≥ 2026-05-15+.
