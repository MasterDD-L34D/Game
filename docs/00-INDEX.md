---
title: Evo Tactics — Documentazione (indice legacy)
doc_status: legacy_active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Evo Tactics — Documentazione (indice legacy)

> **Nota — Indice legacy.** Questo indice è mantenuto per compatibilità con i link esistenti nel codice e nei tracker. L'**entrypoint canonico** della documentazione è ora [`docs/hubs/README.md`](hubs/README.md) (workstream hubs), accompagnato dal `docs/governance/docs_registry.json` per la mappatura completa.
>
> I doc numerati sono stati spostati in [`docs/core/`](core/) durante la ristrutturazione di aprile 2026. Tutti i link sotto sono già aggiornati ai nuovi path.

> **Final Design Freeze v0.9.** La baseline canonica di design finale di Evo Tactics vive in [`docs/core/90-FINAL-DESIGN-FREEZE.md`](core/90-FINAL-DESIGN-FREEZE.md) (A3 source of truth). Il bundle esecutivo (roadmap, milestones & gates, backlog, playbook Codex, piano cross-repo) e' in [`docs/planning/EVO_FINAL_DESIGN_ROADMAPS_INDEX.md`](planning/EVO_FINAL_DESIGN_ROADMAPS_INDEX.md). Le regole di risoluzione conflitti tra fonti sono in [`docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md).

## Accesso rapido (SSoT)

- [INTEGRAZIONE GUIDE — SSoT](INTEGRAZIONE_GUIDE.md)
- [Trait Reference Manual](trait_reference_manual.md) — indice unificato dei capitoli modulari.
- [Sentience Track — guida rapida](README_SENTIENCE.md)
- [Scheda operativa dei trait](traits_scheda_operativa.md) · [Template dati](traits_template.md) · [Guida autori](README_HOWTO_AUTHOR_TRAIT.md)
- [Piano operativo prossimo ciclo](next_steps_trait_migration.md)
- [Trait Editor standalone](trait-editor.md) — setup rapido e comandi di build.
- [Tutorial Idea Engine](tutorials/idea-engine.md) · [Indice e changelog widget](ideas/IDEAS_INDEX.md)
- Catalogo e schemi canonici: `packs/evo_tactics_pack/docs/catalog/`
  - `trait_entry.schema.json`, `trait_catalog.schema.json`, `trait_reference.json`
  - **Mancanti (target SSoT):** `sentience_track.schema.json`, `sentience_track.json`
- Tool Python: `tools/py/`
  - `trait_template_validator.py`
  - **Backlog (target SSoT):** `export_csv.py`, `seed_merge.py`

## Linee guida principali

- [01 Visione](core/01-VISIONE.md)
- [02 Pilastri di Design](core/02-PILASTRI.md)
- [03 Loop di Gioco](core/03-LOOP.md)

## Sistema

- [10 Sistema Tattico (TV/d20)](core/10-SISTEMA_TATTICO.md)
- [11 Regole TV/d20 specifiche](core/11-REGOLE_D20_TV.md)

## Rules Engine / Combat

- [ADR-2026-04-13: Rules Engine d20](adr/ADR-2026-04-13-rules-engine-d20.md) — decisioni architetturali per il motore regole tattico.
- [Combat Hub](hubs/combat.md) — hub canonico del workstream combat.
- Codice sorgente: `services/rules/` (resolver, hydration, demo CLI, worker).

## Contenuti & Progressione

- [20 Specie & Parti (catalogo + budget)](core/20-SPECIE_E_PARTI.md)
- [22 Forme Base (16) + pacchetti PI](core/22-FORME_BASE_16.md)
- [24 Telemetria VC (Aggro/Risk/…)](core/24-TELEMETRIA_VC.md)
- [25 Regole Sblocco + Economia PE](core/25-REGOLE_SBLOCCO_PE.md)
- [27 Mating / Nido (reclutamento & riproduzione)](core/27-MATING_NIDO.md)
- [28 NPG, Biomi, Affissi & Director](core/28-NPC_BIOMI_SPAWN.md)
- [Trait Reference & Glossario](catalog/trait_reference.md)

