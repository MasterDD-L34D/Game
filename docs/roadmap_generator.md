# Roadmap trimestrale – Generatore Pathfinder ETL (Q1)

## Milestone 1 – Rafforzare l'asse strutturale (Settimane 1-4)
- **Obiettivo**: coprire il gap prioritario emerso dal report `pathfinder_trait_gap.csv` sull'asse strutturale (`versatility`).
- **Deliverable**:
  - 4 nuovi tratti `struttura` bilanciati su blueprint apex/microbici con schede complete (tier, sinergie, requisiti ambientali).
  - Aggiornamento `PathfinderTraitFormula` per assegnare i nuovi tratti alle creature con `versatility ≥ 0.8`.
  - Validazione incrociata con `tools/analysis/pathfinder_axis_coverage.py` (nessun `missing_traits` sull'asse strutturale).
- **Dipendenze**: team Narrative per label/descrizioni, QA sistemi per smoke-test `scripts/trait_audit.py`.
- **Owner**: Trait Library Strike Team.
- **Metriche**: `missing_traits` = 0 per `versatility`, incremento ≥20% di specie con bucket `core` aggiornato.

## Milestone 2 – Ampliare le sinergie di mobilità e minaccia (Settimane 5-8)
- **Obiettivo**: consolidare gli assi `mobility` e `threat`, garantendo copertura per i ruoli tattici ad alta incidenza (predatori apex).
- **Deliverable**:
  - Due pass di tuning su tratti `locomozione`/`offensiva` per armonizzare sinergie e conflitti.
  - Import guidato (CLI) di 50 profili Pathfinder prioritari verificando bucket `core` e `optional`.
  - Aggiornamento dei dataset `packs/evo_tactics_pack/docs/catalog/env_traits.json` e baseline (`report_trait_coverage.py`).
- **Dipendenze**: sistemi di generazione (`services/generation/species_builder.py`), bilanciamento VC.
- **Owner**: Gameplay Systems + Live Ops.
- **Metriche**: `high_creatures` coperti ≥95% negli assi `mobility` e `threat` (nessun ruolo apex scoperto nel report), audit `trait_gap_report.py` senza nuovi warning.

## Milestone 3 – Integrazione dataset & preparazione release pubblica (Settimane 9-12)
- **Obiettivo**: consolidare i dataset ETL e predisporre il rilascio pubblico del generatore.
- **Deliverable**:
  - Pipeline CI che esegue `pathfinder_axis_coverage.py`, `report_trait_coverage.py` e `trait_gap_report.py` su ogni aggiornamento.
  - Pacchetto documentazione (`docs/evo-tactics-pack`) con guida d'uso aggiornata e changelog.
  - Sessione di playtest pubblico con checklist QA (telemetria + feedback) e retroazione su roadmap Q2.
- **Dipendenze**: DevOps per pipeline, Community Team per playtest.
- **Owner**: Release Management.
- **Metriche**: build nightly con report allegati, checklist QA firmata, piano di follow-up approvato entro fine trimestre.
