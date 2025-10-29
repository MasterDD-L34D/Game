# Tooling Maintenance Log — Incoming Pipeline (Agenti)

`AG-Toolsmith` registra le attività di manutenzione mensili relative a script, validatori e pipeline collegate all'onboarding degli asset in `incoming/`.

| Data | Task | Agente owner | Stato | Note |
| --- | --- | --- | --- | --- |
| 2025-10-29 | Applicare `unzip -o` in `scripts/report_incoming.sh` per evitare prompt interattivi | `AG-Toolsmith` | Pianificato | Segnalato dal report 2025-10-29; verifica post-fix richiesta a `AG-Validation` |
| YYYY-MM-DD | Aggiornare `scripts/report_incoming.sh` per supportare nuovo formato | `AG-Toolsmith` | Pianificato | |
| | | | | |

## Linee guida
- Inserire link a PR o commit nella colonna **Note**.
- Se un'attività riguarda più sprint, duplicare la riga con date diverse e stato aggiornato.
- Chiudere ogni voce con conferma `AG-Validation` (test eseguiti).
