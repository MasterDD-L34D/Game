# REF_INCOMING_CATALOG – Catalogo incoming/backlog

Versione: 0.2
Data: 2025-11-24
Owner: agente **archivist** (supporto: coordinator)
Stato: DRAFT – inventario iniziale

---

## Obiettivi

- Catalogare il contenuto di `incoming/**` e `docs/incoming/**` con stato (INTEGRATO / DA_INTEGRARE / STORICO) e priorità di triage.
- Distinguere materiale attivo (buffer) da legacy o archivio, indicando percorso di destinazione o archiviazione.
- Collegare le fonti incoming a patchset/ticket che ne gestiranno l’integrazione nei core o nei pack derivati.

## Stato attuale

- Le fonti sono distribuite tra pack versionati, dataset CSV/JSON e note di lavorazione, senza un indice centralizzato.
- Coesistono molte versioni dello stesso pack (es. `evo_pacchetto_minimo*`, `evo-tactics-unified-*`) che richiedono deduplica e marcatura legacy.
- Esistono dati specialistici (enneagramma, ancestors, species draft) e script di validazione non allineati alle pipeline correnti.

## Rischi

- Rumore e duplicati rispetto ai core o ai pack derivati se il materiale non viene etichettato prima dell’uso.
- Rischio di reimport multipli da pack legacy o da backup di repository (`*FullRepo*`, `*final*`).
- Mancanza di tracciamento verso ticket/patchset rende difficile decidere priorità e responsabili.

## Dipendenze

- `REF_REPO_SOURCES_OF_TRUTH` per confrontare le fonti incoming con i dataset canonici.
- `REF_PACKS_AND_DERIVED` per capire l’impatto del materiale incoming sui pack e sui derived.
- `REF_REPO_MIGRATION_PLAN` per schedulare quando integrare/archiviare ciascuna fonte.
- Supporto di coordinator per priorità e di dev-tooling per eventuali script di import/validazione.

---

## Inventario `incoming/`

