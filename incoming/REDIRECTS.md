# Incoming – Redirect e indici (03B cleanup)

Questa tabella elenca i percorsi archivio per gli asset spostati dal buffer
`incoming/` durante il cleanup 03B. Fare riferimento ai manifest indicati prima
di estrarre o reimportare materiale.

| Origine (storica)                                                                                                                        | Destinazione archivio                              | Note                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incoming/evo-tactics-final*.zip`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip`, `evo-tactics-merged*.zip`, `evo-tactics.zip` | `incoming/archive_cold/backups/2025-11-25/`        | Checksum ufficiali in `reports/backups/2025-11-25_freeze/manifest.txt` e verifica locale in `incoming/archive_cold/backups/2025-11-25/manifest.sha256`. Solo audit/rollback. |
| `incoming/docs/*`, `incoming/decompressed/*` (duplicati DevKit)                                                                          | `incoming/archive_cold/devkit_scripts/2025-11-25/` | Derivati DevKit; non usare per ingest diretta.                                                                                                                               |
| `incoming/incoming_inventory.json`, `compat_map*.json`, `game_repo_map.json`, `pack_biome_jobs_v8_alt.json`                              | `incoming/archive_cold/inventory/2025-11-25/`      | Inventari legacy sostituiti dal catalogo `docs/planning/REF_INCOMING_CATALOG.md`.                                                                                            |
| `incoming/idea_intake_site_package.zip`, `generator.html`, `index*.html`, `last_report.*`, `logs_48354746845.zip`, `species_index.html`  | `incoming/archive_cold/reports/2025-11-25_site/`   | Pacchetti/HTML report intake spostati in archiviazione fredda. Checksum locali in `manifest.sha256`; riferimento freeze in `reports/backups/2025-11-25_freeze/manifest.txt`. |

Note operative:

- Nessuno spostamento su `data/core/**` o `data/derived/**`.
- 2025-11-25: redirect verificati dopo controllo checksum (`manifest.sha256` → OK).
- Le verifiche di integrità vanno loggate in `logs/agent_activity.md` con
  approvazione Master DD.
