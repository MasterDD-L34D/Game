# Audit bundle 02A → 03A/03B (ciclo 2026-02-20)

## Scopo
Raccogliere in un unico punto i riferimenti operativi per chiudere il ciclo 02A→03A→03B e preparare il riavvio successivo. Il bundle è esclusivamente testuale, punta agli artefatti già versionati (log, changelog, rollback, istruzioni backup/redirect) e sostituisce definitivamente l'uso di archivi binari.

## Indice artefatti
- **Log freeze/sblocco**
  - Freeze 03AB (2025-11-25) registrato in `logs/agent_activity.md` con snapshot/core/derived/incoming e owner Master DD.
  - Sblocco finale registrato il 2026-02-21 in `logs/agent_activity.md` (step `UNFREEZE-02A-APPROVED-2026-02-21`) con approvazione Master DD, riallineamento backup/redirect e trigger PIPELINE_SIMULATOR della sequenza 02A→freeze→03A→03B.
- **Report 02A – baseline (pre-03A)**
  - Validatori 02A in report-only per `patch/03A-core-derived`: `reports/temp/patch-03A-core-derived/{schema_only.log,trait_audit.log,trait_style.log,trait_style.json}` e appendici `trait_style.md`/`changelog.md`.
  - Rerun dedicati (report-only) per TKT-02A con copie in `reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/` e `.../rerun-2025-11-25T23-27-06Z/`.
  - Rerun 02A report-only 2025-11-28T15:44Z su `patch/03A-core-derived` con log `schema_only.log`, `trait_audit.log`, `trait_style.log`, `trait_style.json` salvati nei percorsi canonici `reports/temp/patch-03A-core-derived/` e mirrorati in `reports/temp/patch-03A-core-derived/rerun-2025-11-28T15-44-05Z/`.
- **Report 02A – post-merge (smoke 03B)**
  - Output smoke 02A in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/` (`schema_only.log`, `trait_audit.log`, `trait_style.log`, `trait_style.json`).
  - Rerun 2026-04-27 (report-only) su `patch/03B-incoming-cleanup`: `schema_only.log` riporta 14 controlli con 3 avvisi complessivi; `trait_audit.log` segnala l’assenza del precedente `reports/schema_validation.json` (nessun output aggiuntivo); `trait_style.log` produce 62 suggerimenti informativi senza errori o warning.
- **Changelog + rollback 03A**
  - Changelog: `reports/temp/patch-03A-core-derived/changelog.md`.
  - Pacchetto rollback: `reports/temp/patch-03A-core-derived/rollback.md` (agganciato allo snapshot 2025-11-25).
- **Backup/redirect 03B**
  - Istruzioni di backup/restore incoming: `reports/backups/2026-02-20_incoming_backup/README.md`.
  - Piano redirect e rischi: `reports/temp/patch-03B-incoming-cleanup/2026-02-20/cleanup_redirect.md`.

## Uso pratico (riavvio ciclo)
1. **Verifica log** – `logs/agent_activity.md` contiene la chiusura freeze/sblocco del 2026-02-21 con approvazione Master DD e trigger PIPELINE_SIMULATOR (step `UNFREEZE-02A-APPROVED-2026-02-21`).
2. **Conferma baseline** – Riesamina i log 02A baseline e le whitelist 02A presenti nei rerun 2025-11-25 per allineare i validator al nuovo ciclo.
3. **Validazione post-merge** – Conserva gli output smoke 02A del 2026-02-20 come riferimento iniziale per il prossimo ciclo; riesegui se cambiano gli input core/pack.
4. **Ripristino rapido** – In caso di regressione, applica il rollback 03A seguendo `reports/temp/patch-03A-core-derived/rollback.md` e, per incoming, le istruzioni di `reports/backups/2026-02-20_incoming_backup/README.md`.
5. **Trigger riavvio** – La sequenza 02A→freeze→03A→03B è stata già rilanciata via PIPELINE_SIMULATOR nella finestra di sblocco 2026-02-21; mantenere questa baseline per i prossimi rerun e ricollegare eventuali override di branch/log al nuovo ciclo.

## Readiness check (prossimo ciclo)
- **Dipendenza `jsonschema`**: richiesta per `scripts/trait_audit.py`; confermare presenza del pacchetto Python nel venv locale prima del rerun (warning pregresso risolto installando `jsonschema`).
- **Override di branch/log**: usare i percorsi già referenziati (`reports/temp/patch-03A-core-derived/`, `reports/temp/patch-03B-incoming-cleanup/2026-02-20/`) come baseline; documentare ogni override in `logs/agent_activity.md`.
- **Audit bundle**: il presente file è la sola fonte; il precedente archivio binario (`logs/audit-bundle.tar.gz`) è deprecato e non è richiesto per l'avvio dei cicli 03A/03B.

## Checklist di copertura
- [x] Log freeze referenziati
- [x] Log sblocco registrato
- [x] Report 02A iniziale
- [x] Report 02A post-merge (smoke)
- [x] Changelog + rollback 03A
- [x] Istruzioni backup/redirect 03B
- [x] Trigger riavvio eseguito

## Step 2026-04-28 (rerun 02A → gate 03A → checkpoint 03B)
- **Rerun 02A (report-only)** — log consolidato in `logs/TKT-02A-VALIDATOR.rerun.log` (sha256 `31e07dde55ebd94ab1c31ba59f36a261e09a50b8f72083ef4d50cd8c925d44bb`) e copie specchiate in `reports/temp/patch-03A-core-derived/`:
  - `schema_only.log` — sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`.
  - `trait_audit.log` — sha256 `a4bfc3b7ac4d77dc4998c88930383fc49c4939d1093298323653643eb5d89277`.
  - `trait_style.log` — sha256 `abd65d68ce177386a7fd7c7a1f25ac66dadfabe6f2aeb85364b0a54d04b9ed02`.
  - `trait_style.json` — sha256 `c8637e02f78c5b0d1ac701bcc9ffb8396aee85e2ab50901f144db80618657050`.
