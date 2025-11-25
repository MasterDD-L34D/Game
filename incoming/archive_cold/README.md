# archive_cold – Incoming cleanup (2025-11-25 freeze)

Queste cartelle raccolgono materiale storico spostato durante il cleanup 03B.
Gli artefatti non vanno reimportati direttamente; usare i backup off-repo
tracciati in `reports/backups/2025-11-25_freeze/manifest.txt`.

- `backups/2025-11-25/`: bundle completi del repository (repo ZIP/DevKit) con
  checksum registrati nel manifest S3 (`incoming_backup_2025-11-25.tar.gz`).
  Verifica locale aggiornata al 2025-11-25 in `backups/2025-11-25/manifest.sha256`.
- `devkit_scripts/2025-11-25/`: script e estrazioni DevKit duplicati rispetto a
  `tools/` usati solo come storico.
- `inventory/2025-11-25/`: inventari e mappe legacy sostituiti dal catalogo
  `docs/planning/REF_INCOMING_CATALOG.md`.
- `reports/2025-11-25_site/`: pacchetti HTML/ZIP del sito intake archiviati
  durante il cleanup 03B con manifest `manifest.sha256`.

Per ripristinare, usare gli archivi off-repo o il manifest sopra citato e
loggare l’operazione in `logs/agent_activity.md`.
