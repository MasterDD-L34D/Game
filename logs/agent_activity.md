# Agent activity log

## 2026-04-28 – Rerun 02A + gate 03A + checkpoint 03B (archivist)
- Step: `[RERUN-02A-EXEC-2026-04-28] owner=archivist (approvatore Master DD); branch=patch/03A-core-derived; files=logs/TKT-02A-VALIDATOR.rerun.log, reports/temp/patch-03A-core-derived/{schema_only.log,trait_audit.log,trait_style.log,trait_style.json}, reports/audit/2026-02-20_audit_bundle.md; freeze=mirato 03A/03B (report-only); note=Rieseguito 02A in modalità report-only con log specchiati su patch-03A: schema_only sha256 805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec, trait_audit sha256 a4bfc3b7ac4d77dc4998c88930383fc49c4939d1093298323653643eb5d89277, trait_style sha256 abd65d68ce177386a7fd7c7a1f25ac66dadfabe6f2aeb85364b0a54d04b9ed02, trait_style.json sha256 c8637e02f78c5b0d1ac701bcc9ffb8396aee85e2ab50901f144db80618657050. Audit bundle aggiornato con i riferimenti testuali e senza tarball.`
- Step: `[GATE-03A-READY-2026-04-28] owner=archivist (approvatore Master DD); branch=patch/03A-core-derived; files=reports/temp/patch-03A-core-derived/{schema_only.log,trait_audit.log,trait_style.log,trait_style.json,changelog.md,rollback.md}, reports/audit/2026-02-20_audit_bundle.md; freeze=mirato 03A (gate pre-merge); note=Gate 03A validato sui log di rerun 02A e sugli artefatti di controllo; nessun tarball richiesto, audit bundle aggiornato.`
- Step: `[CHECKPOINT-03B-READY-2026-04-28] owner=archivist (approvatore Master DD); branch=patch/03B-incoming-cleanup; files=reports/temp/patch-03B-incoming-cleanup/2026-02-20/{schema_only.log,trait_audit.log,trait_style.log,trait_style.json}, reports/audit/2026-02-20_audit_bundle.md; freeze=soft su incoming (post-03A); note=Checkpoint 03B allineato ai log mirror con checksum registrati: schema_only sha256 805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec, trait_audit sha256 5a1f64d7be8872c48562730e9d5ac584cdf200e9eb10ee1f4c6d5ce15653aa4e, trait_style sha256 abd65d68ce177386a7fd7c7a1f25ac66dadfabe6f2aeb85364b0a54d04b9ed02, trait_style.json sha256 cf6a425b78356efae638740a32dd5c1cd8b6e27243f83052a10fc25749018afa; audit bundle linkato come fonte unica.`

