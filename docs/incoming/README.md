# Docs Incoming – Stato e triage (PATCHSET-01)

Schema di tracciamento per `docs/incoming/**`. Stati: **INTEGRATO**, **DA_INTEGRARE**, **LEGACY**, **STORICO**. Dettaglio completo in `docs/planning/REF_INCOMING_CATALOG.md`. Owner 01A (catalogo): Laura B.

Linee guida minime:

- Applica le stesse etichette di stato del catalogo e mantieni i percorsi invariati durante il triage.
- Ogni aggiornamento di stato o nota va loggato in `logs/agent_activity.md` con riferimento 01A e owner assegnato.

| Fonte / descrizione                | Percorso                                                                             | Stato        | Note / next-step                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------- |
| Mappe compat/feature               | `docs/incoming/FEATURE_MAP_EVO_TACTICS.md`, `GAME_COMPAT_README.md`                  | DA_INTEGRARE | Aggiornare rispetto ai pack correnti; allineare con catalogo incoming.                                     |
| Modelli di riferimento             | `docs/incoming/MODELLI_RIF_EVO_TACTICS.md`                                           | DA_INTEGRARE | Verificare contro schemi attuali; marcare legacy se superati.                                              |
| Linee guida integrazione/stat scan | `docs/incoming/README_INTEGRAZIONE_MECCANICHE.md`, `README_SCAN_STAT_EVENTI.md`      | DA_INTEGRARE | Sincronizzare con pipeline QA e doc ufficiale; se superate, marcare STORICO.                               |
| Documenti enneagramma              | `docs/incoming/Ennagramma/README_ENNEAGRAMMA.md`                                     | DA_INTEGRARE | Collegare al dataset in `incoming/Ennagramma/`; valutare legacy dopo merge.                                |
| Archivio/estrazioni                | `docs/incoming/decompressed/README.md`, `docs/incoming/archive/INDEX.md`             | STORICO      | Log/indice storico; counterpart incoming archiviato in `incoming/archive_cold/devkit_scripts/2025-11-25/`. |
| Piani backlog                      | `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`, `.../TASKS_BREAKDOWN.md` | DA_INTEGRARE | Identificare owner; se non più in roadmap spostare in `incoming/legacy`.                                   |
| Script backlog                     | `docs/incoming/lavoro_da_classificare/scripts/README.md`                             | DA_INTEGRARE | Verificare dipendenze prima di riesecuzione.                                                               |

Note:

