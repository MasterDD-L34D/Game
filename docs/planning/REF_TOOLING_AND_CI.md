# REF_TOOLING_AND_CI – Allineamento tooling e CI

Versione: 0.6
Data: 2026-04-22
Owner: agente **dev-tooling** (supporto: archivist, coordinator)
Stato: PATCHSET-00 CONSULTIVO – allineare tooling/CI al nuovo assetto (nessuna modifica a dati/tooling prevista in questo stadio; `validate-naming.yml` confermato report-only con trigger `push`/`workflow_dispatch` e gate PR disattivato finché la matrice core/derived non è stabilizzata). **Nota smoke**: ogni aggiornamento consultivo richiede solo riesecuzione smoke (report-only) di workflow/validator dichiarati sotto, senza alterare `data/core/**`, `data/derived/**` o tooling.

---

## Obiettivi

- Inventariare workflow CI, validatori e script di generazione pack per verificarne l’aderenza ai percorsi core e alle nuove regole di derivazione.
- Definire una checklist di compatibilità che eviti regressioni su test, schema-checker e pipeline Golden Path.
- Pianificare gli adeguamenti necessari per usare `data/core/**` come input primario e rigenerare i pack in modo ripetibile.

## Stato attuale

- I workflow `.github/workflows/**` e gli script in `tools/**`, `scripts/**`, `ops/**` non sono correlati a un inventario unico.
- Non è chiaro quali validatori usino core vs snapshot, né quali fixture in `data/derived/**` siano considerate canoniche per i test.
- Mancano indicazioni su come i workflow interagiscano con `packs/evo_tactics_pack` e con eventuali pack legacy.

## Rischi

- Test o validatori possono puntare a snapshot obsoleti, mascherando regressioni sui core.
- Rigenerazioni manuali o non documentate dei pack possono rompere la CI o la compatibilità con ALIENA/UCUM.
- Assenza di ownership sugli script può bloccare la manutenzione o lasciare step critici non automatizzati.

## Dipendenze

- `REF_REPO_SOURCES_OF_TRUTH` per sapere quali percorsi core devono essere convalidati.
- `REF_PACKS_AND_DERIVED` per le regole di rigenerazione dei pack e la classificazione delle fixture.
- `REF_REPO_MIGRATION_PLAN` per schedulare gli adeguamenti tooling/CI per patchset.
- Coordinamento con coordinator e archivist per prioritizzare P0/P1 e per evitare rotture del Golden Path.

## Prerequisiti e governance dei branch

- Esecuzione pianificata su branch dedicati `tooling-ci/allineamento-core-pack` e `tooling-ci/pack-regeneration`, con gate incrociati (merge solo se entrambi i branch hanno passato checklist schema + lint + rigenerazione pack).
- Allineare i gate a quanto previsto dalla milestone **0.2**: niente merge su `main` senza artifact pack rigenerato e validato da `tools/py/validate_datasets.py` + `schema-validate` + smoke CLI.
- Richiedere approvazione congiunta owner dati (core) + owner pack per modifiche che toccano sia `data/core/**` sia `packs/evo_tactics_pack/**`.
- Documentare in ogni PR gli artifact pubblicati (pack dist, report lint) e collegarli al branch dedicato.
- Nomina esplicita di un owner umano per PATCHSET-00 e registrazione delle attività correlate in `logs/agent_activity.md`.
- Uso di branch sperimentali separati per validare nuove checklist/validator prima di proporli sui branch principali di tooling/CI.

## Prossimi passi

1. Elencare i workflow CI e gli script rilevanti con input, output, dipendenze e owner.
2. Mappare quali validatori/schema-checker usano core vs derived e verificare la presenza degli schemi aggiornati.
3. Definire una checklist minima per la rigenerazione dei pack (comandi, prerequisiti, validazioni) da integrare in CI o documentazione.
4. Identificare fixture `data/derived/**` critiche per i test e pianificare la loro sostituzione con versioni rigenerate dai core.
5. Proporre aggiornamenti incrementali ai workflow CI, allineandoli con i patchset definiti nel piano di migrazione.

## Ordine di abilitazione CI (Master DD – 2026-04-12)

