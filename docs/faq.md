# Domande frequenti — Support & QA

Aggiornato al ciclo VC-2025-11. Nuove domande vengono raccolte dopo ogni retro settimanale (martedì).

## Support

| Domanda | Risposta rapida | Owner | Stato |
| ------- | ---------------- | ----- | ----- |
| Come abilitiamo i log CLI giornalieri nel profilo `support`? | Usare `game-cli support init --logs daily` e verificare upload su bucket Drive Sync entro le 18:00 CET. | Support Lead | In corso (test 2025-11-07).
| Qual è la procedura di escalation se `game-cli deploy` fallisce in produzione? | Aprire ticket `#vc-ops`, allegare log `logs/cli/<data>.log`, eseguire rollback con profilo `support`. | Support Lead | Attivo.
| Quando ruotare i token API condivisi? | Ogni lunedì 08:00 CET seguendo `docs/support/token-rotation.md` e aggiornando `config/cli/support.yaml`. | Security Liaison | Attivo (ultima rotazione 2025-11-10).
| Come confermiamo la versione CLI usata in playtest e supporto? | Eseguire `game-cli version --json`, copiare l'hash in `docs/chatgpt_sync_status.md` e linkare il log di giornata. | Support Lead | Nuovo (verifica giornaliera).
| Dove archiviare le registrazioni demo per l'onboarding? | Cartella Drive `Presentations/Onboarding-2025-11-18` + riferimento in `docs/presentations/2025-11-18-onboarding.md`. | Narrative Ops | Pianificato (upload 2025-11-16).

## QA

| Domanda | Risposta rapida | Owner | Stato |
| ------- | ---------------- | ----- | ----- |
| Come eseguiamo gli smoke test CLI? | Run `scripts/cli_smoke.sh` (default) o filtra con `--profile support`; archivia output in `logs/cli/qa/`. | QA Lead | Attivo (copre playtest/telemetry/support).
| Dove registriamo gli esiti dei playtest VC? | Nel tracker `docs/checklist/playtest-status.md` + allegato `logs/playtests/<data>-vc/summary.yaml`. | QA Analyst | Continuo.
| Chi conferma la copertura telemetria dopo ogni build? | QA Lead coordina con Telemetria usando il report `docs/chatgpt_changes/sync-<data>.md`. | Telemetria POC | In corso.
| Come prepariamo il test bed per l'onboarding del 18/11? | Clonare branch demo `feature/onboarding-cli-demo`, lanciare `scripts/cli_smoke.sh --profile playtest` e validare export Drive. | QA Support | Pianificato (setup 2025-11-15).
| Quando aggiornare i template di bug legati alla CLI? | Dopo ogni retro Support/QA del martedì, sincronizzare i campi in `docs/support/bug-template.md`. | QA Lead | Nuovo (post-onboarding).

## Post-onboarding 2025 Q4

| Domanda | Risposta rapida | Owner | Stato |
| ------- | ---------------- | ----- | ----- |
| Dove trovo le registrazioni onboarding? | In `docs/presentations/2025-11-onboarding-recordings.md` con link Drive e note di follow-up. | HR Ops | Aggiornato. |
| Come verifico che il workflow `daily-pr-summary` abbia girato? | Controlla GitHub Actions (`daily-pr-summary`), poi apri `docs/chatgpt_changes/daily-pr-<data>.md`; se assente esegui manualmente `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>`. | Technical Writer | Attivo giornalmente. |
| Qual è la checklist post-onboarding per Support/QA? | Seguire `docs/piani/roadmap.md` > Procedura post-ottobre 2025 (punti 1-6) e spuntare `docs/checklist/project-setup-todo.md` sezione Knowledge sharing. | Support Lead | In corso. |

### Sessioni registrate
- Batch Q4 (2025-11-18, 10:00-12:00 CET) — Setup repo, workflow PR giornaliero, telemetria VC.【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L7】
- Support handoff (2025-11-19, 16:00 CET) — Escalation CLI, gestione ticket post-sync.【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L7】
- Companion relazioni (2025-11-20, 14:30 CET) — Modulo Relazioni, rituali Nido, log `relations-log.yaml`.【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L7】

## Da raccogliere
- Verificare disponibilità di template escalation nel drive Support entro 2025-11-12.

## Troubleshooting CLI (Nov 2025)
- `game-cli deploy` restituisce `Missing token for profile support`: verificare rotazione in `config/cli/support.yaml`, rigenerare token via `docs/support/token-rotation.md` e rilanciare il comando con `--refresh-credentials`.
- Log mancanti dopo smoke test QA: controllare che il comando sia stato eseguito con `--store-log` e che la cartella `logs/cli/qa/<data>/` sia sincronizzata con Drive.
- Differenze di hash tra `game-cli version` e config: aggiornare il branch locale con `git pull --rebase` e rilanciare `scripts/cli_smoke.sh` per generare i log corretti.
