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
- **Gap trait principali:** 51 missing_in_index, 0 missing_in_external (202 slug verificati come legacy_only)
- **Playbook da archiviare:** 3
- **Ecotipi con mismatch legacy:** 20 su 20

## Avanzamento epiche ROL-\*

| Epic   | Stato       | Progress (%) | Gap aperti                   | Campione                                                                                                                        |
| ------ | ----------- | ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ROL-03 | in-progress | 99           | Playbook da archiviare: 3    | docs/evo-tactics/guides/security-ops.md, docs/evo-tactics/guides/template-ptpf.md, docs/evo-tactics/guides/visione-struttura.md |
| ROL-04 | in-progress | 99           | Trait missing_in_index: 2    | coscienza_dalveare_diffusa, traits_aggregate                                                                                    |
| ROL-05 | done        | 100          | Trait missing_in_external: 0 | —                                                                                                                               |
| ROL-06 | at-risk     | 0            | Ecotipi con mismatch: 20     | Anguis magnetica, Chemnotela toxica, Elastovaranus hydrus, Gulogluteus scutiger, Perfusuas pedes                                |

## Focus operativi

- **Documentazione legacy da snapshot (ROL-03):** docs/evo-tactics/guides/security-ops.md, docs/evo-tactics/guides/template-ptpf.md, docs/evo-tactics/guides/visione-struttura.md
- **Trait da indicizzare (ROL-04):** coscienza_dalveare_diffusa, traits_aggregate
- **Trait da fornire ai consumer esterni (ROL-05):** completata la verifica dei 202 slug: marcati `legacy_only`, nessun missing_in_external aperto.
- **Specie/ecotipi con mismatch (ROL-06):** Anguis magnetica, Chemnotela toxica, Elastovaranus hydrus, Gulogluteus scutiger, Perfusuas pedes

## Fonti principali

- `reports/evo/rollout/documentation_gap.md`
- `reports/evo/rollout/documentation_diff.json`
- `reports/evo/rollout/traits_gap.csv`
- `reports/evo/rollout/species_ecosystem_gap.md`
- `data/derived/analysis/trait_gap_report.json`
