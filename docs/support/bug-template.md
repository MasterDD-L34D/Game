# Template escalation bug CLI

- **Titolo**: `[CLI][<profile>] <descrizione>`
- **Data**: `<AAAA-MM-GG>`
- **Build CLI**: output di `game-cli version --json`
- **Profilo**: `playtest` | `telemetry` | `support`
- **Comando eseguito**: es. `game-cli deploy --profile support`
- **Log allegati**: `logs/cli/<data>.log`, estratto `docs/chatgpt_changes/sync-<data>.md`
- **Esito smoke test**: link a `logs/cli/qa/<data>/`
- **Impatto**: `blocking` | `degraded` | `info`
- **Severità**: `critical` | `high` | `medium` | `low` (vedi scala backlog in `docs/process/incident_reporting_table.md`)
- **Frequenza**: `sempre` | `intermittente` | `raro` | `non_riprodotto` (coerente con backlog `Frequenza`)
- **Stato riproducibilità**: `confermata` | `parziale` | `non_riprodotta`
- **Azioni intraprese**: rollback/manual fix/ri-esecuzione
- **Owner escalation**: Support Lead / QA Lead / Tools Dev
- **Link log**: URL/Drive al log principale (obbligatorio)
- **Link screenshot/video**: evidenza visiva (PNG/MP4) oppure `N/A` se non applicabile

_Compila il template in Drive e collega il ticket `#vc-ops` relativo._
