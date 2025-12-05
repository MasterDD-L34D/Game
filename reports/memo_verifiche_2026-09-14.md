# Memo sintetico – Verifiche e rischi aperti (2026-09-14)

## Esiti verifiche
- **Redirect smoke staging (2026-09-14)**: ultimo run `reports/redirects/redirect-smoke-staging.json` in **ERROR** per host `http://localhost:8000` non raggiungibile (Connection refused). Gate 03B bloccato; 03A resta pronto. Ticket correlati: #1204/#1205/#1206, **[TKT-03B-001]**. (rif. log 2026-09-14)
- **Readiness 01B/01C**: checkpoint 2025-11-30 conferma freeze documentale chiuso e attività in modalità report-only sui branch dedicati con ticket **[TKT-01B-001/002]**, **[TKT-01C-001/002]**; nessun nuovo drop rilevato. (rif. `reports/readiness_01B01C_status.md`)
- **Pipeline 02A→03A→03B (simulazione)**: runbook aggiornato conferma sequenza seriale con validator 02A in report-only e log obbligatori per freeze/sblocco; preparazioni parallele consentite solo in draft. (rif. `reports/pipeline_simulation.md`)
- **Orchestrator tuning**: configurazione rivista (poolSize 6, timeout 90s, retry 1) con piano di test k6 pronto ma non eseguito in questo ambiente. (rif. `reports/orchestrator_load_review.md`)

## Rischi aperti / blocchi
- **Connettività staging**: smoke redirect in errore finché l’host `http://localhost:8000` non è ripristinato; impedisce lo sblocco dei gate 03B e la chiusura del freeze 03A/03B.
- **Dipendenza approvazione Master DD**: ogni passo di freeze/merge richiede firma Master DD; le attività restano in report-only fino al via libera.
- **Test di carico orchestrator non eseguiti**: necessario eseguirli in ambiente con backend attivo per validare il tuning.

## Comandi/validatori da lanciare (report-only)
- **Rerun smoke redirect staging** (dev-tooling, report-only) appena il listener è attivo: `python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json` (allegare al ticket #1204/#1206 e loggare su `logs/agent_activity.md`).
- **Validator 02A** su `patch/03A-core-derived` (report-only) prima di qualsiasi merge o riapertura freeze: eseguire schema-only, trait audit, trait style; loggare con ID `TKT-02A-VALIDATOR` come da pipeline.
- **Freeze/rollback readiness**: se si apre o riconferma il freeze 3→4, registrare snapshot/backup e approvazione Master DD con il template di log riportato in `reports/pipeline_simulation.md`.
- **Test di carico orchestrator** (solo in ambiente idoneo): `BASE_URL=http://<host>:3333 k6 run tests/load/orchestrator-load.k6.js` con soglie p95 <90s per generation e <10s per validators; risultato da riportare in modalità report-only.

## Condivisione e approvazioni
- **Owners**: archivist (log/memo), dev-tooling (smoke redirect & validator 02A), coordinator (freeze/sblocco), Master DD (approvazioni). Coinvolgere anche backups-oncall per snapshot/rollback quando si riattiva il freeze.
- **Azione richiesta**: condividere il presente memo con gli owner sopra per raccogliere approvazioni e confermare l’esecuzione dei comandi in report-only prima di qualsiasi rollout.
