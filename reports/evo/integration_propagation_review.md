# Evo Integration Propagation Review

## Sintesi del piano
- Il file `incoming/lavoro_da_classificare/integration_batches.yml` indica che tutti i batch (documentation → frontend) sono completati, con timestamp e riferimento al cleanup finale.
- I tracker `incoming/lavoro_da_classificare/TASKS_BREAKDOWN.md` e `incoming/lavoro_da_classificare/tasks.yml` confermano gli stessi stati "done" e rimandano ai log QA per ogni attività.

## Propagazione nei sistemi
### Documentazione
- Le nuove guide sono pubblicate in `docs/evo-tactics/`, con indice aggiornato in `docs/README.md` (sezione "Stato import Evo-Tactics").
- Il log `reports/evo/qa/docs.log` certifica il passaggio del comando `npm run docs:lint` dopo la conversione.

### Dataset
- I dataset Evo sono presenti sotto `data/external/evo/`, incluso `species_ecotype_map.json` con note sulle classi senza match.
- `reports/evo/qa/dataset.log` contiene l'esito positivo di `make evo-validate`, che valida schemi e dati.

### Frontend e QA
- La suite Playwright del progetto Evo (`npm run test:e2e -- --project=evo`) ha esito positivo come riportato in `reports/evo/qa/frontend.log`.
- `docs/tooling/evo.md` descrive le automazioni disponibili, incluse le procedure per installare i browser e lanciare i test E2E.

## Inventario e chiusura staging
- `reports/evo/inventory_audit.md` documenta l'archiviazione dei duplicati legacy e il cleanup dell'area `incoming/lavoro_da_classificare/`.
- L'inventario (`incoming/lavoro_da_classificare/inventario.yml`) segnala ogni voce legacy come `archiviato` o `validato`, a eccezione del secret `SITE_BASE_URL` ancora marcato "richiesto".

## Punto aperto
- Provisionare il secret `SITE_BASE_URL` seguendo la procedura in `docs/tooling/evo.md` e aggiornare l'inventario portando la voce a `configurato`.

## Prossimi passi consigliati
1. Creare (o aggiornare) il secret `SITE_BASE_URL` in GitHub Actions con l'URL ufficiale dell'ambiente Evo.
2. Aggiornare `incoming/lavoro_da_classificare/inventario.yml` con lo stato `configurato`, includendo data e referente.
3. Eseguire `make update-tracker TRACKER_CHECK=1` e archiviare l'output QA in `reports/evo/qa/` per mantenere la tracciabilità.