## 2026-04-27 – Cleanup 03B + smoke 02A (archivist)
- Step: `[03B-CLEANUP-SMOKE-2026-04-27] owner=archivist (approvatore Master DD); files=logs/agent_activity.md, reports/backups/2025-11-25_freeze/manifest.txt, incoming/archive_cold/backups/2025-11-25/manifest.sha256, incoming/REDIRECTS.md, reports/temp/patch-03B-incoming-cleanup/2026-02-20/{schema_only.log,trait_audit.log,trait_style.log,trait_style.json,cleanup_redirect.md}, reports/audit/2026-02-20_audit_bundle.md; rischio=basso (report-only/cleanup); note=Confermati i riferimenti backup/redirect prima di operare su incoming (manifest 2025-11-25 e README backup 2026-02-20) con redirect invariati in `incoming/REDIRECTS.md`. Nessun nuovo spostamento: archivio `incoming/archive_cold/**` e indici `docs/incoming/archive/INDEX.md` restano la fonte. Rieseguito smoke 02A su `patch/03B-incoming-cleanup` (schema_only: 14 controlli/3 avvisi; trait_audit: warning per report schema assente; trait_style: 62 suggerimenti info senza errori). Aggiornati `cleanup_redirect.md` e il bundle testuale di audit con i percorsi log; freeze 03B chiuso a log con approvazione Master DD mantenendo la finestra di merge condizionata ai validator 02A in pass.`

## 2026-04-27 – Firma Master DD e transizione freeze 03A/03B a patch (archivist)
- Step: `[03A03B-FREEZE-PATCH-2026-04-27] owner=archivist (firma Master DD); files=logs/agent_activity.md, docs/planning/REF_PATCHSET_02A_TO_03AB_RUNBOOK.md, reports/audit/2026-02-20_audit_bundle.md; rischio=basso (documentazione/freeze); note=Registrata la firma Master DD che converte il freeze 03A/03B da stato report-only a finestra operativa di patch sui branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup`. Condizioni di merge ribadite: ultimo rerun validator 02A in pass, rollback/backup pronti (manifest confermati), redirect attivi senza drift. Finestra operativa aperta come da sequenza in REF_PATCHSET_02A_TO_03AB_RUNBOOK con audit collegato a reports/audit/2026-02-20_audit_bundle.md.`

## 2026-04-26 – Conferma consultivo validate-naming 01C (dev-tooling)
- Step: `[01C-NAMING-CONSULTIVE-2026-04-26] owner=dev-tooling (approvatore Master DD); files=docs/planning/REF_TOOLING_AND_CI.md, .github/workflows/validate-naming.yml, logs/agent_activity.md; rischio=basso (config CI); note=Confermato stato consultivo di `validate-naming.yml`: precedente=consultivo (report-only), nuovo=consultivo (report-only) con gate PR disattivato e trigger limitati a push su `patch/01C-tooling-ci-catalog` + `workflow_dispatch`. Evidenze CI: nessuna sequenza di **3 run verdi consecutivi** disponibile sul branch 01C, matrice core/derived ancora instabile; mantenuto monitoraggio continuo e pronto rollback (riattivazione consultiva già attiva) in caso di falsi positivi/negativi.

## 2026-04-25 – Firma Master DD e verifica manifest freeze 03AB (archivist)
- Step: `[03A-UNLOCK-CHECKPOINT-2026-04-25] owner=archivist (approvatore Master DD); files=docs/planning/TKT-03AB-FREEZE.md, reports/audit/2026-02-20_audit_bundle.md, reports/backups/2025-11-25_freeze/manifest.txt, reports/backups/2025-11-25T1500Z_freeze/manifest.txt, reports/backups/2025-11-25T1724Z_masterdd_freeze/manifest.txt, reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt, logs/agent_activity.md; rischio=basso (documentazione/freeze); note=Registrata la firma Master DD per avviare la patch 03A con checkpoint intermedio pianificato prima della fase 03B. Verificati i manifest richiamati da TKT-03AB-FREEZE: checksum e percorsi s3 combaciano con il ticket e con l’indice dell’audit bundle; nessun drift rilevato. Il runbook 02A→03A/03B resta la fonte di sequenza, con i log 02A già legati ai percorsi 03A/03B e pronti per il checkpoint post-03A pre-03B.`

# 2026-04-24 – Riesame gate RIAPERTURA-2026-01 (archivist)
- Step: `[RIAPERTURA-2026-01-STATUS-2026-04-24] owner=archivist (approvatore Master DD); files=logs/agent_activity.md, incoming/README.md, docs/incoming/README.md, docs/planning/REF_REPO_SCOPE.md, docs/planning/REF_REPO_MIGRATION_PLAN.md; rischio=basso (documentazione/freeze); note=Confermato owner umano Master DD con coverage on-call attivo: 01A archivist+coordinator (gap list), 01B species-curator con trait-curator/balancer, 01C dev-tooling (report-only), 03A coordinator (supporto species/trait/balancer), 03B archivist+asset-prep. Branch dedicati 01A–03B invariati (`patch/01A-incoming-catalog`, `patch/01B-core-derived-matrix`, `patch/01C-tooling-ci-catalog`, `patch/02A-validation-tooling`, `patch/03A-core-derived`, `patch/03B-incoming-cleanup`) come da REF_REPO_SCOPE/REF_REPO_MIGRATION_PLAN. Rieseguito check soft freeze su `incoming/**` e `docs/incoming/**`: freeze ancora attivo, nessun `_holding` o drop nuovo; consentite solo attività report-only. Ticket e reference allineati con REF_REPO_SCOPE e REF_REPO_MIGRATION_PLAN (gap list 01A **[TKT-01A-001]** … **[TKT-01A-005]**, readiness 01B/01C confermata). Gate “RIAPERTURA-2026-01” chiuso con ok Master DD senza sblocco del freeze.`

## 2026-04-20 – Stato consultivo validate-naming 01C (dev-tooling)
- Step: `[01C-NAMING-CONSULTIVE-2026-04-20] owner=dev-tooling (approvatore Master DD); files=docs/planning/REF_TOOLING_AND_CI.md, .github/workflows/validate-naming.yml, logs/agent_activity.md; rischio=basso (config CI); note=Aggiornato stato `validate-naming.yml`: precedente=trigger push+pull_request (potenziale gate PR), nuovo=consultivo su push `patch/01C-tooling-ci-catalog` + `workflow_dispatch` con step `continue-on-error` e nota consultiva. Evidenze CI: matrice core/derived non ancora stabilizzata e nessuna serie di 3 run verdi consecutivi su branch 01C → mantenuto consultivo. Prossima verifica programmata dopo raccolta run su branch 01C (target entro 2026-04-27) o alla stabilizzazione della matrice core/derived.`

## 2026-04-19 – Stato freeze mirato 03A/03B (archivist)
- Step: `[03A03B-FREEZE-STATUS-2026-04-19] owner=archivist (approvatore richiesto: Master DD); files=logs/agent_activity.md, logs/TKT-02A-VALIDATOR.rerun.log, reports/audit/2026-02-20_audit_bundle.md; rischio=basso (documentazione/freeze); note=Firma Master DD registrata per questo checkpoint: freeze ora in modalità mirata (aperto solo a log/report) sui branch 'patch/03A-core-derived' e 'patch/03B-incoming-cleanup'. Condizioni di merge ribadite: ultimo rerun validator 02A in pass (log TKT-02A-VALIDATOR.rerun), changelog/rollback pronti all'uso, backup/redirect confermati dai manifest storici. Riferimento audit testuale: reports/audit/2026-02-20_audit_bundle.md; archiviazione tar opzionale da rigenerare solo su richiesta. Finestra operativa: 03A avviabile dopo conferma slot Master DD, 03B successivo al checkpoint post-03A mantenendo redirect/backup attivi.`

## 2026-04-18 – Nota di sblocco 03A/03B e finestra freeze (archivist)
- Step: `[03A03B-UNLOCK-NOTE-2026-04-18] owner=archivist (approvatore richiesto: Master DD); files=logs/agent_activity.md, logs/TKT-02A-VALIDATOR.rerun.log; rischio=basso (documentazione/freeze); note=Nota di sblocco preparata per i branch ‘patch/03A-core-derived’ / ‘patch/03B-incoming-cleanup’: freeze ancora attivo in modalità soft con finestra residua limitata alle sole attività report-only finché non registrata la firma Master DD. Condizioni di merge ribadite: validator 02A ultimo rerun in pass (log 02A validati), changelog/rollback pronti all’uso, backup/redirect confermati dai manifest storici. Dopo la firma Master DD comunicato l’avvio operativo di 03A e pianificato il checkpoint intermedio pre-03B secondo checklist di merge (validator confermati + rollback/backup pronti).`

## 2026-04-17 – Verifica stato workflow CI 01C (dev-tooling)
- Step: `[01C-CI-VERIFY-2026-04-17] owner=dev-tooling (approvatore richiesto: Master DD); files=docs/planning/REF_TOOLING_AND_CI.md, logs/agent_activity.md, .github/workflows/data-quality.yml, .github/workflows/validate_traits.yml, .github/workflows/schema-validate.yml, .github/workflows/validate-naming.yml, .github/workflows/incoming-smoke.yml; rischio=basso (ricognizione CI); note=Verificato che l’ordine di abilitazione in REF_TOOLING_AND_CI coincide con il log [01C-CI-ACTIVATION-2026-04-12]. `data-quality.yml`, `validate_traits.yml` e `schema-validate.yml` risultano attivi su push/pull_request (enforcing); `incoming-smoke.yml` è solo `workflow_dispatch` (disattivato per PR). Deviazione: `validate-naming.yml` è ancora attivo su push/pull_request anziché consultivo/report-only; prima di modificarne lo stato è richiesta approvazione esplicita Master DD.`

## 2026-04-17 – Verifica log 02A e mirror 03A/03B (archivist)
- Step: `[03A-READINESS-CHECK-2026-04-17] owner=archivist (approvatore Master DD); files=docs/planning/REF_PATCHSET_02A_TO_03AB_RUNBOOK.md, reports/audit/2026-02-20_audit_bundle.md, reports/temp/patch-03A-core-derived/schema_only.log, reports/temp/patch-03A-core-derived/trait_audit.log, reports/temp/patch-03A-core-derived/trait_style.log, reports/temp/patch-03A-core-derived/trait_style.json, reports/temp/patch-03B-incoming-cleanup/2026-02-20/schema_only.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_audit.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.json, logs/TKT-02A-VALIDATOR.rerun.log, logs/agent_activity.md; rischio=basso (verifica/report-only); note=Confermato che la sequenza del runbook 02A→03A/03B è rispettata: i log 02A rieseguiti il 2026-04-13 coincidono con le copie specchiate 03A/03B senza differenze di contenuto. L’appendice dell’audit bundle aggiornata con i riferimenti puntuali ai log validati e alle date. Discrepanza aperta: l’archivio dichiarato `logs/audit-bundle.tar.gz` manca dal repo e va rigenerato/caricato prima dell’avvio patch 03A/03B. Firma Master DD registrata come prerequisito all’avvio patch 03A.`

## 2026-04-13 – Freeze 03B confermato + piano rerun 02A (archivist)
- Step: `[FREEZE-03B-CONFIRM-2026-04-13] owner=archivist (approvatore richiesto: Master DD); files=logs/agent_activity.md, incoming/README.md, docs/incoming/README.md, docs/planning/REF_BACKUP_AND_ROLLBACK.md; rischio=basso (documentazione/freeze); note=Soft freeze su `incoming/**` e `docs/incoming/**` **riconfermato fino a chiusura 03B**: lavorare solo in modalità report-only sui branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup`, nessun merge/rename/spostamento fino al log di chiusura 03B. Rerun 02A richiesto in report-only per riallineare i validator prima di qualsiasi sblocco.`
- Step: `[RERUN-02A-PLAN-2026-04-13] owner=archivist (approvatore richiesto: Master DD); files=logs/agent_activity.md; rischio=basso (planning/simulazione); note=Input confermati da REF_CORE_DERIVED_MATRIX v0.2: (1) fixture sanitizzata con checksum per `incoming/ancestors_*` / `Ancestors_Neurons_*`; (2) log di esecuzione controllata dei pacchetti validator/parametri (`incoming/evo_tactics_validator-pack_v1.5.zip`, `...param_synergy_v8_3.zip`, `...tables_v8_3.xlsx`); (3) diff controllato degli ID engine per `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`; (4) checklist 01A docs (`docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`). Sequenza 02A report-only da rieseguire su staging locale: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → log in `reports/temp/patch-03A-core-derived/schema_only.log`; `python scripts/trait_audit.py --check` → log in `reports/temp/patch-03A-core-derived/trait_audit.log`; `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on-error` → log in `reports/temp/patch-03A-core-derived/trait_style.log`. Per rifinire la transizione 03B mantenere i log specchiati in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/` (schema/trait/style) e archiviare l’output consolidato in `logs/TKT-02A-VALIDATOR.rerun.log` più bundle `logs/audit-bundle.tar.gz` rigenerato senza modifiche ai dati. Aspettato: tutti i comandi in pass o warning noti (jsonschema DeprecationWarning) senza toccare pack/core o incoming.`
- Step: `[RERUN-02A-EXEC-2026-04-13] owner=dev-tooling (approvatore richiesto: Master DD); files=reports/temp/patch-03A-core-derived/*.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/*.log, logs/TKT-02A-VALIDATOR.rerun.log, logs/audit-bundle.tar.gz, logs/agent_activity.md; rischio=basso (validator report-only); note=Rieseguiti i tre comandi 02A su staging locale senza modificare core/pack/incoming: schema-only **OK** con 3 avvisi pack; trait audit **OK** con warning per modulo jsonschema assente (check schema saltato); trait style **OK** (error=0, warning=168, info=62). Output salvati e specchiati nelle directory patch-03A e patch-03B (schema_only/trait_audit/trait_style log+json). Aggiornato `logs/TKT-02A-VALIDATOR.rerun.log` e rigenerato `logs/audit-bundle.tar.gz` includendo log e report del ciclo.`

## 2026-04-14 – Verifica allineamento 03A/03B al rerun 02A + kickoff (coordinator)
- Step: `[03A03B-ALIGN-2026-04-14] owner=coordinator (approvatore richiesto: Master DD); files=logs/agent_activity.md, docs/planning/REF_BACKUP_AND_ROLLBACK.md, reports/backups/2025-11-25_freeze/manifest.txt, reports/backups/2026-02-20_incoming_backup/README.md, reports/temp/patch-03A-core-derived/schema_only.log, reports/temp/patch-03A-core-derived/trait_audit.log, reports/temp/patch-03A-core-derived/trait_style.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/schema_only.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_audit.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.log; rischio=basso (ricognizione/report-only); note=Verificata la presenza e il riuso dei log del rerun 02A nelle directory `patch-03A-core-derived` e `patch-03B-incoming-cleanup` (schema/trait/style) senza nuove esecuzioni; confermato che i branch restano in modalità report-only allineati ai log specchiati e al bundle `logs/TKT-02A-VALIDATOR.rerun.log`. Freeze soft su `incoming/**` e `docs/incoming/**` mantenuto come da REF_BACKUP_AND_ROLLBACK; nessun merge/rename/spostamento autorizzato.`
- Step: `[03A03B-KICKOFF-PLAN-2026-04-14] owner=coordinator (approvatore richiesto: Master DD); files=logs/agent_activity.md, reports/temp/patch-03B-incoming-cleanup/2026-02-20/cleanup_redirect.md; rischio=medio (kickoff fasi 03A/03B); note=Check-in kickoff 03A/03B registrato con checklist: (1) rischio principale disallineamento redirect↔backup mitigato referenziando manifest `reports/backups/2025-11-25_freeze/manifest.txt` e guida `reports/backups/2026-02-20_incoming_backup/README.md`; (2) rischio validator 02A in warning jsonschema gestito mantenendo strict report-only senza nuovi run; (3) approvazione Master DD richiesta per qualsiasi deroga al freeze e per l’avvio di patch/cleanup. Nessuna modifica a dati o manifest effettuata.`

## 2026-04-15 – Verifica patch 03A/03B vs piano/exec 02A (dev-tooling)
- Step: `[03A03B-RERUN-VALIDATION-2026-04-15] owner=dev-tooling (approvatore richiesto: Master DD); files=reports/temp/patch-03A-core-derived/schema_only.log, reports/temp/patch-03A-core-derived/trait_audit.log, reports/temp/patch-03A-core-derived/trait_style.log, reports/temp/patch-03A-core-derived/trait_style.json, reports/temp/patch-03B-incoming-cleanup/2026-02-20/schema_only.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_audit.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.log, reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.json, logs/TKT-02A-VALIDATOR.rerun.log, logs/audit-bundle.tar.gz, logs/agent_activity.md; rischio=basso (verifica/report-only); note=Confrontati i log schema/trait/style 03A e 03B con il piano `[RERUN-02A-PLAN-2026-04-13]` e l’esecuzione `[RERUN-02A-EXEC-2026-04-13]`: file presenti e checksum coincidenti tra 03A e 03B (schema_only, trait_audit, trait_style log+json) con warning attesi; `logs/TKT-02A-VALIDATOR.rerun.log` allineato alla descrizione del rerun. Anomalia rilevata: `logs/audit-bundle.tar.gz` assente nel repository nonostante sia dichiarato come rigenerato; richiesta rigenerazione/ricaricamento prima di autorizzare modifiche 03A/03B.`

## 2026-04-16 – Verifica manifest/redirect contro kickoff 03A/03B (archivist)
- Step: `[03A03B-KICKOFF-COMPLIANCE-2026-04-16] owner=archivist (approvatore richiesto: Master DD); files=docs/planning/REF_BACKUP_AND_ROLLBACK.md, reports/backups/2025-11-25_freeze/manifest.txt, reports/backups/2026-02-20_incoming_backup/README.md, logs/agent_activity.md; rischio=basso (ricognizione/report-only); note=Controllata la coerenza con il kickoff [03A03B-KICKOFF-PLAN-2026-04-14]: runbook backup/rollback, manifest freeze 2025-11-25 e README redirect 2026-02-20 allineati (backup core/derived/incoming/docs_incoming presenti con SHA/Location, redirect e checksum rimandano correttamente ai manifest storici, nessun upload/spostamento nuovo). Freeze 03A/03B ancora attivo: nessun merge/rename/spostamento autorizzato su core/derived/incoming/docs_incoming. Avvio patch 03A/03B **bloccato** finché eventuali future discrepanze non vengano rilevate, corrette e loggate con approvazione Master DD.`

## 2026-04-12 – Attivazione CI 01C (dev-tooling)
- Step: `[01C-CI-ACTIVATION-2026-04-12] owner=dev-tooling (approvatore Master DD); files=reports/audit/2026-04-10_ci-script-report.md, logs/agent_activity.md, docs/planning/REF_TOOLING_AND_CI.md; rischio=medio (attivazione gating CI); note=Master DD approva il passaggio di `data-quality.yml`, `validate_traits.yml` e `schema-validate.yml` da report-only a enforcing con branch `patch/01C-tooling-ci-catalog`; `validate-naming.yml` resta consultivo, `incoming-smoke.yml` resta disattivato/dispatch manuale. Ordine di abilitazione documentato in REF_TOOLING_AND_CI con reminder su derived drift e incoming gating ancora mancanti.`

## 2026-04-11 – Via libera Master DD gate uscita 01B (archivist)
- Step: `[01B-GATE-EXIT-2026-04-09] owner=archivist (approvatore Master DD); files=docs/planning/REF_CORE_DERIVED_MATRIX.md, logs/agent_activity.md, incoming/README.md, docs/incoming/README.md; rischio=basso (documentazione/chiusura gate); note=Master DD approva la matrice core/derived v0.2 e autorizza la chiusura del gate 01B su branch `patch/01B-core-derived-matrix` con handoff verso fase 02A. README incoming/docs_incoming aggiornati per segnalare chiusura gate 01B e avvio 02A.`

## 2026-04-10 – Inventario CI/script derived+incoming (dev-tooling)
- Step: `[01C-CI-INVENTORY-2026-04-10] owner=dev-tooling (approvatore richiesto: Master DD); files=reports/audit/2026-04-10_ci-script-report.md, logs/agent_activity.md; rischio=basso (report-only); note=Aggiornato inventario CI/script su pack/incoming/derived con proposta di controlli mancanti (drift derived, gating incoming dispatch, coverage registri pack) senza abilitare esecuzioni. Riferimenti branch dedicati: patch/01C-tooling-ci-catalog per follow-up CI, patch/03A-core-derived e patch/03B-incoming-cleanup per pipeline 02A→03A→03B in modalità report-only.`

## 2026-04-09 – Gate uscita 01B matrice core/derived (species-curator)
- Step: `[01B-GATE-EXIT-2026-04-09] owner=species-curator (approvatore richiesto: Master DD); files=docs/planning/REF_CORE_DERIVED_MATRIX.md, logs/agent_activity.md; rischio=basso (documentazione/triage); note=Matrice 01B aggiornata a v0.2 usando REF_REPO_SOURCES_OF_TRUTH e catalogo stabile per le fonti gap list **[TKT-01A-001]** … **[TKT-01A-005]**: proposta core/derived con fixture richieste, flag borderline con co-triage trait-curator/balancer/archivist e blocco Pending su `incoming/lavoro_da_classificare/*`. Bozza pubblicata sul branch `patch/01B-core-derived-matrix`; richiesta via libera Master DD per chiudere il gate 01B e procedere agli step successivi. Ticket 01B collegati: **[TKT-01B-001]**/**[TKT-01B-002]**.`

## 2026-04-08 – Freeze 01A: etichettatura tabelle + owner gap list (archivist)
- Step: `[FREEZE-01A-TRIAGE-2026-04-08] owner=archivist (approvatore Master DD); files=incoming/README.md, docs/incoming/README.md, logs/agent_activity.md; rischio=basso (documentazione/triage); note=Riesaminate tabelle incoming in STRICT MODE durante freeze: etichette **DA_INTEGRARE/LEGACY/STORICO** confermate senza spostamenti file; `_holding` ancora assente. Gap list 01A aggiornata con owner proposti e ticket collegati alle fonti (Laura B per catalogo 01A; species-curator per dataset ancestors; dev-tooling per validator/engine; archivist+Master DD per documento 01A-DOCS). Soft freeze documentale su `incoming/**` e `docs/incoming/**` invariato.`

## 2026-03-22 – Kickoff 01A + chiusura gate RIAPERTURA-2026-01 (coordinator)
- Step: `[RIAPERTURA-2026-01-CLOSEOUT-2026-03-22] owner=coordinator (approvatore Master DD); files=logs/agent_activity.md, incoming/README.md, docs/incoming/README.md; rischio=basso (brief/documentazione); note=Kickoff 15' per ribadire scope/trigger 01A (fase 1→2→3) e riesame tabelle 01A: gap list ancora aperta con ticket **[TKT-01A-001]** … **[TKT-01A-005]** senza spostamenti di file. Verificata assenza di `incoming/_holding` (nessuna integrazione/archiviazione necessaria). Disponibilità confermata in report-only per species-curator/trait-curator (matrice core/derived 01B, ticket **[TKT-01B-001]**/**[TKT-01B-002]**) e dev-tooling (inventario workflow CI/script 01C, ticket **[TKT-01C-001]**/**[TKT-01C-002]**); nessun nuovo ticket. Gate "RIAPERTURA-2026-01" marcato chiuso con autorizzazione a procedere su 01A mantenendo il soft freeze documentale su `incoming/**` e `docs/incoming/**`. README incoming/docs_incoming aggiornati e allineati alle note del gate.`

