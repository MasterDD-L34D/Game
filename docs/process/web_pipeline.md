# Pipeline web · Procedura di rilascio

Questa procedura definisce il percorso end-to-end per promuovere la web experience (dashboard di test e dataset statici) dall'ambiente di sviluppo alla pubblicazione su GitHub Pages.

## Panoramica del flusso

1. **Validazione continua automatica** – ogni push/PR esegue `ci.yml`, che installa le dipendenze e lancia `scripts/run_validation_suite.sh`, `scripts/run_test_suite.sh` oltre ai sample CLI TypeScript/Python.
2. **Validazione staging manuale/programmata** – prima di rilasciare, eseguire manualmente gli script di gating nello stesso ordine usato da CI per catturare regressioni ambientali.
3. **Promozione e pubblicazione** – il workflow `deploy-test-interface.yml` lancia i medesimi gate (suite di validazione + test) prima di confezionare l'artifact con `scripts/run_deploy_checks.sh`.

## Run di staging passo–passo

> Suggerimento: usare un ambiente clean (es. container locale o runner GitHub) per replicare al meglio le condizioni di deploy.

1. **Installare le dipendenze di test**
   ```bash
   ./scripts/install_test_dependencies.sh
   ```
   Lo script installa/aggiorna le librerie Python (`pip` + `requirements.txt`), esegue `npm ci` per gli strumenti TypeScript e scarica i browser Playwright necessari. In caso di proxy/blocchi sul CDN ufficiale, effettua automaticamente il fallback a Google Chrome stabile (`google-chrome-stable`) e configura i gate per riutilizzarne il binario. È lo stesso step richiamato da CI e dai workflow di deploy, quindi garantisce parità ambientale.
   > Se il runner ha già un browser compatibile, impostare `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/percorso/del/browser` prima di avviare la pipeline per saltare il fallback.
2. **Eseguire la pipeline web end-to-end**
   ```bash
   DEPLOY_DATA_DIR="$(pwd)/data" ./scripts/run_deploy_checks.sh
   ```
   Lo script delega prima `scripts/run_validation_suite.sh` e `scripts/run_test_suite.sh`, poi genera il bundle statico ed esegue lo smoke HTTP finale. Al termine scrive un report dettagliato in `logs/web_status.md` e lascia il bundle temporaneo pronto per l'ispezione.
   > Per saltare le validazioni già eseguite manualmente, impostare `RUN_FULL_VALIDATION=0` prima di invocare lo script.

Se uno dei passaggi fallisce (es. Playwright non riesce a scaricare Chromium, come accaduto in staging con risposta 403), l'uscita non-zero blocca il flusso e il rilascio **deve** essere posticipato o l'incidente risolto prima di riprovare.

## Checklist Go/No-Go

- [ ] CI `CI` (workflow `ci.yml`) verde sull'ultimo commit candidato.
- [ ] CI `Deploy site` (workflow `deploy-test-interface.yml`) verde nell'ultima esecuzione manuale/programmata.
- [ ] Output CLI smoke privo di errori (ottenuto tramite `scripts/run_test_suite.sh` o `scripts/run_deploy_checks.sh`).
- [ ] `python3 scripts/trait_audit.py --check` (incluso nella validation suite) restituisce "nessuna regressione".
- [ ] `scripts/run_deploy_checks.sh` termina con `exit 0` e aggiorna `logs/web_status.md` con esito ✅.
- [ ] Bundle statico generato (`dist/` in workflow o directory temporanea riportata dallo script) aperto in browser locale senza errori console critici.
- [ ] Tutti gli eventuali problemi Playwright/UI risolti o tracciati con ticket bloccante.

**Go**: tutti i checkbox spuntati, log archiviati e artefatti verificati. Procedere con `workflow_dispatch` di `Deploy site` oppure attendere trigger automatico su `main`.

**No-Go**: un qualsiasi gate fallito. Annotare l'errore su `logs/web_status.md` e aprire ticket di follow-up prima di ripetere la procedura.
