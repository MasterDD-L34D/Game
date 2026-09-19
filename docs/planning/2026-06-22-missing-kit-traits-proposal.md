---
title: '12 missing creature-kit traits -- mechanic proposal (master-dd ratify)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [trait, mechanic, creatures, salvage, ratify]
---

# 12 missing creature-kit traits -- mechanic proposal

Option (2) of the creature salvage: the 13 retired creatures' signature kit traits
do NOT exist in canon (0 in active_effects, no mechanic anywhere). To salvage their
identity I propose a concrete mechanic per trait (using the canon `effect.kind`
vocabulary: apply_status / damage_reduction / extra_damage / buff_stat / heal /
attack_bonus). **I draft, you ratify** -- approve/edit the mechanic; then I add each
to `active_effects.yaml` + generate the per-trait DB file via `add_trait_stub` +
wire it into the creature kits.

**Band-neutral by construction**: none of these traits is referenced by any combat
sim party until the creatures are flipped live, so the catalog/oracle bands don't move.

| id                    | category        | tier | concept                                              | proposed mechanic (effect)                | used by                        |
| --------------------- | --------------- | ---- | ---------------------------------------------------- | ----------------------------------------- | ------------------------------ |
| adattamento_volo      | fisiologico     | T1   | Adattamento al volo / mobilita' aerea                | `buff_stat` move_bonus +1                 | archon, balor, banshee, couatl |
| artigli_psionici      | offensivo       | T2   | Artigli a scarica psionica (bypassa armatura fisica) | `extra_damage` +1 (log psionic_claws)     | rakshasa                       |
| corteccia_memetica    | difensivo       | T2   | Corteccia che assorbe/devia il colpo                 | `damage_reduction` 1                      | treant                         |
| eco_sismico           | sensoriale      | T1   | Ecolocalizzazione sismica -> mira migliore           | `attack_bonus` +1                         | banshee                        |
| filtri_bioattivi      | fisiologico     | T1   | Filtri che neutralizzano tossine                     | `damage_reduction` 1                      | otyugh                         |
| maschera_illusoria    | comportamentale | T2   | Maschera illusoria -> disorienta l'attaccante        | `apply_status` enemy `disorient` 1t (\*)  | rakshasa                       |
| matrice_antimagia     | control         | T3   | Matrice che sopprime le abilita' nemiche vicine      | `apply_status` enemy `suppressed` 1t (\*) | golem                          |
| membrane_osmotiche    | fisiologico     | T1   | Membrane osmotiche -> resistenza ambientale          | `damage_reduction` 1                      | otyugh                         |
| nuclei_di_controllo   | control         | T2   | Nuclei di controllo -> coordinazione                 | `buff_stat` move_bonus +1                 | golem                          |
| pigmenti_aurorali     | sensoriale      | T1   | Pigmenti aurorali -> abbaglia il nemico              | `apply_status` enemy `disorient` 1t (\*)  | treant                         |
| radici_ancora_planare | difensivo       | T2   | Radici-ancora -> molto tanky da fermo                | `damage_reduction` 2                      | treant                         |
| tessuti_adattivi      | fisiologico     | T2   | Tessuti adattivi -> rigenerazione lieve              | `heal` 1                                  | rakshasa                       |

(\*) `disorient` esiste gia' nel motore (usato dai trait TKT-P6). `suppressed` e'
NUOVO: se non vuoi toccare il motore, lo rimpiazzo con un `apply_status` esistente
(es. `disorient`) o un `buff_stat` debuff -- tua scelta.

## After your ratify

1. Add each ratified mechanic to `data/core/traits/active_effects.yaml`.
2. `add_trait_stub` -> per-trait DB file + index entry + glossary (the 5-gate flow).
3. Wire into the creature kits (the 13 specs).
4. Canonize creatures + re-baseline (CI-green).

**Your call**: approve the mechanics as-is, edit any (tier/effect/amount), and
decide the `suppressed` status (new engine status vs reuse existing). Then I build
the 12 + finish the creature kits.
