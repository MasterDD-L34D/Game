# Inventario dataset e sorgenti

I ruoli di responsabilità fanno riferimento alla pipeline agentica documentata nel playbook di triage (`AG-Core`, `AG-Biome`, `AG-Personality`, `AG-Toolsmith`, `AG-Orchestrator`).【F:docs/process/incoming_triage_pipeline.md†L9-L82】 Dimensioni e timestamp sono calcolati dallo stato della working tree al momento dell'audit.

## 1. Mappatura sorgenti strutturate

| Percorso | Formato | Versione | Destinazione/Utilizzo |
| --- | --- | --- | --- |
| data/core/traits/glossary.json | JSON | schema 1.0 | Glossario centrale usato da tool ETL e validatori.【F:docs/DesignDoc-Overview.md†L39-L44】 |
| packs/evo_tactics_pack/docs/catalog/trait_glossary.json | JSON | schema 1.0 | Glossario distribuito nel pack, sincronizzato dal workflow tratti.【F:docs/DesignDoc-Overview.md†L39-L44】 |
| data/traits/index.json | JSON | schema 2.0 | Reference genetico consumato da baseline e validatori.【F:docs/DesignDoc-Overview.md†L40-L44】 |
| packs/evo_tactics_pack/docs/catalog/env_traits.json | JSON | schema 1.0 | Regole env→trait per generator e ETL coverage.【F:docs/DesignDoc-Overview.md†L40-L44】 |
| packs/evo_tactics_pack/data/core/species.yaml | YAML | v0.41 | Catalogo specie consumato da generator e coverage.【F:docs/public/idea-taxonomy.json†L10-L15】 |
| data/core/traits/biome_pools.json | JSON | schema 1.0 | Pool tratti per synth biome (biomeSynthesizer).【F:services/generation/biomeSynthesizer.js†L492-L516】 |
| data/packs.yaml | YAML | N/D | Tabelle pack usate dal CLI roll_pack TS/Python.【F:tools/ts/roll_pack.ts†L106-L158】 |
| data/derived/analysis/trait_baseline.yaml | YAML | schema 1.0 | Baseline PI generata da `build_trait_baseline.py`.【F:tools/py/build_trait_baseline.py†L15-L55】 |
| data/derived/analysis/trait_coverage_report.json | JSON | schema 1.0 | Report coverage usato per audit e dashboard.【F:tools/py/report_trait_coverage.py†L15-L53】 |
| data/derived/analysis/trait_coverage_matrix.csv | CSV | N/D | Matrice flatten per diff e reporting.【F:tools/py/report_trait_coverage.py†L15-L53】 |
| data/derived/analysis/trait_env_mapping.json | JSON | N/D | Crosswalk PI↔ambienti prodotto dal migrator.【F:tools/py/trait_catalog_migrator.py†L17-L36】 |
| data/derived/analysis/trait_gap_report.json | JSON | schema 1.0 | Gap ETL vs reference per QA tratti.【F:docs/DesignDoc-Overview.md†L44-L47】 |
| data/external/pathfinder_bestiary_1e.json | JSON | meta source CSV | Dataset normalizzato per traduzione statblock Pathfinder.【F:tools/importers/pathfinder_bestiary.py†L1-L14】 |
| incoming/pathfinder/bestiary1e_index.csv | CSV | SRD index | Input grezzo per ETL Pathfinder.【F:tools/importers/pathfinder_bestiary.py†L11-L14】 |

## 2. Registro dataset curati (data/ & packs/)

