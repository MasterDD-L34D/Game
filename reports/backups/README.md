# Backups and snapshots (off-repo)

Per policy CI/PR, gli archivi binari non vengono versionati nel repository. Conservare snapshot/backup
in storage esterno mantenendo il percorso logico `reports/backups/<label>/` e registrando checksum e
metadati in `docs/planning/` e `logs/agent_activity.md`.

Al bisogno, depositare solo file testuali (es. manifest, note operative) per documentare dove sono
archiviati gli artefatti.

## Convenzioni per i manifest

- Ogni blocco di backup deve avere una cartella dedicata (es. `reports/backups/2025-11-25_freeze/`).
- Versionare solo file di testo (es. `MANIFEST.md`) con percorso logico e checksum; rimuovere
  qualsiasi archivio (`*.tar`, `*.tar.gz`, `*.tgz`, `*.zip`) prima del commit.
- Collegare il manifest ai log operativi e alle note di pianificazione pertinenti.
