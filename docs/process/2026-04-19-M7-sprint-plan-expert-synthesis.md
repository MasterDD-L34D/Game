---
title: M7 Sprint plan — expert audit synthesis + damage scaling pivot
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - 'docs/playtest/2026-04-19-m6-iter3-channel-exploit.md'
  - 'docs/playtest/2026-04-19-m6-iter2b-baseline.md'
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
  - 'docs/adr/ADR-2026-04-19-kill-python-rules-engine.md'
---

# M7 Sprint plan — expert audit synthesis

**Data**: 2026-04-19 (session-end)
**Trigger**: post M6-Z iter4 0 defeat pattern + user challenge "risolviamo debiti tecnici prima"
**Outcome**: STOP calibration archaeology, PIVOT damage scaling, FIX structural DPR asymmetry

## Session 2026-04-19 final scoreboard

**19 PR merged in main** (M5 + M6 + quick wins M7):

| Bucket                            | PR count |  Effort  |
| --------------------------------- | :------: | :------: |
| M5 P0 audit fix + retrospective   |    10    |   ~5h    |
| M6 core (engine + data + routing) |    4     |   ~3h    |
| M6 hotfix + docs + deprecation    |    4     |  ~1.5h   |
| M7 quick wins cherry              |    1     |  ~1.5h   |
| **Total**                         |  **19**  | **~11h** |

## 4 expert audit synthesis

### 1. balance-auditor — **smoking gun identified**

**DPR asymmetry root cause 0 defeat**:

| Matchup (N=10k sim)                   | Hit rate | Dmg/atk | Atks to kill |
| ------------------------------------- | :------: | :-----: | :----------: |
| BOSS (mod5) → skirmisher (cd11, hp10) |   75%    |  4.88   |   **2.0**    |
| BOSS (mod5) → vanguard (cd13, hp14)   |   65%    |  4.12   |     3.4      |
| elite (mod3) → skirmisher             |   66%    |  2.46   |     4.1      |
| player_sk (mod3) → BOSS (cd15, hp40)  |   46%    |  1.58   |     25.3     |

- Enemy total DPR/round: **37.80**
- Player total DPR/round: **24.52**
- Ratio player/enemy: **0.65x**

Channel exploit ±20% = irrelevante vs structural gap.

Secondary finding: **PRESSURE_DELTAS inverted** — winning side escalates instead of losing side (AI Progress meter pattern violated). Design decision pending ADR.

### 2. session-debugger — **14 call sites channel hardcoded**

M6-#1b refactor pipe `action.channel` solo in 3 bridge sites. Altri 11 (overwatch ×2 + abilityExecutor ×7 + legacy ×1 + /action direct ×1) ancora default "fisico". Feature resistance **monodimensionale** in produzione.

