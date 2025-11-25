# Backups and snapshots (off-repo)

Per policy CI/PR, gli archivi binari non vengono versionati nel repository. Conservare snapshot/backup
in storage esterno mantenendo il percorso logico `reports/backups/<label>/` e registrando checksum e
metadati in `docs/planning/` e `logs/agent_activity.md`.

Al bisogno, depositare solo file testuali (es. manifest, note operative) per documentare dove sono
archiviati gli artefatti.

## Formato standard dei manifest

- File di testo `manifest.txt` per ogni cartella logica (es. `reports/backups/<label>/`).
- Per ciascun archivio includere blocchi con i campi:
  - `Archive`: nome file.
  - `SHA256`: checksum completo.
  - `Location`: URL/bucket e path esatti.
  - `On-call`: contatto di reperibilità per restore/incident.
  - `Last verified`: data e metodo di verifica checksum.
- Ordinare i blocchi seguendo l’elenco degli artefatti nel planning corrispondente.

## Frequenza di controllo

- Verifica checksum e contatto on-call almeno **mensilmente** durante i freeze e dopo ogni modifica
  alle pipeline di backup.
- Aggiornare data e note di verifica direttamente nel manifest e registrare eventuali incident in
  `logs/agent_activity.md`.