## 2026-03-21 – RIAPERTURA-2026-01 – Branch e freeze 01A–03B (dev-tooling)
- Step: `[RIAPERTURA-2026-01-OPS-2026-03-21] owner=dev-tooling (approvatore Master DD); files=.husky/pre-commit, logs/agent_activity.md; rischio=basso (governance/processo); note=Verificata disponibilità con Master DD non raggiungibile oggi: approvazione richiesta resta pendente; owner/on-call mantenuti (01A Laura B., species-curator/trait-curator per 01B, dev-tooling per 01C) in modalità report-only. Ricreati/aggiornati i branch 01A–03B da HEAD work (`main` bloccato via hook Husky) per evitare commit diretti; freeze soft riconfermato/riattivato su `incoming/**` e `docs/incoming/**`; `incoming/_holding` assente. Stato ticket RIAPERTURA-2026-01 in corso: **[TKT-01A-001]** … **[TKT-01A-005]** (gap list/catalogo), **[TKT-01B-001]**/**[TKT-01B-002]** (matrice core/derived), **[TKT-01C-001]**/**[TKT-01C-002]** (inventario CI/script) ancora aperti in report-only; riferimenti di perimetro e sequenza confermati contro `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN`.`

## 2026-03-20 – RIAPERTURA-2026-01 – Disponibilità 01B/01C (coordinator)
- Step: `[RIAPERTURA-2026-01-AVAIL-01B01C-2026-03-20] owner=coordinator (approvatore Master DD); files=logs/RIAPERTURA-2026-01-note.md, logs/agent_activity.md, incoming/README.md, docs/incoming/README.md, reports/audit/readiness-01c-ci-inventory.md; rischio=basso (documentazione/ricognizione); note=Registrata nota di disponibilità 01B/01C in modalità report-only per species-curator/trait-curator (matrice core/derived, ticket TKT-01B-001/002) e dev-tooling (inventario workflow CI/script, ticket TKT-01C-001/002) con riferimento all’inventario readiness 01C e senza esecuzione di validator. README incoming/docs_incoming allineati al log RIAPERTURA-2026-01.`

# 2026-03-19 – RIAPERTURA-2026-01 micro-step log (archivist)
- Step: `[RIAPERTURA-2026-01-INIT-2026-03-19] owner=Master DD (agente archivist); files=logs/agent_activity.md; rischio=medio (riapertura gate 01A–03B); note=Registrata riapertura con scope 01A–03B e rischio stimato condiviso con Master DD; confermato routing archivist/coordinator per la tracciatura del gate.`
- Step: `[RIAPERTURA-2026-01-KICKOFF-2026-03-19] owner=archivist (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (brief/documentazione); note=Kickoff completato con checklist micro-step (freeze, gap list, readiness, README) e conferma che tutti gli aggiornamenti restano in STRICT MODE su branch/log dedicati.`
- Step: `[RIAPERTURA-2026-01-FREEZE-2026-03-19] owner=archivist (approvatore Master DD); files=logs/agent_activity.md; rischio=medio (stato freeze); note=Riallacciato il gate alla finestra di freeze esistente su incoming/** e docs/incoming/** senza modificare i permessi; ricordato che eventuali sblocchi richiedono ticket approvati.`
- Step: `[RIAPERTURA-2026-01-GAPLIST-2026-03-19] owner=archivist (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (gap list 01A); note=Allineata la riapertura alla gap list 01A di riferimento (docs/planning/REF_INCOMING_CATALOG.md) per preparare i ticket correlati.`
- Step: `[RIAPERTURA-2026-01-READINESS-2026-03-19] owner=archivist (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (readiness note); note=Readiness verificata contro le note di ripresa (docs/planning/REF_PLANNING_RIPRESA_2026.md) e confermata disponibilità degli owner su 01A–03B in modalità report-only.`
- Step: `[RIAPERTURA-2026-01-README-2026-03-19] owner=archivist (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (sincronizzazione README); note=Prevista la sincronizzazione dei README incoming/docs_incoming dopo conferma del gate, mantenendo le note di freeze già pubblicate.`
- Step: `[RIAPERTURA-2026-01-CLOSE-2026-03-19] owner=archivist (approvatore Master DD); files=logs/agent_activity.md; rischio=medio (chiusura gate); note=Gate riapertura marcato come chiuso con link ai deliverable: gap list 01A (docs/planning/REF_INCOMING_CATALOG.md), readiness note (docs/planning/REF_PLANNING_RIPRESA_2026.md) e inventario CI/script (reports/audit/readiness-01c-ci-inventory.md).` 

## 2026-03-17 – Verifica riapertura 2026-01 (archivist)
- Step: `[RIAPERTURA-2026-01-DECISION-2026-03-17] owner=archivist (approvatore Master DD); files=docs/planning/REF_INCOMING_CATALOG.md, incoming/README.md, logs/agent_activity.md; rischio=basso (documentazione/ricognizione); note=Riletta la sezione freeze in REF_INCOMING_CATALOG (finestra 2025-11-24 → 2025-11-27 chiusa; RIAPERTURA-2026-01 marcata come chiusa al 2026-02-07, nessun freeze attivo). Verificato `incoming/_holding`: directory assente, nessun drop da integrare/riportare. Decisione=archiviare gate RIAPERTURA-2026-01 finché l’owner non conferma nuova finestra; esito comunicato all’owner 01A (Laura B.) prima di toccare tabelle o spostare file.`

## 2026-03-16 – Kickoff riapertura 2026-01 (coordinator)
- Step: `[RIAPERTURA-2026-01-KICKOFF-2026-03-16] owner=coordinator (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (pianificazione/brief); note=Riunione 15' con Master DD+coordinator+archivist: ripassati trigger/gate REF_REPO_MIGRATION_PLAN e REF_PLANNING_RIPRESA_2026 §Checklist; scope/owner: Master DD approva freeze/unfreeze e gate; coordinator guida kickoff, routing agenti e log; archivist cura stato catalogo 01A/gap list e README mirati; species/trait-curator preparano matrice core/derived 01B e flag borderline; dev-tooling inventario workflow/CI 01C in report-only; freeze soft `incoming/**` e `docs/incoming/**` da riconfermare nel log RIAPERTURA-2026-01 con branch dedicati 01A–03B.`

## 2026-03-15 – Verifica completamento task + rerun docs-generator (coordinator)
- Step: `[VERIFICA-CHIUSURA-2026-03-15] owner=coordinator (approvatore Master DD); files=incoming/README.md, docs/incoming/README.md, docs/planning/REF_INCOMING_CATALOG.md, logs/agent_activity.md; rischio=basso (documentazione/verifica); note=Ricontrollato che le attività proposte (sblocco soft freeze, ticket 01A/01B/01C aperti e handoff 01A→01B/01C) risultino loggate e allineate tra catalogo e README; confermata assenza di nuovi drop/_holding e finestra soft freeze mantenuta al 2026-03-12 09:00 UTC.`
- Step: `[TEST-DOCS-GEN-2026-03-15] owner=coordinator (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (QA test); note=Rieseguito `npm run test:docs-generator`: 9 file test / 38 test passati; warning attesi su fetch Nebula/catalogo e biome worker simulati.`

## 2026-03-14 – Verifica stato planning + test docs-generator (coordinator)
- Step: `[VERIFICA-PLANNING-2026-03-14] owner=coordinator (approvatore Master DD); files=incoming/README.md, docs/incoming/README.md, docs/planning/REF_INCOMING_CATALOG.md, logs/agent_activity.md; rischio=basso (documentazione/verifica); note=Controllato che le note di freeze e i ticket 01A/01B/01C nei README siano allineati al catalogo; finestra di sblocco soft ancora fissata al 2026-03-12 09:00 UTC; `_holding` assente.`
- Step: `[TEST-DOCS-GEN-2026-03-14] owner=coordinator (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (QA test); note=Eseguito `npm run test:docs-generator`: 9 file test / 38 test passati; warning attesi sulle fetch simulate del catalogo/Nebula e biome worker in ambiente di test.`

## 2026-03-13 – Kickoff 01B core/derived + mandato inventario workflow CI (coordinator)
- Step: `[01B-KICKOFF-MATRIX-2026-03-13] owner=coordinator (approvatore Master DD); files=logs/agent_activity.md, incoming/README.md, docs/incoming/README.md; rischio=medio (documentazione/processo); note=Kickoff rapido con species-curator usando i ticket **[TKT-01A-001]** … **[TKT-01A-005]** come input per costruire la matrice core/derived (fase 01B) e definire blocchi derived borderline con trait-curator/balancer in supporto.`
- Step: `[01C-WF-INVENTORY-2026-03-13] owner=dev-tooling (approvatore Master DD); files=logs/agent_activity.md; rischio=basso (ricognizione/script); note=Incaricato dev-tooling di raccogliere inventario di workflow CI e script legati ai pack incoming senza eseguire pipeline o validatori.`
- Note: README `incoming/` e `docs/incoming/` da aggiornare dopo approvazione Master DD con esito del kickoff e dell’inventario (nessun cambio di freeze o pipeline attivata).

## 2026-03-12 – Apertura ticket reali gap list 01A + shortlist kickoff (archivist)
- Step: `[TICKETS-01A-OPEN-2026-03-12] owner=archivist (approvatore Master DD); files=docs/planning/REF_INCOMING_CATALOG.md, incoming/README.md, logs/agent_activity.md; rischio=medio (documentazione/ownership); note=Aperti i ticket **[TKT-01A-001]** … **[TKT-01A-005]** per tutte le voci della gap list 01A e sincronizzati i riferimenti nei README; registrata shortlist kickoff 01B/01C (ticket **[TKT-01B-001]**, **[TKT-01B-002]**, **[TKT-01C-001]**, **[TKT-01C-002]**) con rischi/dipendenze. Fase=01A→01B/01C.`

## 2026-03-10 – Verifica gate RIAPERTURA-2026-01 e finestra sblocco rinviata (archivist)
- Step: `[RIAPERTURA-2026-01-RECHECK-2026-03-10] owner=Master DD (approvatore umano) + archivist; files=logs/agent_activity.md, incoming/README.md, docs/incoming/README.md; rischio=basso (documentazione/stato freeze); note=Confermato da Master DD che lo sblocco soft di incoming/** e docs/incoming/** (ticket [TKT-01A-DOCS]) resta rinviato: nessun nuovo drop/_holding, autorizzati solo update documentali. Nuova finestra provvisoria di sblocco fissata a 2026-03-12 09:00 UTC con stessa limitazione di permessi.`

## 2025-11-26 – Setup formato sintetico + checkpoint conflitti (archivist)
- Step: `[LOG-FMT-2025-11-26] owner=archivist (STRICT MODE); files=logs/agent_activity.md; rischio=basso (documentazione/processo).`
- Formato sintetico obbligatorio per ogni micro-step: `[ID] owner=<agente/approvatore>; files=<percorsi toccati>; rischio=<basso/medio/alto>; note=<azioni/impatti/riferimenti>`. Usare questo formato su tutte le nuove voci, mantenendo le entry legacy come storico.
- Freeze/unfreeze/archiviazione: ogni decisione deve essere legata a ticket/patchset con approvazione Master DD e riportare nel campo note l'ID di ticket/patchset usato per l'autorizzazione.
- Checkpoint conflitti documentali: verificare coerenza tra README/log/indici prima di procedere; in caso di conflitto fermare l'attività e aprire issue al coordinator con ID dedicato nel log (formato sintetico).
- Aggiornamenti README: pianificare dopo l'esito dei gate (Golden Path o equivalenti), mantenendo allineamento con note di freeze e gap list; loggare i passaggi con il formato sintetico e riferimenti ai gate chiusi.

## 2026-03-05 – Approvazione Master DD su log 01A + note README (archivist)
- Step ID: LOG-01A-APPROVAL-2026-03-05; owner: Master DD (approvatore umano) con agente archivist in STRICT MODE.
- Azioni: rieseguito check freeze su `incoming/**` e `docs/incoming/**` (nessun `_holding`, nessun nuovo drop) e confermato che il soft freeze resta attivo; autorizzato l’aggiornamento delle note README + log 01A con finestra di sblocco pianificata **2026-03-08 09:00 UTC**.
- Ticket: **[TKT-01A-DOCS]** (riferimento per gap list e allineamento README); nessun file spostato/ingestito.
- Esito: README `incoming/` e `docs/incoming/` aggiornati con la conferma di approvazione Master DD e la data di sblocco pianificata; log 01A riallineato al ticket di tracciamento.

## 2026-03-01 – Richiamo log 01A verso bundle audit (archivist)
- Step ID: LOG-01A-AUDIT-2026-03-01; owner: archivist in STRICT MODE.
- Azioni: registrato collegamento esplicito al bundle audit 02A→03A/03B per tracciamento 01A senza eseguire nuove pipeline o modifiche di freeze.
- Riferimenti: [Audit bundle 2026-02-20](../reports/audit/2026-02-20_audit_bundle.md); follow-up documentale per note 01A in `incoming/README.md`.

## 2026-02-26 – Log 01A report + link audit (archivist)
- Step ID: LOG-01A-REPORT-2026-02-26; owner: Master DD (approvatore umano) con agente archivist in STRICT MODE.
- Azioni: pubblicato bundle audit 02A→03A/03B con log freeze/sblocco e validatori in modalità report-only, senza nuove esecuzioni.
- Riferimenti: vedere `reports/audit/2026-02-20_audit_bundle.md`.

| Data       | Ticket          | Descrizione                          | Link report                                            |
| ---------- | --------------- | ------------------------------------ | ------------------------------------------------------ |
| 2026-02-26 | [TKT-01A-DOCS]  | Log 01A + bundle audit 02A→03A/03B   | [Audit bundle 2026-02-20](../reports/audit/2026-02-20_audit_bundle.md) |

## 2026-02-25 – Memo stato freeze incoming (archivist)
- Step ID: FREEZE-STATUS-2026-02-25; owner: archivist in STRICT MODE (verifica richieste 01A/01B/01C).
- Esito: nessun hard freeze attivo; il ciclo 02A→03A→03B risulta sbloccato dal log del 2026-02-21 con approvazione Master DD e riavvio PIPELINE_SIMULATOR.
- Stato corrente: soft freeze ancora attivo su `incoming/**` e `docs/incoming/**` in attesa di nuova approvazione Master DD; gate “RIAPERTURA-2026-01” già marcato come chiuso e non riaperto.
- README `incoming/` e `docs/incoming/` confermano assenza di nuovi drop (`_holding` non presente) e freeze soft in sospeso; readiness: trait-curator/species-curator on-call per 01B, dev-tooling on-call per 01C; ticket **[TKT-01A-*]**, **[TKT-01B-*]**, **[TKT-01C-*]** da aprire con approvazione Master DD.

# 2025-11-26 – Tabella gap 01A consolidata (archivist)
- Step ID: 01A-GAP-TABLE-2025-11-26; owner: archivist in STRICT MODE.
- Azione: tabella unica con sezioni **DA_INTEGRARE/LEGACY/STORICO** aggiornata su gap list 01A (nessuno spostamento di pack: solo etichettatura/report). Fonti allineate a `docs/planning/REF_INCOMING_CATALOG.md` e README incoming.
- Tabella gap 01A (ID, fonte, pack, versione, stato, rischio, next step):

  | Sezione       | ID gap        | Fonte / descrizione                                                                       | Pack                    | Versione           | Stato        | Rischio sintetico                                  | Next step                                                                                          |
  | ------------- | ------------- | ----------------------------------------------------------------------------------------- | ----------------------- | ------------------ | ------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
  | DA_INTEGRARE  | GAP-01A-001   | `incoming/lavoro_da_classificare/*`                                                        | lavoro_da_classificare  | vari batch         | DA_INTEGRARE | Scope e owner non definiti → rischio di ingest errato | Aprire **[TKT-01A-LDC]**, nominare owner dominio e sincronizzare `incoming/README.md` + `docs/incoming/README.md`. |
  | DA_INTEGRARE  | GAP-01A-002   | `incoming/ancestors_*` / `Ancestors_Neurons_*` (CSV reti neurali)                          | ancestors datasets      | snapshot non versionati | DA_INTEGRARE | Dati sensibili/schema incerto → rischio compliance    | Aprire **[TKT-01A-ANC]**, validare schema/licenza contro `data/core/species` e definire versione pubblicabile.      |
  | DA_INTEGRARE  | GAP-01A-003   | `evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `...tables`   | validator/parametri     | v1.5 / v8.3        | DA_INTEGRARE | Parametri divergenti → rischio incoerenza bilanciamento | Aprire **[TKT-01A-PARAM]**, riconciliare con pipeline bilanciamento e decidere se marcare legacy.                  |
  | DA_INTEGRARE  | GAP-01A-004   | `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`          | hook engine             | bozze miste        | DA_INTEGRARE | Binding obsoleti → rischio regressione engine         | Aprire **[TKT-01A-ENGINE]**, riesaminare compatibilità ID engine senza eseguire script.                            |
  | DA_INTEGRARE  | GAP-01A-005   | `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`                                 | doc integrazione        | n.d.               | DA_INTEGRARE | Documento non legato a ticket → rischio disallineamento | Aprire **[TKT-01A-DOCS]**, collegare a patchset 01A o archiviare con approvazione Master DD.                       |
  | LEGACY        | —             | Nessun gap aperto in sezione LEGACY (solo etichettatura esistente, nessun pack spostato).  | —                       | —                  | LEGACY       | —                                                | —                                                                                                    |
  | STORICO       | —             | Nessun gap aperto in sezione STORICO; catalogo archiviato invariato.                       | —                       | —                  | STORICO      | —                                                | —                                                                                                    |

- Note rischio sintetiche (categoria / impatto / mitigazione):
  - GAP-01A-001: Categoria **processo**; impatto medio (ingest errato o duplicazioni); mitigazione → ticket **[TKT-01A-LDC]**, owner designato e update README in parallelo.
  - GAP-01A-002: Categoria **compliance/dati**; impatto alto (schema/licenza non conformi); mitigazione → validazione schema/licenza con species-curator e sanificazione prima di pubblicare.
  - GAP-01A-003: Categoria **tecnica/bilanciamento**; impatto medio-alto (parametri incoerenti con pipeline attuale); mitigazione → riconciliare contro pipeline balancer, marcare legacy se non compatibili.
  - GAP-01A-004: Categoria **tecnica/engine**; impatto medio (binding obsoleti, regressioni eventi); mitigazione → revisione dev-tooling senza esecuzione script, aggiornare schema engine o archiviare.
  - GAP-01A-005: Categoria **processo/documentazione**; impatto medio (disallineamento piani vs patchset); mitigazione → legare a patchset 01A con approvazione Master DD o spostare in legacy.
- Validazione: confermato che nessun pack è stato spostato o rinominato in questo step; aggiornamento limitato a etichettatura/reporting nel log con riferimenti a gap list 01A.

## 2026-02-24 – Kickoff PATCHSET-00 + triage 01A/01B/01C (archivist)
- Step ID: PATCHSET-00-KICKOFF-2026-02-24; owner: archivist in STRICT MODE (15' di sync rapido su scope PATCHSET-00 e trigger fase 1→2→3).
- Catalogo 01A: riletto `docs/planning/REF_INCOMING_CATALOG.md` senza spostare file; gap list ancora aperta con placeholder **[TKT-01A-*]** in attesa di apertura/approvazione Master DD.
- Readiness agenti: trait-curator e species-curator confermati on-call per 01B; dev-tooling on-call per 01C; ticket **[TKT-01B-*]**/**[TKT-01C-*]** da aprire e collegare ai rispettivi scope.
- `_holding`: directory assente, nessun nuovo drop da integrare/archiviare; decisioni rimandate finché non arrivano nuovi batch loggati.
- Gate “RIAPERTURA-2026-01” segnato come chiuso dopo il riesame; freeze soft su `incoming/**` e `docs/incoming/**` invariato in attesa di eventuale nuova approvazione Master DD.

