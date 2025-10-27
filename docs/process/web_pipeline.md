# Pipeline web · Procedura di rilascio

Questa procedura definisce il percorso end-to-end per promuovere la web experience (dashboard di test e dataset statici) dall'ambiente di sviluppo alla pubblicazione su GitHub Pages.

## Panoramica del flusso

1. **Validazione continua automatica** – ogni push/PR esegue `ci.yml`, che include build TS/Python, suite CLI, audit dei tratti e `scripts/run_deploy_checks.sh`.
2. **Validazione staging manuale/programmata** – prima di rilasciare, eseguire manualmente gli script di gating nello stesso ordine usato da CI per catturare regressioni ambientali.
3. **Promozione e pubblicazione** – il workflow `deploy-test-interface.yml` ripete i gate (CLI smoke, audit tratti, deploy checks) e, solo in caso di esito positivo, carica l'artifact su GitHub Pages.

## Run di staging passo–passo

> Suggerimento: usare un ambiente clean (es. container locale o runner GitHub) per replicare al meglio le condizioni di deploy.

1. **CLI smoke**
   ```bash
   ./scripts/cli_smoke.sh
   ```
   Verifica la sanità di profili HUD, playtest, support e telemetry, con validazioni YAML e generazione encounter.
2. **Audit tratti**
   ```bash
   python3 scripts/trait_audit.py --check
   ```
   Garantisce che il catalogo tratti sia coerente con dataset e regole correnti.
3. **Deploy checks**
   ```bash
   DEPLOY_DATA_DIR="$(pwd)/data" scripts/run_deploy_checks.sh
   ```
   Lo script esegue `npm ci`, installa i browser Playwright, lancia la suite Playwright/UI (`npm test`), i test Python (`pytest`), genera il bundle statico e ne verifica la raggiungibilità via HTTP locale. Al termine scrive un report dettagliato in `logs/web_status.md`.

Se uno dei passaggi fallisce (es. Playwright non riesce a scaricare Chromium, come accaduto in staging con risposta 403), l'uscita non-zero blocca il flusso e il rilascio **deve** essere posticipato o l'incidente risolto prima di riprovare.

## Checklist Go/No-Go

- [ ] CI `CI` (workflow `ci.yml`) verde sull'ultimo commit candidato.
- [ ] CI `Deploy site` (workflow `deploy-test-interface.yml`) verde nell'ultima esecuzione manuale/programmata.
- [ ] Output CLI smoke privo di errori (solo avvisi noti ammessi, da documentare in `logs/cli/`).
- [ ] `python3 scripts/trait_audit.py --check` restituisce "nessuna regressione".
- [ ] `scripts/run_deploy_checks.sh` termina con `exit 0` e aggiorna `logs/web_status.md` con esito ✅.
- [ ] Bundle statico generato (`dist/` in workflow o directory temporanea riportata dallo script) aperto in browser locale senza errori console critici.
- [ ] Tutti gli eventuali problemi Playwright/UI risolti o tracciati con ticket bloccante.

**Go**: tutti i checkbox spuntati, log archiviati e artefatti verificati. Procedere con `workflow_dispatch` di `Deploy site` oppure attendere trigger automatico su `main`.

**No-Go**: un qualsiasi gate fallito. Annotare l'errore su `logs/web_status.md` e aprire ticket di follow-up prima di ripetere la procedura.
