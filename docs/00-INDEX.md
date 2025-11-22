# Evo Tactics — Documentazione (indice)

- [01 Visione](01-VISIONE.md)
- [02 Pilastri di Design](02-PILASTRI.md)
- [03 Loop di Gioco](03-LOOP.md)

## Sistema

- [10 Sistema Tattico (TV/d20)](10-SISTEMA_TATTICO.md)
- [11 Regole TV/d20 specifiche](11-REGOLE_D20_TV.md)

## Contenuti & Progressione

- [20 Specie & Parti (catalogo + budget)](20-SPECIE_E_PARTI.md)
- [22 Forme Base (16) + pacchetti PI](22-FORME_BASE_16.md)
- [24 Telemetria VC (Aggro/Risk/…)](24-TELEMETRIA_VC.md)
- [25 Regole Sblocco + Economia PE](25-REGOLE_SBLOCCO_PE.md)
- [27 Mating / Nido (reclutamento & riproduzione)](27-MATING_NIDO.md)
- [28 NPG, Biomi, Affissi & Director](28-NPC_BIOMI_SPAWN.md)

## Interfaccia & Produzione

- [30 UI TV — Carta Temperamentale & Albero Evolutivo](30-UI_TV_IDENTITA.md)
- [40 Roadmap / MVP → Alpha](40-ROADMAP.md)
- [Tutorial rapidi (CLI, Idea Engine, Dashboard)](tutorials/README.md)

## Dati & Appendici

- [INTEGRAZIONE GUIDE — SSoT](INTEGRAZIONE_GUIDE.md)
- [Trait Reference Manual (SSoT)](trait_reference_manual.md)
- [Scheda operativa trait](traits_scheda_operativa.md)
- [Template dati trait](traits_template.md)
- [Guida autori trait](README_HOWTO_AUTHOR_TRAIT.md)
- [Trait Reference & Glossario](catalog/trait_reference.md)
- [Sentience Track — guida rapida](README_SENTIENCE.md)
- Schemi e cataloghi canònici: `packs/evo_tactics_pack/docs/catalog/`
  - `trait_entry.schema.json`, `trait_catalog.schema.json`, `trait_reference.json`
  - **Mancanti**: `sentience_track.schema.json`, `sentience_track.json` (vedi INTEGRAZIONE_GUIDE)
- Strumenti Python: `tools/py/`
  - `trait_template_validator.py`
  - **Mancanti**: `export_csv.py`, `seed_merge.py` (vedi INTEGRAZIONE_GUIDE)

- `data/core/species.yaml` (catalogo Specie & Parti)
- `tools/*` (validator Python/TS)
- Appendici: Canvas integrali
  - [A — Canvas originale (testuale)](appendici/A-CANVAS_ORIGINALE.txt)
  - [C — NPG & Biomi (testuale)](appendici/C-CANVAS_NPG_BIOMI.txt)
  - [D — Accoppiamento/Mating (testuale)](appendici/D-CANVAS_ACCOPPIAMENTO.txt)
  - [Prontuario metriche UCUM](appendici/prontuario_metriche_ucum.md)
  - [Style guide naming (Specie & Tratti)](appendici/STYLE_GUIDE_NAMING.md)
  - [Metodo A.L.I.E.N.A. — documento integrato](appendici/ALIENA_documento_integrato.md)

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

| File                                                          | Titolo                                       | Scopo                                                                    | Owner attuale                                               | Ultimo aggiornamento | Percorso                               |
| ------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------- | -------------------------------------- |
| [action-items.md](docs/checklist/action-items.md)             | Action Items — Sintesi operativa             | Sintesi quotidiana attività cross-team e follow-up PR giornalieri.       | UI Systems · Progression Design · VFX/Lighting · QA Support | 2025-10-28           | `docs/checklist/action-items.md`       |
| [bug-intake.md](docs/checklist/bug-intake.md)                 | Bug Intake Checklist                         | Verifica dati obbligatori prima del triage ticket.                       | N/D                                                         | 2025-10-27           | `docs/checklist/bug-intake.md`         |
| [clone-setup.md](docs/checklist/clone-setup.md)               | Procedura di clone e setup iniziale          | Istruzioni ambiente standard container /workspace/Game.                  | Ops/ChatGPT                                                 | 2025-10-26           | `docs/checklist/clone-setup.md`        |
| [demo-release.md](docs/checklist/demo-release.md)             | Checklist release demo pubblica              | Passi di coordinamento per bundle demo Evo Tactics Pack.                 | N/D                                                         | 2025-10-27           | `docs/checklist/demo-release.md`       |
| [milestones.md](docs/checklist/milestones.md)                 | Checklist Milestone                          | Stato avanzamento milestone telemetria/dataset/playtest.                 | N/D                                                         | 2025-10-28           | `docs/checklist/milestones.md`         |
| [project-setup-todo.md](docs/checklist/project-setup-todo.md) | TODO Operativo — Avvio completo del progetto | Sequenza end-to-end per rendere operativo il progetto con note storiche. | Ops/ChatGPT · Release Ops · Marketing Ops · Lead Dev Tools  | 2025-10-28           | `docs/checklist/project-setup-todo.md` |
| [telemetry.md](docs/checklist/telemetry.md)                   | Checklist — Telemetry Export & QA Filters    | Controlli giornalieri/settimanali su export telemetria e filtri QA.      | N/D                                                         | 2025-10-28           | `docs/checklist/telemetry.md`          |
| [vc_playtest_plan.md](docs/checklist/vc_playtest_plan.md)     | Playtest VC Mirati alla Telemetria           | Piano sessioni mirate agli indici VC e setup strumentazione.             | N/D                                                         | 2025-10-24           | `docs/checklist/vc_playtest_plan.md`   |

