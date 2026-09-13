---
title: Hardcore_06 scenario_overrides fix — 4-iter cascade final report
date: 2026-05-20
type: playtest-calibration
scenario: enc_tutorial_06_hardcore
sprint: post-v44.3-balance-fix-loop
pillar: [P6]
status: partial-fix-wr-in-band-secondary-red
supersedes: docs/playtest/2026-05-20-hardcore-06-postwave57-report.md
last_verified: 2026-05-20
---

# Hardcore_06 — 4-iter cascade scenario_overrides fix

## TL;DR (30s)

**WR 0% → 15% (in-band floor)** post infra `scenario_overrides` + `boss_hp_multiplier: 0.65` (HP 40→26). N=40 ratify confirmed primary metric in-band [15-25%]. Secondary metrics (defeat 85%, timeout 0%) RED — iter3 deferred (raise `turn_limit_defeat` 25→35 OR disable for hardcore_06).

**L-069 N-sample authority lesson validated empirically same-session**: N=10 iter1 = 10% (lucky-high), N=10 iter2 = 0% (unlucky-low), N=40 = 15% true mean.

## Pattern adopted

Hades Pact (modular orthogonal) + ITB (scenario-tagged) hybrid. Source: [docs/research/2026-05-20-calibration-knob-patterns-industry.md](../research/2026-05-20-calibration-knob-patterns-industry.md).

Infra: per-scenario override block in `data/core/balance/damage_curves.yaml` + resolver in `apps/backend/services/balance/damageCurves.js` + apply hook in `hardcoreScenario.js`.

Avoids cross-scenario regression: same `encounter_class: hardcore` shared with hardcore_07, but boss HP nerf isolated to hardcore_06.

## 4-iter cascade trail

| Iter         | Knob                                 | Sample   | WR      | Defeat | Boss residual | Verdict                      |
| ------------ | ------------------------------------ | -------- | ------- | ------ | ------------- | ---------------------------- |
| Baseline     | Wave 5-7 (`cost_ap 1→2`)             | N=10     | 0%      | 100%   | 22.4          | RED                          |
| iter1        | `boss_hp_multiplier 0.75` (HP 40→30) | N=10     | 10%     | 90%    | 15.3          | AMBER near-band (lucky-high) |
| iter2        | `boss_hp_multiplier 0.65` (HP 40→26) | N=10     | 0%      | 100%   | 17.2          | RED (unlucky-low noise)      |
| iter2 ratify | `boss_hp_multiplier 0.65` (HP 40→26) | **N=40** | **15%** | 85%    | 13.8          | **WR IN-BAND**               |

**Critical observation iter1→iter2 paradox**: boss HP DROPPED 30→26 but N=10 WR DROPPED 10%→0%. Counter-intuitive deterministic effect. Caused by N=10 CI95 ±30pp noise floor. N=40 ratify (CI95 ±15pp) restored coherent picture WR 15%.

## N=40 ratify final state

```
WR:           15.0% (6 wins / 40 runs)        target [15-25%] ✅ IN-BAND
Defeat:       85.0% (34 defeats / 40 runs)    target [40-55%] 🔴 +30pp ceiling
Timeout:       0.0% (0 timeouts / 40 runs)    target [15-25%] 🔴 -15pp floor
Boss res:     13.8 HP avg on loss             baseline 22.4 (Δ -8.6)
DMG dealt:    43.8 avg                        baseline 47.3 (Δ -3.5)
DMG taken:    26.1 avg                        baseline 24.1 (Δ +2)
Turns avg:    24.55                           cap 25 (turn_limit_defeat)
Elapsed:      36.8 min
AI intent:    Apex|attack 518 (dominant), Critical|move 223
```

## Engineering deliverable

### Files changed (3, ~50 LOC functional)

1. **`data/core/balance/damage_curves.yaml`** (+25 LOC)
   - Added `scenario_overrides:` block with `enc_tutorial_06_hardcore.boss_hp_multiplier: 0.65`
   - Added validation rule `scenario_overrides_valid_ids`