**Status model triplice drift risk**: dict + intensity dict + array (M5-#5 Option B bandaid). `syncStatusesFromRoundState` chiamato 4× per round. Memory leak potential + drift non-detectable.

### 3. sot-planner — **doc stale critici**

| File                                    | Gap                                                     |
| --------------------------------------- | ------------------------------------------------------- |
| `docs/hubs/combat.md`                   | Cita Python `merge_resistances()` only, no M6-#1 native |
| `docs/core/00-SOURCE-OF-TRUTH.md §13.2` | Python impl primary, Node missing                       |
| `docs/core/11-REGOLE_D20_TV.md`         | No resistance come player choice                        |

**3 ADR missing**:

1. Player job archetype design
2. Channel damage taxonomy
3. Species archetype migration plan

### 4. ROI prioritization — **ranking netto**

| #   | Debt                        |   ROI   | Action            |
| --- | --------------------------- | :-----: | ----------------- |
| 1   | replace_all prevention hook | **8.0** | FIX NOW           |
| 2   | Plan-Reveal TODO P0         |   3.3   | FIX NOW           |
| 3   | Overwatch channel hardcode  |   3.0   | FIX NOW           |
| 4   | Status model canonical #5b  |   2.4   | FIX NOW           |
| 5   | deepClone consolidation     |   2.0   | FIX NOW           |
| 6   | Damage scaling asymmetry    |  1.56   | **PIVOT FEATURE** |
| 12  | Target band 15-25%          |   0.3   | **KILL**          |

## Flint meta-verdict

> "OFF TRACK outcome. 3 iter senza defeat = lever sbagliato. Calibration archaeology. Sunk cost mascherato. Target 15-25% one-size-fits-all fallacy."

- **Damage scaling = FEATURE**, non debt. ADR + `damage_curves.yaml` in M7.
- **M6-Z branch = KILL** + cherry-pick code (done via #1646).
- **Python Phase 3** = DEFER post-M7.

## Shipped M7 Quick Wins (#1646)

### Fix #1 — DPR structural

`sessionConstants.js`:

- `DEFAULT_HP` 10 → **14** (player survival +40% vs BOSS focus-fire)
- `DEFAULT_DC` 12 → **13** (hit rate enemy 75% → ~55%)

Expected iter5: defeat rate 0 → **10-30%** (se DPR era root cause real).

### Cherry M6-Z code (architectural)

- `JOB_ARCHETYPE` map (vanguard→corazzato, warden/invoker→psionico, altri→adattivo)
- `ARCHETYPE_VULN_CHANNEL` map (canale exploit per archetype)
- `normaliseUnit` derive `resistance_archetype` da input OR job
- `declareSistemaIntents::pickExploitChannel` enemy AI smart channel

## M7 sprint plan (≈14h, 6 PR stimati)

| #   | Task                                                                   | Tipo           | Ore |   ROI    |
| --- | ---------------------------------------------------------------------- | -------------- | :-: | :------: |
| 1   | replace_all prevention hook (.claude/commands/)                        | Infrastructure |  1  |   8.0    |
| 2   | **ADR damage scaling curves** + `data/core/balance/damage_curves.yaml` | Design         |  3  |   high   |
| 3   | Channel routing 14 call sites (overwatch + abilityExecutor + legacy)   | Feature        | 2-3 |   3.0    |
| 4   | Status canonical M5-#5b (unify dict + intensity + array)               | Refactor       |  5  |   2.4    |
| 5   | Plan-Reveal TODO P0 (render.js:369 + main.js:422)                      | Frontend       |  3  |   3.3    |
| 6   | Iter5 calibration validation post-DPR fix                              | Playtest       | 0.5 | validate |

### Design decision pending ADR

- **PRESSURE_DELTAS direction**: AI escalates on winning side (current) vs losing side (balance-auditor proposal). Design choice, not bug. ADR M7.
- **Target difficulty band**: kill 15-25% one-size. Derive per encounter class:
  - Tutorial 60-80%
  - Standard 40-60%
  - Hardcore 15-25%
  - Boss 5-15%

## Key lessons

### Technical

1. **replace_all pattern recurrent** (2× bug production 48h: PR #1628 AP/roundAction + #1641 action undefined). Need prevention hook.
2. **Calibration archaeology trap** (4 iter senza defeat = segnale forte lever sbagliato, non tuning issue).
3. **Spec-vs-impl asymmetry** (84 species archetype data but only 4 job player routing).
4. **Docs drift post-refactor** (combat.md stale 48h dopo major engine shift).

### Process

1. **Spike-first before committing 10h plan** (Flint pre-M6 spike validated lever, pre-M7 pivot spike validated DPR hypothesis via expert sim).
2. **Expert agent audit post-session** (4 parallel perspectives = root cause in 30 min vs weeks of calibration).
3. **"Qual è la leva giusta?" > "Qual è il tuning giusto?"** (primo questione design, secondo è engineering).
4. **Kill-60 criterion netto** (Win >50% OR defeat <10% → STOP vs iter-forever).

### Design

1. **Resistance = tactical lever reale** (evidence spike + iter3 +5.7% damage output con channel exploit).
2. **Damage scaling = feature separata** (mai conflare con resistance tuning).
3. **Target band one-size fallacy** (hardcore-06 ≠ tutorial_01).

## Outstanding M7+ backlog

- Expert audit findings non-closed: 12 total debts ranked, 5 FIX NOW (shipped), 7 DEFER/KILL
- Python Phase 3 removal post-M7
- Encounter schema archetype override (M8+)
- MBTI/Ennea VC recalibrate (playtest-gated)
- Channel damage taxonomy ADR
- Player job archetype ADR
- Species archetype migration plan ADR

## Riferimenti

- [M5 retrospective](2026-04-18-M4-retrospective-art-integration-gap.md) — previous arc
- [M6 iter2b baseline](../playtest/2026-04-19-m6-iter2b-baseline.md) — 50% win ground-truth
- [M6 iter3 channel exploit](../playtest/2026-04-19-m6-iter3-channel-exploit.md) — 60% unexpected up
- [ADR kill Python rules engine](../adr/ADR-2026-04-19-kill-python-rules-engine.md) — Phase 1 active
- Flint reviews (x3 this session) — brutal honesty validated
- Expert agents (balance/session/sot/ROI) 2026-04-19 — 4 parallel perspectives synthesis