- **Gate 03A (pre-merge)** — validazione del branch `patch/03A-core-derived` basata sugli stessi log di rerun 02A (checksum sopra) e sugli artefatti di controllo (`changelog.md`, `rollback.md`) già presenti in `reports/temp/patch-03A-core-derived/`; nessun tarball richiesto.
- **Checkpoint 03B (post-03A)** — mirror dei log in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/` con checksum allineati al gate 03A:
  - `schema_only.log` — sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`.
  - `trait_audit.log` — sha256 `5a1f64d7be8872c48562730e9d5ac584cdf200e9eb10ee1f4c6d5ce15653aa4e`.
  - `trait_style.log` — sha256 `abd65d68ce177386a7fd7c7a1f25ac66dadfabe6f2aeb85364b0a54d04b9ed02`.
  - `trait_style.json` — sha256 `cf6a425b78356efae638740a32dd5c1cd8b6e27243f83052a10fc25749018afa`.
- **Stato tarball** — confermato che l’audit rimane solo testuale; nessun archivio binario aggiunto o richiesto.

## Step 2026-05-01 (rerun 02A → gate 03A → checkpoint/cleanup 03B)
- **Rerun 02A (report-only)** — log schema-only aggiornati in `reports/temp/patch-03A-core-derived/schema_only_2026-05-01.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`); confermata la sola presenza di 3 avvisi pack.
- **Gate 03A** — validazione schema-only specchiata in `schema_only_2026-05-01_gate.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`, identico al rerun). Gate chiuso in report-only con approvazione Master DD e riferimenti in `changelog.md`/`rollback.md`.
- **Checkpoint 03B** — prima del cleanup è stata riconfermata la catena di backup/redirect (`reports/backups/2025-11-25_freeze/manifest.txt`, `incoming/archive_cold/backups/2025-11-25/manifest.sha256`, `reports/backups/2026-02-20_incoming_backup/README.md`), mantenendo il freeze su incoming/redirect.
- **Cleanup 03B + smoke** — rieseguito smoke 02A schema-only in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/schema_only_2026-05-01_smoke.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`, uguale a rerun/gate); `cleanup_redirect.md` aggiornato a log, nessun tarball o spostamento fisico, freeze 03B chiuso con firma Master DD.

## Step 2026-05-02 (rerun 02A schema-only)
- **Rerun 02A (report-only)** — log schema-only aggiornati in `reports/temp/patch-03A-core-derived/schema_only_2026-05-02.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`, 14 controlli eseguiti con 3 avvisi pack); aggiornamento testuale dell’audit bundle, nessun tarball o artefatto binario aggiunto.
- **Gate 03A (schema-only)** — validazione in report-only specchiata in `reports/temp/patch-03A-core-derived/schema_only_2026-05-02_gate.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`, identico al rerun) con approvazione Master DD registrata in `logs/agent_activity.md`; nessun artefatto aggiuntivo oltre al log testuale.
- **Checkpoint 03B** — riletti i manifest di backup/redirect (`reports/backups/2025-11-25_freeze/manifest.txt`, `incoming/archive_cold/backups/2025-11-25/manifest.sha256`, `reports/backups/2026-02-20_incoming_backup/README.md`) confermando il freeze attivo su incoming/redirect e nessun redirect modificato; evidenza loggata in `logs/agent_activity.md` e nel presente bundle.
- **Cleanup 03B + smoke** — confermati redirect invariati e fonti di backup come sopra; smoke schema-only post-merge salvato in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/schema_only_2026-05-02_smoke.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`, 14 controlli con 3 avvisi pack). Freeze 03B chiuso con firma Master DD; nessun artefatto binario aggiunto.

