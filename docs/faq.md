# Domande frequenti — Support & QA

Aggiornato al ciclo VC-2025-11. Nuove domande vengono raccolte dopo ogni retro settimanale (martedì).

## Support

| Domanda                                                                 | Risposta rapida                                                                                                                                                                               | Owner            | Stato                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------- |
| Come abilitiamo i log CLI giornalieri nel profilo `support`?            | Pianificare `scripts/cli_smoke.sh --profile support` (cron o azione manuale), verificare che generi `logs/cli/support-pack.json` e caricare il file sul bucket Drive Sync entro le 18:00 CET. | Support Lead     | In corso (test 2025-11-07).           |
| Qual è la procedura di escalation se i controlli pre-deploy falliscono? | Aprire ticket `#vc-ops`, allegare output di `scripts/run_deploy_checks.sh`, raccogliere i log in `logs/tooling/` e coordinare il rollback con il profilo `support`.                           | Support Lead     | Attivo.                               |
| Quando ruotare i token API condivisi?                                   | Ogni lunedì 08:00 CET seguendo `docs/support/token-rotation.md` e aggiornando `config/cli/support.yaml`.                                                                                      | Security Liaison | Attivo (ultima rotazione 2025-11-10). |
| Come confermiamo la revisione CLI usata in playtest e supporto?         | Registrare `git rev-parse HEAD` (o `git describe --tags --always`) nel log giornaliero, allegare gli artefatti di `scripts/cli_smoke.sh` e aggiornare `docs/chatgpt_sync_status.md`.          | Support Lead     | Nuovo (verifica giornaliera).         |
| Dove archiviare le registrazioni demo per l'onboarding?                 | Cartella Drive `Presentations/Onboarding-2025-11-18` + riferimento in `docs/presentations/2025-11-18-onboarding.md`.                                                                          | Narrative Ops    | Pianificato (upload 2025-11-16).      |

### Comandi disponibili della CLI Python

L'entrypoint documentato in `tools/py/game_cli.py` accetta un flag globale `--profile <nome>` e espone i seguenti sottocomandi (`python tools/py/game_cli.py [--profile <nome>] <comando>`):

- `roll-pack [FORM MBTI] [ARCHETIPO] [data_path] [--seed <valore>]`
- `generate-encounter [biome] [data_path] [--party-power <int>] [--seed <valore>]`
- `validate-datasets`
- `validate-ecosystem-pack [--json-out <percorso>] [--html-out <percorso>]`
- `investigate <file|dir> [...] [--recursive] [--json] [--html] [--destination NAME|-] [--max-preview <int>]`

L'alias storico `validate-ecosystem` viene normalizzato in `validate-ecosystem-pack` dal wrapper stesso. Impostare `--destination -` con `investigate` evita la creazione dei report su disco e restituisce l'output JSON sullo standard output.

## QA

| Domanda                                                 | Risposta rapida                                                                                                                | Owner          | Stato                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------ |
| Come eseguiamo gli smoke test CLI?                      | Run `scripts/cli_smoke.sh` (default) o filtra con `--profile support`; archivia output in `logs/cli/qa/`.                      | QA Lead        | Attivo (copre playtest/telemetry/support). |
| Dove registriamo gli esiti dei playtest VC?             | Nel tracker `docs/checklist/playtest-status.md` + allegato `logs/playtests/<data>-vc/summary.yaml`.                            | QA Analyst     | Continuo.                                  |
| Chi conferma la copertura telemetria dopo ogni build?   | QA Lead coordina con Telemetria usando il report `docs/chatgpt_changes/sync-<data>.md`.                                        | Telemetria POC | In corso.                                  |
| Come prepariamo il test bed per l'onboarding del 18/11? | Clonare branch demo `feature/onboarding-cli-demo`, lanciare `scripts/cli_smoke.sh --profile playtest` e validare export Drive. | QA Support     | Pianificato (setup 2025-11-15).            |
| Quando aggiornare i template di bug legati alla CLI?    | Dopo ogni retro Support/QA del martedì, sincronizzare i campi in `docs/support/bug-template.md`.                               | QA Lead        | Nuovo (post-onboarding).                   |

## Post-onboarding 2025 Q4

| Domanda                                                        | Risposta rapida                                                                                                                                                                                                | Owner            | Stato                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| Dove trovo le registrazioni onboarding?                        | In `docs/presentations/2025-11-onboarding-recordings.md` con link Drive e note di follow-up.                                                                                                                   | HR Ops           | Aggiornato.          |
| Come verifico che il workflow `daily-pr-summary` abbia girato? | Controlla GitHub Actions (`daily-pr-summary`), poi apri `docs/chatgpt_changes/daily-pr-<data>.md`; se assente esegui manualmente `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>`. | Technical Writer | Attivo giornalmente. |
| Qual è la checklist post-onboarding per Support/QA?            | Seguire `docs/piani/roadmap.md` > Procedura post-ottobre 2025 (punti 1-6) e spuntare `docs/checklist/project-setup-todo.md` sezione Knowledge sharing.                                                         | Support Lead     | In corso.            |

### Sessioni registrate

- Batch Q4 (2025-11-18, 10:00-12:00 CET) — Setup repo, workflow PR giornaliero, telemetria VC.【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L7】
- Support handoff (2025-11-19, 16:00 CET) — Escalation CLI, gestione ticket post-sync.【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L7】
- Companion relazioni (2025-11-20, 14:30 CET) — Modulo Relazioni, rituali Nido, log `relations-log.yaml`.【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L7】

## Da raccogliere

- Verificare disponibilità di template escalation nel drive Support entro 2025-11-12.

## Troubleshooting CLI (Nov 2025)

- `python tools/py/game_cli.py validate-ecosystem-pack` restituisce `Validator del pack non trovato`: assicurarsi che gli asset siano sincronizzati (vedi `scripts/run_deploy_checks.sh`) e che `tools/py/roll_pack.py` sia aggiornato.
- Log mancanti dopo smoke test QA: controllare che sia stato eseguito `scripts/cli_smoke.sh --profile <profilo>` e che la cartella `logs/cli/qa/<data>/` sia sincronizzata con Drive.
- Differenze tra commit registrato e ambiente locale: eseguire `git pull --rebase`, rilanciare `scripts/cli_smoke.sh` e aggiornare `docs/chatgpt_sync_status.md` con il nuovo hash.
