# TKT-03AB-FREEZE — Freeze core/derived/incoming

## Contesto

Freeze straordinario richiesto per proteggere `core/**`, `derived/**`, `incoming/**` e `docs/incoming/**` durante la fase 03A/03B.

## Approvals

- Master DD (approvatore umano) – 2025-11-25T12:05Z
- Master DD (approvatore umano) – 2025-12-02T13:58Z (chiusura freeze 03AB post triade/smoke PASS; merge 03A→03B→main autorizzato)
- Agente: coordinator (esecuzione in STRICT MODE)

## Finestra di freeze

- Start: 2025-11-25T12:05Z
- End: 2025-11-27T12:05Z
- Scope: blocco merge/patch su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**`, salvo interventi di rollback autorizzati.

## Stato 2025-12-02

- Triade Frattura Abissale + smoke rieseguite via `bash scripts/qa/run_frattura_abissale_pipeline.sh`: **PASS** (schema/coerenza, trait style 0 suggerimenti, evaluate+sync in dry-run senza modifiche).
- Master DD approva i gate triade/smoke e autorizza il merge sequenziale `patch/03A-core-derived` → `patch/03B-incoming-cleanup` → `main`, dichiarando chiuso il freeze 03AB.
- Manifest di backup confermati per la chiusura e archiviati come riferimento: `reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, `reports/backups/2025-11-25T1500Z_freeze/manifest.txt`, `reports/backups/2025-11-25T1724Z_masterdd_freeze/manifest.txt`, `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt`.

### Stato manifest e retrieval (verifica 2025-12-08)

- `reports/backups/2025-11-25_freeze/manifest.txt` — **presente**. I riferimenti S3 per i quattro tar (`core_snapshot_2025-11-25`, `derived_snapshot_2025-11-25`, `incoming_backup_2025-11-25`, `docs_incoming_backup_2025-11-25`) sono documentati in questa pagina nella sezione _Retrieval_ con ruolo `backup-restore` e comando `aws s3 cp … | sha256sum`.
- `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt` — **presente**, modalità archive-less: nessun archivio S3 da prelevare; il recupero si effettua ristabilendo i file testuali indicati in `inventory.md` e rieseguendo smoke/validator.
- `reports/backups/2025-11-25T1500Z_freeze/manifest.txt` — **presente** con percorsi S3 espliciti per i quattro tar del freeze 15:00Z (core/derived/incoming/docs_incoming); usare ruolo `backup-restore` in sola lettura e verificare i checksum SHA256 riportati nel manifest prima del ripristino.
- `reports/backups/2025-11-25T1724Z_masterdd_freeze/manifest.txt` — **presente** con percorsi S3 espliciti per i tar 17:24Z; seguire le note `manifest.sha256` per i checksum originali e ruolo `backup-restore` per l’accesso.
- `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt` — **presente** con percorsi S3 espliciti per i tar 20:28Z; usare il ruolo `backup-restore` e validare gli SHA256 del manifest prima di eventuali estrazioni.

## Artefatti di snapshot/backup

- Archivi custoditi off-repo (policy anti-binary in PR). Percorso logico: `reports/backups/2025-11-25_freeze/`.
- Manifests:
  - `core_snapshot_2025-11-25.tar.gz` — sha256 `d986100a5440aea18658d6a22600cd403ba9fcfb6db4473dc9dd70227d43b984`
  - `derived_snapshot_2025-11-25.tar.gz` — sha256 `283e3b2f50514446dd9843a069ed089bd79f470bbcb0cdb3caab1a6b96c45355`
  - `incoming_backup_2025-11-25.tar.gz` — sha256 `043c20b99dc565a3f3e354959f2dd273183435001583c009133d4c4c7fd2a619`
  - `docs_incoming_backup_2025-11-25.tar.gz` — sha256 `c5475c1c32813b2feb861768480c1a851dbc7667e9c54bf642fea873d0201a9c`

## Retrieval

- `core_snapshot_2025-11-25.tar.gz`
  - Storage: generato on-demand via `scripts/backup/rebuild_freeze_2025_11_25.sh` in `reports/backups/2025-11-25_freeze/staging/artifacts/core_snapshot_2025-11-25.tar.gz` (no S3 tracking per il freeze baseline).
  - Access: repository locale; nessun ruolo AWS richiesto (policy anti-binary in PR → artefatti esclusi dal repo, rigenerabili).
  - Checksum: `cd reports/backups/2025-11-25_freeze && sha256sum -c source_lists/core_snapshot_2025-11-25.tar.gz.sha256`.

- `derived_snapshot_2025-11-25.tar.gz`
  - Storage: generato on-demand via `scripts/backup/rebuild_freeze_2025_11_25.sh` in `reports/backups/2025-11-25_freeze/staging/artifacts/derived_snapshot_2025-11-25.tar.gz`.
  - Access: repository locale; nessun ruolo AWS richiesto (artefatti rigenerabili, non committati).
  - Checksum: `cd reports/backups/2025-11-25_freeze && sha256sum -c source_lists/derived_snapshot_2025-11-25.tar.gz.sha256`.

- `incoming_backup_2025-11-25.tar.gz`
  - Storage: generato on-demand via `scripts/backup/rebuild_freeze_2025_11_25.sh` in `reports/backups/2025-11-25_freeze/staging/artifacts/incoming_backup_2025-11-25.tar.gz`.
  - Access: repository locale; nessun ruolo AWS richiesto (artefatti rigenerabili, non committati).
  - Checksum: `cd reports/backups/2025-11-25_freeze && sha256sum -c source_lists/incoming_backup_2025-11-25.tar.gz.sha256`.

- `docs_incoming_backup_2025-11-25.tar.gz`
  - Storage: generato on-demand via `scripts/backup/rebuild_freeze_2025_11_25.sh` in `reports/backups/2025-11-25_freeze/staging/artifacts/docs_incoming_backup_2025-11-25.tar.gz`.
  - Access: repository locale; nessun ruolo AWS richiesto (artefatti rigenerabili, non committati).
  - Checksum: `cd reports/backups/2025-11-25_freeze && sha256sum -c source_lists/docs_incoming_backup_2025-11-25.tar.gz.sha256`.

## Rollback

- Owner rollback: Master DD (approvatore umano)
- Ripristino: estrarre l’archivio pertinente nella root del repository e ripristinare i permessi di default.

## Note operative

- Validare eventuali patch future contro la finestra di freeze prima di procedere.
- Loggare in `logs/agent_activity.md` ogni eccezione o rollback.
