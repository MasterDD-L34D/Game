---
type: research
status: live
workstream: combat
slug: 2026-05-10-trait-mech-no-handler-audit
tags: [trait, balance, audit, dead-economy]
date: 2026-05-10
author: balance-auditor-agent
---

# Trait-Mech No-Handler Audit — 2026-05-10

## Summary

- **Real trait count** in `trait_mechanics.yaml`: 30 (not 31 as cited — off-by-one in ticket).
- **Gap kind distribution**: 0 traits with empty active_effects (gap a), 0 traits with missing active_effects field (gap b for ability system), 1 trait missing passive handler in active_effects.yaml (gap b for passive system), **all 30 traits with gap (c)** — ability_ids defined but NOT registered in `data/core/jobs.yaml`, making them invisible to `abilityExecutor.js`.
- **Root cause**: two separate execution paths exist. `traitEffects.js` handles PASSIVE triggers (reads `active_effects.yaml` by trait_id). `abilityExecutor.js` handles ACTIVE ability dispatch (reads `jobs.yaml` by ability_id). Trait_mechanics defines 39 ability_ids across 30 traits — **0/39 are registered in jobs.yaml**.
- **Class distribution of missing registrations**: 21 buff abilities (Easy), 11 damage abilities (Medium), 4 heal abilities (Easy), 3 apply_status abilities (Easy).
- **Effort estimate**: 24 Easy × ~5min + 14 Medium × ~15min + 1 extra passive handler × ~10min = ~3h 40min total authoring.

---

## Architecture Clarification

Two resolver systems, both broken for trait_mechanics abilities:

| System          | File                 | Input                             | Output                                    | Status for trait_mechanics    |
| --------------- | -------------------- | --------------------------------- | ----------------------------------------- | ----------------------------- |
| Passive trigger | `traitEffects.js`    | `active_effects.yaml` by trait_id | damage_delta / status apply on attack     | 29/30 registered (1 missing)  |
| Active dispatch | `abilityExecutor.js` | `jobs.yaml` by ability_id         | buff / heal / damage / status on AP spend | 0/30 registered (all missing) |

The `buff`, `heal`, `damage`, `apply_status` effect_types in trait_mechanics are **ACTIVE abilities** (unit spends AP to trigger). `abilityExecutor.js` handles all 18 effect_types already — the gap is purely **missing jobs.yaml entries**. No new code needed for the easy/medium cases.

---

## Per-Trait Table (30 traits)

