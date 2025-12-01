# REF_PLANNING_RIPRESA_2026 – Checkpoint rapido di riapertura

Versione: 0.2
Data: 2025-02-03
Owner: **Master DD (owner umano)** con agente archivist (routing automatico attivo)
Stato: NOTE OPERATIVE – checklist per riattivare PATCHSET-01A → 03B (timeline 2025)

> **Nota delta (timeline 2025):** tutte le milestone 2026 sono riallineate alla roadmap che chiude **domenica 07/12/2025** (formato DD/MM/AAAA). La tabella di mapping sottostante esplicita vecchia data → nuova data, con ticket e owner per ogni aggiornamento, per evitare l’uso involontario del calendario obsoleto.

| Vecchia data (2026)                      | Nuova data (2025)                                      | Ticket/Note      | Owner       |
| ---------------------------------------- | ------------------------------------------------------ | ---------------- | ----------- |
| 2026-01-02 (versione 0.1)                | 2025-02-03 (versione 0.2, kickoff riapertura)          | TKT-PLAN-01A-03B | Master DD   |
| 2026-02-12 (RIAPERTURA-2026-02)          | 2025-04-04 (checkpoint RIAPERTURA-2025-04 per 03A/03B) | TKT-03A-READY    | Archivist   |
| 2026-02-20 (audit bundle)                | 2025-04-25 (audit bundle riallineato ai gate 02A)      | TKT-02A-AUDIT    | Dev-tooling |
| 2026-05-01/02 (baseline schema-only 03A) | 2025-08-22/23 (baseline schema-only 03A, report-only)  | TKT-03A-BASELINE | Balancer    |
| 2026-05-02 (firma freeze 03B)            | 2025-08-24 (firma freeze 03B su branch dedicati)       | TKT-03B-CLEANUP  | Master DD   |
| 2026-05-08 (note post 03A/03B)           | 2025-08-29 (note post 03A/03B post-freeze)             | TKT-03B-POST     | Archivist   |
| 2026-07-08 → 2026-07-15 (freeze doc)     | 2025-10-06 → 2025-10-13 (freeze doc finale pre-uscita) | TKT-FREEZE-OCT25 | Coordinator |
| 2026-07-10 (nota freeze)                 | 2025-10-08 (nota freeze in corso)                      | TKT-FREEZE-OCT25 | Coordinator |

Scope della ripresa: riattivare i flussi preparatori su incoming/01A–03B senza introdurre nuove fonti dati o variazioni di scope rispetto ai reference già approvati.

---

## Obiettivi

- Definire un checkpoint compatto per riprendere il lavoro sui patchset 01A–03B senza riaprire l’intero ciclo di design.
- Allineare rapidamente owner, branch e log in `logs/agent_activity.md` prima di toccare dati o pack.
- Collegare le attività di riapertura ai riferimenti esistenti (`REF_REPO_SCOPE`, `REF_REPO_MIGRATION_PLAN`, `REF_INCOMING_CATALOG`).
- Ribadire la nuova timeline 2025 con chiusura 03B al **07/12/2025** e milestone aggiornate nella tabella di mapping.

## Prerequisiti lampo (da confermare entro 24h)

- **Owner e agenti:** Master DD conferma disponibilità; coordinator e archivist attivi per il kickoff; trait/species/balancer reperibili on-call per i gate 01A–03B rebaselinati nel 2025.
- **Branch di lavoro:** creare/aggiornare branch dedicati per 01A–03B; nessun commit diretto su `main`.
- **Freeze:** il freeze documentale finale per incoming/docs è pianificato **06/10/2025 → 13/10/2025**; confermare attivazione con Master DD prima di aprire nuovi drop.
- **Log:** verificare ultima voce in `logs/agent_activity.md`; aprire nuova entry con ID **RIAPERTURA-2025-02** prima di toccare tabelle e usare l’ID per ogni gate 01A–03B.
- **Allineamento reference:** rileggere `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN` per assicurare che 01A/01B/01C seguano i trigger 2025 già approvati e che 02A → 03B usino i nuovi checkpoint.
- **Stato ticketing:** riallineare i ticket 01A–03B ai codici 2025 (TKT-PLAN-01A-03B, TKT-03A-READY, TKT-03A-BASELINE, TKT-03B-CLEANUP, TKT-FREEZE-OCT25) chiudendo i riferimenti 2026 superati.
- **Aggiornamento 2025-04-04:** aperto checkpoint **RIAPERTURA-2025-04** (patchset 03A/03B) dopo esito baseline 02A in modalità report-only; freeze soft su `incoming/**` e `docs/incoming/**` ancora da confermare con Master DD, README incoming/docs allineati e tracciati nel log.
- **Aggiornamento 2025-08-29:** rerun 02A schema-only 22/08/2025–23/08/2025 loggati in `reports/audit/2025-04-25_audit_bundle.md` e usati come base per i gate 03A/03B; cleanup 03B chiuso con firma Master DD (log 24/08/2025) e freeze documentale dismesso in attesa della finestra di ottobre.
- **Aggiornamento 2025-10-08:** finestra di freeze documentale **06/10/2025 → 13/10/2025** registrata su log **RIAPERTURA-2025-02**; readiness 01B/01C marcata **report-only** su branch `patch/01B-core-derived-matrix` e `patch/01C-tooling-ci-catalog` con ticket attivi **TKT-01B-001/002** e **TKT-01C-001/002** riallineati a `REF_REPO_MIGRATION_PLAN`.

## Checklist di riapertura (48h)

