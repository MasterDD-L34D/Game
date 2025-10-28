# QA — HUD Smart Alerts

## Metriche di controllo
- **Ack rate ≥ 80%** — calcolato come numero di alert con almeno un ack su tutti gli alert `raised`. La pipeline `tools/ts/hud_alerts.ts` traccia `ackCount`, `ackRecipients` e `lastAckTimestamp` per ciascun evento.【F:tools/ts/hud_alerts.ts†L200-L360】
- **Filter ratio ≤ 25%** — i filtri devono bloccare al massimo un quarto degli alert sopra soglia (valutato su campioni con almeno quattro eventi `raised`); ogni evento `filtered` include `filterName` e `filterCount` per monitorare derive o errori di configurazione.【F:tools/ts/hud_alerts.ts†L200-L360】
- **Log consolidati** — ogni cartella playtest mantiene `hud_alert_log.json` con cronologia `raised/acknowledged/cleared` e drop filtro, base per i trend QA.【F:logs/playtests/2025-11-05-vc/hud_alert_log.json†L1-L40】【F:logs/playtests/2025-10-24-vc/hud_alert_log.json†L1-L40】

## Validazione automatica
- Eseguire `scripts/qa/hud_smart_alerts.py` (schedulato nel job canary `config/jobs/hud_canary.yaml`) per generare il report giornaliero e verificare le soglie.【F:scripts/qa/hud_smart_alerts.py†L1-L171】【F:config/jobs/hud_canary.yaml†L1-L11】
- Il comando produce output testuale e, se richiesto, salva un riepilogo JSON in `logs/reports/hud_smart_alerts.json` per uso dashboard.

## Escalation
1. **Ack rate sotto soglia** — notifica immediata al QA lead e apertura ticket tuning HUD (etichetta `hud-alerts`), includendo il report JSON dell'ultima esecuzione.
2. **Filter ratio sopra soglia** — richiede review del set di filtri con il team bilanciamento; loggare nel diario QA e pianificare hotfix entro 24h.
3. **Eventi con metadati mancanti** — se il validator segnala ack senza destinatario o filtri senza nome, bloccare il deploy canary finché i dati non sono completi.
