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

## Da raccogliere
- Post-onboarding 2025-11-18: aggiungere sezione `Troubleshooting CLI` con snippet ricorrenti.
- Verificare disponibilità di template escalation nel drive Support entro 2025-11-12.