| Percorso / gruppo                                                                                                    | Tipo asset                                                          | Stato proposto                | Note / rischi (e candidati legacy/archive_cold)                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `incoming/evo_pacchetto_minimo*.zip` (v1–v8)                                                                         | pack zip versionati                                                 | DA_INTEGRARE                  | Consolidare in un’unica versione; versioni <=v4 candidate per `incoming/legacy` dopo diff.                            |
| `incoming/evo-tactics-unified-*` (1.9.7–2.0.1)                                                                       | pack zip + tools                                                    | DA_INTEGRARE                  | Verificare sovrapposizioni con core; etichettare <2.0 come legacy e valutare `archive_cold` dopo checksum.            |
| `incoming/evo-tactics-badlands*`, `evo_tactics_ecosystem_badlands.zip`, `evo_tactics_ecosystems_pack.zip`            | pack bioma/espansioni                                               | DA_INTEGRARE                  | Rischio di doppioni con pack badlands ufficiali; segnalare per confronto con maintainer biomi.                        |
| `incoming/evo-tactics-(final                                                                                         | merged)\*`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip` | backup repo / bundle completi | STORICO                                                                                                               | Backup non versionati; candidati per `archive_cold` per evitare reimport accidentali. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` | tool/validatori e tabelle parametri                                 | DA_INTEGRARE                  | Integrare tool nella toolchain o marcarli legacy; verificare coerenza con pipeline di bilanciamento.                  |
| `incoming/ancestors_*` (zip/csv) e `ancestors_neurons_dump*`                                                         | dataset ancestors / reti neurali                                    | DA_INTEGRARE                  | Richiedono validazione schema; potenziali dati sensibili duplicati, valutare checksum e marcatura legacy dopo import. |
| `incoming/evo_sentience_*` e `sensienti_traits_v0.1.yaml`, `sentience_traits_v1.0.yaml`                              | sentience pack + trait YAML                                         | DA_INTEGRARE                  | Allineare con trait canonici; rischio di divergenza nomenclatura, richiede revisione trait-curator.                   |
| `incoming/Ennagramma/` + `evo_enneagram_addon_v1.zip`                                                                | dataset enneagramma (CSV/JSON) e addon pack                         | DA_INTEGRARE                  | Verificare fonti rispetto a docs/incoming/Ennagramma; alcune versioni potrebbero diventare legacy dopo merge.         |
| `incoming/Img/*.svg` (tipologie MBTI)                                                                                | asset grafici                                                       | DA_INTEGRARE                  | Richiede verifica licenza; candidati a `incoming/legacy` se sostituiti da asset ufficiali.                            |
| `incoming/species/*.json` + `templates/*.schema.json`                                                                | draft specie e schemi                                               | DA_INTEGRARE                  | Validare contro schemi correnti; rischio di schema obsoleto, coordinare con species-curator e dev-tooling.            |
| `incoming/personality_module.v1.json`, `enneagramma_mechanics_registry.template.json`                                | moduli json                                                         | DA_INTEGRARE                  | Controllare compatibilità con moduli attivi; possibili conflitti di nomenclatura.                                     |
| `incoming/idea_catalog.csv`, `IDEA-001_ecosistema_template.yaml`, `recon_meccaniche.json`                            | note/idee ecosistemi                                                | DA_INTEGRARE                  | Integrare in pipeline design; se superseduti, spostare in `incoming/legacy`.                                          |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`                                    | hook / schema / script scansione                                    | DA_INTEGRARE                  | Allineare con engine corrente; rischio di riferimenti obsoleti.                                                       |
| `incoming/docs/*` (script devkit)                                                                                    | script/validatori                                                   | STORICO                       | Probabili residui di DevKit; candidati a `archive_cold` dopo verifica duplicati in `tools/`.                          |
| `incoming/lavoro_da_classificare/*` (sitemap, robots, yml)                                                           | asset sito / integrazione                                           | DA_INTEGRARE                  | Definire owner; se non più in roadmap, spostare in `incoming/legacy`.                                                 |
| `incoming/idea_intake_site_package.zip`, `generator.html`, `index*.html`, `last_report.*`, `logs_48354746845.zip`    | output report / pacchetti sito                                      | STORICO                       | Materiale di reportistica; suggerito archivio freddo per evitare rumore.                                              |
| `incoming/incoming_inventory.json`, `game_repo_map.json`, `compat_map*.json`, `pack_biome_jobs_v8_alt.json`          | mappe e inventari precedenti                                        | STORICO                       | Inventari non più allineati; conservarli in `archive_cold` dopo diff con catalogo corrente.                           |
| `incoming/pathfinder/bestiary1e_index.csv`                                                                           | indice bestiario                                                    | DA_INTEGRARE                  | Necessita conferma di licenza e mapping a specie interne.                                                             |
| `incoming/scripts/*.sh`/`*.py`                                                                                       | script backlog/validazione                                          | DA_INTEGRARE                  | Integrare o marcare legacy; rischi di dipendenze rotte.                                                               |

## Inventario `docs/incoming/`

| Percorso                                                                             | Tipo asset                       | Stato proposto | Note / rischi (e candidati legacy/archive_cold)                                          |
| ------------------------------------------------------------------------------------ | -------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `docs/incoming/FEATURE_MAP_EVO_TACTICS.md`, `GAME_COMPAT_README.md`                  | mappe compatibilità / feature    | DA_INTEGRARE   | Aggiornare rispetto ai pack attuali; mantenere come riferimento vivo nel catalogo.       |
| `docs/incoming/MODELLI_RIF_EVO_TACTICS.md`                                           | modelli di riferimento           | DA_INTEGRARE   | Verificare se riflettono versioni correnti dei modelli; se superati, spostare in legacy. |
| `docs/incoming/README_INTEGRAZIONE_MECCANICHE.md`, `README_SCAN_STAT_EVENTI.md`      | guideline integrazione/stat scan | DA_INTEGRARE   | Allineare con pipeline QA; se sostituiti da doc in `/docs`, marcare STORICO.             |
| `docs/incoming/Ennagramma/README_ENNEAGRAMMA.md`                                     | guida dataset enneagramma        | DA_INTEGRARE   | Sincronizzare con asset in `incoming/Ennagramma`; se fusi altrove, considerare legacy.   |
| `docs/incoming/decompressed/README.md`                                               | note estrazioni                  | STORICO        | Probabile log di estrazione; candidare a `archive_cold` dopo snapshot.                   |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`, `.../TASKS_BREAKDOWN.md` | piano e task backlog             | DA_INTEGRARE   | Identificare owner; se obsoleti rispetto a roadmap, spostare in `incoming/legacy`.       |
| `docs/incoming/archive/INDEX.md`                                                     | indice archivio                  | STORICO        | Mantenere solo per storico; valido candidato `archive_cold`.                             |

---

## Prossimi passi

1. Validare checksum/versioni per decidere quali pack marcare `legacy` o `archive_cold` (no spostamenti in questo step).
2. Collegare ogni fonte prioritaria a ticket/patchset e assegnare owner di dominio (traits/specie/biomi/tooling).
3. Aggiornare `incoming/README.md` e `docs/incoming/README.md` dopo ogni triage incrementale per mantenere lo stato allineato.
4. Definire regole minime di accettazione (formato, checksum, schema) prima di muovere una fonte da DA_INTEGRARE a INTEGRATO.
5. Integrare la tabella nel flusso di PATCHSET successivi e mantenerla sincronizzata con `docs/incoming/README.md`.

## Changelog

- 2025-11-24: primo inventario con proposte di stato e candidati legacy/archive_cold (archivist).
- 2025-11-23: struttura iniziale del catalogo incoming (archivist).
