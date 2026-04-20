---
title: 'ADR 2026-04-20 — Damage scaling curves (difficulty as feature, not tuning)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-20'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
  - 'docs/playtest/2026-04-19-m6-iter2b-baseline.md'
  - 'docs/playtest/2026-04-19-m6-iter3-channel-exploit.md'
  - 'docs/process/2026-04-19-M7-sprint-plan-expert-synthesis.md'
---

# ADR-2026-04-20 · Damage scaling curves

**Stato**: 🟢 ACCEPTED — implementation chiusa (Phase A+B+C+D+E shipped 2026-04-20, PR #1652/#1653/#1654/#1656/#1657). Calibration **parked iter7 RED**, structural fix → M9 (NON ulteriore multiplier tune).
**Trigger**: M6 iter5 evidence (70% win rate post M7 quick wins, 0 defeat 4 iter consecutivi) → Flint verdict "lever sbagliata, damage scaling è feature non debt"

## Contesto

Sprint M6 + M7 quick wins hanno implementato resistance/channel system (spike validated 84.6→20% lever), species archetype field (84 specie + 4 job player map), channel routing (10/14 call sites). Con tutto attivo, batch calibration hardcore-06:

| Iter                        |    Win    | Defeat | Timeout | Notes                     |
| --------------------------- | :-------: | :----: | :-----: | ------------------------- |
| baseline                    |   84.6%   |   -    |    -    | pre-M6                    |
| iter2b                      |    50%    |   0    |  5/10   | M6 resistance, no routing |
| iter3                       |    60%    |   0    |  4/10   | player smart channel      |
| iter4                       |    50%    |   0    |  5/10   | enemy smart channel       |
| iter5 (post M7 DPR+routing) | **70%** ↑ | **0**  |  3/10   | player più robusto        |

**Pattern**: resistance lever corretto tatticamente, MA **0 defeat in 4 iter consecutivi**. Flint verdict (2026-04-19 review):

> "Channel exploit aumenta probabilità hit, non damage step. Root cause = enemy damage per hit insufficient vs player HP pool. Stai grattando sintomo, non malattia."

Balance-auditor sim N=10k confermò DPR asymmetry:

- Enemy total DPR/round: 37.80
- Player total DPR/round (8p × 2AP): 24.52
- Ratio player/enemy 0.65x ma **enemy non focus-fire** → damage splits 8 target → team pool 112HP sopravvive sempre

## Problema di design

Target "15-25% win rate" deriva da hardcore-06 playtest iter1 estrapolato universalmente. Expert analysis (ROI) + Flint concorde:

**Target band 15-25% one-size-fits-all = fallacy.**

Curve difficulty reali per encounter type:

| Encounter class | Target win | Target defeat | Target timeout |
| --------------- | :--------: | :-----------: | :------------: |
| Tutorial 01-03  |   60-80%   |    10-20%     |     5-10%      |
| Tutorial 04-05  |   40-60%   |    20-35%     |     5-15%      |
| Standard        |   35-55%   |    25-40%     |     10-20%     |
| Hardcore        |   15-25%   |    40-55%     |     15-25%     |
| Boss            |   5-15%    |    55-70%     |     10-25%     |

Non **win rate** unico. Design sano: **defeat rate > 20%** per sentire threat. 0 defeat = combat dead (stall o exploit).

## Decisione

**Damage scaling come FEATURE canonica**, non calibration tuning ad-hoc. Nuovo file `data/core/balance/damage_curves.yaml` che definisce:

1. **Enemy base damage curves** per encounter class × enemy tier
2. **Player HP curves** per job × character_level (future)
3. **Difficulty target bands** per encounter class (sostituisce one-size 15-25%)
4. **Boss damage scaling multiplier** su HP threshold (enrage mechanic)

### Architettura

```yaml
# data/core/balance/damage_curves.yaml
version: '1.0'
encounter_classes:
  tutorial:
    target_bands:
      win_rate: [0.60, 0.80]
      defeat_rate: [0.10, 0.20]
      timeout_rate: [0.05, 0.10]
    enemy_damage_multiplier: 1.0
    boss_enrage_threshold_hp: null
  standard:
    target_bands:
      win_rate: [0.35, 0.55]
      defeat_rate: [0.25, 0.40]
      timeout_rate: [0.10, 0.20]
    enemy_damage_multiplier: 1.2
    boss_enrage_threshold_hp: 0.30 # 30% HP → +1 mod damage
  hardcore:
    target_bands:
      win_rate: [0.15, 0.25]
      defeat_rate: [0.40, 0.55]
      timeout_rate: [0.15, 0.25]
    enemy_damage_multiplier: 1.4
    boss_enrage_threshold_hp: 0.40
  boss:
    target_bands:
      win_rate: [0.05, 0.15]
      defeat_rate: [0.55, 0.70]
      timeout_rate: [0.10, 0.25]
    enemy_damage_multiplier: 1.6
    boss_enrage_threshold_hp: 0.50

enemy_tiers:
  minion:
    base_mod: 2
    hp_baseline: 4
  elite:
    base_mod: 3
    hp_baseline: 8
  boss:
    base_mod: 5
    hp_baseline: 20
    enrage_mod_bonus: 1 # +1 mod quando hp < threshold class

# Player job archetype combat stats (per M8 class system)
player_classes:
  vanguard:
    hp_baseline: 14
    armor_baseline: 0
  warden:
    hp_baseline: 10
    armor_baseline: 0
  skirmisher:
    hp_baseline: 10
    armor_baseline: 0
```

### Integrazione runtime

1. **Encounter YAML** dichiara `encounter_class: hardcore` (default `standard`)
2. **Hydration session init** (apps/backend/routes/session.js `/start`) legge class → applica `enemy_damage_multiplier` a tutti enemy.mod
3. **Boss enrage** (session.js performAttack boss turn): se `boss.hp / boss.max_hp < threshold` → enemy damage +enrage_mod_bonus per quel turno
4. **Calibration harness** (`tools/py/batch_calibrate_hardcore06.py`): leggi target_bands da damage_curves.yaml invece di 15-25% hardcoded → determine pass/fail per encounter class

### Tuning iter1 proposto (post-ADR merge)

- hardcore-06 enemy mod effective post multiplier 1.4:
  - BOSS mod 5 → **7** (was 5)
  - Elite mod 3 → **4** (was 3)
  - Minion mod 2 → **3** (was 2)
- Boss hp 22 → 28 (allunga exploit window ma letalità +40%)
- Enrage: boss < 40% hp → +1 mod (= 8 total, nuke finale)

Expected iter6 post-tuning:

- Win 20-30% (da 70%)
- Defeat 35-50% (da 0)
- Timeout 15-25%

**Dentro target_bands hardcore class** (15-25% win + 40-55% defeat).

## Conseguenze

### Positive

- **Difficulty declared, not inferred**: ogni encounter dichiara class → sistema tuning coerente
- **Per-class target bands**: tutorial easy vs boss challenging, non one-size
- **Enrage mechanic**: boss letale fase finale = tension drammatica (not stall)
- **Calibration-driven**: harness legge target YAML, pass/fail oggettivo
- **Future M8 ready**: player class stats in stesso file, stat curves sbloccano per character progression

### Negative

- **Complexity +1 layer**: damage multiplier pipeline pre-attack (session init)
- **YAML schema drift risk**: nuovo file, serve AJV schema + CI guard (aggiungere)
- **Breaking tuning precedente**: encounter corrente hardcore-06 boss mod 5 sarà 7 post-apply → richiede re-playtest tutti scenari
- **Tutorial impatto**: encounter senza class dichiarato → `standard` default, mod multiplier 1.2 → lievemente più letali. Da validare per tutorial_01-03 (target 60-80% win).

### Rollback

- Delete `damage_curves.yaml`
- Remove pipeline hook in session.js `/start`
- Scenari YAML continuano funzionare (class ignored)
- Full revert docs-only PR

## Implementation plan (M7-#2 stack)

1. **Phase A — ADR + YAML** (questo PR, ~3h):
   - ADR approved
   - `data/core/balance/damage_curves.yaml` creato
   - JSON Schema `schemas/evo/damage_curves.schema.json`
   - CI guard `tests/scripts/damageCurvesIntegrity.test.js`

2. **Phase B — Runtime integration** (~3h, separate PR):
   - Loader `services/balance/damageCurves.js`
   - Hook in session.js `/start`: apply `enemy_damage_multiplier` to unit.mod
   - Hook in performAttack boss: enrage check + mod bonus
   - Tests integration session init + enrage

3. **Phase C — Encounter class annotations** (~1h):
   - Annotate encounter YAML (~10 scenari) con `encounter_class`
   - CI guard: ogni encounter ha class valida

4. **Phase D — Calibration harness upgrade** (~2h):
   - `batch_calibrate_hardcore06.py` legge target_bands from YAML
   - Output pass/fail per class target
   - Iter6 batch post-tuning

**Totale M7-#2 cluster: ~9h, 4 PR.**

## Design decision pending

### Q1: Enrage mechanic ambito

Opzione A: solo boss tier (hardcoded via `tier:'boss'`)
Opzione B: qualsiasi unit con custom `enrage_threshold` nel YAML encounter

Scelta: **A** per Phase B (cleaner). B come future M8+.

### Q2: Multiplier applicato a mod o a damage_dice?

Opzione A: `unit.mod *= multiplier` al session init (statico)
Opzione B: damage final dice roll × multiplier (dinamico)

Scelta: **A** (statico). Più semplice + testabile + compatibile con predict_combat. B over-engineered.

### Q3: Target bands overlap acceptable?

Tutorial defeat 10-20% vs standard defeat 25-40% ha overlap zero. Bands non-overlapping → encounter class determinabile post-hoc da win_rate.

## Implementation log (post-accept)

### Phase A — ADR + YAML (shipped 2026-04-20, PR #1652)

- `data/core/balance/damage_curves.yaml` creato, 5 encounter_classes + enemy_tiers + player_classes
- CI guard `tests/scripts/damageCurvesIntegrity.test.js` (10 test)

### Phase B — Runtime (shipped 2026-04-20, PR #1653)

- `apps/backend/services/balance/damageCurves.js` loader + 4 helper
- `session.js /start` applica `enemy_damage_multiplier` a `unit.mod` enemy spawn
- `performAttack` boss enrage hook: check `shouldEnrageBoss` pre-attack, applica `enrage_mod_bonus`, revert post
- 13/13 test verdi

### Phase C — Encounter annotation (shipped 2026-04-20, PR #1654)

- 9 YAML encounter + 5 JS tutorial scenario + 1 hardcore annotati con `encounter_class`
- Schema `schemas/evo/encounter.schema.json` esteso con enum 5 valori
- Frontend `apps/play/src/main.js` propaga `encounter_class` in `startOpts`
- 12/12 schema test + 254/254 api test verdi

### Phase D — Harness verdict (shipped 2026-04-20, PR #1656)

- `batch_calibrate_hardcore06.py`: `load_target_bands()` mini-YAML stdlib-only parser
- `verdict_for()` emette GREEN/AMBER (±5pp edge) / RED (>5pp out) / UNKNOWN
- CLI `--encounter-class` flag
- 9/9 pytest verdi

### Phase E — Hardcore tune (shipped 2026-04-20)

Post iter6 RED (wr 63.3%, defeat 0%), tune YAML knob:

- `hardcore.enemy_damage_multiplier`: 1.4 → **1.8** (+28%)
- `boss.enemy_damage_multiplier`: 1.6 → **2.0** (mantiene monotonic)
- `enemy_tiers.boss.enrage_mod_bonus`: 1 → **3** (late-fight drama)

Test aggiornati per nuovi valori (23/23 verdi).

## Calibration log

| Iter  | Config                              |   N |   Win | Defeat | Timeout | Verdict | Commit         |
| ----- | ----------------------------------- | --: | ----: | -----: | ------: | :-----: | -------------- |
| iter6 | hardcore 1.4x, enrage 1             |  30 | 63.3% |   0.0% |   36.7% | 🔴 RED  | PR #1657       |
| iter7 | hardcore 1.8x, boss 2.0x, enrage +3 |  30 | 33.3% |   0.0% |   66.7% | 🔴 RED  | Phase E branch |

Target band (ADR): win 15-25%, defeat 40-55%, timeout 15-25%.

**iter7 outcome**: wr ↓ -30pp (direzionalmente giusto, ancora +8pp over), defeat stuck 0%, timeout raddoppiato (stalemate pattern). Verdict Flint kill-60: **multiplier knob exhausted, park + structural fix M9**. Vedi `docs/playtest/2026-04-20-m7-iter7-phase-e-verdict.md`.

## Lesson (post iter6+iter7)

1. **Feature shipped correctly**: verdict auto emesso validates Phase D ROI.
2. **Numeri starting-point ≠ calibrated**: ADR multiplier 1.4x scelto come educated guess, non N=30 pre-validated. Phase E tune necessary post-playtest.
3. **Pattern validato**: data-driven verdict > ad-hoc eyeballing. Pre-Phase D, iter6 avrebbe richiesto lettura manuale win_rate + confronto mentale con band.
4. **Multiplier knob plateaued**: iter7 conferma scaling lineare mult→wr exists, MA defeat_rate stuck a 0%. Structural fix obbligatorio (M9): timeout=defeat, concentrate enemy aggro, o ridurre player HP pool. NON ulteriore multiplier tune.
5. **Kill-60 disciplined**: 2 iter sufficienti per diagnose. 3rd iter sarebbe stato wasted cycle. Parking ship value > perfection.

## Autori

- Master DD (user direction 2026-04-19/20)
- Flint advisor review (damage scaling = feature pivot)
- Expert agents parallel audit (balance-auditor DPR smoking gun)