## Interfaccia & Produzione

- [30 UI TV — Carta Temperamentale & Albero Evolutivo](core/30-UI_TV_IDENTITA.md)
- [40 Roadmap / MVP → Alpha](core/40-ROADMAP.md)
- [Tutorial rapidi (CLI, Idea Engine, Dashboard)](tutorials/README.md)

## Dati & Appendici

- `data/core/species.yaml` (catalogo Specie & Parti)
- Appendici
  - [A — Canvas originale (testuale)](appendici/A-CANVAS_ORIGINALE.txt)
  - [C — NPG & Biomi (testuale)](appendici/C-CANVAS_NPG_BIOMI.txt)
  - [D — Accoppiamento/Mating (testuale)](appendici/D-CANVAS_ACCOPPIAMENTO.txt)
  - [Prontuario metriche UCUM](appendici/prontuario_metriche_ucum.md)
  - [Style guide naming (Specie & Tratti)](appendici/STYLE_GUIDE_NAMING.md)
  - [Metodo A.L.I.E.N.A. — documento integrato](appendici/ALIENA_documento_integrato.md)
  - [Sandbox — concept/trait/bilanciamento (draft)](appendici/sandbox/README.md)

## Automazioni & CI

- [Pipeline `CI` principale](ci-pipeline.md)
- [Workflow CI & QA mirati](ci.md)
- Mirror documentazione: eseguire `node scripts/sync_evo_pack_assets.js` dopo ogni modifica ai dataset canonici per garantire
  percorsi risolti (`packs/evo_tactics_pack/data/...`) in `docs/public/evo-tactics-pack/` e `docs/evo-tactics-pack/`; i test
  `tests/scripts/sync_evo_pack_assets.test.js` si eseguono con `node --test` e coprono le regressioni sugli URL relativi.
- Fallback biomi offline: i pool in cache devono includere `metadata.schema_version` e `updated_at` in linea con i file
  canonici; verificare con `node --test tests/services/biomeSynthesizerMetadata.test.js` e con la validazione completa
  `python tools/py/game_cli.py validate-ecosystem-pack`.

## Tracker operativi e log

<!-- tracker-registry:start -->

### Operativo (checklist)

| File                                                        | Titolo                                       | Scopo                                                                    | Owner attuale                                               | Ultimo aggiornamento | Percorso                             |
| ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------- | ------------------------------------ |
| [action-items.md](docs/process/action-items.md)             | Action Items — Sintesi operativa             | Sintesi quotidiana attività cross-team e follow-up PR giornalieri.       | UI Systems · Progression Design · VFX/Lighting · QA Support | 2026-04-15           | `docs/process/action-items.md`       |
| [bug-intake.md](docs/process/bug-intake.md)                 | Bug Intake Checklist                         | Verifica dati obbligatori prima del triage ticket.                       | N/D                                                         | 2026-04-14           | `docs/process/bug-intake.md`         |
| [clone-setup.md](docs/process/clone-setup.md)               | Procedura di clone e setup iniziale          | Istruzioni ambiente standard container /workspace/Game.                  | Ops/ChatGPT                                                 | 2026-04-14           | `docs/process/clone-setup.md`        |
| [demo-release.md](docs/process/demo-release.md)             | Checklist release demo pubblica              | Passi di coordinamento per bundle demo Evo Tactics Pack.                 | N/D                                                         | 2026-04-14           | `docs/process/demo-release.md`       |
| [milestones.md](docs/process/milestones.md)                 | Checklist Milestone                          | Stato avanzamento milestone telemetria/dataset/playtest.                 | N/D                                                         | 2026-04-15           | `docs/process/milestones.md`         |
| [project-setup-todo.md](docs/process/project-setup-todo.md) | TODO Operativo — Avvio completo del progetto | Sequenza end-to-end per rendere operativo il progetto con note storiche. | Ops/ChatGPT · Release Ops · Marketing Ops · Lead Dev Tools  | 2026-04-14           | `docs/process/project-setup-todo.md` |
| [telemetry.md](docs/process/telemetry.md)                   | Checklist — Telemetry Export & QA Filters    | Controlli giornalieri/settimanali su export telemetria e filtri QA.      | N/D                                                         | 2026-04-14           | `docs/process/telemetry.md`          |
| [vc_playtest_plan.md](docs/process/vc_playtest_plan.md)     | Playtest VC Mirati alla Telemetria           | Piano sessioni mirate agli indici VC e setup strumentazione.             | N/D                                                         | 2026-04-14           | `docs/process/vc_playtest_plan.md`   |

