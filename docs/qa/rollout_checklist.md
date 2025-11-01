# Checklist QA — Rollout Mission Control

Questa checklist coordina QA, Ops e Analytics durante il rollout canary di Mission Control.
È allineata al flag `rollout.qaMetricsMonitoring` e alla pipeline programmata in `config/jobs/monitoring.yaml`.

## Preparazione
- [ ] Conferma che il flag `rollout.qaMetricsMonitoring` sia configurato su `canary` con stage gate `qa-approval`.
- [ ] Allinea le coorti coinvolte (QA Bravo, QA Delta, Ops Foxtrot) con le sessioni di playtest giornaliere.
- [ ] Notifica i canali `#qa-rollout` e `#ops-oncall` sul kickoff e condividi l'orario della finestra attiva (06:00–23:00 UTC).

## Pipeline e rollout
- [ ] Verifica che il job `qa-rollout-metrics` sia presente nel catalogo `config/jobs/monitoring.yaml`.
- [ ] Registra il change request nel tracker QA con riferimento alla pipeline Mission Control.
- [ ] Esegui un dry-run della pipeline utilizzando `python tools/monitoring/schedule_metrics.py --dry-run` per validare cron, coorti e metadati.

## Monitoraggio metriche
- [ ] Abilita il monitoraggio automatizzato con `python tools/monitoring/schedule_metrics.py --apply`.
- [ ] Controlla che `logs/qa/rollout_metrics_schedule.json` sia stato generato/aggiornato con timestamp corrente.
- [ ] Traccia gli alert:
  - `mission_control_uptime` ≥ 99.5% (24h) → escalation `ops-oncall` se sotto soglia per 2 slot consecutivi.
  - `hud_action_latency_p95` ≤ 3800 ms (6h) → apri ticket nel board QA rollout.
  - `playtest_squad_engagement` ≥ 0.62 (7d) → sync con Analytics Duty.

## Scenari overlay & adaptive response
- [ ] Simula alert risk > 0.60 su coorti TAP e verifica che l'overlay HUD mostri soglie risk/cohesion aggiornate.
- [ ] Conferma ack entro 2 turni medi e registra recipient in `hud_alert_log.json` per ogni overlay mostrato.
- [ ] Valida che l'Adaptive Engine generi risposte `critical` e `warning` per squadre TAP con delta engagement coerente.
- [ ] Riesegui `npx tsx tests/analytics/squadsync_responses.test.ts` per garantire compatibilità REST/GraphQL delle risposte adaptive.

## Criteri di rollback
- [ ] Ack rate < 0.82 su finestra 24h o durata alert P95 > 2 turni → rollback immediato dell'overlay TAP.
- [ ] Tilt medio > 0.50 dopo 3 cicli consecutivi → disattiva flag `hud.smart_overlay_tap` e notifica `#hud-alerts`.
- [ ] Adaptive Engine con delta engagement negativo > 12% per due squadre TAP → ripristina configurazione precedente e avvia post-mortem.

## Gate di avanzamento
- [ ] Approvazione QA Insights dopo 24h di stabilità.
- [ ] Validazione Ops per uptime costante.
- [ ] Aggiornamento doc Mission Control nel canvas release.

## Post-rollout
- [ ] Disattiva flag `rollout.qaMetricsMonitoring` oppure promuovi a `stable` dopo retrospettiva.
- [ ] Archivia gli artifact nella cartella `reports/mission-control/rollout`.
- [ ] Aggiorna la pagina di stato con l'esito finale e il link al report QA.