| Percorso | Dimensione | Ultimo aggiornamento | Responsabile | Dipendenze principali |
| --- | --- | --- | --- | --- |
| data/derived/analysis/trait_baseline.yaml | 170.80 KB | 2025-10-29T18:47:06 | AG-Core | Env traits, trait reference e glossario sono dichiarati nel metadata.【F:data/derived/analysis/trait_baseline.yaml†L1-L5】 |
| data/derived/analysis/trait_coverage_report.json | 258.89 KB | 2025-10-29T18:47:06 | AG-Core | Dipende da env_traits, trait_reference, trait_glossary e species root.【F:data/derived/analysis/trait_coverage_report.json†L1-L9】 |
| data/derived/analysis/trait_coverage_matrix.csv | 39.29 KB | 2025-10-29T18:47:06 | AG-Core | Generato da `report_trait_coverage.py` con env_traits, trait_reference e species.【F:tools/py/report_trait_coverage.py†L15-L53】 |
| data/derived/analysis/trait_env_mapping.json | 18.58 KB | 2025-10-29T18:47:06 | AG-Core | Output del migrator che incrocia packs e registri trait.【F:tools/py/trait_catalog_migrator.py†L17-L36】 |
| data/derived/analysis/trait_gap_report.json | 66.17 KB | 2025-10-29T18:47:06 | AG-Core | Confronta il report ETL con trait_reference e glossario.【F:data/derived/analysis/trait_gap_report.json†L2-L8】 |
| data/core/traits/glossary.json | 67.79 KB | 2025-10-29T18:47:07 | AG-Core | Punta al trait_reference del pack come sorgente.【F:data/core/traits/glossary.json†L1-L12】 |
| data/core/traits/biome_pools.json | 13.55 KB | 2025-10-29T18:47:07 | AG-Biome | Caricato insieme al glossario dal biome synthesizer.【F:services/generation/biomeSynthesizer.js†L492-L516】 |
| data/packs.yaml | 5.60 KB | 2025-10-29T18:47:07 | AG-Core | Consumata dal CLI roll_pack per generare combinazioni.【F:tools/ts/roll_pack.ts†L106-L158】 |
| data/core/species.yaml | 1.93 KB | 2025-10-29T18:47:07 | AG-Biome | Ingerita dal taxonomy builder/idea widget.【F:docs/public/idea-taxonomy.json†L10-L15】 |
| data/core/biomes.yaml | 18.02 KB | 2025-10-29T18:47:06 | AG-Biome | Fonte primaria per taxonomy e generator.【F:docs/public/idea-taxonomy.json†L2-L16】 |
| data/core/biome_aliases.yaml | 1.97 KB | 2025-10-29T18:47:06 | AG-Biome | Alias risolti nel taxonomy JSON pubblico.【F:docs/public/idea-taxonomy.json†L2-L16】 |
| data/core/mating.yaml | 16.12 KB | 2025-10-29T18:47:07 | AG-Personality | Descrive compatibilità forme documentata nelle linee guida dataset.【F:docs/data-guidelines.md†L7-L12】 |
| data/core/game_functions.yaml | 246.00 B | 2025-10-29T18:47:06 | AG-Orchestrator | Incluso nella tassonomia idea intake e storage server.【F:docs/public/idea-taxonomy.json†L14-L16】【F:server/app.js†L140-L192】 |
| data/core/telemetry.yaml | 3.26 KB | 2025-10-29T18:47:07 | AG-Core | Allinea telemetria con pack e PE economy nel design doc.【F:docs/DesignDoc-Overview.md†L33-L45】【F:data/core/telemetry.yaml†L1-L78】 |
| data/core/hud/layout.yaml | 928.00 B | 2025-10-29T18:47:06 | AG-Core | Overlay fa riferimento agli indici telemetrici configurati in `data/core/telemetry.yaml`.【F:data/core/hud/layout.yaml†L1-L34】【F:data/core/telemetry.yaml†L1-L78】 |
| data/core/missions/skydock_siege.yaml | 3.62 KB | 2025-10-29T18:47:07 | AG-Core | Tuning missione basato su metriche rischio/tilt annotate nel file.【F:data/core/missions/skydock_siege.yaml†L1-L34】 |
| data/external/pathfinder_bestiary_1e.json | 1.56 MB | 2025-10-29T18:47:06 | AG-Core | Deriva dal CSV Pathfinder in incoming secondo lo script ETL.【F:data/external/pathfinder_bestiary_1e.json†L1-L15】【F:tools/importers/pathfinder_bestiary.py†L11-L14】 |
| data/external/auto_external_sources.yaml | 847.00 B | 2025-10-29T18:47:06 | AG-Toolsmith | Manifest di sorgenti HTML/JSON da fetchare.【F:data/external/auto_external_sources.yaml†L1-L18】 |
| data/external/chatgpt_sources.yaml | 703.00 B | 2025-10-29T18:47:06 | AG-Toolsmith | Configurazione usata dallo script di sync ChatGPT.【F:data/external/chatgpt_sources.yaml†L1-L24】【F:README.md†L218-L223】 |
| data/external/drive/approved_assets.json | 4.21 KB | 2025-10-29T18:47:06 | AG-Toolsmith | Generato da config `config/drive/approved_asset_sources.json` tramite tool drive.【F:data/external/drive/approved_assets.json†L1-L39】【F:tools/drive/generate-approved-assets.mjs†L16-L78】 |
| packs/evo_tactics_pack/data/core/species.yaml | 4.14 KB | 2025-10-29T18:47:07 | AG-Biome | Metadati pack specie usati in coverage e taxonomy.【F:packs/evo_tactics_pack/data/core/species.yaml†L1-L11】【F:docs/public/idea-taxonomy.json†L10-L15】 |
| data/traits/index.json | 248.13 KB | 2025-10-29T18:47:07 | AG-Core | Reference puntato dal glossario e dagli script baseline.【F:data/traits/index.json†L1-L13】【F:tools/py/build_trait_baseline.py†L15-L55】 |
| packs/evo_tactics_pack/docs/catalog/trait_glossary.json | 66.52 KB | 2025-10-29T18:47:07 | AG-Core | Replica pack del glossario legata al reference.【F:packs/evo_tactics_pack/docs/catalog/trait_glossary.json†L1-L8】 |
| packs/evo_tactics_pack/docs/catalog/env_traits.json | 24.50 KB | 2025-10-29T18:47:07 | AG-Core | Regole ambientali legate al glossario condiviso.【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L1-L17】 |
| packs/evo_tactics_pack/docs/catalog/catalog_data.json | 32.41 KB | 2025-10-29T18:47:07 | AG-Core | Indice ecosistemi/specie nel bundle pack.【F:packs/evo_tactics_pack/docs/catalog/catalog_data.json†L1-L17】 |
| incoming/pathfinder/bestiary1e_index.csv | 141.37 KB | 2025-10-29T18:47:07 | AG-Core | Input CSV per l’ETL Pathfinder.【F:incoming/pathfinder/bestiary1e_index.csv†L1-L4】【F:tools/importers/pathfinder_bestiary.py†L11-L14】 |

