# REF_INCOMING_CATALOG – Catalogo incoming/backlog

Versione: 0.5
Data: 2025-12-30
Owner: **Master DD (owner umano 01A)** con supporto archivist
Stato: PATCHSET-01A – inventario aggiornato

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

## Prerequisiti di governance

- Owner umano identificato per la manutenzione del catalogo PATCHSET-00 (Master DD) e registrato in `logs/agent_activity.md`.
- Branch dedicati per lavorare su triage incoming senza impattare `main` finché le tabelle non sono validate.
- Log degli aggiornamenti di numerazione 01A–03B e delle approvazioni di triage nel file di audit centrale.
- Master DD approva e logga in STRICT MODE ogni passaggio di stato 01A (congelamento ingressi, gap list, assegnazione owner) prima di propagare aggiornamenti ai documenti collegati.

### Stato prerequisiti PATCHSET-01A

- Prerequisiti chiusi: catalogo incoming consolidato e allineato con `incoming/README.md` e `docs/incoming/README.md`.

---

## Inventario `incoming/`

<!-- prettier-ignore -->
| Percorso | Tipo asset | Stato proposto | Rischi | Note |
| --- | --- | --- | --- | --- |
| `incoming/evo_pacchetto_minimo_v1..v8.zip` | pack baseline versionati | DA_INTEGRARE | Duplicati, possibili regressioni tra versioni. | Deduplicare e scegliere versione di riferimento; <=v4 candidati legacy. |
| `incoming/evo-tactics-unified-*` (1.9.7–2.0.1, +tools) | pack unificati e tool | DA_INTEGRARE | Sovrapposizioni con core, versioni miste. | Allineare checksum; marcare <2.0 come legacy prima del merge. |
| `incoming/evo-tactics-badlands*`, `evo_tactics_ecosystem_badlands.zip`, `evo_tactics_ecosystems_pack.zip` | pack bioma/espansioni | DA_INTEGRARE | Possibili doppioni con pack ufficiali. | Validare contenuti con maintainer biomi prima di includere. |
| `incoming/evo-tactics-final*.zip`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip`, `evo-tactics-merged*.zip`, `evo-tactics.zip` | backup/bundle repo | STORICO | Rischio reimport accidentale. | Congelare in archivio freddo con checksum. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` | tool e tabelle parametri | DA_INTEGRARE | Misallineamento possibile con pipeline attuale. | Rieseguire validazioni e aggiornare riferimenti o marcare legacy. |
| `incoming/ancestors_*`, `ancestors_neurons_dump*`, `Ancestors_Neurons_*` csv | dataset ancestors / reti neurali | DA_INTEGRARE | Dati duplicati/sensibili, schema da confermare. | Validare schema e consolidare le versioni pubblicabili. |
| `incoming/evo_sentience_branch_layout_v0_1.zip`, `evo_sentience_rfc_pack_v0_1.zip`, `sensienti_traits_v0.1.yaml`, `sentience_traits_v1.0.yaml` | pack sentience e trait | DA_INTEGRARE | Divergenze di nomenclatura trait. | Allineare con trait canonici via trait-curator prima di promozione. |
| `incoming/Ennagramma/`, `evo_enneagram_addon_v1.zip` | dataset enneagramma e addon | DA_INTEGRARE | Versioni multiple da normalizzare. | Sincronizzare con doc `docs/incoming/Ennagramma` e decidere legacy. |
| `incoming/Img/*.svg` | asset grafici MBTI | DA_INTEGRARE | Licenza da confermare. | Raccogliere liberatorie/licenze prima dell’uso in pack. |
| `incoming/species/*.json`, `incoming/templates/*.schema.json` | draft specie e schemi | DA_INTEGRARE | Schemi possibili obsoleti. | Validare con species-curator e aggiornare mapping. |
| `incoming/personality_module.v1.json`, `enneagramma_mechanics_registry.template.json` | moduli JSON | DA_INTEGRARE | Conflitti di nomenclatura con moduli attivi. | Verificare compatibilità e versioning prima di integrazione. |
| `incoming/idea_catalog.csv`, `IDEA-001_ecosistema_template.yaml`, `recon_meccaniche.json` | idee e note ecosistemi | DA_INTEGRARE | Possibili duplicati con pipeline design. | Collegare a ticket/patchset design e decidere legacy se superati. |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` | hook/script/ schema engine | DA_INTEGRARE | Riferimenti engine forse obsoleti. | Allineare con engine corrente e scartare binding non compatibili. |
| `incoming/docs/*` | script DevKit | STORICO | Duplicati potenziali di `tools/`. | Spostare in archive_cold dopo snapshot se sovrapposti. |
| `incoming/lavoro_da_classificare/*` | asset sito, config e batch | DA_INTEGRARE | Owner non definito; scope roadmap incerto. | Nominare owner e decidere se integrare o marcare legacy. |
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
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`, `.../TASKS_BREAKDOWN.md` | piani e task backlog | DA_INTEGRARE | Owner non definito; rischio fuori roadmap. | Identificare owner e aggiornare o spostare in legacy. |
| `docs/incoming/lavoro_da_classificare/scripts/README.md` | note script backlog | DA_INTEGRARE | Potrebbe descrivere tool non mantenuti. | Verificare dipendenze prima di riesecuzione. |
| `docs/incoming/archive/INDEX.md`, `archive/2025-11-15_evo_cleanup`, `archive/2025-12-19_inventory_cleanup`, `archive/documents` | archivio storico | STORICO | Materiale legacy già chiuso. | Mantenere come storico; eventuale spostamento in archive_cold. |

---

## Prossimi passi

1. Validare checksum/versioni per decidere quali pack marcare `legacy` o `archive_cold` (no spostamenti in questo step).
2. Collegare ogni fonte prioritaria a ticket/patchset e assegnare owner di dominio (traits/specie/biomi/tooling).
3. Aggiornare `incoming/README.md` e `docs/incoming/README.md` dopo ogni triage incrementale per mantenere lo stato allineato.
4. Definire regole minime di accettazione (formato, checksum, schema) prima di muovere una fonte da DA_INTEGRARE a INTEGRATO.
5. Integrare la tabella nel flusso di PATCHSET successivi e mantenerla sincronizzata con `docs/incoming/README.md`.

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

| Inizio     | Fine       | Responsabili                                    | Note operative                                                                                                                                                      |
| ---------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-24 | 2025-11-27 | archivist + coordinator, approvazione Master DD | Freeze soft su `incoming/**` e `docs/incoming/**`; nuovi drop vanno parcheggiati in `incoming/_holding` con log in `logs/agent_activity.md` e nota di approvazione. |

**2026-02-07 (RIAPERTURA-2026-01):** la finestra sopra risulta chiusa; nessun freeze attivo al momento. Necessaria nuova approvazione di Master DD per riattivare blocchi o aprire una finestra aggiornata.

#### Gap list 01A (bozza, in attesa di approvazione Master DD)

| Fonte                                                                             | Missing mapping                                        | Owner proposto                                            | Ticket/Note                                                                                                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incoming/lavoro_da_classificare/*`                                               | Nessun mapping verso core/derived né owner di dominio. | coordinator + owner dominio da nominare                   | Ticket **[TKT-01A-001]** aperto (triage + nomina owner dominio); stato 01A loggato e riflesso in `incoming/README.md` e `docs/incoming/README.md`.         |
| `incoming/ancestors_*` CSV / `Ancestors_Neurons_*`                                | Schema e sensibilità dati non mappati ai dataset core. | species-curator (supporto dev-tooling per sanitizzazione) | Ticket **[TKT-01A-002]** aperto per validare schema contro `data/core/species` e definire versione pubblicabile (handoff 01B con species-curator on-call). |
| `incoming/evo_tactics_validator-pack_v1.5.zip` e `..._param_synergy_v8_3.zip`     | Tabelle parametri non collegate ai pack core/derived.  | balancer + dev-tooling                                    | Ticket **[TKT-01A-003]** aperto per riconciliare parametri con pipeline attuale prima di promozione; traccia in README incoming aggiornata.                |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` | Bindings engine non allineati agli ID correnti.        | dev-tooling                                               | Ticket **[TKT-01A-004]** aperto per revisione compatibilità engine + eventuale refactor schema (consultivo, nessuna esecuzione).                           |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`                        | Piano integrazione senza legame a patchset/ticket.     | coordinator + archivist                                   | Ticket **[TKT-01A-005]** aperto per collegare a patchset 01A o archiviare con presa in carico; allineato ai README incoming.                               |

**Stato ticket:** i ticket **[TKT-01A-001]** … **[TKT-01A-005]** sono aperti e registrati (owner confermati per 01A); ogni avanzamento verso 01B/01C va loggato con approvazione Master DD.

### Shortlist kickoff 01B/01C (pronta per handoff)

| Ticket            | Fase | Scope sintetico                                                                                    | Owner di dominio              | Rischi / dipendenze                                                                                                                   |
| ----------------- | ---- | -------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **[TKT-01B-001]** | 01B  | Matrice core/derived basata su gap 01A (input `incoming/` + `docs/incoming/`).                     | species-curator + coordinator | Dipende da chiusura 01A-001/002; rischio duplicati se i dataset ancestors non vengono sanificati prima del merge.                     |
| **[TKT-01B-002]** | 01B  | Allineamento trait sentience/enneagramma con trait canonici (handoff trait-curator).               | trait-curator                 | Richiede esito 01A-003 e licenze asset MBTI; possibile rinvio se binding engine (01A-004) risultano bloccanti.                        |
| **[TKT-01C-001]** | 01C  | Verifica tool/validatori parametri (`*_param_synergy*`, tabelle v8_3) con pipeline attuale.        | balancer + dev-tooling        | Dipende da 01A-003 chiuso; rischio alto se gli script legacy rompono gli hook engine (01A-004).                                       |
| **[TKT-01C-002]** | 01C  | Revisione hook/script engine (`hook_bindings.ts`, `engine_events.schema.json`) e compatibilità ID. | dev-tooling                   | Debito tecnico: validare contro engine corrente prima di attivare nuovi binding; blocco se 01B-001 chiede mapping eventi non coperti. |

**Ispezione `incoming/_holding` (2026-02-07):** cartella non presente; nessun batch da integrare o archiviare, in attesa di eventuali drop futuri da loggare prima dell’ingestione.

**Collegamento README:** la gap list 01A qui sopra è stata sincronizzata con `incoming/README.md` e `docs/incoming/README.md` per l’handoff verso 01B; ogni aggiornamento futuro deve aggiornare i tre documenti in parallelo e registrare l’esito nel log di attività.

## Changelog

- 2025-12-30: versione 0.5 – intestazione sincronizzata al report v0.5, mantenendo PATCHSET-01A e le tabelle di triage come baseline ufficiale.
- 2025-12-23: versione 0.3 – tabelle normalizzate e allineate alle linee guida di triage senza rinominare/spostare asset.
- 2025-12-17: versione 0.3 – design completato e perimetro documentazione confermato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance rafforzati (owner umano, branch dedicati, logging su `logs/agent_activity.md`).
- 2025-11-24: versione 0.3 – inventario arricchito con rischi e prossimi passi e prerequisiti PATCHSET-01A chiusi (archivist).
- 2025-11-24: primo inventario con proposte di stato e candidati legacy/archive_cold (archivist).
- 2025-11-23: versione 0.3 – ownership passata a Laura B. (01A) e inventario aggiornato con tabella per `incoming/` e `docs/incoming/`.
- 2025-11-23: struttura iniziale del catalogo incoming (archivist).