### Processo

| File                                                                            | Titolo                                                       | Scopo                                                                    | Owner attuale | Ultimo aggiornamento | Percorso                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------- | -------------------- | ---------------------------------------------- |
| [incident_reporting_table.md](docs/process/incident_reporting_table.md)         | Registro Segnalazioni Cross-Team — Implementazione Operativa | Configurazione tabella Airtable e permessi per segnalazioni condivise.   | N/D           | 2026-04-14           | `docs/process/incident_reporting_table.md`     |
| [qa_hud.md](docs/process/qa_hud.md)                                             | QA — HUD Smart Alerts                                        | Metriche e pipeline QA per monitorare ack/filter ratio degli alert HUD.  | QA lead       | 2026-04-14           | `docs/process/qa_hud.md`                       |
| [qa_reporting_schema.md](docs/process/qa_reporting_schema.md)                   | QA Telemetry & Segnalazioni — Schema condiviso               | Panorama fonti dati QA, campi disponibili e gap di reporting.            | N/D           | 2026-04-14           | `docs/process/qa_reporting_schema.md`          |
| [telemetry_ingestion_pipeline.md](docs/process/telemetry_ingestion_pipeline.md) | Pipeline Dati Telemetria → Tabella QA/Design                 | Flusso di ingestione telemetria, snapshot visuali e modulo QA manuale.   | N/D           | 2026-04-14           | `docs/process/telemetry_ingestion_pipeline.md` |
| [traits_checklist.md](docs/process/traits_checklist.md)                         | Checklist iterativa tratti                                   | Step incrementali per aggiungere/revisionare tratti con controlli dati.  | N/D           | 2026-04-14           | `docs/process/traits_checklist.md`             |
| [web_handoff.md](docs/process/web_handoff.md)                                   | Web Handoff · Foodweb Archetypes 2025-11-05                  | Nota di consegna verso team web/UI con archetipi ruolo×bioma aggiornati. | N/D           | 2026-04-14           | `docs/process/web_handoff.md`                  |
| [web_pipeline.md](docs/process/web_pipeline.md)                                 | Pipeline web · Procedura di rilascio                         | Processo end-to-end per promuovere la web experience su GitHub Pages.    | N/D           | 2026-04-14           | `docs/process/web_pipeline.md`                 |

### Log & metriche

