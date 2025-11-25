# TKT-03AB-FREEZE — Freeze core/derived/incoming

## Contesto

Freeze straordinario richiesto per proteggere `core/**`, `derived/**`, `incoming/**` e `docs/incoming/**` durante la fase 03A/03B.

## Approvals

- Master DD (approvatore umano) – 2025-11-25T12:05Z
- Agente: coordinator (esecuzione in STRICT MODE)

## Finestra di freeze

- Start: 2025-11-25T12:05Z
- End: 2025-11-27T12:05Z
- Scope: blocco merge/patch su `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**`, salvo interventi di rollback autorizzati.

## Artefatti di snapshot/backup

- Archivi custoditi off-repo (policy anti-binary in PR). Percorso logico: `reports/backups/2025-11-25_freeze/`.
- Manifests:
  - `core_snapshot_2025-11-25.tar.gz` — sha256 `f42ac8a30fffafa4a6178602cf578474fe2c0c03b6c26a664fec5dc04aeabe17`
  - `derived_snapshot_2025-11-25.tar.gz` — sha256 `e9552e270b16af35731156dc04888df4d590f6677624fc9a9232e0e3c43b675b`
  - `incoming_backup_2025-11-25.tar.gz` — sha256 `44fca4ef9f02871394f3b57fa665998aa748a169f32fb3baac93ef97f373a626`
  - `docs_incoming_backup_2025-11-25.tar.gz` — sha256 `c6f6cf435f7ce22326e8cbfbb34f0ee8029daae5f4ff55b6ee41a468f904840c`

## Retrieval

- `core_snapshot_2025-11-25.tar.gz`
  - Storage: `s3://evo-backups/game/2025-11-25_freeze/core_snapshot_2025-11-25.tar.gz`
  - Access: ruolo `arn:aws:iam::123456789012:role/backup-restore` (SSO readonly; ticket SOC richiesto per assunzione del ruolo)
  - Checksum: `aws s3 cp s3://evo-backups/game/2025-11-25_freeze/core_snapshot_2025-11-25.tar.gz - | sha256sum`

- `derived_snapshot_2025-11-25.tar.gz`
  - Storage: `s3://evo-backups/game/2025-11-25_freeze/derived_snapshot_2025-11-25.tar.gz`
  - Access: ruolo `arn:aws:iam::123456789012:role/backup-restore` (SSO readonly; ticket SOC richiesto per assunzione del ruolo)
  - Checksum: `aws s3 cp s3://evo-backups/game/2025-11-25_freeze/derived_snapshot_2025-11-25.tar.gz - | sha256sum`

- `incoming_backup_2025-11-25.tar.gz`
  - Storage: `s3://evo-backups/game/2025-11-25_freeze/incoming_backup_2025-11-25.tar.gz`
  - Access: ruolo `arn:aws:iam::123456789012:role/backup-restore` (SSO readonly; ticket SOC richiesto per assunzione del ruolo)
  - Checksum: `aws s3 cp s3://evo-backups/game/2025-11-25_freeze/incoming_backup_2025-11-25.tar.gz - | sha256sum`

- `docs_incoming_backup_2025-11-25.tar.gz`
  - Storage: `s3://evo-backups/game/2025-11-25_freeze/docs_incoming_backup_2025-11-25.tar.gz`
  - Access: ruolo `arn:aws:iam::123456789012:role/backup-restore` (SSO readonly; ticket SOC richiesto per assunzione del ruolo)
  - Checksum: `aws s3 cp s3://evo-backups/game/2025-11-25_freeze/docs_incoming_backup_2025-11-25.tar.gz - | sha256sum`

## Rollback

- Owner rollback: Master DD (approvatore umano)
- Ripristino: estrarre l’archivio pertinente nella root del repository e ripristinare i permessi di default.

## Note operative

- Validare eventuali patch future contro la finestra di freeze prima di procedere.
- Loggare in `logs/agent_activity.md` ogni eccezione o rollback.
