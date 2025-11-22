# Tutorial rapido · Adaptive engine SquadSync

Questa guida collega l'ETL canary di SquadSync con il motore adaptive, i test automatici e il canale `#feedback-enhancements`.

## 1. Preparare i dati canary
1. Esegui l'ETL aggiornato:
   ```bash
   python scripts/analytics/etl_squadsync.py --range 2025-12-02:2025-12-06 \
     --output public/analytics/squadsync/canary.json
   ```
   Lo script popola la sezione `adaptive` con priorità, spike Delta e follow-up aperti.【F:scripts/analytics/etl_squadsync.py†L1-L440】
2. Conferma che `public/analytics/squadsync/index.tsx` visualizzi il tab **Adaptive** con chip e barre aggiornate.【F:public/analytics/squadsync/index.tsx†L1-L320】

## 2. Validare il motore adaptive
1. Esegui i test TypeScript:
   ```bash
   npm --prefix tools/ts install
   npm --prefix tools/ts test -- squadsync_responses.test.ts
   ```
2. I test verificano che `createAdaptiveEngine` in `services/squadsync/adaptiveEngine.ts` normalizzi varianti, priorità e tempi di risposta.【F:services/squadsync/adaptiveEngine.ts†L1-L220】【F:tests/analytics/squadsync_responses.test.ts†L1-L210】
3. Verifica anche i resolver GraphQL (`tools/graphql/resolvers/squadsync.ts`) per accertare che i payload adaptive siano esposti correttamente alle dashboard esterne.【F:tools/graphql/resolvers/squadsync.ts†L1-L320】

## 3. Pubblicare i risultati
- Aggiorna il Canvas [Sync HUD · dicembre 2025](../Canvas/feature-updates.md#sync-hud--dicembre-2025) con note su spike adaptive e ack rate.
- Condividi in `#feedback-enhancements` il riepilogo dei test, allegando il mock `assets/analytics/squadsync_mock.svg` e linkando la dashboard canary (`tools/feedback/hud_canary_dashboard.yaml`).【F:assets/analytics/squadsync_mock.svg†L1-L58】【F:tools/feedback/hud_canary_dashboard.yaml†L1-L53】

## 4. Collegare feedback e backlog
1. Dopo ogni analisi, apri `../incoming/FEATURE_MAP_EVO_TACTICS.md` e aggiungi i ticket suggeriti da `tools/feedback/sync_tasks.py` (severità ≥3).【F:tools/feedback/sync_tasks.py†L1-L120】
2. Conferma che `tools/feedback/collection_pipeline.yaml` abbia registrato il passaggio a `in_progress` e che la cadence `canary_sync` sia rispettata.【F:tools/feedback/collection_pipeline.yaml†L1-L110】
3. Se emergono nuovi template o soglie, aggiorna `tools/feedback/hud_canary_dashboard.yaml` prima del prossimo digest.

## 5. Checklist finale
- [ ] ETL canary aggiornato con intervallo corretto.
- [ ] Test `squadsync_responses.test.ts` verdi.
- [ ] Post su `#feedback-enhancements` con mock aggiornato e link dashboard.
- [ ] Ticket backlog aperti e associati ai follow-up in dashboard.

> Nota: se stai preparando una demo pubblica, ricordati di rigenerare anche la build della webapp (`npm run webapp:deploy`) per avere gli stessi asset del Canvas.