2. **`apps/backend/services/balance/damageCurves.js`** (+44 LOC)
   - Added `getScenarioOverride(scenarioId, curves)` resolver
   - Added `applyScenarioBossHpOverride(unit, scenarioId, curves)` mutator
   - Exports both functions

3. **`apps/backend/services/hardcoreScenario.js`** (+5 LOC)
   - Imports `applyScenarioBossHpOverride`
   - Post-construct loop in `buildHardcoreUnits06()` applies override to enemies

### Methodology codify (4 new files)

4. **`docs/research/2026-05-20-calibration-knob-patterns-industry.md`** (~250 LOC)
   - 5 patterns industry-proven (Hades Pact / StS Ascension / DD Modes / ITB / Monster Train)
   - Anti-pattern flags + adoption tickets

5. **`docs/museum/cards/calibration-n-sample-authority-2026-05-20.md`** (~80 LOC)
   - Museum card M-2026-05-20-003 — methodology N-sample authority

6. **`~/.claude/projects/C--dev-Game/memory/feedback_n_sample_authority.md`** (PC-local)
   - Memory file persistent — N=10 → N=40 escalation rule

7. **`tools/py/calibrate_drift_verify.py`** (~225 LOC)
   - Reusable wrapper N=10 probe → N=40 ratify auto-escalation
   - Tested `--help` works on Windows cp1252

## Iter3 path (deferred next session)

Secondary metric fix proposal:

```yaml
scenario_overrides:
  enc_tutorial_06_hardcore:
    boss_hp_multiplier: 0.65 # keep, primary WR knob
    turn_limit_defeat_override: null # disable forced defeat at 25 rounds
```

**Expected effect**: 34 defeats converted ~20 → timeouts (boss residual 13.8 = boss almost dead, more rounds → boss kills OR run timeout). WR 15→17-22%, defeat 85→55%, timeout 0→20%. All bands green.

**Effort**: ~15min schema update + N=40 ratify ~24min = ~40min total.

**OR alternative simpler**: extend `turn_limit_defeat` per-scenario via override field. Same delta files.

## Pillar delta v44.3 → v44.4

- **P6 Fairness**: 🟡 split-verdict-worse → **🟢 candidato HARD partial-reinforced**
  - hardcore_07: 🟡 OOB-high +10pp (deferred this session)
  - hardcore_06: **🟢 WR in-band** (primary metric pass) + 🟡 secondary metrics RED (iter3 candidate)
- L-069 N-sample authority codified canonical (museum + memory + wrapper + research)

## Master-dd action

1. **Review PR** `claude/balance-scenario-overrides-2026-05-20` branch (3 file fix + 4 file methodology)
2. **Ratify scenario_overrides infra** as canonical pattern (Hades+ITB hybrid)
3. **Iter3 verdict**: ship secondary metric fix this session OR defer next
4. **hardcore_07 follow-up**: defer N=40 verify + cost_ap 2→3 OR scenario_overrides knob
5. **CLAUDE.md anti-pattern catalogue #10** add L-069 (next handoff)

## Bundle resume trigger next session

> _"hardcore_06 iter3 turn_limit_defeat override OR null + N=40 ratify secondary metric band convergence + hardcore_07 N=40 verify scenario_overrides path"_

## Artifacts

| File                  | Path                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| Baseline N=10         | `docs/playtest/2026-05-20-hardcore-06-postwave57.{json,jsonl,log}` + report    |
| Iter1 N=10 HP 30      | `docs/playtest/2026-05-20-hardcore-06-postfix-bosshp30.{json,jsonl,log}`       |
| Iter2 N=10 HP 26      | `docs/playtest/2026-05-20-hardcore-06-postfix-bosshp26-iter2.{json,jsonl,log}` |
| **Iter2 N=40 ratify** | `docs/playtest/2026-05-20-hardcore-06-postfix-bosshp26-n40.{json,jsonl,log}`   |
| Research doc          | `docs/research/2026-05-20-calibration-knob-patterns-industry.md`               |
| Museum card           | `docs/museum/cards/calibration-n-sample-authority-2026-05-20.md`               |
| Wrapper tool          | `tools/py/calibrate_drift_verify.py`                                           |