1. **Kickoff rapido (coordinator):** convocare 15’ per ribadire scope PATCHSET-00 e i trigger fase 1→2→3 (`REF_REPO_MIGRATION_PLAN`) con milestone aggiornate al 2025.
2. **Stato catalogo incoming (archivist):** rileggere tabelle 01A e segnare gap list aperte; niente spostamenti file.
3. **Readiness owner per 01B/01C:** raccogliere conferma species-curator/trait-curator/dev-tooling su disponibilità e ticket aperti usando le code 2025.
4. **Validare freeze + holding:** controllare se esistono nuovi drop in `incoming/_holding`; loggare decisione (integrare o archiviare) senza muovere file.
5. **Verificare unfreeze + sync log/README:** confermare lo sblocco della finestra **06/10/2025 → 13/10/2025**, aggiornare `logs/agent_activity.md` (entry **RIAPERTURA-2025-02**) e sincronizzare `incoming/README.md` e `docs/incoming/README.md` con lo stato post-freeze.
6. **Aggiornare README mirati:** se emergono variazioni, sincronizzare solo `incoming/README.md` e `docs/incoming/README.md` con note di stato e ticket 2025.
7. **Gate di uscita riapertura:** una volta chiusi i punti 1–6, loggare in `logs/agent_activity.md` “RIAPERTURA-2025-02 chiusa” e passare alla pipeline 01A.

### Note operative 2025-08-29 (post 03A/03B)

- Baseline validator: usare i log schema-only 22/08/2025–23/08/2025 (report-only) e i mirror 03B in `reports/temp/patch-03B-incoming-cleanup/2025-04-25/` come riferimento unico per il prossimo ciclo.
- Freeze: la finestra 03B documentale è stata chiusa con firma Master DD al 24/08/2025; prima di nuovi drop aprire un nuovo freeze (template in `logs/agent_activity.md`) o aderire a quello di ottobre.
- Documentazione: README `incoming/` e `docs/incoming/` sincronizzati sullo stato post-freeze; mantenere la coerenza con `reports/audit/2025-04-25_audit_bundle.md` per redirect/backup.
- Azione successiva: richiesta conferma Master DD per riaprire il ciclo con nuovi batch o per mantenere lo stato di sola consultazione fino al freeze di ottobre.

### Nota operativa 2025-10-08 (freeze ottobre 2025)

- Finestra freeze **06/10/2025 → 13/10/2025** attiva per incoming/docs con stato loggato in `logs/agent_activity.md` (**RIAPERTURA-2025-02**).
- Readiness 01B/01C confermata in modalità **report-only** su `patch/01B-core-derived-matrix` e `patch/01C-tooling-ci-catalog`, legata ai ticket **TKT-01B-001/002** e **TKT-01C-001/002**.
- Allineamento a `REF_REPO_MIGRATION_PLAN`: seguire i trigger 01B/01C → 02A usando i branch dedicati; nessuna modifica ai pack finché il freeze non viene sbloccato e annotato nel log, con obiettivo di uscita finale **07/12/2025**.

### Ruoli e responsabilità durante la riapertura

- **Owner (Master DD):** approva freeze/unfreeze, sblocca gate 1–6, valida note di rischio.
- **Coordinator:** governa kickoff, conferma routing degli agenti, mantiene la timeline.
- **Archivist:** fotografa stato `incoming/01A`, registra gap list, prepara update README.
- **Species/Trait-curator:** verificano readiness 01B/01C e validano matrice core/derived preliminare.
- **Dev-tooling:** prepara inventario workflow CI/script (report-only) e propone next step di automazione.

## Sequenza operativa express (dopo checklist)

- **01A (archivist, supporto coordinator/asset-prep):** riprendere triage tabelle con label DA_INTEGRARE/LEGACY/STORICO; aggiornare note di rischio.
- **01B (species-curator + trait-curator):** preparare matrice core/derived preliminare usando la gap list aggiornata; nessuna patch ai pack.
- **01C (dev-tooling):** inventario workflow CI + script locali con input/output; predisporre modalità report-only per validator futuri.

Deliverable minimi post-checklist:

- **Log riapertura** completo in `logs/agent_activity.md` (ID, owner, decisioni freeze, file toccati).
- **Gap list 01A** aggiornata e referenziata dai README mirati.
- **Nota di readiness 01B/01C** con elenco agenti on-call e ticket in carico.
- **Inventario tool CI/script** con stato “report-only” e puntamento a repository/script.

## Gate, log e comunicazioni

- Ogni micro-step deve avere log sintetico (ID, owner, file toccati, rischio) in `logs/agent_activity.md`.
- Decisioni su freeze o archiviazione devono citare il ticket/patchset e l’approvazione Master DD.
- Se si rilevano conflitti tra documenti di riferimento, fermarsi e aprire issue a coordinator prima di proseguire.
- Aggiornare i README solo dopo aver loggato l’esito del gate di riapertura, mantenendo coerenza con le note di freeze e con l’obiettivo di chiusura 03B al **07/12/2025**.

## Note rapide di rischio

- Riattivare patchset senza confermare il freeze può introdurre ingressi non tracciati → eseguire sempre controllo su `_holding`.
- Mancata sincronizzazione dei README può rendere invalida la gap list 01A → priorità alta agli aggiornamenti mirati post-triage.
- Evitare patch o spostamenti file fino alla chiusura del gate di riapertura; questa nota è solo per preparare la ripartenza.
- Mancanza di inventario CI/script può rallentare la pipeline 01C → produrre almeno un elenco “report-only” prima di riaprire validator.

---

## Changelog

- 2026-01-02: versione 0.1 – checkpoint di riapertura per riprendere i patchset 01A–03B senza modificare lo scope di riferimento.
- 2025-02-03: versione 0.2 – riallineo timeline ai gate 2025 con chiusura al 07/12/2025, mapping completo e aggiornamento freeze/log/ticket.
