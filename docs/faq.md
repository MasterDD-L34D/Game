# Domande frequenti — Support & QA

Aggiornato al ciclo VC-2025-10. Nuove domande vengono raccolte dopo ogni retro settimanale (martedì).

## Support

| Domanda | Risposta rapida | Owner | Stato |
| ------- | ---------------- | ----- | ----- |
| Come abilitiamo i log CLI giornalieri nel profilo `support`? | Usare `game-cli support init --logs daily` e verificare upload su bucket Drive Sync entro le 18:00 CET. | Support Lead | In corso (test 2025-11-07).
| Qual è la procedura di escalation se `game-cli deploy` fallisce in produzione? | Aprire ticket `#vc-ops`, allegare log `logs/cli/<data>.log`, eseguire rollback con profilo `support`. | Support Lead | Attivo.
| Quando ruotare i token API condivisi? | Ogni lunedì mattina seguendo il playbook `config/cli/support.yaml` > sezione `credentials`. | Security Liaison | Da pianificare post-onboarding.

## QA

| Domanda | Risposta rapida | Owner | Stato |
| ------- | ---------------- | ----- | ----- |
| Come eseguiamo gli smoke test CLI? | Run `scripts/cli_smoke.sh --profile playtest` e allega output nella cartella `logs/cli/qa/`. | QA Lead | Pianificato per 2025-11-08.
| Dove registriamo gli esiti dei playtest VC? | Nel tracker `docs/checklist/playtest-status.md` + allegato `logs/playtests/<data>-vc/summary.yaml`. | QA Analyst | Continuo.
| Chi conferma la copertura telemetria dopo ogni build? | QA Lead coordina con Telemetria usando il report `docs/chatgpt_changes/sync-<data>.md`. | Telemetria POC | In corso.

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
- Post-onboarding 2025-11-18: aggiungere sezione `Troubleshooting CLI` con snippet ricorrenti. _(in agenda prossima retro Support/QA, owner Support Lead)._ 
- Verificare disponibilità di template escalation nel drive Support entro 2025-11-12.