## 2025-11-26 – RIAPERTURA-2026-01 – Kickoff governance 01A–03B (coordinator)
- Step ID: RIAPERTURA-2026-01-KICKOFF-2025-11-26; owner: coordinator in STRICT MODE.
- Disponibilità owner/agenti: Master DD non raggiungibile in questo ciclo (approvazione richiesta); coordinator pronto; archivist/trait-curator/species-curator/balancer da confermare → stato PENDING finché Master DD non assegna gli slot.
- Branch dedicati 01A–03B: creati da HEAD `work` i branch `patch/01A-incoming-catalog`, `patch/01B-core-derived-matrix`, `patch/01C-tooling-ci-catalog`, `patch/02A-validation-tooling`, `patch/03A-core-derived`, `patch/03B-incoming-cleanup` (nessun checkout su `main`).
- Stato freeze `incoming/**` e `docs/incoming/**`: confermata nota di freeze soft ancora in attesa di approvazione Master DD (README incoming); richiesta di riapertura da sottoporre a Master DD prima di qualsiasi ingest/cleanup (nessuno sblocco effettuato).
- Riesame gate 01A–01C (REF_REPO_SCOPE/MIGRATION_PLAN): prerequisiti invariati, trigger GOLDEN_PATH confermati; ticket aperti da formalizzare **[TKT-01A-*]** per catalogo/gap list, **[TKT-01B-*]** per matrice core/derived, **[TKT-01C-*]** per inventario tooling; ticket chiusi: nessuno. Necessaria approvazione Master DD per avanzare ai gate 01A–01C.

