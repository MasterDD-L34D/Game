# Backup incoming 2026-02-20 (istruzioni operative)

## Scopo
Documentare il checkpoint di transizione verso 03B con backup/redirect pronti e le istruzioni di ripristino
per il buffer `incoming/` senza aggiungere archivi binari al repository.

## Artefatti di riferimento
- Backup registrati nel manifest storico `reports/backups/2025-11-25_freeze/manifest.txt` (S3) per `incoming` e `docs_incoming`.
- Verifica locale precedente: `incoming/archive_cold/backups/2025-11-25/manifest.sha256` (checksum OK 2025-11-25).
- Indici/redirect correnti: `incoming/REDIRECTS.md` e `docs/incoming/archive/INDEX.md`.

## Istruzioni di ripristino
1. Recupera gli archivi dal bucket indicato nel manifest 2025-11-25 (`incoming_backup_2025-11-25.tar.gz`, `docs_incoming_backup_2025-11-25.tar.gz`).
2. Riesegui `sha256sum -c manifest.sha256` usando il file in `incoming/archive_cold/backups/2025-11-25/` prima di estrarre.
3. Estrai gli archivi in staging e confronta con lo stato post-03B usando i log smoke 02A (schema-only, trait audit, trait style).
4. In caso di rollback, ripristina i redirect originali seguendo la tabella in `incoming/REDIRECTS.md` e aggiorna il log in `logs/agent_activity.md`.

## Stato verifiche
- Nessun ricalcolo checksum eseguito in questa registrazione (report-only); ultima verifica nota: 2025-11-25.
- Smoke 02A post-merge 03B aggiornato in `reports/temp/patch-03B-incoming-cleanup/2026-02-20/`.
- 2025-12-01: post-merge 03A rieseguito controllo di coerenza redirect/manifest senza re-upload; riferimento ai backup S3 invariato (`reports/backups/2025-11-25_freeze/manifest.txt`). Log smoke mirror 03B in `reports/temp/patch-03B-incoming-cleanup/2025-12-01-smoke/`.

## Contatti
- Owner operativo: coordinator + dev-tooling.
- Approvazione richiesta: Master DD per eventuale estrazione/rollback.