- Branch operativo: `patch/01C-tooling-ci-catalog` (strict-mode, nessun artefatto commit).
- **Decisione 2026-04-20**: `validate-naming.yml` resta in modalità consultiva per raccogliere metriche di stabilità finché la matrice core/derived non è stabilizzata. La pipeline gira su `push` del branch `patch/01C-tooling-ci-catalog` e via `workflow_dispatch` per run controllati; il trigger PR è disattivato per evitare blocchi.
- **Verifica 2026-04-26**: confermata la modalità consultiva e il gate PR disattivato su `patch/01C-tooling-ci-catalog`; nessuna sequenza di 3 run verdi consecutivi disponibile, monitoraggio continuo finché la matrice core/derived non è stabile.
- **Condizioni per promuovere a enforcing**:
  - matrice core/derived stabilizzata e allineata con gli scope 03A/03B;
  - almeno **3 run consecutivi verdi** su `patch/01C-tooling-ci-catalog` con falsi positivi/negativi monitorati;
  - approvazione esplicita Master DD e log operativo aggiornato con piano di rollback (ripristino consultivo o disattivazione trigger PR in caso di regressioni);
  - conferma che glossari/registri pack puntino alle fonti core aggiornate senza drift.
- Nota decisionale (report-only vs enforcing):
  - **Report-only**: mantenere `validate-naming.yml` consultivo su `push` del branch `patch/01C-tooling-ci-catalog` e tramite `workflow_dispatch` per raccolta metriche, con step non bloccanti e senza gate PR; validazione glossari/registi limitata ai registri trait/species core e ai registri pack (`packs/evo_tactics_pack/tools/config/registries/**`) per misurare falsi positivi.
  - **Enforcing**: passaggio vincolante (riattivando il trigger `pull_request` e rimuovendo continue-on-error) quando (i) la matrice core/derived è stabile, (ii) esistono **3 run verdi consecutivi** su `patch/01C-tooling-ci-catalog`, (iii) è stato monitorato e documentato il tasso di falsi positivi/negativi nei log operativi; includere i glossari core e pack come source-of-truth nei job di naming/schema.
  - Impatti attesi sui trigger: nessun trigger aggiuntivo; il passaggio a enforcing rende bloccanti i gate PR e può essere revocato tornando a trigger solo `push`/`workflow_dispatch` in caso di regressioni.
- Sequenza approvata:
  1. Abilitare **enforcing** su `data-quality.yml` (audit core/pack) e `validate_traits.yml` (catalogo trait, lint, coverage) come gate PR.
  2. Portare **schema-validate.yml** in enforcing su variazioni schema/lint (core + config/schemas) prima dei merge.
  3. Mantenere **validate-naming.yml** in **report-only** finché la matrice core/derived non è stabile; convergere a enforcing solo dopo l’allineamento delle registrazioni pack e previa conferma esplicita.
  4. Lasciare **incoming-smoke.yml** **disattivato/solo dispatch manuale** (nessun trigger PR) fino a quando non vengono definiti i check automatici su nuovi drop e arriva un via libera esplicito.
- Reminder check mancanti: drift `data/derived/**` vs sorgenti non ancora monitorato (proposta step opzionale in `validate_traits.yml`), gating incoming ancora limitato a uso manuale di `scripts/report_incoming.sh`.

### Criteri di monitoraggio e promozione

- Richiedere almeno **3 esecuzioni consecutive verdi** su `patch/01C-tooling-ci-catalog` per ciascun workflow prima del passaggio a enforcing.
- Monitorare e allegare agli update PR: tasso di failure per categoria (schema, naming, audit), falsi positivi/negativi noti e delta tempo di esecuzione rispetto allo stato consultivo.
- Documentare eventuali esclusioni temporanee o percorsi ignorati (core vs derived) nei log operativi prima di promuovere un workflow.
- Per `validate-naming.yml` e `incoming-smoke.yml`, non rimuovere i guardrail finché non è stato esplicitamente autorizzato (owner dati + owner CI) e tracciato nel log operativo.

### Log operativo sui cambi di stato