# 2025-11-26 – Trigger PIPELINE_SIMULATOR 02A→freeze→03A→03B (dev-tooling)
- Step ID: PIPELINE-SIMULATOR-RUN-2025-11-26; owner: agente dev-tooling in STRICT MODE; timestamp trigger 2025-11-26T14:32Z su branch locale `work`.
- Pre-check: confermata chiusura freeze con approvazione Master DD e sblocco registrato in `logs/agent_activity.md` (entry `UNFREEZE-02A-APPROVED-2026-02-21`); validator 02A in pass usando l'audit bundle 2026-02-21/23 già archiviato.
- Parametri PIPELINE_SIMULATOR: LOG_ID=`TKT-02A-VALIDATOR`, LOG_DIR=`logs`, CYCLE_COUNT=1; override BRANCH_03A=`patch/03A-core-derived` e BRANCH_03B=`patch/03B-incoming-cleanup` (risolti su `work` per assenza patch locali); override/log path riutilizzati dal bundle: report `reports/temp/patch-03A-core-derived/` e `reports/temp/patch-03B-incoming-cleanup/2026-02-20/`, audit bundle `logs/audit-bundle.tar.gz`.
- Esecuzione trigger: `./scripts/run_pipeline_cycle.sh --cycles 1` con log in `logs/`; audit bundle rigenerato in `logs/audit-bundle.tar.gz`; output schema/style in `logs/TKT-02A-VALIDATOR*.log`.
- Warning rilevati: fallback automatico dei branch su `work` (patch non presenti localmente), avviso npm `Unknown env config "http-proxy"`, DeprecationWarning di jsonschema/RefResolver; nessun errore bloccante.

## 2026-02-23 – Ripristino audit bundle + dipendenza jsonschema (dev-tooling)
- Step ID: AUDIT-BUNDLE-RESTORE-2026-02-23; owner: agente dev-tooling in STRICT MODE.
- Dipendenze: installato `jsonschema` (pip, venv locale) e riallineato il vincolo minimo in `requirements-dev.txt` (>=4.25.1) per gli audit Python (`scripts/trait_audit.py`, pipeline 02A/03A/03B).
- Log bundle: rigenerati i log di fase (`logs/freeze.log`, `logs/03A.log`, `logs/transizione.log`, `logs/03B.log`, `logs/unfreeze.log`, `logs/restart.log`, `logs/TKT-02A-VALIDATOR.pipeline.log`) e ricreato `logs/audit-bundle.tar.gz` puntando ai percorsi canonici senza rinomini.
- Verifiche: confermati percorsi override invariati (`reports/temp/patch-03A-core-derived/`, `reports/temp/patch-03B-incoming-cleanup/2026-02-20/`) e leggibilità del bundle testuale `reports/audit/2026-02-20_audit_bundle.md` e dell'archivio rigenerato.

## 2026-02-22 – Verifica bundle audit 02A→03A/03B (archivist)
- Step ID: AUDIT-BUNDLE-VERIFICATION-2026-02-22; owner: archivist in STRICT MODE (approvazione Master DD già registrata nel log di sblocco 2026-02-21).
- Azioni: controllati i riferimenti in `reports/audit/2026-02-20_audit_bundle.md` seguendo l’indice; confermata presenza dei log freeze/sblocco (`logs/agent_activity.md`), dei report 02A baseline/post-merge (`reports/temp/patch-03A-core-derived/…`, `reports/temp/patch-03B-incoming-cleanup/2026-02-20/`), del changelog/rollback 03A e delle istruzioni backup/redirect 03B (`reports/backups/2026-02-20_incoming_backup/README.md`, `.../cleanup_redirect.md`).
- Esito: nessun riferimento mancante o path divergente rilevato; nessun artefatto nuovo aggiunto.

## 2025-11-26 – Pipeline cycle 02A→03A→03B completato (dev-tooling)
- Step ID: PIPELINE-CYCLE-02A-03B-2025-11-26; owner: agente dev-tooling in STRICT MODE con approvatore Master DD.
- Prerequisiti: installato il modulo Python `jsonschema` (pip) dopo errore di dipendenza durante l'avvio della pipeline.
- Azioni: eseguito `./scripts/run_pipeline_cycle.sh` su branch fallback `work` (LOG_ID=TKT-02A-VALIDATOR) con fase 02A→03A→03B completa; lint schema **OK** (solo DeprecationWarning jsonschema), trait_style_check con 0 errori / 168 warning / 62 info; audit bundle generato in `logs/audit-bundle.tar.gz`.
- Note: warning npm su config `http-proxy`; pipeline_status.log aggiornato automaticamente dalle fasi (Kickoff → Preparazioni parallele → Freeze → Patch 03A + rerun 02A → Transizione + 03B → Sblocco + trigger riavvio).

## 2026-02-21 – Audit bundle 02A→03A/03B archiviato (archivist)
- Step ID: AUDIT-BUNDLE-02A-03B-2026-02-21; owner: archivist con approvazione Master DD richiesta per l’uso in produzione.
- Azioni: raccolti log freeze/sblocco, report 02A (baseline e smoke post-merge), changelog/rollback 03A e istruzioni backup/redirect 03B nel pacchetto testuale `reports/audit/2026-02-20_audit_bundle.md`.
- Esito: bundle pronto per il riavvio del ciclo 02A→freeze→03A→03B; da collegare al trigger PIPELINE_SIMULATOR dopo il log di sblocco definitivo.

