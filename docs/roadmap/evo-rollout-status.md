---
title: Evo-Tactics rollout status
updated: 2025-10-29
generated_by: tools/roadmap/update_status.py
---

# Evo-Tactics rollout status

<!-- Generated automatically; edit via tools/roadmap/update_status.py -->

## Snapshot settimanale

- **Data riferimento:** 2025-10-29
- **Owner aggiornamento:** Gameplay Ops · Evo rollout crew
- **Status generale:** at-risk
- **Ultimo report trait gap:** `data/derived/analysis/trait_gap_report.json`
- **Copertura trait ETL:** 29/170 (17.1%)
- **Gap trait principali:** 51 missing_in_index, 174 missing_in_external
- **Playbook da archiviare:** 3
- **Ecotipi con mismatch legacy:** 20 su 20

## Avanzamento epiche ROL-\*

| Epic   | Stato       | Progress (%) | Gap aperti                     | Campione                                                                                                                        |
| ------ | ----------- | ------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| ROL-03 | in-progress | 99           | Playbook da archiviare: 3      | docs/evo-tactics/guides/security-ops.md, docs/evo-tactics/guides/template-ptpf.md, docs/evo-tactics/guides/visione-struttura.md |
| ROL-04 | in-progress | 77           | Trait missing_in_index: 51     | ali_fono_risonanti, articolazioni_a_leva_idraulica, articolazioni_multiassiali, artigli_ipo_termici, artiglio_cinetico_a_urto   |
| ROL-05 | at-risk     | 23           | Trait missing_in_external: 174 | ali_fulminee, ali_ioniche, ali_membrana_sonica, antenne_dustsense, antenne_eco_turbina                                          |
| ROL-06 | at-risk     | 0            | Ecotipi con mismatch: 20       | Anguis magnetica, Chemnotela toxica, Elastovaranus hydrus, Gulogluteus scutiger, Perfusuas pedes                                |

## Focus operativi

- **Documentazione legacy da snapshot (ROL-03):** docs/evo-tactics/guides/security-ops.md, docs/evo-tactics/guides/template-ptpf.md, docs/evo-tactics/guides/visione-struttura.md
- **Trait da indicizzare (ROL-04):** ali_fono_risonanti, articolazioni_a_leva_idraulica, articolazioni_multiassiali, artigli_ipo_termici, artiglio_cinetico_a_urto
- **Trait da fornire ai consumer esterni (ROL-05):** ali_fulminee, ali_ioniche, ali_membrana_sonica, antenne_dustsense, antenne_eco_turbina
- **Specie/ecotipi con mismatch (ROL-06):** Anguis magnetica, Chemnotela toxica, Elastovaranus hydrus, Gulogluteus scutiger, Perfusuas pedes

## Fonti principali

- `reports/evo/rollout/documentation_gap.md`
- `reports/evo/rollout/documentation_diff.json`
- `reports/evo/rollout/traits_gap.csv`
- `reports/evo/rollout/species_ecosystem_gap.md`
- `data/derived/analysis/trait_gap_report.json`
