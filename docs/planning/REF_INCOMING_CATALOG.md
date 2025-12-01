# REF_INCOMING_CATALOG – Catalogo incoming/backlog

Versione: 0.6
Data: 2025-12-07
Owner: **Master DD (owner umano 01A–01C)** con supporto archivist
Stato: Baseline 07/12/2025 – 01A chiuso, 01B/01C in report-only allineati ai gate aggiornati

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

## Prerequisiti di governance (baseline 07/12/2025)

- Owner umano confermato: Master DD mantiene la responsabilità 01A–01C, con registrazione aggiornata in `logs/agent_activity.md` datata 07/12/2025 (delta vs v0.5 post-milestone: ownership estesa oltre 01A e retrodatata rispetto al checkpoint 30/12/2025).
- Branch dedicati e congelati fino al nuovo kickoff: triage 01B su `patch/01B-core-derived-matrix` e 01C su `patch/01C-tooling-ci-catalog`, mantenuti in report-only fino alla chiusura roadmap <07/12/2025 (delta: le attività precedentemente previste post-30/12/2025 sono anticipate e limitate a update documentali).
- Logging e audit: ogni riallineamento 01A→01B→01C deve essere loggato in STRICT MODE nel file di audit centrale con riferimento al gate e al ticket collegato (delta: aggiunta nota di riallineamento 07/12/2025 rispetto al log 0.5 post-milestone).
- Master DD approva e logga ogni passaggio di stato (congelamento ingressi, gap list, assegnazione owner, handoff 01B/01C) prima di propagare aggiornamenti ai documenti collegati, con nota di conformità al calendario 07/12/2025.

**Allineamento gate 01A–01C (07/12/2025):** 01A congelato e consegnato; 01B (species/trait-curator) opera in report-only sui branch dedicati; 01C (dev-tooling) mantiene i tool legacy/bloccati fino al rebase event-map v2.3, con tutti i passaggi loggati.

### Stato prerequisiti PATCHSET-01A

- Prerequisiti chiusi: catalogo incoming consolidato e allineato con `incoming/README.md` e `docs/incoming/README.md` (riesame 07/12/2025 confermato da Master DD).

---

## Segmentazione buffer/legacy/archive_cold (REF_REPO_SCOPE)

| Percorso                                | Segmento                   | Stato        | Owner umano                                          | Ticket/Patchset                                                                      | Fase |
| --------------------------------------- | -------------------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ---- |
| `incoming/` (pack e dataset attivi)     | buffer backlog             | DA_INTEGRARE | Master DD                                            | **[TKT-01B-001]** (matrice core/derived)                                             | 01B  |
| `incoming/lavoro_da_classificare/`      | buffer backlog             | DA_INTEGRARE | archivist (Master DD, handoff species/trait-curator) | **[TKT-01A-001]** (gap list) / **[TKT-01B-001]** (matrice core/derived)              | 01B  |
| `incoming/archive/`                     | legacy (warm archive)      | STORICO      | Master DD                                            | —                                                                                    | 02A  |
| `incoming/archive_cold/`                | archive_cold (immutabile)  | STORICO      | Master DD                                            | —                                                                                    | 02A  |
| `docs/incoming/` (linee guida e mappe)  | buffer documentale         | DA_INTEGRARE | Master DD                                            | **[TKT-01A-005]** (piani integrazione)                                               | 01B  |
| `docs/incoming/lavoro_da_classificare/` | buffer documentale         | DA_INTEGRARE | archivist (Master DD, dominio catalogo)              | **[TKT-01A-005]** (piano integrazione) / **[TKT-01B-002]** (handoff trait/sentience) | 01B  |
| `docs/incoming/decompressed/`           | legacy (derivati estratti) | STORICO      | Master DD                                            | —                                                                                    | 02A  |
| `docs/incoming/archive/`                | archive_cold documentale   | STORICO      | Master DD                                            | —                                                                                    | 02A  |