### Processo

| File                                                                            | Titolo                                                       | Scopo                                                                    | Owner attuale | Ultimo aggiornamento | Percorso                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------- | -------------------- | ---------------------------------------------- |
| [incident_reporting_table.md](docs/process/incident_reporting_table.md)         | Registro Segnalazioni Cross-Team — Implementazione Operativa | Configurazione tabella Airtable e permessi per segnalazioni condivise.   | N/D           | 2025-10-27           | `docs/process/incident_reporting_table.md`     |
| [qa_hud.md](docs/process/qa_hud.md)                                             | QA — HUD Smart Alerts                                        | Metriche e pipeline QA per monitorare ack/filter ratio degli alert HUD.  | QA lead       | 2025-10-27           | `docs/process/qa_hud.md`                       |
| [qa_reporting_schema.md](docs/process/qa_reporting_schema.md)                   | QA Telemetry & Segnalazioni — Schema condiviso               | Panorama fonti dati QA, campi disponibili e gap di reporting.            | N/D           | 2025-10-27           | `docs/process/qa_reporting_schema.md`          |
| [telemetry_ingestion_pipeline.md](docs/process/telemetry_ingestion_pipeline.md) | Pipeline Dati Telemetria → Tabella QA/Design                 | Flusso di ingestione telemetria, snapshot visuali e modulo QA manuale.   | N/D           | 2025-10-27           | `docs/process/telemetry_ingestion_pipeline.md` |
| [traits_checklist.md](docs/process/traits_checklist.md)                         | Checklist iterativa tratti                                   | Step incrementali per aggiungere/revisionare tratti con controlli dati.  | N/D           | 2025-10-28           | `docs/process/traits_checklist.md`             |
| [training/trait_style_session.md](docs/process/training/trait_style_session.md) | Trait Style Session & Review                                 | Agenda formazione e processo per nomenclatura/descrizioni trait.         | N/D           | 2025-10-29           | `docs/process/training/trait_style_session.md` |
| [web_handoff.md](docs/process/web_handoff.md)                                   | Web Handoff · Foodweb Archetypes 2025-11-05                  | Nota di consegna verso team web/UI con archetipi ruolo×bioma aggiornati. | N/D           | 2025-10-29           | `docs/process/web_handoff.md`                  |
| [web_pipeline.md](docs/process/web_pipeline.md)                                 | Pipeline web · Procedura di rilascio                         | Processo end-to-end per promuovere la web experience su GitHub Pages.    | N/D           | 2025-10-28           | `docs/process/web_pipeline.md`                 |

### Log & metriche

