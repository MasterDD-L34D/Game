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

## Freeze 2025-11-25 (rebuild on-demand)

- Requisito: working tree pulito e dipendenze standard presenti (`rsync`, Python 3, `gzip`, `tar`).
- Elenchi sorgenti versionati e checksum stabili sono in `reports/backups/2025-11-25_freeze/source_lists/`
  (`*.txt` + `*.sha256`).
- Rigenera gli artefatti deterministici (tar.gz e zip) e lo staging locale con:

  ```bash
  scripts/backup/rebuild_freeze_2025_11_25.sh
  ```

- Verifica che i file di inventario non siano stati alterati prima del rebuild:

  ```bash
  (cd reports/backups/2025-11-25_freeze && sha256sum -c source_lists/*.sha256)
  ```

- Gli archivi risultanti sono creati in `reports/backups/2025-11-25_freeze/staging/artifacts/` e **non vanno
  committati**; il manifest punta allo script e ai checksum perché l’artefatto si genera on-demand dal repository.
