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
- L'inventario (`incoming/lavoro_da_classificare/inventario.yml`) conferma tutte le voci legacy come `archiviato` o `validato`; il secret `SITE_BASE_URL` è ora configurato (provisioning 2025-11-11, log QA `reports/evo/qa/update-tracker.log`).

## Piano operativo per il provisioning dei secret

### 1. Configurare `SITE_BASE_URL` in GitHub Actions
- Consultare `docs/tooling/evo.md` (§ "Configurazione secrets CI") e raccogliere l'URL ufficiale dell'ambiente Evo.
- In GitHub → **Settings → Secrets and variables → Actions**, creare o aggiornare il secret `SITE_BASE_URL` con il valore raccolto.
- Replicare lo stesso valore nella sezione **Variables**, sempre con il nome `SITE_BASE_URL`, così che i workflow possano leggerlo anche come variabile di ambiente.

### 2. Aggiornare l'inventario e i tracker
- Aprire `incoming/lavoro_da_classificare/inventario.yml` e impostare lo stato della voce `secrets/SITE_BASE_URL` su `configurato`, riportando data, referente e link alla richiesta di provisioning.
- Eseguire `make update-tracker TRACKER_CHECK=1` per propagare l'aggiornamento verso `tasks.yml` e `TASKS_BREAKDOWN.md` in modalità di verifica.
- Salvare l'output del comando sotto `reports/evo/qa/update-tracker.log`, così da conservare traccia dell'operazione.

### 3. Verificare l'utilizzo del secret nei workflow
- Riesaminare i file in `.github/workflows/` e confermare che i job che dipendono da `SITE_BASE_URL` (Lighthouse, site-audit, Playwright) non riportino più warning legati all'assenza del secret.
- Annotare la verifica in `reports/evo/inventory_audit.md` aggiungendo un paragrafo "Provisioning secrets" con riferimento al log QA salvato.