| File                                                                            | Titolo                                     | Scopo                                                                                 | Owner attuale       | Ultimo aggiornamento | Percorso                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------- | -------------------- | ---------------------------------------------- |
| [chatgpt_sync.log](logs/chatgpt_sync.log)                                       | Log sincronizzazione ChatGPT               | Cronologia esecuzioni scripts/chatgpt_sync.py e diff generati.                        | N/D                 | 2025-10-24           | `logs/chatgpt_sync.log`                        |
| [chatgpt_sync_last.json](logs/chatgpt_sync_last.json)                           | Snapshot ultima sincronizzazione ChatGPT   | Esito strutturato dell'ultima run con percorsi export/diff.                           | N/D                 | 2025-10-24           | `logs/chatgpt_sync_last.json`                  |
| [2025-11-XX-dryrun.json](logs/drive/2025-11-XX-dryrun.json)                     | Drive sync dry-run                         | Stato dry-run convertYamlToSheetsDryRun() e azioni suggerite.                         | N/D                 | 2025-10-28           | `logs/drive/2025-11-XX-dryrun.json`            |
| [2025-11-08-filter-selections.md](logs/exports/2025-11-08-filter-selections.md) | Telemetry Export — Log interazioni filtri  | Audit settimanale applicazione filtri export (Analytics/Support).                     | Analytics · Support | 2025-10-28           | `logs/exports/2025-11-08-filter-selections.md` |
| [traits_tracking.md](logs/traits_tracking.md)                                   | Monitoraggio inventario trait              | Aggiornamenti periodici copertura trait/specie, validator e note dai report incoming. | N/D                 | 2025-12-07           | `logs/traits_tracking.md`                      |
| [trait_audit.md](logs/trait_audit.md)                                           | Trait Data Audit                           | Stato errori/warning dataset trait.                                                   | N/D                 | 2025-10-29           | `logs/trait_audit.md`                          |
| [web_status.md](logs/web_status.md)                                             | Programmazione riesami sito web            | Agenda e checklist riesami settimanali sito con azioni QA e riscontri intake.         | N/D                 | 2025-11-14           | `logs/web_status.md`                           |
| [report.html](reports/incoming/latest/report.html)                              | Incoming intake — sessione corrente        | Esito HTML report incoming con preview asset e note di triage.                        | Ops/ChatGPT         | 2025-11-14           | `reports/incoming/latest/report.html`          |
| [latest-dashboard-metrics.json](logs/qa/latest-dashboard-metrics.json)          | Dashboard & generator metrics snapshot     | Metriche più recenti per dashboard/generator con audit accessibilità.                 | N/D                 | 2025-10-27           | `logs/qa/latest-dashboard-metrics.json`        |
| [dashboard_metrics.jsonl](logs/qa/dashboard_metrics.jsonl)                      | Storico metriche dashboard                 | Append log JSONL con run successive e confronti visual regression.                    | N/D                 | 2025-10-27           | `logs/qa/dashboard_metrics.jsonl`              |
| [2025-10-24-tooling.md](logs/tooling/2025-10-24-tooling.md)                     | 2025-10-24 — Verifica ambiente & toolchain | Verifica versioni e operazioni tooling (npm, pip, CLI).                               | N/D                 | 2025-10-24           | `logs/tooling/2025-10-24-tooling.md`           |

### Pianificazione

| File                                          | Titolo                    | Scopo                                                              | Owner attuale | Ultimo aggiornamento | Percorso                      |
| --------------------------------------------- | ------------------------- | ------------------------------------------------------------------ | ------------- | -------------------- | ----------------------------- |
| [roadmap.md](docs/piani/roadmap.md)           | Roadmap Operativa         | Procedura settimanale post-ottobre 2025 con milestone e follow-up. | N/D           | 2025-11-10           | `docs/piani/roadmap.md`       |
| [maintenance.md](docs/roadmap/maintenance.md) | Manutenzione roadmap live | Checklist aggiornamento snapshot deploy/go-no-go.                  | N/D           | 2025-11-05           | `docs/roadmap/maintenance.md` |

### Appendici di stato

| File                                                               | Titolo                                 | Scopo                                                    | Owner attuale | Ultimo aggiornamento | Percorso                                    |
| ------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------- | ------------- | -------------------- | ------------------------------------------- |
| [A-CANVAS_ORIGINALE.txt](appendici/A-CANVAS_ORIGINALE.txt)         | Canvas A — Originale                   | Visione principale con note telemetria/Resonance Shards. | N/D           | 2025-10-27           | `docs/appendici/A-CANVAS_ORIGINALE.txt`     |
| [C-CANVAS_NPG_BIOMI.txt](appendici/C-CANVAS_NPG_BIOMI.txt)         | Canvas C — NPG & Biomi                 | Canvas NPG reattivi, biomi e protocolli soccorso.        | N/D           | 2025-10-26           | `docs/appendici/C-CANVAS_NPG_BIOMI.txt`     |
| [D-CANVAS_ACCOPPIAMENTO.txt](appendici/D-CANVAS_ACCOPPIAMENTO.txt) | Canvas D — Mating, Reclutamento & Nido | Canvas sistemi attrazione, nido e ereditarietà parti.    | N/D           | 2025-10-26           | `docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt` |

<!-- tracker-registry:end -->
