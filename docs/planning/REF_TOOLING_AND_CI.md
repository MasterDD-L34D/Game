# REF_TOOLING_AND_CI – Allineamento tooling e CI

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **dev-tooling** (supporto: archivist, coordinator)
Stato: DRAFT – allineare tooling/CI al nuovo assetto

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

## Prossimi passi

1. Elencare i workflow CI e gli script rilevanti con input, output, dipendenze e owner.
2. Mappare quali validatori/schema-checker usano core vs derived e verificare la presenza degli schemi aggiornati.
3. Definire una checklist minima per la rigenerazione dei pack (comandi, prerequisiti, validazioni) da integrare in CI o documentazione.
4. Identificare fixture `data/derived/**` critiche per i test e pianificare la loro sostituzione con versioni rigenerate dai core.
5. Proporre aggiornamenti incrementali ai workflow CI, allineandoli con i patchset definiti nel piano di migrazione.

---

## Mappatura workflow CI (`.github/workflows/**`)

- **ci.yml** → orchestration principale con `paths-filter` che abilita job per aree ts/cli/python/data/deploy/styleguide/stack/site_audit.
- **data-quality.yml** → audit dati: `tools/py/validate_datasets.py`, `scripts/trait_audit.py --check`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py` (usa core e derived attuali).
- **validate_traits.yml** → validazione trait catalog (`tools/py/trait_template_validator.py --summary`, `scripts/build_trait_index.js`, trait coverage, `scripts/trait_style_check.js`).
- **schema-validate.yml** → verifica formale degli schemi JSON in `schemas/*.json` con `jsonschema`.
- **validate-naming.yml** → controllo naming registri (`tools/py/validate_registry_naming.py` + registri pack `packs/evo_tactics_pack/tools/config/registries/**`).
- Workflow di servizio (`data-quality.yml`, `traits-monthly-maintenance.yml`, `traits-sync.yml`, `qa-*.yml`, `incoming-smoke.yml`, `evo-*.yml`, `daily-*.yml`, `qa-*.yml`, `hud.yml`, `lighthouse.yml`, `gh-pages.yml`, `telemetry-export.yml`, `search-index.yml`, `idea-intake-index.yml`, `qa-reports.yml`, `qa-kpi-monitor.yml`, `qa-export.yml`, `update-evo-tracker.yml`, `evo-rollout-status.yml`): refresh tracker, sync trait, export KPI/report, rollout status, idea intake, search index, HUD/lighthouse, deploy test interface, telemetry export, pubblicazione siti. Da riallineare dove consumano dataset derived o pack.
- Workflow chatGPT/e2e/deploy (`chatgpt_sync.yml`, `e2e.yml`, `deploy-test-interface.yml`, `incoming-smoke.yml`, `hud.yml`, `lighthouse.yml`): verificare dipendenze su snapshot/pack.

## Validator e schema checker (percorsi e comandi)

- `tools/py/validate_datasets.py` (richiamato da data-quality): valida dataset core e pack tramite moduli `evo_tactics_pack.run_all_validators` e path `packs/evo_tactics_pack/**`.
- `scripts/trait_audit.py --check`: audit trait core (glossario `data/core/traits/glossary.json`, pools, species).
- `tools/py/trait_template_validator.py --summary`: verifica schema trait rispetto a `config/schemas/trait.schema.json` e `data/traits/**`.
- `scripts/trait_style_check.js`: lint stile trait (input `data/traits/**`, produce report in `reports/trait_style/**`).
- `tools/py/report_trait_coverage.py --strict`: coverage trait vs env/species (usa `packs/evo_tactics_pack/docs/catalog/env_traits.json` e specie pack).
- `tools/py/validate_registry_naming.py`: incrocia registri pack (`packs/evo_tactics_pack/tools/config/registries/*.yaml`) con glossario core/pack.
- `tools/audit/data_health.py`, `tools/traits/check_biome_feature.py`, `tools/traits.py`: validazioni su `data/core/**` (biomi, species, glossary) e mirror pack.
- Schemi: `schemas/core/**`, `schemas/evo/**`, `schemas/quality/**`, `config/schemas/*.json`, `schemas/card_schema.yaml`, `schemas/roll_table_schema.yaml` (attualmente validati da `schema-validate.yml`).

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

## Checklist automatica PATCHSET-01

- **Schema**: eseguire `python -m jsonschema --version` + `python tools/py/trait_template_validator.py --summary` + validazione schemi JSON/YAML (`python tools/py/validate_datasets.py --schemas-only`, `python tools/py/validate_export.py --check-telemetry data/core/telemetry.yaml`).
- **Lint dati core**: `python scripts/trait_audit.py --check --core-root data/core`, `python tools/py/report_trait_coverage.py --strict --glossary data/core/traits/glossary.json`, `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`.
- **Rigenerazione pack**: `node scripts/build_evo_tactics_pack_dist.mjs --source data/core --out dist/packs/evo_tactics_pack` seguito da `python tools/py/validate_datasets.py --pack dist/packs/evo_tactics_pack` e update cataloghi (`node scripts/update_evo_pack_catalog.js --pack dist/packs/evo_tactics_pack`).
- **Smoke/CLI**: `bash scripts/cli_smoke.sh --core-root data/core --pack-root dist/packs/evo_tactics_pack` (verifica path e asset); opzionale `python tools/audit/data_health.py --core-root data/core --pack-root dist/packs/evo_tactics_pack`.
- **Artefatti/report**: pubblicare `reports/trait_progress.md`, `data/derived/analysis/trait_coverage_report.json`, `dist/packs/evo_tactics_pack/**` come artifact CI per revisione.

---

## Changelog

- 2025-11-23: struttura iniziale di inventario tooling/CI (dev-tooling).
