# REF_INCOMING_CATALOG – Catalogo incoming/backlog

Versione: 0.3
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

### Stato prerequisiti PATCHSET-01A

- Prerequisiti chiusi: catalogo incoming consolidato e allineato con `incoming/README.md` e `docs/incoming/README.md`.

---

## Inventario `incoming/`

| Percorso / gruppo                                                                                                    | Tipo asset                                                          | Stato proposto                | Rischi / note ereditate (v0.2)                                 | Prossimo passo (allineato README)                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `incoming/evo_pacchetto_minimo*.zip` (v1–v8)                                                                         | pack zip versionati                                                 | DA_INTEGRARE                  | Duplicati tra versioni; rischio reimport legacy.               | Consolidare in un’unica versione e valutare versioni <=v4 per `incoming/legacy` dopo diff.        |
| `incoming/evo-tactics-unified-*` (1.9.7–2.0.1)                                                                       | pack zip + tools                                                    | DA_INTEGRARE                  | Sovrapposizioni con core; versioni <2.0 potenzialmente legacy. | Etichettare <2.0 come legacy, verificare checksum e sovrapposizioni con core prima di promuovere. |
| `incoming/evo-tactics-badlands*`, `evo_tactics_ecosystem_badlands.zip`, `evo_tactics_ecosystems_pack.zip`            | pack bioma/espansioni                                               | DA_INTEGRARE                  | Doppioni possibili con pack badlands ufficiali.                | Confrontare con maintainer biomi e decidere merge o legacy.                                       |
| `incoming/evo-tactics-(final                                                                                         | merged)\*`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip` | backup repo / bundle completi | STORICO                                                        | Backup non versionati; rischio reimport accidentali.                                              | Congelare come archivio freddo (`archive_cold`) mantenendo checksum. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` | tool/validatori e tabelle parametri                                 | DA_INTEGRARE                  | Possibile disallineamento con pipeline bilanciamento.          | Integrare o marcare legacy dopo revisione pipeline e toolchain.                                   |
| `incoming/ancestors_*` (zip/csv) e `ancestors_neurons_dump*`                                                         | dataset ancestors / reti neurali                                    | DA_INTEGRARE                  | Dati potenzialmente sensibili/duplicati; schema da validare.   | Verificare schema e checksum, poi decidere import o legacy.                                       |
| `incoming/evo_sentience_*` e `sensienti_traits_v0.1.yaml`, `sentience_traits_v1.0.yaml`                              | sentience pack + trait YAML                                         | DA_INTEGRARE                  | Divergenze di nomenclatura trait.                              | Allineare con trait canonici via trait-curator prima di promuovere.                               |
| `incoming/Ennagramma/` + `evo_enneagram_addon_v1.zip`                                                                | dataset enneagramma (CSV/JSON) e addon pack                         | DA_INTEGRARE                  | Versioni multiple possibili; rischio legacy post-merge.        | Sincronizzare con `docs/incoming/Ennagramma` e decidere versioni da archiviare.                   |
| `incoming/Img/*.svg` (tipologie MBTI)                                                                                | asset grafici                                                       | DA_INTEGRARE                  | Licenza da confermare; possibili sostituzioni future.          | Verificare licenze e spostare in `incoming/legacy` se rimpiazzati da asset ufficiali.             |
| `incoming/species/*.json` + `templates/*.schema.json`                                                                | draft specie e schemi                                               | DA_INTEGRARE                  | Schemi potenzialmente obsoleti.                                | Validare contro schemi correnti con species-curator e dev-tooling.                                |
| `incoming/personality_module.v1.json`, `enneagramma_mechanics_registry.template.json`                                | moduli json                                                         | DA_INTEGRARE                  | Possibili conflitti di nomenclatura con moduli attivi.         | Controllare compatibilità e versioni prima di integrazione.                                       |
| `incoming/idea_catalog.csv`, `IDEA-001_ecosistema_template.yaml`, `recon_meccaniche.json`                            | note/idee ecosistemi                                                | DA_INTEGRARE                  | Potenziali duplicati con pipeline design.                      | Integrare nel design flow o spostare in `incoming/legacy` se superati.                            |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`                                    | hook / schema / script scansione                                    | DA_INTEGRARE                  | Riferimenti engine possibili obsoleti.                         | Allineare con engine corrente e mantenere solo binding compatibili.                               |
| `incoming/docs/*` (script devkit)                                                                                    | script/validatori                                                   | STORICO                       | Residui DevKit possibili duplicati di `tools/`.                | Verificare duplicati e collocarli in `archive_cold` dopo snapshot.                                |
| `incoming/lavoro_da_classificare/*` (sitemap, robots, yml)                                                           | asset sito / integrazione                                           | DA_INTEGRARE                  | Owner non definito; rischio fuori roadmap.                     | Nominare owner e decidere legacy se fuori roadmap.                                                |
| `incoming/idea_intake_site_package.zip`, `generator.html`, `index*.html`, `last_report.*`, `logs_48354746845.zip`    | output report / pacchetti sito                                      | STORICO                       | Rumore da reportistica; rischi reimport.                       | Spostare in archivio freddo per preservare storico e ridurre rumore.                              |
| `incoming/incoming_inventory.json`, `game_repo_map.json`, `compat_map*.json`, `pack_biome_jobs_v8_alt.json`          | mappe e inventari precedenti                                        | STORICO                       | Inventari non allineati con catalogo attuale.                  | Conservare in `archive_cold` dopo diff con catalogo 0.3.                                          |
| `incoming/pathfinder/bestiary1e_index.csv`                                                                           | indice bestiario                                                    | DA_INTEGRARE                  | Licenza da verificare; mapping specie incerto.                 | Confermare licenza e creare mapping interno prima di uso.                                         |
| `incoming/scripts/*.sh`/`*.py`                                                                                       | script backlog/validazione                                          | DA_INTEGRARE                  | Dipendenze potenzialmente rotte.                               | Testare e integrare oppure marcare legacy dopo verifica esecuzione.                               |

## Inventario `docs/incoming/`

| Percorso                                                                             | Tipo asset                       | Stato proposto | Rischi / note ereditate (v0.2)                          | Prossimo passo (allineato README)                               |
| ------------------------------------------------------------------------------------ | -------------------------------- | -------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/incoming/FEATURE_MAP_EVO_TACTICS.md`, `GAME_COMPAT_README.md`                  | mappe compatibilità / feature    | DA_INTEGRARE   | Possibile disallineamento con pack attuali.             | Aggiornare mappe e mantenere riferimento vivo nel catalogo.     |
| `docs/incoming/MODELLI_RIF_EVO_TACTICS.md`                                           | modelli di riferimento           | DA_INTEGRARE   | Modelli forse superati rispetto alle versioni correnti. | Verificare allineamento e spostare in legacy se superati.       |
| `docs/incoming/README_INTEGRAZIONE_MECCANICHE.md`, `README_SCAN_STAT_EVENTI.md`      | guideline integrazione/stat scan | DA_INTEGRARE   | Potrebbero non riflettere pipeline QA attuali.          | Sincronizzare con pipeline QA o marcare STORICO se sostituiti.  |
| `docs/incoming/Ennagramma/README_ENNEAGRAMMA.md`                                     | guida dataset enneagramma        | DA_INTEGRARE   | Richiede coerenza con dataset `incoming/Ennagramma`.    | Collegare al dataset e valutare legacy dopo merge.              |
| `docs/incoming/decompressed/README.md`                                               | note estrazioni                  | STORICO        | Log di estrazione senza uso operativo.                  | Candidare a `archive_cold` dopo snapshot.                       |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`, `.../TASKS_BREAKDOWN.md` | piano e task backlog             | DA_INTEGRARE   | Owner non chiaro; possibile obsolescenza roadmap.       | Identificare owner e decidere se spostare in `incoming/legacy`. |
| `docs/incoming/archive/INDEX.md`                                                     | indice archivio                  | STORICO        | Indice di archivio storico.                             | Mantenere solo come storico, candidare `archive_cold`.          |

---

## Prossimi passi

1. Validare checksum/versioni per decidere quali pack marcare `legacy` o `archive_cold` (no spostamenti in questo step).
2. Collegare ogni fonte prioritaria a ticket/patchset e assegnare owner di dominio (traits/specie/biomi/tooling).
3. Aggiornare `incoming/README.md` e `docs/incoming/README.md` dopo ogni triage incrementale per mantenere lo stato allineato.
4. Definire regole minime di accettazione (formato, checksum, schema) prima di muovere una fonte da DA_INTEGRARE a INTEGRATO.
5. Integrare la tabella nel flusso di PATCHSET successivi e mantenerla sincronizzata con `docs/incoming/README.md`.

## Changelog

- 2025-11-24: versione 0.3 – inventario arricchito con rischi e prossimi passi e prerequisiti PATCHSET-01A chiusi (archivist).
- 2025-11-24: primo inventario con proposte di stato e candidati legacy/archive_cold (archivist).
- 2025-11-23: struttura iniziale del catalogo incoming (archivist).
