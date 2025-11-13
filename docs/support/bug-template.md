# Template escalation bug CLI

- **Titolo**: `[CLI][<profile>] <descrizione>`
- **Data**: `<AAAA-MM-GG>`
- **Build CLI**: output di `git rev-parse HEAD` (eventualmente `git describe --tags --always`)
- **Profilo**: `playtest` | `telemetry` | `support`
- **Comando eseguito**: es. `python tools/py/game_cli.py validate-ecosystem-pack --profile support`
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
- **Riferimento comandi CLI**: `python tools/py/game_cli.py [--profile <nome>] <comando>` con sottocomandi `roll-pack [FORM MBTI] [ARCHETIPO] [data_path] [--seed <valore>]`, `generate-encounter [biome] [data_path] [--party-power <int>] [--seed <valore>]`, `validate-datasets`, `validate-ecosystem-pack [--json-out <percorso>] [--html-out <percorso>]`, `investigate <file|dir> [...] [--recursive] [--json] [--html] [--destination NAME|-] [--max-preview <int>]`

_Compila il template in Drive e collega il ticket `#vc-ops` relativo._