- 2026-04-08: riesame freeze 01A in STRICT MODE (archivist) senza spostamenti di file: etichette confermate **DA_INTEGRARE/LEGACY/STORICO**, gap list aggiornata con owner proposti e ticket collegati alle fonti; `incoming/_holding` ancora assente. Soft freeze documentale invariato su `incoming/**` e `docs/incoming/**`.
- 2026-03-22: kickoff 15' per ribadire trigger fase 1→2→3 e riesame delle tabelle 01A: gap list ancora aperta (**[TKT-01A-001]** … **[TKT-01A-005]**) senza spostamenti di file; `incoming/_holding` confermato assente (nessuna integrazione/archiviazione). Disponibilità riconfermata in report-only per species/trait-curator (matrice core/derived 01B, ticket **[TKT-01B-001]**/**[TKT-01B-002]**) e dev-tooling (inventario workflow CI/script 01C, ticket **[TKT-01C-001]**/**[TKT-01C-002]**). Gate "RIAPERTURA-2026-01" marcato chiuso con autorizzazione a procedere su 01A; soft freeze documentale invariato su `incoming/**` e `docs/incoming/**`.
- 2026-03-19: log **RIAPERTURA-2026-01** (micro-step archivist) riconferma soft freeze su `incoming/**` e `docs/incoming/**`, gap list 01A allineata a `docs/planning/REF_INCOMING_CATALOG.md` e ticket **[TKT-01A-001]** … **[TKT-01A-005]** (alias **[TKT-01A-DOCS]** per la voce documentazione) registrati in `logs/agent_activity.md`; nessuno spostamento file autorizzato.
- 2026-03-20: nota **RIAPERTURA-2026-01** aggiornata con disponibilità species-curator/trait-curator (01B) e dev-tooling (01C) in modalità report-only, con ticket **[TKT-01B-001]**, **[TKT-01B-002]**, **[TKT-01C-001]**, **[TKT-01C-002]** e riferimenti in `logs/RIAPERTURA-2026-01-note.md` e `reports/audit/readiness-01c-ci-inventory.md`.
- Spostamento eseguito per i duplicati DevKit e inventari (freeze 2025-11-25) verso `incoming/archive_cold/**` con riferimento a `reports/backups/2025-11-25_freeze/manifest.txt`.
- Tenere la tabella sincronizzata con `incoming/README.md` e il catalogo di pianificazione.
- 2026-03-13: kickoff 01B con species-curator per matrice core/derived su ticket **[TKT-01A-001]** … **[TKT-01A-005]**; dev-tooling incaricato di inventariare workflow CI/script incoming senza eseguire pipeline. Aggiornamento README dopo approvazione Master DD (vedi `logs/agent_activity.md`).
- 2026-03-10: riesame gate **RIAPERTURA-2026-01** con Master DD (ticket **[TKT-01A-005]** / **[TKT-01A-DOCS]**): soft freeze su `incoming/**`/`docs/incoming/**` confermato e finestra di sblocco rimandata; vedere riesame 2026-03-19 per stato corrente.
- 2026-02-07: gap list 01A aggiornata con ticket proposti **[TKT-01A-*]** sulle voci aperte (placeholder da aprire e loggare con approvazione Master DD); `incoming/_holding` non presente (nessun batch attivo) e ogni nuovo drop va loggato prima di eventuale ingestione.
- Handoff 01A → 01B: gap list e ticket sono specchiati in `incoming/README.md` e `docs/planning/REF_INCOMING_CATALOG.md`; species-curator è on-call per 01B con supporto trait-curator/balancer per i casi borderline core/derived.
- 2026-02-12: checkpoint **RIAPERTURA-2026-02** per patchset 03A/03B registrato in `logs/agent_activity.md` dopo gate 02A (report-only); freeze soft ancora da confermare con Master DD e nessuna riapertura automatica dei validator CI.
- 2026-02-24: kickoff rapido PATCHSET-00 (15') per ribadire trigger fase 1→2→3; gap list 01A riletta (ticket **[TKT-01A-*]** ancora placeholder) senza spostare file. `_holding` ancora assente (nessun drop da integrare/archiviare). Readiness: trait-curator/species-curator on-call per 01B, dev-tooling on-call per 01C; ticket **[TKT-01B-*]**/**[TKT-01C-*]** da aprire/loggare con approvazione Master DD.

Gap list 01A (sincronizzata con `docs/planning/REF_INCOMING_CATALOG.md` e log **RIAPERTURA-2026-01**):

- **[TKT-01A-001]** – `incoming/lavoro_da_classificare/*`: assenza mapping/owner → nominare owner dominio prima di ingest. Owner proposto: archivist (Laura B, catalogo 01A) con supporto trait-curator per normalizzazioni.
- **[TKT-01A-002]** – `incoming/ancestors_*` / `Ancestors_Neurons_*`: validare schema/licenza e sanificare versioni pubblicabili. Owner proposto: species-curator (on-call 01B) con revisione archivist per catalogazione.
- **[TKT-01A-003]** – `evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx`: riconciliare parametri con pipeline bilanciamento, possibile legacy se fuori sync. Owner proposto: dev-tooling (01C) con segnalazione a balancer per esito QA.
- **[TKT-01A-004]** – `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`: riesaminare compatibilità ID engine senza eseguire script. Owner proposto: dev-tooling (01C) con handoff a engine maintainer dopo QA.
- **[TKT-01A-005]** / **[TKT-01A-DOCS]** – `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`: collegare a patchset 01A o archiviare con approvazione Master DD. Owner proposto: archivist (Laura B) con coordinamento Master DD per decisione finale.