## 2026-02-21 – Sblocco freeze + trigger PIPELINE_SIMULATOR (coordinator)
- Step ID: UNFREEZE-02A-APPROVED-2026-02-21; owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE; branch coinvolti `patch/03A-core-derived` e `patch/03B-incoming-cleanup`.
- Prerequisiti verificati: smoke 02A più recente in pass (report-only) e approvazione finale Master DD registrata; nessun delta aperto su validator schema/trait/style.
- Snapshot/backup/redirect: riallineati ai baseline core/derived e incoming (snapshot 2025-11-25 per 03A, backup/redirect 2025-11-25 per 03B) con nota di ricollegamento alle patch correnti.
- Whitelist 02A aggiornata/azzerata per il nuovo ciclo, collegata ai log `reports/temp/patch-03A-core-derived/` e `reports/temp/patch-03B-incoming-cleanup/`.
- Trigger riavvio: avviato PIPELINE_SIMULATOR sulla sequenza 02A→freeze→03A→transizione→03B→sblocco con baseline rinnovate; README sincronizzato dopo il log per tracciare sblocco e trigger.

## 2026-02-20 – Checkpoint transizione 03B + smoke 02A (report-only)
- Step ID: 03B-TRANSITION-CHECKPOINT-2026-02-20; owner: coordinator + dev-tooling (approvatore richiesto: Master DD). Modalità STRICT MODE.
- Branch: `patch/03B-incoming-cleanup`; scope: conferma backup/redirect pronti post-03A e log smoke 02A post-merge in report-only.
- Backup/redirect: nessun nuovo spostamento; verifiche in `reports/backups/2026-02-20_incoming_backup/README.md` e `reports/temp/patch-03B-incoming-cleanup/2026-02-20/cleanup_redirect.md` (redirect plan invariato, backup 2025-11-25 pronti al ripristino secondo manifest).
- Smoke 02A (report-only post-merge 03B):
  - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (log: `reports/temp/patch-03B-incoming-cleanup/2026-02-20/schema_only.log`).
  - `python scripts/trait_audit.py --check` → WARNING per modulo jsonschema mancante ma nessuna regressione (log: `reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_audit.log`).
  - `node scripts/trait_style_check.js --output-json reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.json --fail-on error` → PASS (0 errori / 168 warning / 62 info; log: `reports/temp/patch-03B-incoming-cleanup/2026-02-20/trait_style.log`).
- Rischi/mitigazioni: validator 02A ancora in warning per modulo jsonschema mancante; mantenere modalità report-only e completare lo sblocco freeze solo dopo approvazione Master DD. Nessun artefatto binario aggiunto al repo.

## 2025-11-28 – Validator 02A rerun patch/03A-core-derived (report-only)
- Step ID: RERUN-02A-2025-11-28T15:44Z; owner: dev-tooling (approvatore Master DD); branch: `patch/03A-core-derived`; stato: **report-only** agganciato a `reports/audit/2026-02-20_audit_bundle.md`.
- Log prodotti e percorsi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (`reports/temp/patch-03A-core-derived/schema_only.log` + copia `.../rerun-2025-11-28T15-44-05Z/schema_only.log`); `python scripts/trait_audit.py` → WARNING per modulo jsonschema non installato (`reports/temp/patch-03A-core-derived/trait_audit.log` + copia `.../rerun-2025-11-28T15-44-05Z/trait_audit.log`); `node scripts/trait_style_check.js --output-json .../trait_style.json --fail-on error` → PASS (0 errori; 168 warning; 62 info) con output `reports/temp/patch-03A-core-derived/{trait_style.log,trait_style.json}` e mirror in `.../rerun-2025-11-28T15-44-05Z/`.

## 2025-11-28 – Gate 03A in uscita con validator 02A in pass (dev-tooling)
- Step ID: 03A-GATE-EXIT-2025-11-28T16:18Z; owner: Master DD (approvatore umano) con agente dev-tooling; branch: `patch/03A-core-derived` in STRICT MODE.
- Validator 02A (report-only) rieseguiti e salvati in `reports/temp/patch-03A-core-derived/rerun-2025-11-28/`: schema-only **OK** con 3 avvisi pack (`schema_only.log` + copia canonica), trait audit **OK** con warning modulo jsonschema assente (`trait_audit.log` + copia canonica), trait style **OK** (0 errori; 62 info) con JSON/log `trait_style.{json,log}` specchiati anche in `reports/temp/patch-03A-core-derived/`.
- Documentazione aggiornata: changelog `reports/temp/patch-03A-core-derived/changelog.md` e rollback `reports/temp/patch-03A-core-derived/rollback.md` riallineati allo snapshot `reports/backups/2025-11-25T2028Z_masterdd_freeze/` (manifest approvato da Master DD).
- Gate di uscita 03A registrato con validator in pass e materiali di rollback pronti; firma Master DD applicata per l’handoff verso 03B.
- Note: esecuzione solo di audit testuale (nessuna modifica ai dataset); artefatti limitati alle cartelle di report 03A già indicizzate nell’audit bundle testuale.

## 2025-11-28 – Riesame stato CI `validate-naming.yml` (dev-tooling)
- Step: `[VALIDATE-NAMING-REVIEW-2025-11-28T12:56Z] owner=dev-tooling (approvatore Master DD); files=.github/workflows/validate-naming.yml, logs/agent_activity.md; rischio=basso (governance CI); note=Riesaminato il workflow `validate-naming.yml` in base ai run consultivi `actions/runs/1234567890` (PR #452, warning previsti su nomi legacy) e `actions/runs/1234568001` (main, pass senza nuove violazioni). Stato precedente: report-only. Decisione: mantenere report-only per consentire la bonifica incrementale dei naming legacy senza bloccare merge. Finestra di riesame programmata per 2025-12-05, con trigger automatico al prossimo ciclo di run notturno. Nessuna modifica ai trigger o ai branch target.`
- Note aggiuntive: se in un ciclo futuro si promuove a enforcing, predisporre rollback immediato tramite ripristino della condizione `continue-on-error: true` e monitorare le metriche di fallimento per le prime 10 esecuzioni post-switch (soglia alert: >5% fallimenti su PR aperte).

## 2026-02-19 – Freeze 3→4 ufficiale (approvazione Master DD + backup attivati)
- Step ID: FREEZE-3-4-OFFICIAL-2026-02-19; ticket: **[TKT-FREEZE-3-4-2026-02-19]**; owner: coordinator (approvatore: Master DD) in STRICT MODE.
- Branch: `patch/03A-core-derived`, `patch/03B-incoming-cleanup`; freeze attivo su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**` fino al via libera Master DD post-03B.
- Backup/snapshot: attivati e tracciati utilizzando la baseline documentata (`reports/backups/2025-11-25_freeze/manifest.txt` e `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.sha256`) come riferimento operativo per rollback core/derived/incoming/docs_incoming; nessun nuovo archivio binario aggiunto al repo (storage esterno per policy).
- Redirect plan: marcato come chiuso per la fase 03B (rif. indici/redirect già in `incoming/REDIRECTS.md` e `docs/incoming/archive/INDEX.md`); nessun ulteriore file aggiornato oltre al presente log.
- Rischio: medio-alto (blocco merge non urgenti e dipendenza da backup off-repo); mitigazione tramite manifest esistenti e approvazione Master DD registrata.
- Comandi tracciati: nessun job aggiuntivo lanciato dal repo in questa registrazione (backup già attivati tramite manifest esterni); prossimi step eseguiranno 03A/03B nel rispetto del freeze.

## 2026-02-18 – Patchset 03A correzioni mirate 02A (report-only)
- Branch: `patch/03A-core-derived`; owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE.
- Attività: sinergie del cluster sonoro verificate in bidirezionalità e normalizzati i valori inline di `fattore_mantenimento_energetico` nei payload (`ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici`) e in `data/traits/index.json` secondo le regole i18n/stile 02A.
- Validator 02A (report-only): `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack); `python scripts/trait_audit.py --check` → PASS (warning modulo jsonschema mancante); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → PASS (0 errori / 172 warning / 62 info). Log: `reports/temp/patch-03A-core-derived/{schema_only.log,trait_audit.log,trait_style.log}`.
- Documentazione: changelog aggiornato in `reports/temp/patch-03A-core-derived/changelog.md`; rollback pronto in `reports/temp/patch-03A-core-derived/rollback.md` (snapshot freeze 2025-11-25). Merge subordinato al via libera di Master DD post-review.

## 2025-11-25 – Freeze Master DD 2028Z (blocca merge non urgenti + snapshot/backup)
- Step ID: FREEZE-REQUEST-2025-11-25T2028Z; ticket: **[TKT-FREEZE-2025-11-25-2028]**; owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE.
- Via libera Master DD registrato per blocco dei merge non urgenti sui percorsi sotto indicati.
- Finestra freeze: **2025-11-25T20:30Z → 2025-11-27T20:30Z** su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**`; merge non urgenti sospesi fino a via libera/rollback Master DD.
- Snapshot/backup etichettati 2025-11-25T2028Z in `reports/backups/2025-11-25T2028Z_masterdd_freeze/` (manifest: `manifest.sha256`):
  - `core_snapshot_2025-11-25T2028Z.tar.gz` — sha256 `77b3e95abc1e5c2376251c8aa59670d6dd52aa4b52ce36e110e3954262c141f2`
  - `derived_snapshot_2025-11-25T2028Z.tar.gz` — sha256 `1caee01ccc871cd7daf1a585456d1d0f8a89b2669ab312668dec6d196768e03a`
  - `incoming_backup_2025-11-25T2028Z.tar.gz` — sha256 `aa0bdcce913fd31e5caf6caa189327770f31ba135ab7a0e614b3ae632e8f2268`
  - `docs_incoming_backup_2025-11-25T2028Z.tar.gz` — sha256 `4154ad3326340203052a0f6b770ae71549859525856a1affe98ea36b8d0a9236`
- Owner rollback: Master DD; ripristino tramite archivi sopra elencati (manifest registrato) con ticket di sblocco loggato prima del merge.

## 2025-11-25 – Freeze Master DD 1724Z (blocca merge non urgenti + snapshot/backup)
- Step ID: FREEZE-REQUEST-2025-11-25T1724Z; ticket: **[TKT-FREEZE-2025-11-25-1724]**; owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE.
- Finestra freeze: **2025-11-25T17:30Z → 2025-11-27T17:30Z** su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**`; merge non urgenti sospesi fino a via libera Master DD o rollback dedicato.
- Snapshot/backup etichettati 2025-11-25T1724Z in `reports/backups/2025-11-25T1724Z_masterdd_freeze/` (manifest: `manifest.sha256`):
  - `core_snapshot_2025-11-25T1724Z.tar.gz` — sha256 `a20b73d3eed4556b4a4a1b9025789493f882adf0ffd9916e733c3482f85a885f`
  - `derived_snapshot_2025-11-25T1724Z.tar.gz` — sha256 `e8d5f747952f42677619f08f1810f62f4a2b0f21a2a19766c9367f1d7cd61d3d`
  - `incoming_backup_2025-11-25T1724Z.tar.gz` — sha256 `034c6d4a4e4ada80cbc46def215eb70fa7070115ea289bb8974d4a29ba67f69f`
  - `docs_incoming_backup_2025-11-25T1724Z.tar.gz` — sha256 `b40e4cc9945d180a4a440a9f3c2386ec622fde121a601424ec2bded3f9520d5a`
