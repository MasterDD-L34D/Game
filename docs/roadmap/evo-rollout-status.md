---
title: Evo-Tactics rollout status
updated: 2025-12-02
generated_by: tools/roadmap/update_status.py
---

# Evo-Tactics rollout status

<!-- Generated automatically; edit via tools/roadmap/update_status.py -->

## Snapshot settimanale

- **Data riferimento:** 2025-12-02
- **Owner aggiornamento:** Gameplay Ops · Evo rollout crew
- **Status generale:** at-risk
- **Ultimo report trait gap:** `data/derived/analysis/trait_gap_report.json`
- **Copertura trait ETL:** 20/254 (7.9%)
- **Gap trait principali:** 0 missing_in_index, 0 missing_in_external, 253 mismatch
- **Playbook da archiviare:** 3
- **Ecotipi con mismatch legacy:** 0 su 20

## Avanzamento epiche ROL-\*

| Epic   | Stato       | Progress (%) | Gap aperti                         | Campione                                                                                                                        |
| ------ | ----------- | ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ROL-03 | in-progress | 99           | Playbook da archiviare: 3          | docs/evo-tactics/guides/security-ops.md, docs/evo-tactics/guides/template-ptpf.md, docs/evo-tactics/guides/visione-struttura.md |
| ROL-04 | at-risk     | 0            | Trait da allineare (index): 253    | ali_fono_risonanti, ali_fulminee, ali_ioniche, ali_membrana_sonica, ali_solari_fotoni                                           |
| ROL-05 | at-risk     | 0            | Trait da allineare (external): 253 | ali_fono_risonanti, ali_fulminee, ali_ioniche, ali_membrana_sonica, ali_solari_fotoni                                           |
| ROL-06 | done        | 100          | Ecotipi con mismatch: 0            | Anguis magnetica, Chemnotela toxica, Elastovaranus hydrus, Gulogluteus scutiger, Perfusuas pedes                                |

## Focus operativi

- **Documentazione legacy da snapshot (ROL-03):** docs/evo-tactics/guides/security-ops.md, docs/evo-tactics/guides/template-ptpf.md, docs/evo-tactics/guides/visione-struttura.md
- **Trait da indicizzare (ROL-04):** ali_fono_risonanti, ali_fulminee, ali_ioniche, ali_membrana_sonica, ali_solari_fotoni
- **Trait da fornire ai consumer esterni (ROL-05):** ali_fono_risonanti, ali_fulminee, ali_ioniche, ali_membrana_sonica, ali_solari_fotoni
- **Specie/ecotipi con mismatch (ROL-06):** Anguis magnetica, Chemnotela toxica, Elastovaranus hydrus, Gulogluteus scutiger, Perfusuas pedes

## Fonti principali

- `reports/evo/rollout/documentation_gap.md`
- `reports/evo/rollout/documentation_diff.json`
- `reports/evo/rollout/traits_gap.csv`
- `reports/evo/rollout/species_ecosystem_gap.md`
- `data/derived/analysis/trait_gap_report.json`