## Appendice rerun 2026-04-17 (solo testuale)
- Log operativi: sblocco registrato in [`logs/agent_activity.md` (entry UNFREEZE-02A-APPROVED-2026-02-21)](../../logs/agent_activity.md#2026-02-21--sblocco-freeze--trigger-pipeline_simulator-coordinator) e rerun 02A (report-only) in [`logs/agent_activity.md` (03A sonic cluster debolezze + rerun 02A)](../../logs/agent_activity.md#2026-02-20--03a-sonic-cluster-debolezze--rerun-02a-report-only); verifica 2026-04-17 registrata in [`logs/agent_activity.md` (03A-READINESS-CHECK-2026-04-17)](../../logs/agent_activity.md#2026-04-17--verifica-log-02a-e-mirror-03a03b-archivist).
- Riferimenti runbook/log 02A: sequenza copiata dal runbook [`docs/planning/REF_PATCHSET_02A_TO_03AB_RUNBOOK.md`](../../docs/planning/REF_PATCHSET_02A_TO_03AB_RUNBOOK.md); log 02A pianificati in [`logs/agent_activity.md` (RERUN-02A-PLAN-2026-04-13)](../../logs/agent_activity.md#2026-04-13--freeze-03b-confermato--piano-rerun-02a-archivist) ed eseguiti in [`logs/agent_activity.md` (RERUN-02A-EXEC-2026-04-13)](../../logs/agent_activity.md#2026-04-13--freeze-03b-confermato--piano-rerun-02a-archivist); output consolidato in `logs/TKT-02A-VALIDATOR.rerun.log` allineato ai percorsi 03A/03B.
- Rerun aggiuntivo 02A (report-only) 2025-11-28T15:44Z su `patch/03A-core-derived`: log `schema_only.log`, `trait_audit.log`, `trait_style.log`, `trait_style.json` disponibili in `reports/temp/patch-03A-core-derived/` e specchiati in `reports/temp/patch-03A-core-derived/rerun-2025-11-28T15-44-05Z/` (warning jsonschema mancante su trait audit).
- Log rerun schema/trait/style 03A (report-only) in `reports/temp/patch-03A-core-derived/`:
  - `schema_only.log` — sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`.
  - `trait_audit.log` — sha256 `a4bfc3b7ac4d77dc4998c88930383fc49c4939d1093298323653643eb5d89277`.
  - `trait_style.log` — sha256 `1ac8496f3f4a1fb340026a93b6608a3d713c9edbacf715dc3e7e91ac19460c6d`.
  - `trait_style.json` — sha256 `bfea3a033eb43e86c0368af196e0803df17270c937350ae26f13b1dd053e3d4e`.
- Log rerun schema/trait/style 03B (smoke post-merge) in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/` (stessa serie di checksum della baseline 03A):
  - `schema_only.log` — sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`.
  - `trait_audit.log` — sha256 `a4bfc3b7ac4d77dc4998c88930383fc49c4939d1093298323653643eb5d89277`.
  - `trait_style.log` — sha256 `1ac8496f3f4a1fb340026a93b6608a3d713c9edbacf715dc3e7e91ac19460c6d`.
  - `trait_style.json` — sha256 `bfea3a033eb43e86c0368af196e0803df17270c937350ae26f13b1dd053e3d4e`.
- Nessun tarball o artefatto binario aggiunto: i checksum sono testuali e i log restano nei percorsi già indicizzati.
- Note verifica 2026-04-17:
  - La sequenza del runbook `REF_PATCHSET_02A_TO_03AB_RUNBOOK.md` è rispettata: i log 02A (schema_only/trait_audit/trait_style) rieseguiti il 2026-04-13 sono presenti e specchiati nei percorsi 03A/03B senza delta nei contenuti.
- L’archivio binario `logs/audit-bundle.tar.gz` è stato ritirato: la documentazione rimane solo in formato testuale e non è necessario alcun tarball per avviare le patch 03A/03B.

### Mini-checklist rerun 2026-04-XX
- [x] Log freeze/sblocco
- [x] Report 02A baseline
- [x] Report 02A post-merge
- [x] Changelog/rollback 03A
- [x] Backup/redirect 03B