| #   | trait_id                         | class     | cost_ap | attack_mod | defense_mod | damage_step | gap_kind      | ability_ids                    | effect_types          | complexity | suggested_handler                                            |
| --- | -------------------------------- | --------- | ------- | ---------- | ----------- | ----------- | ------------- | ------------------------------ | --------------------- | ---------- | ------------------------------------------------------------ |
| 1   | struttura_elastica_amorfa        | defensive | 1       | 0          | 1           | 0           | c             | elastic_absorb                 | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +2, 2t)         |
| 2   | filamenti_digestivi_compattanti  | utility   | 1       | 0          | 0           | 0           | c + b_passive | digest_heal                    | heal                  | Easy       | jobs.yaml heal entry + active_effects.yaml passive trigger   |
| 3   | sacche_galleggianti_ascensoriali | mobility  | 2       | 0          | 1           | 0           | c             | buoyant_lift                   | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +1, 2t)         |
| 4   | grassi_termici                   | utility   | 1       | 0          | 0           | 0           | c             | thermal_pulse                  | heal                  | Easy       | jobs.yaml heal entry (1d4+2 self)                            |
| 5   | cuticole_cerose                  | utility   | 1       | 0          | 0           | 0           | c             | waxy_coat                      | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +1, 3t)         |
| 6   | scheletro_idro_regolante         | defensive | 2       | 0          | 1           | 0           | c             | hydro_fortify                  | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +2, 1t)         |
| 7   | olfatto_risonanza_magnetica      | utility   | 2       | 0          | 0           | 0           | c             | magnetic_sense                 | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +1, 2t)          |
| 8   | mimetismo_cromatico_passivo      | defensive | 1       | 0          | 1           | 0           | c             | chromatic_fade                 | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +3, 1t)         |
| 9   | eco_interno_riflesso             | utility   | 2       | 0          | 0           | 0           | c             | echo_pulse                     | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +1, 2t)          |
| 10  | coda_frusta_cinetica             | hybrid    | 2       | 1          | 1           | 0           | c             | tail_whip                      | damage                | Medium     | jobs.yaml damage entry (1d6+2, channel=fisico, target=enemy) |
| 11  | artigli_sette_vie                | offensive | 2       | 1          | 0           | 1           | c             | cleave_strike                  | damage                | Medium     | jobs.yaml damage entry (1d8+3, channel=fisico, target=enemy) |
| 12  | spore_psichiche_silenziate       | offensive | 2       | 1          | 0           | 1           | c             | spore_burst, umbral_spore      | apply_status + damage | Medium     | jobs.yaml apply_status + damage entries                      |
| 13  | nucleo_ovomotore_rotante         | mobility  | 2       | 0          | 0           | 0           | c             | spin_burst, vortex_spin        | buff + damage         | Medium     | jobs.yaml buff entry + damage entry (1d6+1, channel=wind)    |
| 14  | focus_frazionato                 | utility   | 2       | 0          | 0           | 0           | c             | divided_focus                  | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +2, 1t)          |
| 15  | ventriglio_gastroliti            | utility   | 2       | 0          | 0           | 0           | c             | energy_burst                   | buff                  | Easy       | jobs.yaml buff entry (buff_stat=damage_step, +2, 1t)         |
| 16  | sonno_emisferico_alternato       | utility   | 2       | 0          | 0           | 0           | c             | vigilant_rest                  | heal                  | Easy       | jobs.yaml heal entry (1d4+1 self)                            |
| 17  | sangue_piroforico                | offensive | 2       | 1          | 0           | 0           | c             | ignition_surge                 | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +2, 2t)          |
| 18  | respiro_a_scoppio                | mobility  | 2       | 0          | 0           | 0           | c             | explosive_rush, gale_burst     | buff + damage         | Medium     | jobs.yaml buff entry + damage entry (1d6+2, channel=wind)    |
| 19  | empatia_coordinativa             | utility   | 2       | 0          | 0           | 0           | c             | coordinated_boost              | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +1, 2t)          |
| 20  | cute_resistente_sali             | defensive | 2       | 0          | 1           | 0           | c             | salt_harden                    | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +2, 2t)         |
| 21  | criostasi_adattiva               | defensive | 3       | 0          | 1           | 0           | c             | frozen_stasis                  | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +3, 1t)         |
| 22  | carapace_fase_variabile          | defensive | 3       | 0          | 1           | 0           | c             | phase_shift                    | buff                  | Easy       | jobs.yaml buff entry (buff_stat=defense_mod, +2, 2t)         |
| 23  | secrezione_rallentante_palmi     | defensive | 2       | 0          | 1           | 0           | c             | slowing_touch                  | apply_status          | Easy       | jobs.yaml apply_status entry (status=disorient, 1t)          |
| 24  | risonanza_di_branco              | utility   | 1       | 0          | 0           | 0           | c             | pack_call                      | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +1, 2t)          |
| 25  | occhi_infrarosso_composti        | utility   | 1       | 0          | 0           | 0           | c             | thermal_scan                   | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +1, 1t)          |
| 26  | mantello_meteoritico             | defensive | 3       | 0          | 2           | 0           | c             | meteoric_shield, meteor_strike | buff + damage         | Medium     | jobs.yaml buff entry + damage entry (1d8+2, channel=earth)   |
| 27  | lingua_tattile_trama             | utility   | 1       | 0          | 0           | 0           | c             | taste_weakness                 | buff                  | Easy       | jobs.yaml buff entry (buff_stat=attack_mod, +2, 1t)          |
| 28  | frusta_fiammeggiante             | offensive | 2       | 1          | 0           | 1           | c             | whip_lash                      | damage                | Medium     | jobs.yaml damage entry (1d8+2, channel=fuoco, target=enemy)  |
| 29  | enzimi_chelanti                  | utility   | 1       | 0          | 0           | 0           | c             | neutralize_toxin               | heal                  | Easy       | jobs.yaml heal entry (1d4+2 self)                            |
| 30  | zoccoli_risonanti_steppe         | utility   | 1       | 0          | 0           | 0           | c             | resonant_stomp                 | apply_status          | Easy       | jobs.yaml apply_status entry (status=disorient, 1t)          |

---

## Count Correction

Cited gap count was **31**. Actual count is **30 traits** (off-by-one: `_defaults` section has 5 class entries that were miscounted as traits in the original ticket). All 30 traits have gap (c) by the active-ability path. 1 of those 30 also has gap (b) for the passive trigger path.

---

## Gap Distribution

| gap_kind                                              | count | description                                 |
| ----------------------------------------------------- | ----- | ------------------------------------------- |
| (a) active_effects empty array                        | 0     | All 30 have abilities defined               |
| (b) passive handler missing (active_effects.yaml)     | 1     | filamenti_digestivi_compattanti only        |
| (c) ability_id unknown to abilityExecutor (jobs.yaml) | 30    | ALL traits — 39 ability_ids, 0 in jobs.yaml |

| complexity                    | count     | traits                                                                                                                                                                                                              |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Easy (buff/heal/apply_status) | 24 traits | 21 buff + 4 heal + 3 apply_status abilities on 24 traits                                                                                                                                                            |
| Medium (damage dispatch)      | 9 traits  | coda_frusta_cinetica, artigli_sette_vie, spore_psichiche_silenziate, nucleo_ovomotore_rotante, respiro_a_scoppio, mantello_meteoritico, frusta_fiammeggiante, ipertrofia_muscolare_massiva, cannone_sonico_a_raggio |
| Hard (novel mechanic)         | 0         | None — all effect_types already handled in abilityExecutor.js                                                                                                                                                       |