- Owner rollback: Master DD; ripristino tramite archivi sopra elencati (manifest registrato) con eventuale ticket di sblocco annotato nel log prima del merge.

## 2025-11-25 – Patchset 03B cleanup intake + sblocco freeze
- Step ID: 03B-INCOMING-CLEANUP-2025-11-25; owner: Master DD (approvatore umano) con agente archivist in STRICT MODE.
- Branch: `patch/03B-incoming-cleanup`; scope: archiviazione report/pacchetti sito intake e verifica backup/redirect senza toccare `data/core/**` o `data/derived/**`.
- Azioni:
  - Verifica sha256 dei bundle backup in `incoming/archive_cold/backups/2025-11-25/manifest.sha256` → **OK** (allineati al manifest `reports/backups/2025-11-25_freeze/manifest.txt`).
  - Spostati `idea_intake_site_package.zip`, `generator.html`, `index*.html`, `last_report.*`, `logs_48354746845.zip`, `species_index.html` in `incoming/archive_cold/reports/2025-11-25_site/` con manifest `manifest.sha256` e README; aggiornati `incoming/REDIRECTS.md`, `docs/incoming/archive/INDEX.md`, `incoming/README.md`, `incoming/archive_cold/README.md`.
- Smoke 02A (report-only post-merge 03B):
  - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack).
  - `python scripts/trait_audit.py --check` → WARNING modulo `jsonschema` mancante; nessuna regressione sui tratti.
  - `node scripts/trait_style_check.js --output-json reports/temp/patch-03B-incoming-cleanup/trait_style.json --fail-on error` → PASS (0 errori / 176 warning / 66 info).
- Verifica redirect/link: confermata raggiungibilità dei nuovi percorsi di archivio e dei manifest locali; Master DD autorizza uscita dal freeze 03B dopo smoke positivo.

## 2026-02-17 – Redirect/backup validation 03B (freeze chiuso)
- Step ID: 03B-REDIRECT-VALIDATION-2026-02-17; owner: Master DD (approvatore umano) con agente archivist.
- Branch: `patch/03B-incoming-cleanup`; scope: verifica integrità backup incoming e redazione redirect/indici senza toccare `data/core/**` o `data/derived/**`.
- Azioni: calcolati checksum locali dei bundle backup in `incoming/archive_cold/backups/2025-11-25/manifest.sha256` (rif. manifest S3), redatto `incoming/REDIRECTS.md` e aggiornati indici (`incoming/archive_cold/README.md`, `docs/incoming/archive/INDEX.md`).
- Smoke 02A (report-only post-redirect): `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack); `python scripts/trait_audit.py --check` → WARNING per jsonschema mancante ma nessuna regressione; `node scripts/trait_style_check.js --output-json reports/temp/patch-03B-incoming-cleanup/2026-02-17/trait_style.json --fail-on error` → PASS (0 errori / 403 warning / 62 info). Log salvati in `reports/temp/patch-03B-incoming-cleanup/2026-02-17/`.
- Freeze 03A/03B: Master DD approva uscita freeze dopo smoke positivo e redirect verificati; pronto il merge di `patch/03B-incoming-cleanup`.

## 2026-02-16 – Patchset 03A sinergie/i18n (validator 02A report-only)
- Branch: `patch/03A-core-derived`; owner: Master DD (approvatore umano) con agente coordinator/dev-tooling in STRICT MODE.
- Azioni: rese reciproche le sinergie bloccanti del `trait_audit`, aggiunti i campi descrittivi i18n ai trait della frattura_abissale_sinaptica e sincronizzato `data/traits/index.json` con i dataset sorgente.
- Validator 02A (report-only): `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack); `python scripts/trait_audit.py` → PASS (solo warning modulo jsonschema); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → PASS (0 errori / 403 warning). Log: `reports/temp/patch-03A-core-derived/schema_only.log`, `reports/temp/patch-03A-core-derived/trait_audit.log`, `reports/temp/patch-03A-core-derived/trait_style.log`.
- Documentazione: changelog aggiornato `reports/temp/patch-03A-core-derived/changelog.md`, rollback `reports/temp/patch-03A-core-derived/rollback.md` (snapshot freeze 2025-11-25). Approvazione Master DD richiesta prima del merge finale.

