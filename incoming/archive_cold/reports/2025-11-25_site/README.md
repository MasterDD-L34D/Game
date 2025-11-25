# Report sito intake – 2025-11-25 (archiviazione fredda)

Contiene i pacchetti HTML/ZIP del sito intake spostati da `incoming/` durante
il cleanup 03B. Usare solo per audit o rollback, non per ingest diretta.

## Contenuto

- `idea_intake_site_package.zip`, `generator.html`, `index*.html`,
  `last_report.*`, `logs_48354746845.zip`, `species_index.html`
- Manifest locale: `manifest.sha256`
- Riferimento backup freeze: `reports/backups/2025-11-25_freeze/manifest.txt`
  (`incoming_backup_2025-11-25.tar.gz`)

## Note operative
- Verifica checksum con `sha256sum -c manifest.sha256`.
- Eventuali ripristini vanno loggati in `logs/agent_activity.md` e approvati da
  Master DD.
