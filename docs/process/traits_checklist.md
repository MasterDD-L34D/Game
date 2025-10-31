# Checklist iterativa tratti

Queste checklist guidano ogni iterazione di aggiunta o revisione tratti,
seguendo step incrementali che coprono revisione design, QA e telemetria.

## 1. Preparazione design
- [ ] Validare la proposta con il glossario (`data/core/traits/glossary.json`) e
      aprire una nota di revisione nel documento di riferimento del pack.
- [ ] Aggiornare `env_traits.json` / `data/traits/index.json` con tier, slot e
      requisiti ambientali, includendo eventuali note di bilanciamento.
- [ ] Aggiornare `docs/catalog/species_trait_matrix.json` con le nuove
      associazioni Forma↔bioma e indicare l'owner del tratto nelle note.
- [ ] Registrare l'asset nell'inventario `docs/catalog/traits_inventory.json`
      specificando stato (`core/mock`), owner e fonti di riferimento.

## 2. Revisione e QA automatizzato
- [ ] Eseguire `python tools/traits.py validate --matrix docs/catalog/species_trait_matrix.json`
      e archiviare l'output nei log QA.
- [ ] Rigenerare baseline e coverage (`build_trait_baseline.py`,
      `report_trait_coverage.py`) per aggiornare `data/derived/analysis/*.yaml|csv`.
- [ ] Lanciare `python tools/py/validate_registry_naming.py` per verificare
      coerenza slug e traduzioni condivise.
- [ ] Eseguire `python tools/py/traits_validator.py --inventory
      docs/catalog/traits_inventory.json` (opzionale `--no-log` in locale)
      per verificare che tutte le risorse citate siano presenti e aggiornate.
- [ ] Eseguire `scripts/cli_smoke.sh` filtrando il profilo rilevante
      (`CLI_PROFILES="playtest telemetry"`) e annotare eventuali regressioni.

## 3. QA manuale & Playtest
- [ ] Aggiornare il generator (`docs/evo-tactics-pack/generator.js`) o la build
      companion per verificare l'esperienza utente con label e suggerimenti
      aggiornati.
- [ ] Registrare nel log playtest gli scenari coperti, indicando specie/biomi
      e target di pick-rate comparati con il report audit (`docs/reports/trait-env-alignment.md`).
- [ ] Se emergono gap >5% nei pick-rate o mismatch con la matrice specie,
      aprire task di bilanciamento e ripetere la sezione 2.

## 4. Telemetria & chiusura iterazione
- [ ] Integrare i dati raccolti in `data/core/telemetry.yaml` (nuove metriche o
      aggiornamento di quelle esistenti) e allegare i diff al report di
      playtest.
- [ ] Rieseguire `python tools/py/report_trait_coverage.py` per confermare che
      la matrice CSV rifletta le ultime scelte di design.
- [ ] Aggiornare il changelog o la roadmap con le decisioni prese, citando il
      tratto e il gate di qualità superato.
- [ ] Preparare la nota di rilascio o l'aggiornamento del canvas con i link a
      report, matrici e telemetria.

## 5. Manutenzione file trait & integrazione CI

- [ ] Quando si crea un nuovo file specie/evento in `packs/evo_tactics_pack/data/species/**`,
      rigenerare la matrice con `python tools/traits.py matrix --out
      docs/catalog/species_trait_matrix.json` per importare i nuovi trait nel
      generator e prevenire regressioni sugli ID.
- [ ] Aggiornare l'inventario `docs/catalog/traits_inventory.json` con il nuovo path,
      eseguendo `python tools/py/traits_validator.py` per registrare il run in
      `logs/traits_tracking.md`.
- [ ] Verificare che `scripts/run_deploy_checks.sh` passi senza errori: lo script
      viene richiamato sia da CI sia dal workflow `deploy-test-interface.yml` e
      blocca la pubblicazione se l'inventario o i registri del generatore non sono
      coerenti.
- [ ] Collegare il nuovo file alle procedure di audit lanciando `python
      tools/py/validate_registry_naming.py --trait-glossary data/core/traits/glossary.json`
      e archiviare gli output nella cartella `logs/traits/` (se assente, crearla).
- [ ] Annotare nelle note del PR i gate superati (validator inventario, naming,
      `scripts/trait_audit.py --check`) per rendere tracciabile il ciclo di QA.

## 6. Verifica sito e promozione pipeline web

### Stato corrente

<!-- web_status:start -->
_Nessuna esecuzione registrata. Eseguire `python tools/py/update_web_checklist.py` per aggiornare lo stato._
<!-- web_status:end -->

### Percorso di verifica

1. **Trigger di build CI**
   - Il branch principale avvia la pipeline `ci-pipeline.md#web` a ogni push o PR.
   - Il branch di staging avvia la pipeline notturna che esegue smoke test e audit accessibilità (`npm run test:web`, `npm run lint:web`, `npm run audit:web`).
2. **Trigger manuali**
   - Per hotfix o campagne marketing, eseguire `scripts/deploy_web_preview.sh` per il deploy su ambiente di preview.
   - Lanciare `python tools/py/update_web_checklist.py --tests-command "npm run test:web" --coverage 85.0 --regressions "nessuna"` per registrare l'esito.
3. **Criteri di promozione**
   - Nessuna regressione critica aperta nel report QA (`logs/web_status.md`).
   - Copertura funzionale ≥ 80% per componenti core (`coverage/lcov-report/index.html`).
   - Smoke test su dispositivi desktop/mobile completati e firmati dal referente design.
   - Accessibilità AA confermata da audit automatico (`npm run audit:web`) e validazione manuale.

### Checklist pre-promozione

- [ ] Verificare che l'ultima pipeline CI sia verde su staging.
- [ ] Validare l'URL di preview con marketing e supporto.
- [ ] Aggiornare `logs/web_status.md` con note di revisione e prossimo checkpoint.
- [ ] Inviare il riepilogo su #web-status e allegare screenshot del diff principale.
