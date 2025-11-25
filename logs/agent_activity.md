# Agent activity log

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

## 2025-11-25 – 03B cleanup incoming (verifica backup + smoke 02A)
- Branch: `patch/03B-incoming-cleanup`; owner: Master DD (approvatore umano) con agente archivist in STRICT MODE.
- Azioni: verificata integrità dei bundle in `incoming/archive_cold/backups/2025-11-25/` con `sha256sum -c manifest.sha256` (tutti **OK**) e riallineati redirect/README 03B senza toccare `data/core/**` o `data/derived/**`.
- Smoke 02A (report-only):
  - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → PASS (3 avvisi pack).
  - `python scripts/trait_audit.py --check` → PASS (schema skip per jsonschema mancante; nessuna regressione).
  - `node scripts/trait_style_check.js --output-json reports/temp/patch-03B-incoming-cleanup/trait_style.json --fail-on error` → PASS (0 errori; 172 warning, 62 info; solo suggerimenti stilistici preesistenti).
- Esito: redirect e manifest 03B validati; via libera Master DD per chiudere il freeze soft su `incoming/**`/`docs/incoming/**` dopo merge.
