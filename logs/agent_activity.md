# Agent activity log

# 2026-02-14 – Rerun validator 02A (report-only su patch/03A-core-derived)
- Step ID: 02A-RERUN-VALIDATOR-2026-02-14; ticket: **[TKT-02A-VALIDATOR]**; owner: Master DD (approvatore umano) con agente dev-tooling.
- Comandi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`; `python scripts/trait_audit.py --check`; `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`.
- Report: log console salvati in `reports/temp/patch-03A-core-derived/schema_only.log`, `reports/temp/patch-03A-core-derived/trait_audit.log`, `reports/temp/patch-03A-core-derived/trait_style.log`; JSON: `reports/temp/patch-03A-core-derived/trait_style.json`.
- Note: esecuzione in STRICT MODE senza modifiche ai workflow CI; esiti allineati alla baseline 02A (errori schema biomi, sinergie mancanti, lint i18n stile trait).

## 2026-02-13 – Runbook 02A→03B pubblicato
- Owner: Master DD (approvatore umano) con agente coordinator; supporto archivist/dev-tooling.
- Azioni: pubblicato `docs/planning/REF_PATCHSET_02A_TO_03AB_RUNBOOK.md` con sequenza operativa 02A (report-only) → 03A/03B, includendo log/approvals, freeze fase 3→4 e requisiti di backup/rollback.
- Prossimi passi: rieseguire validator 02A in report-only sul branch `patch/03A-core-derived`, registrare freeze approvato con snapshot/backup e avviare 03A/03B secondo runbook; nessuna modifica ai pack/incoming finché il freeze non è loggato.


## 2026-02-12 – RIAPERTURA-2026-02 (checkpoint 03A/03B dopo baseline 02A)
- Owner: Master DD (approvatore umano) con agente archivist; routing 03A/03B in STRICT MODE.
- File da aggiornare: `incoming/README.md`, `docs/incoming/README.md`, eventuali note in `docs/planning/REF_PLANNING_RIPRESA_2026.md` (stato gate e ticket/patchset collegati). Nessuna modifica ad altri pacchetti/dataset.
- Rischi: freeze soft su `incoming/**` e `docs/incoming/**` ancora in attesa di conferma; possibile desincronizzazione catalogo/README se nuove fonti arrivano senza ticket; 02A resta in modalità report-only → non abilitare rollout CI senza nuovo via libera Master DD.


## 2026-02-11 – Piano freeze fase 3→4 (03A/03B)
- Owner: Master DD (approvatore umano) con agente coordinator; supporto species/trait/balancer per 03A e archivist/asset-prep per 03B.
- Branch creati: `patch/03A-core-derived`, `patch/03B-incoming-cleanup` (dedicati a rollout 03A/03B, niente merge su `main`).
- Piano freeze: blocco merge non urgenti su core/derived/incoming durante 03A–03B; sblocco solo con validator 02A in pass (report-only), snapshot core/derived + backup incoming etichettato e approvazione Master DD registrata.
- Checklist di merge: 03A richiede log validator 02A + changelog/rollback script; transizione a 03B dopo backup incoming e redirect in bozza; uscita freeze con smoke 02A su link/redirect e via libera Master DD in log.
- Revert readiness: snapshot core/derived e backup incoming puntati per rollback; in caso di regressioni 02A sospendere 03B e ripristinare stato post-02A.

## 2026-02-10 – PATCHSET-02A baseline validator (report-only)
- Owner: Master DD (approvatore umano) con agente dev-tooling; ticket di tracciamento: **[TKT-02A-VALIDATOR]** (report-only).
- Avvio: esecuzione consultiva checklist 02A su branch `work` senza modifiche ai workflow CI (schema-only, trait audit, trait style check).
- Publishing report: baseline registrata in `docs/planning/02A_validator_report.md` con esiti negativi su schema biomi, sinergie mancanti e lint i18n; nessun artefatto committato.
- Richiesta: via libera di Master DD per procedere ai gate 03A usando questi esiti come baseline (validator in modalità report-only già pronti per ri-run in CI).

## 2026-02-09 – RIAPERTURA-2026-01A (registrazione preliminare)
- Owner: Master DD (approvatore umano) con agente archivist per il logging in STRICT MODE.
- File toccati: `logs/agent_activity.md` (registrazione ID passo prima di ulteriori modifiche; nessun altro file aggiornato).
- Rischi residui e coerenza README: nessun rischio tecnico rilevato; README invariati e coerenti.

## 2026-02-08 – triage incoming 01A con etichette legacy/storico
- Owner: Master DD (approvatore umano) con agente archivist per l’aggiornamento delle tabelle.
- File toccati: `incoming/README.md` (split baseline/unified con marcatura **LEGACY** vs **DA_INTEGRARE**, aggiunti `incoming/docs/*` e `incoming/pathfinder/bestiary1e_index.csv`), `docs/incoming/README.md` (stati ammessi allineati includendo **LEGACY**).
- Rischi e note: servono diff/checksum per scegliere la baseline dei pack legacy vs DA_INTEGRARE; `incoming/docs/*` va verificato contro `tools/` prima di eventuali rimozioni; l’indice Pathfinder richiede conferma licenza/mapping specie prima di uso; mantenere sincronizzati catalogo e README durante ulteriori triage.

# 2026-02-07 – RIAPERTURA-2026-01 follow-up (gap list 01A + readiness 01B/01C)
- Owner: Master DD (approvatore umano) con agente coordinator; supporto archivist (gap list), dev-tooling (inventario tooling/CI), species-curator (readiness 01B), trait-curator/balancer on-call.
- Decisioni freeze: nessun freeze attivo; la finestra 2025-11-24 → 2025-11-27 resta chiusa, nuova approvazione richiesta prima di bloccare `incoming/**` e `docs/incoming/**`.
- File toccati: `docs/planning/REF_INCOMING_CATALOG.md` (gap list 01A collegata ai README), `incoming/README.md` e `docs/incoming/README.md` (note su ticket/owner e handoff 01B), `docs/planning/REF_REPO_MIGRATION_PLAN.md` (nota readiness 01B/01C con agenti on-call e ticket attivi), `docs/planning/REF_TOOLING_AND_CI.md` (inventario workflow CI/script locale in modalità report-only).
- Rischi residui e azioni: freeze non riattivato (richiede approvazione Master DD prima di nuovi drop); README incoming potrebbero desincronizzarsi se si aggiungono batch senza loggare ticket/owner → aggiornare in coppia catalogo+README a ogni triage; inventario validator/workflow marcato “report-only” finché non viene approvato rollout 02A/01C → mantenere esecuzione consultiva e aprire ticket prima di abilitarlo.

## 2025-11-24 – piano operativo 01B e handoff 01A
- Owner: Master DD (approvatore umano) con agente coordinator; species-curator lead per 01B.
- Azioni: preparato in `REF_REPO_MIGRATION_PLAN` la checklist operativa 01B (kickoff, raccolta input, matrice preliminare senza patch, gate di uscita) con routing agenti e log richiesto; aggiunto in `REF_INCOMING_CATALOG` il pacchetto di handoff 01A→01B (gap list approvata, snapshot tabelle, README aggiornati, nota rischi) da loggare al momento della consegna.
- Prossimi passi immediati: consegnare il pacchetto di handoff a species-curator citando i ticket/owner in log; avviare 01B in STRICT MODE compilando la matrice core/derived preliminare con flag borderline e via libera Master DD prima della validazione finale/01C.

## 2025-11-24 – handoff 01A verso 01B/01C
- Owner: Master DD (approvatore umano) con agente coordinator; species-curator in arrivo per 01B.
- Azioni: chiuso il giro di controlli 01A e predisposto il passaggio di consegne verso 01B/01C, richiedendo di consegnare la gap list approvata con ticket/owner a species-curator prima del kickoff 01B; aggiornati i reference di pianificazione con il prossimo step operativo per 01B in STRICT MODE.
- Prossimi passi immediati: confermare la gap list approvata, loggare il kickoff 01B con ticket collegati e costruire la matrice core/derived preliminare (nessuna patch applicata) prima della validazione finale.

## 2025-11-24 – avvio freeze 01A approvato e gap list da ticketare
- Owner: Master DD (approvatore umano) con agente coordinator; supporto archivist/dev-tooling/asset-prep.
- Azioni: registrata approvazione del freeze 2025-11-24 → 2025-11-27 su `incoming/**` e `docs/incoming/**`; istruito l’uso di `incoming/_holding` per nuovi drop con log e nota di approvazione. Allineati i reference 01A/01B/01C per richiedere ticket e owner su ogni riga della gap list prima dello sblocco.
- Prossimi passi immediati: chiudere gap list 01A con ticket/owner per ogni voce, aggiornare `incoming/README.md` + `docs/incoming/README.md` per ogni batch approvato, loggare freeze e gap list completata prima di avviare 01B/01C.

## 2025-11-24 – controlli post-freeze e preparazione step successivo
- Owner: Master DD (approvatore umano) con agente coordinator.
- Azioni: eseguito `npm run test:docs-generator` (vitest) per verificare la suite del generatore di documentazione; tutti i test passati con warning attesi su fetch simulati/worker remoto in ambiente di test.
- Prossimi passi immediati: consolidare la gap list 01A assegnando ticket/owner e aggiornare i README incoming per i batch approvati, quindi loggare la chiusura del freeze e l’uscita verso 01B/01C.

## 2025-11-24 – test docs-generator e proposta freeze 01A
- Owner: Master DD (approvatore umano) con agente coordinator.
- Azioni: eseguito `npm run test:docs-generator` (vitest) per verificare il generatore di documentazione; test passati con warning di fetch simulato in ambiente di test. Inserita in `REF_INCOMING_CATALOG` la proposta di finestra freeze (2025-11-24 → 2025-11-27) e la gap list 01A in bozza con owner/ticket da confermare.
- Prossimi passi immediati: approvazione di Master DD per la finestra freeze e assegnazione owner/ticket sulla gap list; dopo approvazione, aggiornare `incoming/README.md` e `docs/incoming/README.md` per ogni batch triage e registrare avanzamenti.

## 2025-11-24 – piano multi-agente per avanzare 01A
- Owner: Master DD (approvatore umano) con agente coordinator; supporto archivist, dev-tooling, asset-prep.
- Azioni: definito routing automatico per 01A: coordinator guida freeze/gap list con Master DD; archivist gestisce aggiornamenti tabelle/README durante il freeze; dev-tooling fornisce verifiche checksum/script; asset-prep cura metadati/licenze per asset grafici/pack.
- Prossimi passi immediati: loggare ogni batch approvato (freeze, gap list, aggiornamento README) in `logs/agent_activity.md` con ticket/patchset collegati prima dello sblocco 01B/01C.

## 2025-11-26 – kickoff operativo 01A (freeze + gap list)
- Owner: Master DD (approvatore umano) con agente coordinator.
- Azioni: avviato il prossimo step 01A richiedendo finestra di freeze su `incoming/**` e `docs/incoming/**`, con registrazione obbligatoria nel log e in `REF_INCOMING_CATALOG`; preparata la gap list con owner e ticket come prerequisito per 01B/01C.
- Prossimi passi immediati: proporre/approvare la finestra di freeze, popolare gap list in `REF_INCOMING_CATALOG` con owner di dominio, aggiornare `incoming/README.md` e `docs/incoming/README.md` per ogni batch e loggare gli avanzamenti.

## 2025-11-24 – riallineamento gate 01A–01C
- Owner: Master DD (approvatore umano per 01A–01C) con agente coordinator.
- Azioni: standardizzate le intestazioni dei reference di pianificazione su Master DD e rafforzati i prerequisiti di freeze/gap list per 01A (approvazione e logging in STRICT MODE) prima di procedere con 01B–01C.
- Note: richiedere conferma esplicita di Master DD su freeze incoming 01A e gap list prima di avviare i lavori 01B/01C.

## 2026-02-06 – aggiornamento triage incoming (riferimento 01A)
- Owner catalogo: Laura B. (01A)
- Azioni eseguite: allineata la tabella `incoming/README.md` al catalogo PATCHSET-01A (aggiunti pack bioma, sentience, moduli, script e asset) e sincronizzata `docs/incoming/README.md` con le voci del catalogo docs.
- Note: nessuno spostamento/archiviazione effettuato; serve assegnare owner per `incoming/lavoro_da_classificare` e backlog doc.

## 2025-11-25 – conferma owner umano e avvio 01A–01C
- Owner: Master DD (approvatore umano) con agente coordinator in supporto.
- Azioni: registrata l’assunzione di ownership per PATCHSET-00 e l’autorizzazione a procedere con i passi 01A–01C in STRICT MODE; aggiornati i reference di pianificazione con il nuovo owner e gate di approvazione.
- Prossimi passi immediati: congelare nuovi ingressi durante il censimento 01A, pubblicare gap list e assegnatari su `REF_INCOMING_CATALOG`, poi validare matrice core/derived (01B) e inventario tooling/CI (01C) con log fase per fase.

## 2025-11-24 – ripresa roadmap patchset refactor
- Owner: agente coordinator (supporto archivist/dev-tooling per 01A–01C)
- Azioni: riletti `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN`, confermato stato PATCHSET-00 e sequenza 01A–03B; preparato riavvio in STRICT MODE.
- Prossimi passi immediati: confermare owner umano per 01A–01C, congelare nuovi ingressi in `incoming/**` durante il censimento, aggiornare `REF_INCOMING_CATALOG` con gap list e assegnatari, poi validare matrice core/derived (01B) e inventario tooling/CI (01C).

## 2026-02-07 – RIAPERTURA-2026-01 (riattivazione 01A–03B)
- Owner: Master DD (approvatore umano) con agente coordinator; archivist attivato per 01A; trait/species/balancer non ancora confermati on-call (richiesta di conferma inviata).
- Azioni: rilette `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN` senza variazioni ai gate 01A/01B/01C; creati branch dedicati `patchset/01A-catalogo-incoming`, `patchset/01B-core-vs-derived`, `patchset/01C-tooling-ci`, `patchset/02A-validator`, `patchset/03A-core-derived-patch`, `patchset/03B-pulizia-incoming` per evitare uso di `main`.
- Freeze incoming: finestra soft 2025-11-24 → 2025-11-27 in `REF_INCOMING_CATALOG` risultata scaduta; decisione attuale (in attesa di conferma Master DD): nessun freeze attivo, nuova approvazione richiesta prima di riattivare blocchi su `incoming/**` e `docs/incoming/**`.
- Ticketing: nessun ticket 01A–03B rintracciato nel repository; serve aprire/aggiornare ticket per gap list, readiness agenti e follow-up freeze.
- Prossimi passi: raccogliere conferma on-call trait/species/balancer, allineare README incoming al catalogo 01A dopo approvazione Master DD e registrare chiusura “RIAPERTURA-2026-01”.

## 2026-02-07 – Kickoff PATCHSET-00 e readiness 01A (coordinator)
- Kickoff 15' eseguito (scope PATCHSET-00) ribadendo i trigger Fase 1→3 da `REF_REPO_MIGRATION_PLAN` e confermando che il flusso attivo resta su 01A prima di avviare 01B/01C.
- Gap list 01A aggiornata in `REF_INCOMING_CATALOG` con ticket proposti **[TKT-01A-LDC]**, **[TKT-01A-ANC]**, **[TKT-01A-PARAM]**, **[TKT-01A-ENGINE]**, **[TKT-01A-DOCS]`; `incoming/_holding` non trovato (nessun batch da integrare/archiviare) e richiesto logging per futuri drop.
- Readiness confermate con ticket associati: species-curator per sanitizzazione dataset ancestors (**[TKT-01A-ANC]**), trait-curator per normalizzazione nomenclature aperte su `incoming/lavoro_da_classificare/*` (**[TKT-01A-LDC]**), dev-tooling per revisione binding/parametri (**[TKT-01A-ENGINE]**, **[TKT-01A-PARAM]**). Ticket da aprire/collegare in pipeline di triage.
- Stato ticket: le sigle **[TKT-01A-*]** sono placeholder proposti; apertura e tracciamento ufficiale richiedono conferma Master DD prima di passare a 01B/01C.
- README sincronizzati (`incoming/README.md`, `docs/incoming/README.md`) con nota sui ticket 01A proposti e sull'assenza di batch in `_holding`.
- Chiusura “RIAPERTURA-2026-01” registrata e passaggio operativo verso pipeline 01A in STRICT MODE, mantenendo freeze inattivo finché non arriva nuova approvazione.