Le etichette di stato seguono la convenzione **INTEGRATO / DA_INTEGRARE / STORICO** e riprendono la segmentazione `buffer → legacy → archive_cold` di `REF_REPO_SCOPE`; ogni riga è allineata ai gate 01B (handoff verso species/trait curators) o 02A (validator/report-only) per il collegamento ai ticket esistenti.

## Inventario `incoming/`

<!-- prettier-ignore -->
| Percorso | Tipo asset | Stato proposto | Rischi | Note |
| --- | --- | --- | --- | --- |
| `incoming/evo_pacchetto_minimo_v1..v8.zip` | pack baseline versionati | DA_INTEGRARE | Duplicati, possibili regressioni tra versioni. | Deduplicare e scegliere versione di riferimento; <=v4 candidati legacy. |
| `incoming/evo-tactics-unified-*` (1.9.7–2.0.1, +tools) | pack unificati e tool | DA_INTEGRARE | Sovrapposizioni con core, versioni miste. | Allineare checksum; marcare <2.0 come legacy prima del merge. |
| `incoming/evo-tactics-badlands*`, `evo_tactics_ecosystem_badlands.zip`, `evo_tactics_ecosystems_pack.zip` | pack bioma/espansioni | DA_INTEGRARE | Possibili doppioni con pack ufficiali. | Validare contenuti con maintainer biomi prima di includere. |
| `incoming/evo-tactics-final*.zip`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip`, `evo-tactics-merged*.zip`, `evo-tactics.zip` | backup/bundle repo | STORICO | Rischio reimport accidentale. | Congelare in archivio freddo con checksum. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` | tool e tabelle parametri | LEGACY | Decisione dev-tooling (TKT-01C-001): pacchetto legacy/read-only per diff. | Attendere baseline pipeline parametri aggiornata prima di riprendere l'integrazione. |
| `incoming/ancestors_*`, `ancestors_neurons_dump*`, `Ancestors_Neurons_*` csv | dataset ancestors / reti neurali | DA_INTEGRARE | Owner species-curator (TKT-01B-001): drop sanificato `ancestors_neurons_dump_v3` con licenza in pending. | Archiviare versioni precedenti come legacy dopo review; consegna a species/trait-curator per matrice 01B. |
| `incoming/evo_sentience_branch_layout_v0_1.zip`, `evo_sentience_rfc_pack_v0_1.zip`, `sensienti_traits_v0.1.yaml`, `sentience_traits_v1.0.yaml` | pack sentience e trait | DA_INTEGRARE | Divergenze di nomenclatura trait. | Allineare con trait canonici via trait-curator prima di promozione. |
| `incoming/Ennagramma/`, `evo_enneagram_addon_v1.zip` | dataset enneagramma e addon | DA_INTEGRARE | Versioni multiple da normalizzare. | Sincronizzare con doc `docs/incoming/Ennagramma` e decidere legacy. |
| `incoming/Img/*.svg` | asset grafici MBTI | DA_INTEGRARE | Licenza da confermare. | Raccogliere liberatorie/licenze prima dell’uso in pack. |
| `incoming/species/*.json`, `incoming/templates/*.schema.json` | draft specie e schemi | DA_INTEGRARE | Schemi possibili obsoleti. | Validare con species-curator e aggiornare mapping. |
| `incoming/personality_module.v1.json`, `enneagramma_mechanics_registry.template.json` | moduli JSON | DA_INTEGRARE | Conflitti di nomenclatura con moduli attivi. | Verificare compatibilità e versioning prima di integrazione. |
| `incoming/idea_catalog.csv`, `IDEA-001_ecosistema_template.yaml`, `recon_meccaniche.json` | idee e note ecosistemi | DA_INTEGRARE | Possibili duplicati con pipeline design. | Collegare a ticket/patchset design e decidere legacy se superati. |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` | hook/script/ schema engine | DA_INTEGRARE | Dev-tooling (TKT-01C-002): rebase su event-map engine v2.3; non eseguire `scan_engine_idents.py`. | Blocchi borderline segnalati a Master DD se 01B richiede nuovi eventi; consegna hook puliti a species/trait-curator. |
| `incoming/docs/*` | script DevKit | STORICO | Duplicati potenziali di `tools/`. | Spostare in archive_cold dopo snapshot se sovrapposti. |
| `incoming/lavoro_da_classificare/*` | asset sito, config e batch | DA_INTEGRARE | archivist (Master DD, handoff species/trait-curator) | Collegato a **[TKT-01A-001]** → handoff **[TKT-01B-001]**/**[TKT-01B-002]** su `patch/01B-core-derived-matrix`. |
| `incoming/idea_intake_site_package.zip`, `generator.html`, `index*.html`, `last_report.*`, `logs_48354746845.zip` | report/pacchetti sito | STORICO | Rumore da reportistica, rischio reimport. | Archiviare freddo mantenendo checksum. |
| `incoming/incoming_inventory.json`, `game_repo_map.json`, `compat_map*.json`, `pack_biome_jobs_v8_alt.json` | inventari/mappe precedenti | STORICO | Non allineati al catalogo corrente. | Conservare come storico dopo diff con catalogo 0.3. |
| `incoming/pathfinder/bestiary1e_index.csv` | indice bestiario | DA_INTEGRARE | Licenza e mapping specie incerti. | Confermare licenza e creare mapping interno prima dell’uso. |
| `incoming/scripts/*.sh` / `incoming/scripts/*.py` | script backlog/validazione | DA_INTEGRARE | Dipendenze rotte/non tracciate. | Testare in ambiente isolato, poi integrare o marcare legacy. |
| `incoming/decompressed/*` | estrazioni temporanee di pack | STORICO | Derivati non tracciati possono divergere. | Non usare come fonte canonica; rigenerare da archivi originali. |