## 3. Snapshot incoming/ (2025-10-29)

| File | Dimensione | Ultimo aggiornamento | Responsabile | Note |
| --- | --- | --- | --- | --- |
| incoming/Ancestors_Neurons_Attack_Dodge_SelfControl_Ambulation_Partial_v0_6.csv | 6.59 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/EvoTactics_DevKit.zip | 5.34 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/EvoTactics_FullRepo_v1.0.zip | 1.34 MB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/FEATURE_MAP_EVO_TACTICS.md | 6.33 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/GAME_COMPAT_README.md | 1.69 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/IDEA-001_ecosistema_template.yaml | 729.00 B | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/Inserisci questi parametri nella tabella e dammi i....docx | 13.09 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/MODELLI_RIF_EVO_TACTICS.md | 4.73 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/README.md | 1.40 KB | 2025-10-29T18:47:07 | AG-Orchestrator | Flag duplicato in incoming |
| incoming/README_INTEGRAZIONE_MECCANICHE.md | 691.00 B | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/README_SCAN_STAT_EVENTI.md | 938.00 B | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/ancestors_branches_totals_v0.3.csv | 1.33 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_evo_pack_v1_3.zip | 7.53 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_integration_pack_v0_1.zip | 7.93 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_integration_pack_v0_2.zip | 3.50 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_integration_pack_v0_3.zip | 3.85 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_integration_pack_v0_4.zip | 3.11 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_integration_pack_v0_5.zip | 4.21 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/ancestors_neuronal_v0_3.zip | 4.30 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_neurons_dump_v0.3__DEXTERITY.csv | 7.38 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_neurons_dump_v0_6.zip | 7.33 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/ancestors_neurons_pack_v1_2.zip | 8.09 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/compat_map (1).json | 3.93 KB | 2025-10-29T18:47:07 | AG-Orchestrator | Flag duplicato in incoming |
| incoming/compat_map.json | 3.60 KB | 2025-10-29T18:47:07 | AG-Orchestrator | Flag duplicato in incoming |
| incoming/engine_events.schema.json | 416.00 B | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/enneagramma_mechanics_registry.template.json | 6.32 KB | 2025-10-29T18:47:07 | AG-Personality | N/D (grezzo) |
| incoming/et_alignment_scanner.zip | 3.37 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/evo-tactics-badlands-addon-v1.7.zip | 43.17 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-badlands-ecosystem-it-v1.zip | 9.43 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/evo-tactics-final (1).zip | 75.71 KB | 2025-10-29T18:47:07 | AG-Core | Flag duplicato in incoming |
| incoming/evo-tactics-final.zip | 75.71 KB | 2025-10-29T18:47:07 | AG-Core | Flag duplicato in incoming |
| incoming/evo-tactics-interconnect-addon-v1.7.1.zip | 48.72 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-merged.zip | 70.39 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-normalized.zip | 72.10 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-starter.zip | 11.01 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-unified-pack-v1.9.zip | 68.39 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-unified-plus-validators-v1.9.6.zip | 85.49 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/evo-tactics-unified-v1.9.7-ecosistema.zip | 90.59 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo-tactics-unified-v1.9.8-ecosistema-catalog.zip | 94.58 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/evo-tactics-unified-v2.0.0-site-tools.zip | 338.40 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/evo-tactics-unified-v2.0.1-site-tools.zip | 345.99 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/evo-tactics-validator-pack-v1.5.zip | 15.38 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/evo-tactics.zip | 22.56 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_enneagram_addon_v1.zip | 15.38 KB | 2025-10-29T18:47:07 | AG-Personality | N/D (grezzo) |
| incoming/evo_pacchetto_minimo.zip | 10.64 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v2.zip | 17.78 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v3.zip | 23.89 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v4.zip | 31.47 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v5.zip | 41.64 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v6.zip | 45.51 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v7.zip | 65.24 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/evo_pacchetto_minimo_v8.zip | 71.60 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_sentience_branch_layout_v0_1.zip | 3.64 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/evo_sentience_rfc_pack_v0_1.zip | 5.04 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_tactics_ancestors_repo_pack_v1.0 (1).zip | 12.08 KB | 2025-10-29T18:47:07 | AG-Biome | Flag duplicato in incoming |
| incoming/evo_tactics_ancestors_repo_pack_v1.0.zip | 11.42 KB | 2025-10-29T18:47:07 | AG-Biome | Flag duplicato in incoming |
| incoming/evo_tactics_badlands_IT.zip | 11.13 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_tactics_badlands_PTPF_IT.zip | 14.68 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_tactics_deduped_v8_1.zip | 166.26 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_tactics_ecosystem_badlands.zip | 7.50 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/evo_tactics_ecosystems_pack.zip | 3.85 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/evo_tactics_merged_final.zip | 155.01 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_tactics_param_synergy_v8_3.zip | 166.27 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/evo_tactics_tables_v8_3.xlsx | 21.31 KB | 2025-10-29T18:47:07 | AG-Core | N/D (grezzo) |
| incoming/game_repo_map.json | 762.00 B | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/generator.html | 5.00 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/hook_bindings.ts | 1.43 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/idea_catalog.csv | 1.20 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/idea_intake_site_package.zip | 6.96 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/index (1).html | 15.42 KB | 2025-10-29T18:47:07 | AG-Orchestrator | Flag duplicato in incoming |
| incoming/index.html | 15.08 KB | 2025-10-29T18:47:07 | AG-Orchestrator | Flag duplicato in incoming |
| incoming/last_report.html | 4.62 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/last_report.json | 7.02 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/logs_48354746845.zip | 9.23 KB | 2025-10-29T18:47:07 | AG-Orchestrator | N/D (grezzo) |
| incoming/pack_biome_jobs_v8_alt.json | 20.48 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/personality_module.v1.json | 24.16 KB | 2025-10-29T18:47:07 | AG-Personality | N/D (grezzo) |
| incoming/recon_meccaniche.json | 1.82 KB | 2025-10-29T18:47:07 | AG-Validation | N/D (grezzo) |
| incoming/scan_engine_idents.py | 2.97 KB | 2025-10-29T18:47:07 | AG-Toolsmith | N/D (grezzo) |
| incoming/sensienti_traits_v0.1.yaml | 3.77 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |
| incoming/species_index.html | 3.52 KB | 2025-10-29T18:47:07 | AG-Biome | N/D (grezzo) |

### Duplicati segnalati dallo script

Lo script `tools/audit/data_health.py --incoming` evidenzia duplicati da gestire (`compat_map`, `evo-tactics-final`, `evo_tactics_ancestors_repo_pack_v1.0`, `index.html`, `README`).【9688a7†L1-L7】

Lanciando lo stesso audit con l'opzione `--report` viene generato `reports/data_health_summary.json`, utile per integrare il controllo nei workflow CI o nelle dashboard editoriali.
