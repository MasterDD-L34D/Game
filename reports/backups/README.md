# Backups and snapshots (off-repo)

Per policy CI/PR, gli archivi binari non vengono versionati nel repository. Conservare snapshot/backup
in storage esterno mantenendo il percorso logico `reports/backups/<label>/` e registrando checksum e
metadati in `docs/planning/` e `logs/agent_activity.md`.

Al bisogno, depositare solo file testuali (es. manifest, note operative) per documentare dove sono
archiviati gli artefatti.