## Inventario `docs/incoming/`

<!-- prettier-ignore -->
| Percorso | Tipo asset | Stato proposto | Rischi | Note |
| --- | --- | --- | --- | --- |
| `docs/incoming/FEATURE_MAP_EVO_TACTICS.md`, `GAME_COMPAT_README.md` | mappe compatibilità/feature | DA_INTEGRARE | Probabile disallineamento con pack correnti. | Aggiornare rispetto agli ultimi pack e collegare al catalogo. |
| `docs/incoming/MODELLI_RIF_EVO_TACTICS.md` | modelli di riferimento | DA_INTEGRARE | Possibile obsolescenza dei modelli. | Verificare contro schemi attuali e marcare legacy se superati. |
| `docs/incoming/README_INTEGRAZIONE_MECCANICHE.md`, `README_SCAN_STAT_EVENTI.md` | linee guida integrazione/stat | DA_INTEGRARE | Potrebbero non riflettere pipeline QA attuale. | Sincronizzare con pipeline QA o spostare in storico. |
| `docs/incoming/Ennagramma/README_ENNEAGRAMMA.md` | guida dataset enneagramma | DA_INTEGRARE | Deve essere coerente con dataset `incoming/Ennagramma`. | Allineare con il dataset prima di promuovere. |
| `docs/incoming/decompressed/README.md` | note estrazioni | STORICO | Log operativo senza uso diretto. | Candidare ad archive_cold dopo snapshot. |
| `docs/incoming/decompressed/*` (cartelle estratte) | estrazioni di archivi incoming | STORICO | Derivati non versionati dei pack. | Tenere solo come traccia operativa, rigenerare da sorgenti zip. |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`, `.../TASKS_BREAKDOWN.md` | piani e task backlog | DA_INTEGRARE | archivist (Master DD, dominio catalogo) | Allineare a **[TKT-01A-005]** con riferimenti **01B** (**[TKT-01B-001]**/**[TKT-01B-002]**) e branch `patch/01B-core-derived-matrix`. |
| `docs/incoming/lavoro_da_classificare/scripts/README.md` | note script backlog | DA_INTEGRARE | Potrebbe descrivere tool non mantenuti. | Verificare dipendenze prima di riesecuzione. |
| `docs/incoming/archive/INDEX.md`, `archive/2025-11-15_evo_cleanup`, `archive/2025-12-19_inventory_cleanup`, `archive/documents` | archivio storico | STORICO | Materiale legacy già chiuso. | Mantenere come storico; eventuale spostamento in archive_cold. |

---

## Prossimi passi (roadmap compressa <07/12/2025)

1. **05/12 – Archivist + Master DD (TKT-01B-001 / TKT-01C-001):** validare checksum/versioni e marcare legacy/archive_cold le fonti duplicate senza spostamenti fisici; log in `logs/agent_activity.md` con riferimento gate 01A.
2. **05/12 – Coordinator + Archivist (TKT-01A-005):** collegare ogni fonte prioritaria a ticket/patchset e assegnare owner di dominio, aggiornando `incoming/README.md` e `docs/incoming/README.md` in coppia.
3. **06/12 – Species-curator + Trait-curator (TKT-01B-001 / TKT-01B-002):** consolidare gap list e alias map per sentience/enneagramma, consegnando snapshot e mapping ai branch `patch/01B-core-derived-matrix`.
4. **06/12 – Dev-tooling (TKT-01C-001 / TKT-01C-002):** ricalibrare note su tool/validatori e hook engine, mantenendo stato report-only fino a rebase event-map v2.3; blocchi segnalati a Master DD.
5. **07/12 – Master DD (sign-off 01A→01B/01C):** verifica finale del log STRICT MODE, chiusura triage e autorizzazione handoff ai branch dedicati, con delta rispetto a v0.5 post-milestone registrato nel file di audit.

### Step operativo 01A (STRICT MODE, owner Master DD)

- **Freeze ingressi (approvato)**: finestra 2025-11-24 → 2025-11-27 approvata da Master DD; durante il freeze i nuovi drop vanno in `incoming/_holding` con log in `logs/agent_activity.md` e nota di approvazione del batch.
- **Gap list + owner**: stilare elenco puntuale delle fonti senza mapping verso core/derived, nominando un owner di dominio per ciascuna voce e collegando il ticket/patchset di presa in carico; integrare ogni riga con la nota di approvazione Master DD prima di sbloccare 01B/01C.
- **Allineamento README**: per ogni batch di triage approvato, aggiornare in coppia `incoming/README.md` e `docs/incoming/README.md`, includendo riferimento al ticket/patchset; riportare l’esito nel log centrale.
- **Uscita 01A → 01B/01C**: pubblicare la gap list approvata da Master DD e chiudere il freeze (loggando data/ora); solo dopo, permettere a 01B/01C di usare il catalogo come fonte stabile, consegnando a species-curator una copia della gap list con ticket/owner per il kickoff 01B.
- **Pacchetto di handoff per 01B (species-curator)**: includere gap list approvata (ticket/owner), snapshot tabelle incoming, link ai README aggiornati e nota di rischio per le voci borderline. Loggare in `logs/agent_activity.md` la consegna dell’handoff con riferimento al branch/commit.

#### Piano operativo multi-agente 01A (routing automatico attivo)

- **coordinator**: guida il freeze, raccoglie l’approvazione di Master DD e verifica che la gap list sia completa di owner/ticket prima del passaggio a 01B/01C.
- **archivist**: esegue il censimento durante il freeze, aggiorna le tabelle di questo reference e propone gli aggiornamenti dei README in batch coesi (nessuno spostamento file).
- **dev-tooling**: supporta la verifica di checksum e di eventuali script elencati nella gap list; prepara note di compatibilità da collegare ai ticket.
- **asset-prep**: fornisce metadati/licenze per asset grafici e pack, così da sbloccare le voci marcate DA_INTEGRARE.
- **handoff**: ogni aggiornamento di tabella/README approvato da Master DD va loggato in `logs/agent_activity.md` con riferimento a ticket/patchset, chiudendo l’azione 01A corrispondente.

#### Finestra freeze (approvata Master DD)

| Inizio     | Fine       | Responsabili                                    | Note operative                                                                                                                                                                                                                                                                           |
| ---------- | ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-24 | 2025-11-27 | archivist + coordinator, approvazione Master DD | Freeze soft su `incoming/**` e `docs/incoming/**`; nuovi drop vanno parcheggiati in `incoming/_holding` con log in `logs/agent_activity.md` e nota di approvazione.                                                                                                                      |
| 2026-07-08 | 2026-07-15 | archivist (approvazione Master DD)              | Freeze documentale chiuso 2026-07-15T18:00Z (finestra 2026-07-08T09:00Z → 2026-07-15T18:00Z) su `incoming/**` e `docs/incoming/**`; `_holding` assente (nessun drop registrato); nuovi drop post-unfreeze richiedono nuova finestra freeze con log/ticket e riferimento all’attivazione. |

**Stato freeze (2026-07-08):** finestra documentale CHIUSA alle 2026-07-15T18:00Z con approvazione Master DD; nessun drop registrato in `incoming/_holding` (cartella assente). Ogni nuovo drop post-unfreeze richiede apertura di una nuova finestra freeze e logging in `logs/agent_activity.md` con ticket di riferimento.

#### Gap list 01A (chiusa, approvata da Master DD)

| Fonte                                                                             | Missing mapping                                        | Owner proposto                                            | Ticket/Note                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incoming/lavoro_da_classificare/*`                                               | Nessun mapping verso core/derived né owner di dominio. | archivist (Master DD, supporto trait-curator)             | Ticket **[TKT-01A-001]** – Outcome **INTEGRARE** (triage + mapping owner) **CHIUSO** con approvazione Master DD; note allineate ai README incoming/docs e consegna a 01B.                                           |
| `incoming/ancestors_*` CSV / `Ancestors_Neurons_*`                                | Schema e sensibilità dati non mappati ai dataset core. | species-curator (supporto dev-tooling per sanitizzazione) | Ticket **[TKT-01A-002]** – Outcome **INTEGRARE** drop sanificato `ancestors_neurons_dump_v3` **CHIUSO** con approvazione Master DD; legacy precedenti da archiviare dopo review e handoff 01B.                      |
| `incoming/evo_tactics_validator-pack_v1.5.zip` e `..._param_synergy_v8_3.zip`     | Tabelle parametri non collegate ai pack core/derived.  | dev-tooling (supporto balancer)                           | Ticket **[TKT-01A-003]** – Outcome **LEGACY** (read-only fino a nuova baseline parametri) **CHIUSO** con approvazione Master DD; nota riflessa nei README incoming/docs e consegna 01C.                             |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` | Bindings engine non allineati agli ID correnti.        | dev-tooling                                               | Ticket **[TKT-01A-004]** – Outcome **INTEGRARE** dopo rebase su event-map engine v2.3 **CHIUSO** con approvazione Master DD; blocco su `scan_engine_idents.py` da mantenere finché non sbloccato, consegna 01C/01B. |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`                        | Piano integrazione senza legame a patchset/ticket.     | archivist (Master DD)                                     | Ticket **[TKT-01A-005]** – Outcome **INTEGRARE** (allineare piano a patchset 01A / ticket collegati) **CHIUSO** con approvazione Master DD; note sincronizzate nei README e pacchetto handoff 01B/01C.              |

**Stato ticket:** i ticket **[TKT-01A-001]** … **[TKT-01A-005]** sono **CHIUSI** con outcome approvati da Master DD; handoff verso 01B/01C in report-only su `patch/01B-core-derived-matrix` e `patch/01C-tooling-ci-catalog` (registrati nel log centrale).

### Shortlist kickoff 01B/01C (pronta per handoff)

**Aggiornamento owner 2026-05-09:** owner 01B/01C confermano handoff: species-curator accetta `ancestors_neurons_dump_v3` (licenza pending) per TKT-01B-001; trait-curator on-call per alias sentience/enneagramma (TKT-01B-002); dev-tooling marca i pack parametri v1.5/v8_3 LEGACY (TKT-01C-001) e richiede rebase hook su event-map engine v2.3 con blocchi segnalati a Master DD su TKT-01C-002.

**Aggiornamento readiness 2026-07-10:** catalogo 01A stabile per la finestra RIAPERTURA-2026-01 con freeze documentale 2026-07-08T09:00Z → 2026-07-15T18:00Z (chiuso); owner 01B species-curator/trait-curator operano in report-only su `patch/01B-core-derived-matrix`, owner 01C dev-tooling mantiene inventario e controlli in report-only su `patch/01C-tooling-ci-catalog`; ticket attivi **[TKT-01B-001]**, **[TKT-01B-002]**, **[TKT-01C-001]**, **[TKT-01C-002]** con logging in STRICT MODE.

**Aggiornamento readiness 2025-11-30T23:12Z:** riesame 01B/01C con approvazione Master DD: finestra freeze documentale 2026-07-08T09:00Z → 2026-07-15T18:00Z confermata come baseline; owner e ticket invariati (**[TKT-01B-001]**, **[TKT-01B-002]**, **[TKT-01C-001]**, **[TKT-01C-002]**) in modalità report-only; autorizzato proseguire con pipeline/patchset successivi mantenendo logging STRICT MODE e handoff tracciato nei README.

| Ticket            | Fase | Scope sintetico                                                                                    | Owner di dominio              | Rischi / dipendenze                                                                                                                                               |
| ----------------- | ---- | -------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[TKT-01B-001]** | 01B  | Matrice core/derived basata su gap 01A (input `incoming/` + `docs/incoming/`).                     | species-curator + coordinator | Owner conferma drop sanificato `ancestors_neurons_dump_v3` (licenza pending); duplicati da marcare legacy; blocco se Master DD respinge la licenza.               |
| **[TKT-01B-002]** | 01B  | Allineamento trait sentience/enneagramma con trait canonici (handoff trait-curator).               | trait-curator                 | Alias map pronta per handoff; attende refactor hook 01C-002 su event-map v2.3; escalation a Master DD se i binding rimangono bloccati.                            |
| **[TKT-01C-001]** | 01C  | Verifica tool/validatori parametri (`*_param_synergy*`, tabelle v8_3) con pipeline attuale.        | balancer + dev-tooling        | Pacchetto marcato LEGACY/read-only; attendere baseline parametri aggiornata prima di ogni rerun; informare Master DD se richiesto riuso temporaneo.               |
| **[TKT-01C-002]** | 01C  | Revisione hook/script engine (`hook_bindings.ts`, `engine_events.schema.json`) e compatibilità ID. | dev-tooling                   | Rebase su event-map engine v2.3; `scan_engine_idents.py` bloccato finché non arriva ID map aggiornata; avviso a Master DD sui blocchi borderline per matrice 01B. |

**Ispezione `incoming/_holding` (2026-02-07):** cartella non presente; nessun batch da integrare o archiviare, in attesa di eventuali drop futuri da loggare prima dell’ingestione.

**Collegamento README:** la gap list 01A qui sopra è stata sincronizzata con `incoming/README.md` e `docs/incoming/README.md` per l’handoff verso 01B; ogni aggiornamento futuro deve aggiornare i tre documenti in parallelo e registrare l’esito nel log di attività.

## Changelog

- 2025-12-07: versione 0.6 – baseline anticipata al 07/12/2025 con allineamento gate 01A–01C, governance aggiornata (owner/branch/logging) e roadmap compressa pre-handoff.
- 2025-12-30: versione 0.5 – intestazione sincronizzata al report v0.5, mantenendo PATCHSET-01A e le tabelle di triage come baseline ufficiale.
- 2025-12-23: versione 0.3 – tabelle normalizzate e allineate alle linee guida di triage senza rinominare/spostare asset.
- 2025-12-17: versione 0.3 – design completato e perimetro documentazione confermato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance rafforzati (owner umano, branch dedicati, logging su `logs/agent_activity.md`).
- 2025-11-24: versione 0.3 – inventario arricchito con rischi e prossimi passi e prerequisiti PATCHSET-01A chiusi (archivist).
- 2025-11-24: primo inventario con proposte di stato e candidati legacy/archive_cold (archivist).
- 2025-11-23: versione 0.3 – ownership passata a Master DD. (01A) e inventario aggiornato con tabella per `incoming/` e `docs/incoming/`.
- 2025-11-23: struttura iniziale del catalogo incoming (archivist).