| File                                                                            | Titolo                                     | Scopo                                                                 | Owner attuale       | Ultimo aggiornamento | Percorso                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- | ------------------- | -------------------- | ---------------------------------------------- |
| [chatgpt_sync.log](logs/chatgpt_sync.log)                                       | Log sincronizzazione ChatGPT               | Cronologia esecuzioni scripts/chatgpt_sync.py e diff generati.        | N/D                 | 2025-10-29           | `logs/chatgpt_sync.log`                        |
| [chatgpt_sync_last.json](logs/chatgpt_sync_last.json)                           | Snapshot ultima sincronizzazione ChatGPT   | Esito strutturato dell'ultima run con percorsi export/diff.           | N/D                 | 2025-10-29           | `logs/chatgpt_sync_last.json`                  |
| [2025-11-XX-dryrun.json](logs/drive/2025-11-XX-dryrun.json)                     | Drive sync dry-run                         | Stato dry-run convertYamlToSheetsDryRun() e azioni suggerite.         | N/D                 | 2025-10-28           | `logs/drive/2025-11-XX-dryrun.json`            |
| [2025-11-08-filter-selections.md](logs/exports/2025-11-08-filter-selections.md) | Telemetry Export — Log interazioni filtri  | Audit settimanale applicazione filtri export (Analytics/Support).     | Analytics · Support | N/D                  | `logs/exports/2025-11-08-filter-selections.md` |
| [traits_tracking.md](logs/traits_tracking.md)                                   | Monitoraggio inventario trait              | Aggiornamenti periodici copertura trait/specie e risultati validator. | N/D                 | 2025-12-09           | `logs/traits_tracking.md`                      |
| [trait_audit.md](logs/trait_audit.md)                                           | Trait Data Audit                           | Stato errori/warning dataset trait.                                   | N/D                 | 2025-12-09           | `logs/trait_audit.md`                          |
| [web_status.md](logs/web_status.md)                                             | Programmazione riesami sito web            | Agenda e checklist riesami settimanali sito con azioni QA.            | N/D                 | 2025-12-09           | `logs/web_status.md`                           |
| [latest-dashboard-metrics.json](logs/qa/latest-dashboard-metrics.json)          | Dashboard & generator metrics snapshot     | Metriche più recenti per dashboard/generator con audit accessibilità. | N/D                 | 2025-11-23           | `logs/qa/latest-dashboard-metrics.json`        |
| [dashboard_metrics.jsonl](logs/qa/dashboard_metrics.jsonl)                      | Storico metriche dashboard                 | Append log JSONL con run successive e confronti visual regression.    | N/D                 | 2025-11-23           | `logs/qa/dashboard_metrics.jsonl`              |
| [2025-10-24-tooling.md](logs/tooling/2025-10-24-tooling.md)                     | 2025-10-24 — Verifica ambiente & toolchain | Verifica versioni e operazioni tooling (npm, pip, CLI).               | N/D                 | N/D                  | `logs/tooling/2025-10-24-tooling.md`           |

### Pianificazione

| File                                                       | Titolo            | Scopo                                                              | Owner attuale | Ultimo aggiornamento | Percorso                             |
| ---------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ | ------------- | -------------------- | ------------------------------------ |
| [roadmap_operativa.md](docs/planning/roadmap_operativa.md) | Roadmap Operativa | Procedura settimanale post-ottobre 2025 con milestone e follow-up. | N/D           | 2026-04-14           | `docs/planning/roadmap_operativa.md` |

### Appendici di stato

| File                                                                    | Titolo                                 | Scopo                                                    | Owner attuale | Ultimo aggiornamento | Percorso                                    |
| ----------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- | ------------- | -------------------- | ------------------------------------------- |
| [A-CANVAS_ORIGINALE.txt](docs/appendici/A-CANVAS_ORIGINALE.txt)         | Canvas A — Originale                   | Visione principale con note telemetria/Resonance Shards. | N/D           | 2025-11-30           | `docs/appendici/A-CANVAS_ORIGINALE.txt`     |
| [C-CANVAS_NPG_BIOMI.txt](docs/appendici/C-CANVAS_NPG_BIOMI.txt)         | Canvas C — NPG & Biomi                 | Canvas NPG reattivi, biomi e protocolli soccorso.        | N/D           | 2025-11-04           | `docs/appendici/C-CANVAS_NPG_BIOMI.txt`     |
| [D-CANVAS_ACCOPPIAMENTO.txt](docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt) | Canvas D — Mating, Reclutamento & Nido | Canvas sistemi attrazione, nido e ereditarietà parti.    | N/D           | 2025-11-04           | `docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt` |

<!-- tracker-registry:end -->