---

## Quick-Ship Recipe for Easy traits (24 traits × ~5min)

Each easy trait needs one jobs.yaml entry under a "trait_abilities" section (or appended to relevant job). Template:

```yaml
# In data/core/jobs.yaml, under a new section 'trait_abilities:' or per-job:
<ability_id>:
  ability_id: <ability_id>
  name_it: "<name from trait_mechanics>"
  cost_ap: <cost_ap from active_effects entry>
  cost_pi: 0          # trait-native, no PI unlock needed
  effect_type: <buff|heal|apply_status>
  # For buff:
  buff_stat: <buff_stat>        # e.g. defense_mod
  buff_amount: <buff_amount>    # e.g. 2
  buff_duration: <buff_duration> # e.g. 2
  target: self
  # For heal:
  heal_dice: { count: 1, sides: 4, modifier: 2 }
  target: self
  # For apply_status:
  status_id: <status_id>        # e.g. disorient
  status_duration: <N>
  target: enemy
  rank: 1
  source: trait  # marker so abilityExecutor knows this is trait-native not job
```

All values already specified in trait_mechanics.yaml `active_effects` block — copy-transform.

---

## Medium Trait Recipe (9 traits × ~15min)

Damage abilities require `damage_dice` spec. Already present in trait_mechanics. Template:

```yaml
<ability_id>:
  ability_id: <ability_id>
  name_it: '<name_it from trait_mechanics>'
  cost_ap: <cost_ap from active_effects>
  cost_pi: 0
  effect_type: damage
  damage_dice: { count: <N>, sides: <S>, modifier: <M> }
  channel: <fisico|fuoco|wind|earth|mentale|dark>
  target: enemy
  rank: 1
  source: trait
```

Special multi-ability traits (spore_psichiche_silenziate, nucleo_ovomotore_rotante, respiro_a_scoppio, mantello_meteoritico): register both ability_ids as separate entries with their individual effect_types.

---

## Passive Handler Gap (1 trait)

`filamenti_digestivi_compattanti` — has `active_effects.heal` in trait_mechanics but NO matching entry in `data/core/traits/active_effects.yaml`. Missing passive trigger for heal kind (added to traitEffects.js 2026-05-10 via TKT-TRAIT-HEAL-HANDLER).

Fix: add entry to `active_effects.yaml`:

```yaml
filamenti_digestivi_compattanti:
  tier: T1
  category: fisiologico
  applies_to: actor
  trigger:
    action_type: attack
    on_result: hit
  effect:
    kind: heal
    amount: 3
    dice: '1d6+1'
    log_tag: filamenti_digestivi_heal
  description_it: |
    Filamenti digestivi che estraggono nutrienti dai tessuti del bersaglio
    colpito. Ogni hit innesca micro-digestione di contatto: recupera 1d6+1 HP.
```

---

## Effort Breakdown

| category                                        | count                          | per-unit    | total        |
| ----------------------------------------------- | ------------------------------ | ----------- | ------------ |
| Easy traits — jobs.yaml buff/heal/apply_status  | 24 traits (38 abilities)       | ~5min each  | ~3h 10min    |
| Medium traits — jobs.yaml damage                | 9 traits (14 damage abilities) | ~15min each | ~2h 15min    |
| Passive handler (active_effects.yaml)           | 1 trait                        | ~10min      | 10min        |
| Integration test (batch smoke N=5 per category) | —                              | ~30min      | 30min        |
| **TOTAL**                                       |                                |             | **~6h 5min** |

Parallelizable: Easy batch can be scripted (copy-transform from trait_mechanics YAML → jobs.yaml entries). Realistic with scripting assist: ~3h total.

---

## Proposed Tickets

```
TKT-P6-TRAIT-MECH-JOBS-EASY: 3h — register 24 easy trait abilities (buff/heal/apply_status) in jobs.yaml
TKT-P6-TRAIT-MECH-JOBS-MEDIUM: 2h — register 9 medium trait abilities (damage) in jobs.yaml
TKT-P1-TRAIT-MECH-PASSIVE-FIX: 10min — add filamenti_digestivi_compattanti to active_effects.yaml
TKT-P6-TRAIT-MECH-INTEGRATION: 30min — smoke test ability dispatch for 5 sampled traits post-registration
```

---

## Notes

- **No new effect_type kinds needed** — abilityExecutor.js already handles all 18 types including buff/heal/damage/apply_status.
- **No resolver code changes** — pure data authoring in jobs.yaml.
- **Naming collision risk**: `enzimi_chelanti` appears in both trait_mechanics (heal ability) and active_effects.yaml (apply_status bleeding). These are distinct systems — no conflict.
- **`ipertrofia_muscolare_massiva`** has 2 damage abilities (power_strike + ground_pound) — both Medium, register separately.
- **`cannone_sonico_a_raggio`** has 2 damage abilities (sonic_blast + pressure_wave) — both Medium, register separately.
