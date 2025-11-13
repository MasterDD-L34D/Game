# Rotazione token profilo `support`

**Data aggiornamento:** 2025-11-10 — Allineamento con Support/QA Bridge.

## Calendario

| Voce                        | Dettagli                      |
| --------------------------- | ----------------------------- |
| Frequenza                   | Settimanale (ogni lunedì)     |
| Finestra operativa          | 08:00–20:00 CET               |
| Canale notifiche            | `#support-ops`                |
| Owner primario              | Support Lead (G. Parodi)      |
| Owner backup                | QA Core Lead (S. Leone)       |
| Ultima rotazione completata | 2025-11-10 (ticket `SUP-431`) |
| Prossima finestra           | 2025-11-17                    |

## Procedura

1. Aprire il playbook `GAME_CLI_ESCALATION_PLAYBOOK` (variabile impostata dal
   profilo CLI `support`).
2. Disabilitare temporaneamente il token attivo dal pannello Ops (`ops_api_token`).
3. Generare nuovo token, annotare l'hash nel vault condiviso QA/Support.
4. Aggiornare `config/cli/support.yaml` con `last_completed` e `next_window`.
5. Pubblicare l'esito nel canale `#support-ops` includendo hash troncato (primi 6
   caratteri) e timestamp.
6. Allegare il log CLI (`logs/cli/support-pack.json`, `logs/cli/latest-smoke.log` e
   lo snapshot specifico `logs/cli/support-<data>-YYYYMMDDTHHMMSSZ.log` generato con
   `scripts/cli_smoke.sh --label support-<data>`) al ticket di tracking settimanale.

## Checklist QA

- [x] Run `./scripts/cli_smoke.sh --profile support` dopo la rotazione.
- [x] Verificare che l'alert di expiring token su Ops Dashboard sia azzerato.
- [ ] Aggiornare il report mensile `support-ops` con il riepilogo delle rotazioni.