- Ogni passaggio di stato (consultivo → enforcing, disattivato → attivo) deve essere registrato in `logs/agent_activity.md` e nel changelog del branch `patch/01C-tooling-ci-catalog` con: data/ora UTC, workflow, stato precedente, stato nuovo, owner che approva, evidenze di monitoraggio (esecuzioni verdi, metriche).
- Le note di log devono citare eventuali rollback o eccezioni temporanee e includere link ai run CI di riferimento.
- Punto decisionale Master DD: prima di cambiare lo stato di un workflow, verificare che i log operativi riportino la stabilità della matrice core/derived, le **3 esecuzioni verdi consecutive** e l’analisi dei falsi positivi; l’approvazione deve essere tracciata e collegata ai run CI del branch `patch/01C-tooling-ci-catalog`.

## Inventario workflow/script (modalità report-only – 2026-02-07)

| Voce                 | Percorso                                                      | Stato       | Note                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI orchestrazione    | `.github/workflows/ci.yml`                                    | report-only | Include `scripts/cli_smoke.sh`, `scripts/build_trait_index.js`, `tools/py/validate_datasets.py`; mantenere consultivo finché 01C non approvato.                             |
| Audit dati core/pack | `.github/workflows/data-quality.yml`                          | report-only | Usa `scripts/trait_audit.py --check`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py`, `tools/audit/data_health.py`; nessun gating su core/pack attivo. |
| Validazione trait    | `.github/workflows/validate_traits.yml`                       | report-only | `tools/py/trait_template_validator.py --summary`, `scripts/build_trait_index.js`, `scripts/trait_style_check.js`; esecuzione solo informativa.                              |
| Schema checker       | `.github/workflows/schema-validate.yml`                       | report-only | `tools/ajv-wrapper.sh`, `tools/py/yaml_lint.py` su `schemas/**` e `config/schemas/*.json`; nessuna modifica a schema.                                                       |
| Naming registri      | `.github/workflows/validate-naming.yml`                       | report-only | `tools/py/validate_registry_naming.py` contro glossario core; mantenere in sola lettura.                                                                                    |
| Smoke CLI/core-pack  | `scripts/cli_smoke.sh`                                        | report-only | Da usare con `--core-root data/core --pack-root dist/packs/evo_tactics_pack` in dry-run; loggare esiti, senza pubblicare artefatti.                                         |
| Validator dataset    | `tools/py/validate_datasets.py`                               | report-only | Esecuzione con `--schemas-only` o `--pack` in staging; vietato committare output/artefatti.                                                                                 |
| Trait audit/coverage | `scripts/trait_audit.py`, `tools/py/report_trait_coverage.py` | report-only | Solo consultivo su core/pack; includere nei log 01C senza cambiare dataset.                                                                                                 |
| Trait style check    | `scripts/trait_style_check.js`                                | report-only | Lint su `data/traits/**` o core/pack mirror; output locale non commit.                                                                                                      |

---

## Mappatura workflow CI (`.github/workflows/**`)

- **ci.yml** → orchestrazione principale con `paths-filter` per job ts/cli/python/data/deploy/styleguide/stack/site_audit; tocca `scripts/cli_smoke.sh`, `scripts/build_trait_index.js`, `tools/py/validate_datasets.py` e verifica che i job dati puntino a `data/core/**` prima di generare derived.
- **data-quality.yml** → audit dati core/pack: `tools/py/validate_datasets.py`, `scripts/trait_audit.py --check`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py`, `tools/audit/data_health.py` (usa `data/core/**`, `packs/evo_tactics_pack/**`); deve rimanere in sola lettura sui core durante PATCHSET-00.
- **validate_traits.yml** → validazione trait catalog (`tools/py/trait_template_validator.py --summary`, `scripts/build_trait_index.js`, trait coverage, `scripts/trait_style_check.js`, `tools/py/trait_health.py` se abilitato) con ingressi da `data/core/traits/**` e overlay pack.
- **schema-validate.yml** → verifica formale degli schemi JSON/YAML in `schemas/*.json`, `schemas/core/**`, `schemas/evo/**`, `schemas/quality/**`, `config/schemas/*.json`, `schemas/card_schema.yaml`, `schemas/roll_table_schema.yaml` via `jsonschema` / `ajv-wrapper.sh`; include lint YAML per i draft 2020.
- **validate-naming.yml** → controllo naming registri (`tools/py/validate_registry_naming.py` + registri pack `packs/evo_tactics_pack/tools/config/registries/**`) con glossary core come fonte.
- Workflow di servizio (`traits-monthly-maintenance.yml`, `traits-sync.yml`, `qa-*.yml`, `incoming-smoke.yml`, `evo-*.yml`, `daily-*.yml`, `hud.yml`, `lighthouse.yml`, `gh-pages.yml`, `telemetry-export.yml`, `search-index.yml`, `idea-intake-index.yml`, `qa-reports.yml`, `qa-kpi-monitor.yml`, `qa-export.yml`, `update-evo-tracker.yml`, `evo-rollout-status.yml`): refresh tracker, sync trait, export KPI/report, rollout status, idea intake, search index, HUD/lighthouse, deploy test interface, telemetry export, pubblicazione siti. Segnalare eventuali consumi di snapshot (`data/derived/**`) o pack statici `packs/evo_tactics_pack/docs/catalog/**` da rimuovere nei patchset successivi.
- Workflow chatGPT/e2e/deploy (`chatgpt_sync.yml`, `e2e.yml`, `deploy-test-interface.yml`, `incoming-smoke.yml`, `hud.yml`, `lighthouse.yml`): verificare dipendenze su snapshot/pack e smoke contro `data/core/**`; nessun cambio workflow in PATCHSET-00.

## Validator e schema checker (percorsi e comandi)

- `tools/py/validate_datasets.py` (richiamato da data-quality): valida dataset core e pack tramite moduli `evo_tactics_pack.run_all_validators` e path `packs/evo_tactics_pack/**`; opzioni `--core-root`, `--pack-root`, `--schemas-only` per isolare i perimetri.
- `scripts/trait_audit.py --check --core-root data/core`: audit trait core (glossario `data/core/traits/glossary.json`, pools, species) con possibilità di confronto pack `--pack-root packs/evo_tactics_pack/data`.
- `tools/py/trait_template_validator.py --summary`: verifica schema trait rispetto a `config/schemas/trait.schema.json` e `data/traits/**` (core + eventuali overlay pack).
- `scripts/trait_style_check.js`: lint stile trait (input `data/traits/**`, produce report in `reports/trait_style/**`), usato da `validate_traits.yml`.
- `tools/py/report_trait_coverage.py --strict --glossary data/core/traits/glossary.json --pack-root packs/evo_tactics_pack`: coverage trait vs env/species (usa pack cataloghi rigenerati).
- `tools/py/validate_registry_naming.py`: incrocia registri pack (`packs/evo_tactics_pack/tools/config/registries/*.yaml`) con glossario core/pack.
- `tools/audit/data_health.py`, `tools/traits/check_biome_feature.py`, `tools/traits.py`: validazioni su `data/core/**` (biomi, species, glossary) e mirror pack.
- Schemi: `schemas/core/**`, `schemas/evo/**`, `schemas/quality/**`, `config/schemas/*.json`, `schemas/card_schema.yaml`, `schemas/roll_table_schema.yaml` (validazione Draft2020 + lint YAML via `schema-validate.yml` o `tools/py/yaml_lint.py`). Ogni schema tocca core/pack indirettamente tramite template trait/species/biome.

## Test e fixture che toccano core/pack

- **Core**: `tests/test_species_builder.py` (usa `data/core/traits/glossary.json`), `tests/test_species_aliases.py` (`data/core/species/aliases.json`), `tests/playtests/test_balance_progression.py` (`data/core/missions/skydock_siege.yaml`), `tests/server/trait-index.spec.js` e `tests/api/fixtures/traitContractSamples.js` (trait index/glossary core).
- **Pack Evo**: `tests/validators/test_rules.py`, `tests/scripts/test_seed_evo_generator.py`, `tests/test_trait_baseline.py`, `tests/validate_dashboard.py`, `tests/docs-generator/integration/generator.integration.test.ts`, `tests/scripts/sync_evo_pack_assets.test.js` (caricano validators pack, cataloghi, species/ecosystem pack e path `packs/evo_tactics_pack/data/**`).
- **Script QA**: `scripts/qa/frattura_abissale_validations.py`, `scripts/qa/run_frattura_abissale_pipeline.sh` (ingest `data/core/biomes.yaml`, pools, species, glossary).
- **Smoke/CLI**: `scripts/cli_smoke.sh` include loop su `*/data/core/biomes.yaml` e pack incoming.

## Adeguamenti proposti (puntare ai core come source of truth)

- Aggiornare `data-quality.yml` e `validate_traits.yml` per usare percorsi `data/core/**` come input predefinito (non snapshot derived) e generare output derived solo come artefatti; isolare validators pack in job separato con trigger su `packs/evo_tactics_pack/**`.
- Centralizzare i path core in `tools/py/validate_datasets.py` e `scripts/trait_audit.py` usando parametri espliciti `--core-root data/core` e rendere opzionale il mirror pack; evitare fallback a `data/derived/**`.
- Estendere `schema-validate.yml` per includere `config/schemas/*.json` e `schemas/**` (core/evo/quality) garantendo Draft2020 e lint YAML (es. `ajv-wrapper.sh` o `pyyaml` check) sugli schemi `.yaml`.
- Allineare test pack (`tests/scripts/test_seed_evo_generator.py`, validators runtime) a leggere i core come fonte, rigenerando cataloghi pack via pipeline invece di usare fixture statiche in `packs/evo_tactics_pack/docs/catalog/**`.
- Agganciare workflow di sync/maintenance (traits-monthly-maintenance.yml, traits-sync.yml, qa-export.yml, qa-kpi-monitor.yml) al prodotto dei core rigenerati, evitando che consumino snapshot manuali.

## Checklist operativa 02A (solo verifica, senza modifiche ai workflow)

- **Schema checker** (solo consultivo):
  - `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
  - `bash tools/ajv-wrapper.sh schemas/**/*.json`
  - `python tools/py/yaml_lint.py schemas schemas/core schemas/evo schemas/quality config/schemas`
- **Lint dati core**:
  - `python scripts/trait_audit.py --check --core-root data/core`
  - `python scripts/trait_audit.py --check --core-root data/core --pack-root packs/evo_tactics_pack/data`
  - `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`
- **Rigenerazione pack simulata** (senza commit artifact):
  - `node scripts/build_evo_tactics_pack_dist.mjs --source data/core --out /tmp/dist/packs/evo_tactics_pack`
  - `node scripts/update_evo_pack_catalog.js --pack /tmp/dist/packs/evo_tactics_pack`
  - `python tools/py/validate_datasets.py --pack /tmp/dist/packs/evo_tactics_pack`
  - `python tools/py/validate_registry_naming.py --registries packs/evo_tactics_pack/tools/config/registries --glossary data/core/traits/glossary.json`
  - `bash scripts/cli_smoke.sh --core-root data/core --pack-root /tmp/dist/packs/evo_tactics_pack`
  - Archiviare solo report temporanei, senza aggiornare workflow o commit artefatti.

## Smoke PATCHSET-00 (solo consultivo, senza modifica dati/tooling)

- **Workflow da rieseguire come smoke** (report-only, nessun gate PR):
  - `schema-validate.yml` → limita il controllo a `schemas/**/*.json`, `schemas/**/*.yaml`, `config/schemas/*.json` (percorsi canonici in `REF_REPO_SOURCES_OF_TRUTH`), senza toccare `data/core/**`.
  - `validate-naming.yml` → confermato report-only su `push`/`workflow_dispatch`, verifica registri pack `packs/evo_tactics_pack/tools/config/registries/**` rispetto a `data/core/traits/glossary.json`.
  - `data-quality.yml` (solo step read-only) → esecuzione consultiva di `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` per allineamento a percorsi canonici/derived (vedi `REF_PACKS_AND_DERIVED`).
  - Validatori manuali smoke: `python scripts/trait_audit.py --check --core-root data/core` + `bash tools/ajv-wrapper.sh schemas/**/*.json` per confermare che nessuna modifica ai core/derived sia introdotta.

## Checklist automatica PATCHSET-01 (gate incrociati core ↔ pack, con owner)

| Ambito               | Comando esatto                                                                                                                                      | Owner (esecuzione/approvazione)        | Note e riferimenti core/derived                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Schema (core)        | `python tools/py/trait_template_validator.py --summary`                                                                                             | dev-tooling (run) / archivist (review) | Input canonico: `data/core/traits/**`; schema da `schemas/evo/trait.schema.json` (`REF_REPO_SOURCES_OF_TRUTH`). |
| Schema esteso        | `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`                                      | dev-tooling / archivist                | Copre core + pack derived; percorso pack in `REF_PACKS_AND_DERIVED`.                                            |
| Lint dati core       | `python scripts/trait_audit.py --check --core-root data/core`                                                                                       | trait-curator / dev-tooling            | Percorso canonico `data/core/**`; nessun write su derived.                                                      |
| Lint stile traits    | `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`                                                             | trait-curator / dev-tooling            | Usa `data/core/traits/**`; report temporaneo non commit.                                                        |
| Coverage core+pack   | `python tools/py/report_trait_coverage.py --strict --glossary data/core/traits/glossary.json --pack-root dist/packs/evo_tactics_pack`               | trait-curator / dev-tooling            | Richiede pack rigenerato in `dist/packs/evo_tactics_pack` (derived controllato in `REF_PACKS_AND_DERIVED`).     |
| Health check dati    | `python tools/audit/data_health.py --core-root data/core --pack-root dist/packs/evo_tactics_pack`                                                   | dev-tooling / archivist                | Smoke su core e derived rigenerati (nessun write).                                                              |
| Build pack           | `node scripts/build_evo_tactics_pack_dist.mjs --source data/core --out dist/packs/evo_tactics_pack`                                                 | dev-tooling / archivist                | Input canonico `data/core/**`; output derived in `dist/packs/evo_tactics_pack`.                                 |
| Cataloghi pack       | `node scripts/update_evo_pack_catalog.js --pack dist/packs/evo_tactics_pack`                                                                        | dev-tooling / archivist                | Derived dichiarati in `REF_PACKS_AND_DERIVED`; non commit se consultivo.                                        |
| Validator pack       | `python tools/py/validate_datasets.py --pack dist/packs/evo_tactics_pack`                                                                           | dev-tooling / archivist                | Lega derived pack a core; output solo report.                                                                   |
| Naming registri pack | `python tools/py/validate_registry_naming.py --registries packs/evo_tactics_pack/tools/config/registries --glossary data/core/traits/glossary.json` | dev-tooling / archivist                | Incrocia registri pack (derived) con glossario core (canonico).                                                 |
| Smoke CLI            | `bash scripts/cli_smoke.sh --core-root data/core --pack-root dist/packs/evo_tactics_pack`                                                           | dev-tooling / coordinator              | Verifica end-to-end usando core canonici e pack derived rigenerati.                                             |
| Artefatti/report     | Pubblicare come artifact CI: `reports/trait_progress.md`, `data/derived/analysis/trait_coverage_report.json`, `dist/packs/evo_tactics_pack/**`      | dev-tooling / archivist                | Derived tracciati; nessun commit diretto su PATCHSET-01.                                                        |

---

## Changelog

- 2026-04-22: versione 0.6 – aggiunta nota smoke per PATCHSET-00 (nessuna modifica dati/tooling), checklist PATCHSET-01 con comandi/owner e riferimenti ai percorsi canonici (`REF_REPO_SOURCES_OF_TRUTH`) e derived (`REF_PACKS_AND_DERIVED`).
- 2025-12-30: versione 0.5 – intestazione aggiornata al report v0.5, confermata la numerazione 01A–03B e il perimetro di PATCHSET-00 senza impatti ai workflow.
- 2025-12-17: versione 0.3 – design completato e perimetro documentazione confermato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance espansi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-23: struttura iniziale di inventario tooling/CI (dev-tooling).
- 2025-12-09: mappatura workflow/validatori estesa, checklist v0.2 con gate incrociati core/pack e prerequisiti branch dedicati.