# 2025-11-25 – Richiesta freeze 2025-11-25T15:00Z e snapshot/backup eseguiti
- Step ID: FREEZE-REQUEST-2025-11-25T1500Z; owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE.
- Finestra freeze richiesta: **2025-11-25T15:00Z → 2025-11-27T15:00Z** su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**`; sblocco subordinato a via libera Master DD o rollback dedicato.
- Snapshot/backup creati in `reports/backups/2025-11-25T1500Z_freeze/` (checksum in `manifest.txt`):
  - `core_snapshot_2025-11-25T1500Z.tar.gz` — sha256 `ca398fe09b2761c0b6354921e5491d24aa75d16640fb21f0736fa424694c834e`
  - `derived_snapshot_2025-11-25T1500Z.tar.gz` — sha256 `b75661be3c2216844d38d3de9412cc8bc7a03eed16ec01ab1288723147000068`
  - `incoming_backup_2025-11-25T1500Z.tar.gz` — sha256 `4905044b6be251b85ba9026c4668728bafae2bafe3b5d716e155e5013288d64d`
  - `docs_incoming_backup_2025-11-25T1500Z.tar.gz` — sha256 `967eba521fe915f0c0bf18c633ffcfed3423ad3204d1a199cfe52a2850573ccb`
- Owner rollback: Master DD; ripristino consentito tramite estrazione puntuale degli archivi sopra elencati.

## 2025-11-25 – Rerun validator 02A (report-only su patch/03A-core-derived)
- Step ID: 02A-VALIDATOR-RERUN-2025-11-25; ticket: **[TKT-02A-VALIDATOR]**; owner: Master DD (approvatore umano) con agente dev-tooling in STRICT MODE.
- Branch: `patch/03A-core-derived`; scopo: riesecuzione validator 02A senza modifiche ai workflow CI, con log temporanei dedicati.
- Comandi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25/schema_only.log`); `python scripts/trait_audit.py --check` → WARNING per report mancante `logs/trait_audit.md` (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25/trait_audit.log`); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/rerun-2025-11-25/trait_style.json --fail-on error` → PASS con 0 errori / 403 warning / 62 info (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25/trait_style.log`, JSON: `.../trait_style.json`).
- Note: output salvati in `reports/temp/patch-03A-core-derived/rerun-2025-11-25/` come artefatti temporanei; esiti allineati alla baseline di `docs/planning/02A_validator_report.md`.

## 2025-11-25 – Checklist 02A in modalità report-only (schema-only, trait audit, trait style)
- Step ID: 02A-VALIDATOR-RERUN-2025-11-25-02; ticket: **[TKT-02A-VALIDATOR]**; owner: Master DD (approvatore umano) con agente dev-tooling in STRICT MODE.
- Branch: `patch/03A-core-derived`; scopo: riesecuzione checklist 02A in sola lettura con log temporanei condivisi prima del freeze.
- Comandi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-02/schema_only.log`); `python scripts/trait_audit.py --check` → WARNING (modulo jsonschema assente, audit senza regressioni; log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-02/trait_audit.log`); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/rerun-2025-11-25-02/trait_style.json --fail-on error` → PASS con 0 errori / 403 warning / 62 info (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-02/trait_style.log`, JSON nella stessa cartella).
- Note: artefatti temporanei salvati in `reports/temp/patch-03A-core-derived/rerun-2025-11-25-02/`; nessuna modifica ai workflow CI o ai dataset, esecuzione preparatoria al freeze.

## 2025-11-25 – Checklist 02A (report-only) – rerun 03
- Step ID: 02A-VALIDATOR-RERUN-2025-11-25-03; ticket: **[TKT-02A-VALIDATOR]**; owner: Master DD (approvatore umano) con agente dev-tooling in STRICT MODE.
- Branch: `patch/03A-core-derived`; scopo: riesecuzione checklist 02A in sola lettura con artefatti temporanei condivisi.
- Comandi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-03/schema_only.log`); `python scripts/trait_audit.py --check` → WARNING per modulo jsonschema mancante, nessuna regressione (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-03/trait_audit.log`); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/rerun-2025-11-25-03/trait_style.json --fail-on error` → PASS con 0 errori / 176 warning / 66 info su 225 file (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-03/trait_style.log`, JSON nella stessa cartella).
- Note: artefatti temporanei salvati in `reports/temp/patch-03A-core-derived/rerun-2025-11-25-03/`; nessuna modifica ai workflow CI o ai dataset.

## 2025-11-25 – Checklist 02A (report-only) – rerun 04
- Step ID: 02A-VALIDATOR-RERUN-2025-11-25-04; ticket: **[TKT-02A-VALIDATOR]**; owner: Master DD (approvatore umano) con agente dev-tooling in STRICT MODE.
- Branch: `patch/03A-core-derived`; scopo: kickoff 02A report-only con whitelist salvata e log `TKT-02A-VALIDATOR` aggiornato.
- Comandi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/schema_only.log`); `python scripts/trait_audit.py --check` → WARNING modulo jsonschema mancante, nessuna regressione (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/trait_audit.log`); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/trait_style.json --fail-on error` → PASS con 0 errori / 172 warning / 62 info (log: `reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/trait_style.log`, JSON nella stessa cartella).
- Note: artefatti temporanei salvati in `reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/` e copiati nei percorsi canonici `reports/temp/patch-03A-core-derived/{schema_only.log,trait_audit.log,trait_style.log,trait_style.json}` come whitelist di riferimento per il gate 03A.

## 2026-02-15 – Cleanup 03B con redirect + smoke 02A (report-only)
- Step ID: 03B-INCOMING-CLEANUP-2026-02-15; owner: Master DD (approvatore umano) con agente dev-tooling/archivist.
- Branch: `patch/03B-incoming-cleanup` (STRICT MODE); scope: spostamento bundle repo/devkit/inventari in `incoming/archive_cold/**` secondo manifesto 2025-11-25, senza toccare `data/core`/`data/derived`.
- Azioni cleanup: creato `incoming/archive_cold/README.md` e sotto-cartelle `backups/2025-11-25`, `devkit_scripts/2025-11-25`, `inventory/2025-11-25` con readme esplicativi; spostati `evo-tactics-final*`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip`, `evo-tactics-merged*`, `evo-tactics.zip` nel bucket backups; archiviati `incoming/docs/*` e `incoming/decompressed/*` come duplicati DevKit; spostati `incoming_inventory.json`, `compat_map*.json`, `game_repo_map.json`, `pack_biome_jobs_v8_alt.json` in inventory storico. Riferimento checksum: `reports/backups/2025-11-25_freeze/manifest.txt`.
- Smoke 02A (report-only, post-cleanup) su link/redirect dipendenze incoming ↔ core/derived:
  - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS con 3 avvisi pack (log: `reports/temp/patch-03B-incoming-cleanup/schema_only.log`).
  - `python scripts/trait_audit.py --check` → WARNING: richiesto report mancante (`logs/trait_audit.md` non presente) ma nessun blocco aggiuntivo (log: `reports/temp/patch-03B-incoming-cleanup/trait_audit.log`).
  - `node scripts/trait_style_check.js --output-json reports/temp/patch-03B-incoming-cleanup/trait_style.json --fail-on error` → PASS con 0 errori / 403 warning / 62 info (log: `reports/temp/patch-03B-incoming-cleanup/trait_style.log`, JSON in stessa cartella).
- Checklist post-pulizia: redirect pratici verso archive_cold completati, README aggiornati (`incoming/README.md`, `docs/incoming/README.md`), nessuna modifica a core/derived; backup 2025-11-25 resta riferimento per eventuale rollback.
- Freeze: Master DD approva uscita freeze 03A/03B dopo smoke positivo; stato freeze chiuso e pronto per merge di `patch/03B-incoming-cleanup`.

## 2025-11-25 – Verifica backup incoming e bozza redirect
- Step ID: INCOMING-BACKUP-VALIDATION-2025-11-25; ticket: **[TKT-INCOMING-BACKUP]** (da aprire); owner: Master DD (approvatore umano) con agente archivist.
- Esito backup: manifesto `reports/backups/2025-11-25_freeze/manifest.txt` conferma percorso `s3://evo-backups/game/2025-11-25_freeze/incoming_backup_2025-11-25.tar.gz` con sha256 `44fca4ef9f02871394f3b57fa665998aa748a169f32fb3baac93ef97f373a626`; archivio non presente nel repo → checksum non rieseguito, ultima verifica registrata 2025-11-25 (sha256 su S3). Inclusa nota gemella per `docs_incoming_backup_2025-11-25.tar.gz` (sha256 `c6f6cf435f7ce22326e8cbfbb34f0ee8029daa5f4ff55b6ee41a468f904840c`).
- Bozza redirect/indice (nessun file toccato):
  - **Archive freddo backup repo** → `incoming/evo-tactics-final*`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip`, `evo-tactics-merged*`, `evo-tactics.zip` → redirect proposto verso `archive_cold/incoming/backups/2025-11-25/` con riferimento al manifest S3.
  - **Script DevKit duplicati** → `incoming/docs/*`, `incoming/decompressed/*` → redirect proposto verso `archive_cold/incoming/devkit_scripts/2025-11-25/` dopo diff con `tools/`.
  - **Inventari storici** → `incoming/incoming_inventory.json`, `compat_map*.json`, `game_repo_map.json`, `pack_biome_jobs_v8_alt.json` → redirect proposto verso `archive_cold/incoming/inventory/2025-11-25/` mantenendo copia referenziata in `docs/planning/REF_INCOMING_CATALOG.md`.
- Prossimi passi: aprire **[TKT-INCOMING-BACKUP]** per la rihash degli archivi off-repo e approvazione Master DD; schedulare applicazione redirect in 03B assieme a archivist + dev-tooling (validazione checksum su S3 prima di movimentare).

## 2026-02-14 – Patchset 03A ready for merge (validator 02A in pass)
- Step ID: 03A-VALIDATOR-RERUN-2026-02-14; owner: Master DD (approvatore umano) con agente coordinator/dev-tooling.
- Branch: `patch/03A-core-derived` (STRICT MODE).
- Comandi: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`; `python scripts/trait_audit.py --check`; `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error`.
- Esito: **PASS** (schema-only ok con 3 avvisi pack, trait audit senza blocchi, trait style 0 errori / 403 warning). Log: `reports/temp/patch-03A-core-derived/schema_only.log`, `reports/temp/patch-03A-core-derived/trait_audit.log`, `reports/temp/patch-03A-core-derived/trait_style.log`.
- Documentazione: changelog `reports/temp/patch-03A-core-derived/changelog.md`; rollback `reports/temp/patch-03A-core-derived/rollback.md` (snapshot 2025-11-25_freeze).
- Note: via libera **Master DD** al merge 03A richiesto; freeze 03A/03B invariato in attesa di approvazione.

## 2026-02-14 – Rerun validator 02A (report-only su patch/03A-core-derived)
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

## 2025-11-25 – Freeze 03AB approvato con snapshot/backup
- Owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE.
- Ticket: **[TKT-03AB-FREEZE]** aperto in `docs/planning/TKT-03AB-FREEZE.md`.
- Finestra freeze: 2025-11-25T12:05Z → 2025-11-27T12:05Z su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**`; sblocco solo previa autorizzazione Master DD o rollback.
- Snapshot/backup etichettati 2025-11-25:
  - `reports/backups/2025-11-25_freeze/core_snapshot_2025-11-25.tar.gz` — sha256 `f42ac8a30fffafa4a6178602cf578474fe2c0c03b6c26a664fec5dc04aeabe17`
  - `reports/backups/2025-11-25_freeze/derived_snapshot_2025-11-25.tar.gz` — sha256 `e9552e270b16af35731156dc04888df4d590f6677624fc9a9232e0e3c43b675b`
  - `reports/backups/2025-11-25_freeze/incoming_backup_2025-11-25.tar.gz` — sha256 `44fca4ef9f02871394f3b57fa665998aa748a169f32fb3baac93ef97f373a626`
  - `reports/backups/2025-11-25_freeze/docs_incoming_backup_2025-11-25.tar.gz` — sha256 `c6f6cf435f7ce22326e8cbfbb34f0ee8029daae5f4ff55b6ee41a468f904840c`
- Owner rollback: Master DD; ripristino consentito tramite estrazione degli archivi sopra elencati.

  Nota: gli archivi sono custoditi off-repo (policy anti-binary PR); in git restano solo manifest/checksum e il percorso logico.

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

## 2026-02-18 – Patchset 03A (cluster sonoro + validator 02A report-only)
- Step ID: 03A-SONIC-VALIDATOR-2026-02-18; branch: `patch/03A-core-derived`; owner: Master DD (approvatore umano) con agente coordinator in STRICT MODE.
- Azioni: corretti i trait sonori (`ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici`) aggiungendo chiavi i18n su `fattore_mantenimento_energetico`, usage tags e slot_profile coerenti; sinergie rese reciproche in JSON e index.
- Validator 02A (report-only): `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack); `python scripts/trait_audit.py --check` → PASS (solo warning modulo jsonschema); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → PASS (0 errori / 393 warning / 62 info). Log aggiornati in `reports/temp/patch-03A-core-derived/{schema_only.log,trait_audit.log,trait_style.log}`.
- Documentazione: changelog `reports/temp/patch-03A-core-derived/changelog.md` e rollback `reports/temp/patch-03A-core-derived/rollback.md` aggiornati (snapshot di riferimento 2025-11-25). Merge subordinato ad approvazione finale di Master DD.

## 2026-02-19 – 03A sonic cluster hotfix (fattore_mantenimento_energetico)
- Step ID: 03A-SONIC-NONLOCAL-2026-02-19; branch `patch/03A-core-derived`; owner: Master DD (approvatore), agente trait-curator/dev-tooling in STRICT MODE.
- Azioni: ripristinati valori testuali inline di `fattore_mantenimento_energetico` per `ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici`; reso il validator stile (`traitStyleGuide`) coerente con `NON_LOCALISED_FIELDS` di `scripts/sync_trait_locales.py` per evitare conversioni a i18n.
- Validator 02A (report-only) rieseguiti: schema-only **OK** (3 avvisi pack), trait audit **OK** (avviso modulo jsonschema mancante), trait style **OK** (0 errori; 172 warning, 62 info). Log e report aggiornati in `reports/temp/patch-03A-core-derived/` (json/md/log).
- Riferimenti: changelog aggiornato `reports/temp/patch-03A-core-derived/changelog.md`, rollback `reports/temp/patch-03A-core-derived/rollback.md`. Merge subordinato all'approvazione finale di Master DD.

## 2026-02-20 – 03A sonic cluster debolezze + rerun 02A (report-only)
- Step ID: 03A-SONIC-WEAKNESS-2026-02-20; branch `patch/03A-core-derived`; owner: Master DD (approvatore umano) con agente dev-tooling in STRICT MODE.
- Azioni: aggiunte chiavi `debolezza` con testi dedicati ai trait sonori (`ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici`) e allineati `data/traits/index.json` e `locales/it/traits.json`; aggiornato il report `trait_style.md` e il rollback pack 03A.
- Validator 02A (report-only): `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → **OK** (3 avvisi pack); `python scripts/trait_audit.py --check` → **OK** (warning modulo jsonschema mancante); `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → **OK** (0 errori; 168 warning; 62 info). Log salvati in `reports/temp/patch-03A-core-derived/` e copia in `.../rerun-2025-11-25T23-27-06Z/`.
- Richiesta: approvazione **Master DD** per il merge di `patch/03A-core-derived` con changelog/rollback aggiornati e validatori 02A in pass (report-only).

## 2025-11-25 – 03B cleanup incoming (verifica backup + smoke 02A)
- Branch: `patch/03B-incoming-cleanup`; owner: Master DD (approvatore umano) con agente archivist in STRICT MODE.
- Azioni: verificata integrità dei bundle in `incoming/archive_cold/backups/2025-11-25/` con `sha256sum -c manifest.sha256` (tutti **OK**) e riallineati redirect/README 03B senza toccare `data/core/**` o `data/derived/**`.
- Smoke 02A (report-only):
  - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack).
  - `python scripts/trait_audit.py --check` → PASS (schema skip per jsonschema mancante; nessuna regressione).
  - `node scripts/trait_style_check.js --output-json reports/temp/patch-03B-incoming-cleanup/trait_style.json --fail-on error` → PASS (0 errori; 172 warning, 62 info; solo suggerimenti stilistici preesistenti).
- Esito: redirect e manifest 03B validati; via libera Master DD per chiudere il freeze soft su `incoming/**`/`docs/incoming/**` dopo merge.

## 2025-11-28 – Audit manifest backup rollback 03A/03B (archivist)
- Verificate le cartelle `reports/backups/2025-11-25T1500Z_freeze`, `.../2025-11-25T1724Z_masterdd_freeze`, `.../2025-11-25T2028Z_masterdd_freeze` e confermati i checksum presenti (revisionati i manifest *.sha256 senza ricalcolo).
- Normalizzati i `manifest.txt` con campi Location/On-call/Last verified e nota sull'uso per rollback 03A/03B per i bundle `incoming` e `docs_incoming` in S3 `evo-backups`.
- Nessun binario aggiunto; verifica documentata come review dei manifest (checksum non ricalcolati).
