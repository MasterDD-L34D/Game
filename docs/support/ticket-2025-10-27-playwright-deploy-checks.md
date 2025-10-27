# [WEB][deploy-checks] Playwright Chromium download 403

- **Data**: 2025-10-27
- **Build CLI**: N/A (script `scripts/run_deploy_checks.sh`)
- **Profilo**: support
- **Comando eseguito**: `DEPLOY_DATA_DIR="$(pwd)/data/mock/prod_snapshot" scripts/run_deploy_checks.sh`
- **Log allegati**: `logs/web_status.md` (voce 2025-10-27T10:49:20Z)
- **Esito smoke test**: Non eseguito — script interrotto in fase di installazione Playwright
- **Impatto**: blocking
- **Severità**: high
- **Frequenza**: sempre (riproducibile a ogni run su ambiente proxy corrente)
- **Stato riproducibilità**: confermata
- **Azioni intraprese**: raccolta log, aggiornamento milestone web, apertura ticket
- **Owner escalation**: Tools Dev
- **Link log**: `logs/web_status.md`
- **Link screenshot/video**: N/A

## Descrizione

Durante l'esecuzione di `scripts/run_deploy_checks.sh` con il dataset snapshot `data/mock/prod_snapshot`, il comando `npx playwright install chromium` fallisce anche con retry `--with-deps`.
Il mirror Playwright predefinito (`https://playwright.azureedge.net`) risponde con errore `403 Domain forbidden`, impedendo l'installazione del browser necessario alla suite TypeScript/Playwright. Di conseguenza, l'intero script termina (bash `set -e`) prima di avviare i test TypeScript, pytest e lo smoke test HTTP.

## Risultato atteso

Download di Chromium Playwright completato, esecuzione dei test TypeScript/Playwright e Python, generazione bundle e smoke test HTTP con dataset `data/mock/prod_snapshot`.

## Risultato osservato

Installazione bloccata dal proxy/hosting AzureEdge (HTTP 403). Nessun test o smoke eseguito; pipeline interrotta.

## Passi di riproduzione

1. Preparare il dataset con `rsync -a --exclude 'mock' data/ data/mock/prod_snapshot/`.
2. Eseguire `DEPLOY_DATA_DIR="$(pwd)/data/mock/prod_snapshot" scripts/run_deploy_checks.sh`.
3. Osservare i retry falliti di `npx playwright install chromium` con codice `DOMAIN FORBIDDEN`.

## Mitigazioni/Follow-up

- Valutare mirror alternativo o caching interno degli artefatti Playwright.
- Considerare l'uso dell'opzione `PLAYWRIGHT_BROWSERS_PATH` puntando a cache pre-popolata nel repository artefatti CI.
- Includere gestione degradata nel deploy check per registrare l'esito anche in caso di fallimento dell'installazione browser.
