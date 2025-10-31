# Pipeline web · Procedura di rilascio

Questa procedura definisce il percorso end-to-end per promuovere la web experience (dashboard di test e dataset statici) dall'ambiente di sviluppo alla pubblicazione su GitHub Pages.

## Panoramica del flusso

1. **Inventario & trait readiness** – ogni PR deve aggiornare `docs/catalog/traits_inventory.json` tramite `python tools/py/traits_validator.py --inventory docs/catalog/traits_inventory.json` per assicurare che dataset (`data/derived/analysis/*`, `packs/evo_tactics_pack/data/species/*`) siano allineati. Il report viene archiviato da CI in `logs/traits_tracking.md` e segnala risorse mancanti o obsolete.
2. **Configurazione generatore** – il workflow esegue `python tools/py/validate_registry_naming.py` per garantire che i registri del generatore (`packs/evo_tactics_pack/tools/config/registries/env_to_traits.yaml`, `data/traits/index.json`, `docs/catalog/species_trait_matrix.json`) e il glossario siano coerenti; eventuali mismatch bloccano la pipeline prima della build web.
3. **Validazione continua automatica** – ogni push/PR esegue `ci.yml`, che include build TS/Python, suite CLI, audit dei tratti e `scripts/run_deploy_checks.sh` (il quale richiama il validator dell'inventario e la verifica dei registri del generatore).
4. **Validazione staging manuale/programmata** – prima di rilasciare, eseguire manualmente gli script di gating nello stesso ordine usato da CI per catturare regressioni ambientali.
5. **Promozione e pubblicazione** – il workflow `deploy-test-interface.yml` ripete i gate (inventario, configurazione generatore, CLI smoke, audit tratti, deploy checks) e, solo in caso di esito positivo, carica l'artifact su GitHub Pages.

## Run di staging passo–passo

> Suggerimento: usare un ambiente clean (es. container locale o runner GitHub) per replicare al meglio le condizioni di deploy.

1. **Installare le dipendenze Python**
   ```bash
   python3 -m pip install --upgrade pip
   python3 -m pip install -r tools/py/requirements.txt
   ```
   Assicura che i gate Python (CLI, audit tratti, pytest) dispongano delle librerie `yaml`, `requests` e degli altri moduli richiesti sul runner/staging.
2. **CLI smoke**
   ```bash
   ./scripts/cli_smoke.sh
   ```
   Verifica la sanità di profili HUD, playtest, support e telemetry, con validazioni YAML e generazione encounter.
3. **Audit tratti**
   ```bash
   python3 scripts/trait_audit.py --check
   ```
   Garantisce che il catalogo tratti sia coerente con dataset e regole correnti.
4. **Inventario trait**
   ```bash
   python3 tools/py/traits_validator.py --inventory docs/catalog/traits_inventory.json
   ```
   Convalida che tutte le risorse elencate nell'inventario siano presenti, aggiornate e linkate ai report analitici (`data/derived/analysis/*`). In caso di nuove specie/biomi, verificare che le note riportino owner e data di allineamento.
5. **Configurazione generatore**
   ```bash
   python3 tools/py/validate_registry_naming.py --trait-glossary data/core/traits/glossary.json
   ```
   Esegue i controlli incrociati su registri (`env_to_traits.yaml`, `hazards.yaml`, `biome_classes.yaml`), trait reference e matrici specie, assicurando che i preset diffusi via web riflettano il glossario condiviso e che i morphotype elencati abbiano mapping aggiornati.
6. **Deploy checks**
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
- [ ] `python3 tools/py/traits_validator.py --inventory docs/catalog/traits_inventory.json` senza errori e con log aggiornato in `logs/traits_tracking.md`.
- [ ] `python3 tools/py/validate_registry_naming.py --trait-glossary data/core/traits/glossary.json` conferma la coerenza dei registri generator e del glossario.
- [ ] `scripts/run_deploy_checks.sh` termina con `exit 0` e aggiorna `logs/web_status.md` con esito ✅.
- [ ] Bundle statico generato (`dist/` in workflow o directory temporanea riportata dallo script) aperto in browser locale senza errori console critici.
- [ ] Tutti gli eventuali problemi Playwright/UI risolti o tracciati con ticket bloccante.

**Go**: tutti i checkbox spuntati, log archiviati e artefatti verificati. Procedere con `workflow_dispatch` di `Deploy site` oppure attendere trigger automatico su `main`.

**No-Go**: un qualsiasi gate fallito. Annotare l'errore su `logs/web_status.md` e aprire ticket di follow-up prima di ripetere la procedura.
