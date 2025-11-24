# REF_TOOLING_AND_CI – Allineamento tooling e CI

Versione: 0.5
Data: 2025-12-30
Owner: agente **dev-tooling** (supporto: archivist, coordinator)
Stato: PATCHSET-00 PROPOSTA – allineare tooling/CI al nuovo assetto (nessuna modifica a dati/tooling prevista in questo stadio)

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

## Checklist automatica PATCHSET-01 (gate incrociati core ↔ pack)

- **Schema**: `python -m jsonschema --version` (pre-flight) + `python tools/py/trait_template_validator.py --summary` + validazione schemi JSON/YAML (`python tools/py/validate_datasets.py --schemas-only`, `python tools/py/validate_export.py --check-telemetry data/core/telemetry.yaml`, `bash tools/ajv-wrapper.sh schemas/**/*.json`). Target proposti: `make schema-validate` / job `schema-validate.yml`.
- **Lint dati core**: `python scripts/trait_audit.py --check --core-root data/core`, `python tools/py/report_trait_coverage.py --strict --glossary data/core/traits/glossary.json --pack-root dist/packs/evo_tactics_pack`, `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`, `python tools/audit/data_health.py --core-root data/core --pack-root dist/packs/evo_tactics_pack`. Target: `make data-lint` (o step `data-quality` dedicato) vincolato al branch core.
- **Rigenerazione pack**: `node scripts/build_evo_tactics_pack_dist.mjs --source data/core --out dist/packs/evo_tactics_pack` → `node scripts/update_evo_pack_catalog.js --pack dist/packs/evo_tactics_pack` → `python tools/py/validate_datasets.py --pack dist/packs/evo_tactics_pack` → `python tools/py/validate_registry_naming.py --registries packs/evo_tactics_pack/tools/config/registries --glossary data/core/traits/glossary.json`. Target: `make pack-regenerate` su branch `tooling-ci/pack-regeneration`.
- **Smoke/CLI**: `bash scripts/cli_smoke.sh --core-root data/core --pack-root dist/packs/evo_tactics_pack` (verifica path e asset); opzionale `python tools/audit/data_health.py --core-root data/core --pack-root dist/packs/evo_tactics_pack`. Target: `make cli-smoke`/job `ci.yml` (gate cross-branch).
- **Artefatti/report**: pubblicare `reports/trait_progress.md`, `data/derived/analysis/trait_coverage_report.json`, `dist/packs/evo_tactics_pack/**` come artifact CI per revisione; allegare digest a PR di merge incrociato.

---

## Changelog

- 2025-12-30: versione 0.5 – intestazione aggiornata al report v0.5, confermata la numerazione 01A–03B e il perimetro di PATCHSET-00 senza impatti ai workflow.
- 2025-12-17: versione 0.3 – design completato e perimetro documentazione confermato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance espansi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-23: struttura iniziale di inventario tooling/CI (dev-tooling).
- 2025-12-09: mappatura workflow/validatori estesa, checklist v0.2 con gate incrociati core/pack e prerequisiti branch dedicati.
