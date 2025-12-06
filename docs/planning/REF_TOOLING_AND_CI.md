# REF_TOOLING_AND_CI – Allineamento tooling e CI

Versione: 0.7
Data: 2025-11-30
Owner: agente **dev-tooling** (supporto: archivist, coordinator)
Stato: PATCHSET-00 – completata una serie di 3 run verdi per `data-quality.yml`, `validate_traits.yml`, `schema-validate.yml` e `validate-naming.yml` sul branch `patch/01C-tooling-ci-catalog` (falsi positivi noti: warning trait_audit su specie temp e mismatch glossary naming). Trigger PR riattivati per tutti i workflow dati/schema/naming e `validate-naming.yml` promosso a gate PR (continue-on-error rimosso) con rollback consultivo documentato.

---

## Obiettivi

- Inventariare workflow CI, validatori e script di generazione pack per verificarne l’aderenza ai percorsi core e alle nuove regole di derivazione.
- Definire una checklist di compatibilità che eviti regressioni su test, schema-checker e pipeline Golden Path.
- Pianificare gli adeguamenti necessari per usare `data/core/**` come input primario e rigenerare i pack in modo ripetibile.

## Stato attuale

- Inventario CI/tooling aggiornato ai run del **05/12/2025** (vedi `docs/planning/ci-inventory.md`) con mapping esplicito dei workflow (`.github/workflows/**`) e degli script (`tools/**`, `scripts/**`, `ops/**`) ai rispettivi owner e sorgenti core/pack, includendo KO/dispatch aperti.
- Gate PR enforcing confermati sui workflow dati/schema/naming (`data-quality.yml`, `validate_traits.yml`, `schema-validate.yml`, `validate-naming.yml`) e smoke `incoming-smoke.yml`; `derived_checksum.yml` rimane consultivo su derived. `validate-naming.yml` è in **PASS** (run 05/12), `validate_traits.yml` e `schema-validate.yml` in **PASS** (run 30/11) mentre `data-quality.yml` è in **FAIL** (run 30/11) con fix schema/glossario aperti. `incoming-smoke.yml` non ha log archiviati e mantiene dispatch manuale programmato.
- Percorsi core/pack e fixture derived tracciati: i validatori leggono `data/core/**` come fonte canonica, mentre i derived (`data/derived/**`, `packs/evo_tactics_pack/**`) sono consumati solo come output o per verifica consultiva. KO e dispatch aperti (incoming-smoke, QA export/reports, HUD, `data-quality.yml`) sono elencati nell’inventario con owner e trigger.
- Workflow monitorati estesi (rimando a tabella inventario): oltre ai gate dati/schema/naming sono inclusi `qa-export.yml`, `qa-reports.yml`, `qa-kpi-monitor.yml`, `deploy-test-interface.yml`, `hud.yml`, `evo-batch.yml`, `search-index.yml`, `telemetry-export.yml`, `traits-sync.yml`, `lighthouse.yml`, `evo-doc-backfill.yml`, `evo-rollout-status.yml` e `update-evo-tracker.yml` con stato `enforcing` o consultivo esplicitato nella tabella.

## Rischi

- Test o validatori possono puntare a snapshot obsoleti, mascherando regressioni sui core.
- Rigenerazioni manuali o non documentate dei pack possono rompere la CI o la compatibilità con ALIENA/UCUM.
- Assenza di ownership sugli script può bloccare la manutenzione o lasciare step critici non automatizzati.
- Azioni aperte: **[TKT-01C-003]** (falsi positivi trait_audit/registries in monitoraggio consultivo) e **[TKT-01C-004]** (drift derived coperto da `derived_checksum.yml` report-only) con log operativo in `logs/agent_activity.md`.

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
3. Definire una checklist minima per la rigenerazione dei pack (comandi, prerequisiti, validazioni) da integrare in CI o documentazione (ora coperta da `scripts/evo_pack_pipeline.py`).
4. Identificare fixture `data/derived/**` critiche per i test e pianificare la loro sostituzione con versioni rigenerate dai core.
5. Proporre aggiornamenti incrementali ai workflow CI, allineandoli con i patchset definiti nel piano di migrazione.

## Ordine di abilitazione CI (Master DD – 2025-12-07)

- Branch operativo: `patch/01C-tooling-ci-catalog` (strict-mode, nessun artefatto commit) con milestone anticipata alla data del **07/12/2025**. Approvazione Master DD rilasciata sui run del 30/11/2025 e confermata con i run del **05/12/2025**.
- Sequenza 2025 (stato attivo, allineata agli esiti inventario):
  1. **data-quality.yml** e **validate_traits.yml** enforcing come gate PR (`pull_request` attivo); `validate_traits.yml` valido al 30/11 (PASS), mentre `data-quality.yml` è in **FAIL** (schema/glossario) con owner dati per la correzione. Rollback: reimpostare `continue-on-error` e limitare i trigger a `push`/`workflow_dispatch` se il KO persiste o blocca i PR.
  2. **schema-validate.yml** enforcing su variazioni schema/lint (core + config/schemas) con ultimo run 30/11 in PASS; rollback: sospendere l’obbligatorietà del check e tornare a dispatch manuale.
  3. **validate-naming.yml** confermato gate PR (`pull_request` attivo, `continue-on-error` rimosso) con run del 05/12 in PASS e warning glossario chiusi; rollback consultivo documentato (riattivare solo `push`/`workflow_dispatch`, ripristinare `continue-on-error`).
  4. **incoming-smoke.yml** attivo su `pull_request` con filtro `incoming/**` + `workflow_dispatch` manuale; nessun log archiviato, retry dispatch aperto per dataset completo. Rollback: rimuovere il trigger PR e mantenere solo il dispatch se i guardrail smoke bloccano in modo improprio.
  5. Workflow monitorati aggiuntivi: **deploy-test-interface.yml**, **hud.yml**, **qa-export.yml**, **qa-reports.yml**, **evo-batch.yml**, **search-index.yml**, **telemetry-export.yml** (stato dettagliato in `ci-inventory.md`); nessun gate PR, ma mantenere dispatch manuali con rollback a skip se blocchi infrastrutturali.
- Decisioni storiche mantenute solo per audit (non operative):
  - **Decisione 2026-04-20**: `validate-naming.yml` in modalità consultiva con PR disattivato su `patch/01C-tooling-ci-catalog` (superata dalla promozione del 30/11/2025).
  - **Verifica 2026-04-26**: conferma dello stato consultivo e assenza di 3 run verdi consecutivi (archiviata, sostituita dalla milestone 07/12/2025).
- Condizioni di promozione ora soddisfatte (allineate ai run 2025): matrice core/derived stabile sugli scope 03A/03B, **3 run consecutivi verdi** su `patch/01C-tooling-ci-catalog`, approvazione Master DD + piano di rollback documentato, glossari/registri pack puntati alle fonti core.
- Nota decisionale aggiornata (rollback consultivo vs enforcing attuale):
  - **Consultivo (rollback)**: tornare a `push`/`workflow_dispatch` per `validate-naming.yml` con step non bloccanti se emergono falsi positivi bloccanti o drift glossario/registri, mantenendo invariati gli altri gate.
  - **Enforcing (stato attuale)**: trigger `pull_request` attivi e `continue-on-error` rimosso per i workflow dati/schema/naming; i job usano glossari core come source-of-truth e falliscono su mismatch non giustificati.
- Tabella delta (checkpoint 2026 → milestone 07/12/2025):

  | Workflow             | Vecchia data/stato (2026)                                                  | Nuova data/stato (2025-12-07)                                                              |
  | -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
  | data-quality.yml     | 2026-04-12 previsto gate PR, attivazione subordinata a 3 run verdi         | 2025-11-30 enforcing PR gate dopo 3 run verdi; rollback: consultivo con push/dispatch      |
  | validate_traits.yml  | 2026-04-12 previsto gate PR, attivazione subordinata a 3 run verdi         | 2025-11-30 enforcing PR gate dopo 3 run verdi; rollback: consultivo con push/dispatch      |
  | schema-validate.yml  | 2026-04-12 enforcing pianificato su schema/lint con trigger in valutazione | 2025-11-30 enforcing PR gate; approvazione Master DD registrata per milestone 07/12/2025   |
  | validate-naming.yml  | 2026-04-20 consultivo (push/dispatch, PR disattivo, continue-on-error)     | 2025-11-30 enforcing PR gate, `continue-on-error` rimosso; rollback consultivo documentato |
  | incoming-smoke.yml   | 2026-04-12 smoke consultivo su dispatch manuale                            | 2025-11-30 PR + dispatch con guardrail; rollback: solo dispatch                            |
  | derived_checksum.yml | 2026-04-12 consultivo (continue-on-error, push/PR su derived)              | 2025-12-07 consultivo invariato ma allineato ai trigger 2025 e pronto per promozione       |

- Reminder check mancanti: drift `data/derived/**` vs sorgenti non ancora monitorato (coperto da audit checksum consultivo); gating incoming ancora limitato al profilo smoke (paths `incoming/**`) + eventuale uso manuale di `scripts/report_incoming.sh` per triage. KO/dispatch aperti del 05/12/2025: incoming-smoke (retry manuale), raccolta artefatti QA export/reports, HUD dispatch in corso, `data-quality.yml` in FAIL con fix schema/glossario pianificati.

### Azioni aperte e owner (inventario 05/12/2025)

- **data-quality.yml** – Owner dati. Correggere schema/glossario core (`data/core/**`) e rerun archiviando log `logs/ci_runs/data-quality*.log`; rollback consultivo se il gate blocca altri PR.
- **ci.yml** – Owner dev-tooling. Necessario run completo (push/PR) e download artefatti in `logs/ci_runs/`, mantenendo lettura su core e derived generati.
- **e2e.yml** – Owner QA. Dispatch manuale con upload report Playwright in `logs/ci_runs/e2e_*` prima del go-live.
- **QA suite** (`qa-export.yml`, `qa-reports.yml`, `qa-kpi-monitor.yml`) – Owner QA. Ripetere export/report con artefatti in `logs/ci_runs` e `logs/visual_runs`, riallineando badge/baseline pack ai core.
- **hud.yml** – Owner HUD. Dispatch con build overlay/visual e log in `logs/ci_runs`/`logs/visual_runs`; valutare rollback a dispatch-only se blocchi infrastrutturali.
- **incoming-smoke.yml** – Owner dev-tooling. Dispatch manuale su dataset completo (core/incoming) e decisione su rollback a solo `workflow_dispatch` se i guardrail smoke restano bloccanti.
- **evo-batch.yml** – Owner ops/dev-tooling. Programmato dry-run `batch=traits` con log in `logs/ci_runs`; solo dopo valutare `execute=true`.

### Audit checksum derived (consultivo → enforcing)

- **Workflow**: `.github/workflows/derived_checksum.yml` (job `derived-checksum`).
- **Scope**: ricalcola i checksum sha256 dei derived principali (`data/derived/analysis/**`, `data/derived/exports/**`) e li confronta con `manifest.json`/README; output in `reports/derived_checksums/report.{md,json}` pubblicato come artifact.
- **Modalità attuale**: consultiva (`continue-on-error: true`), trigger `pull_request`/`push` sui percorsi `data/derived/**` e documentazione collegata; non blocca i gate PR.
- **Condizioni per renderlo bloccante**:
  - almeno **3 run consecutivi verdi** sul branch di sperimentazione (`tooling-ci/derived-checksum` o equivalente), con mismatch gestiti/risolti;
  - approvazione owner umano (Master DD) e log operativo aggiornato in `logs/agent_activity.md` con piano di rollback;
  - rimozione di `continue-on-error` e (se necessario) promozione a matrix PR con check obbligatorio.
- **Uso manuale/analisi**: l’artifact contiene per ogni file derived lo stato `match/mismatch/missing` confrontando sia il manifest sia la tabella README; può essere allegato alle discussioni PR per decidere se rigenerare gli artifact o aggiornare i reference.

### Criteri di monitoraggio e promozione

- Richiedere almeno **3 esecuzioni consecutive verdi** su `patch/01C-tooling-ci-catalog` per ciascun workflow prima del passaggio a enforcing.
- Monitorare e allegare agli update PR: tasso di failure per categoria (schema, naming, audit), falsi positivi/negativi noti e delta tempo di esecuzione rispetto allo stato consultivo.
- Documentare eventuali esclusioni temporanee o percorsi ignorati (core vs derived) nei log operativi prima di promuovere un workflow.
- Per `incoming-smoke.yml` restano i guardrail su timeout/concurrency/permessi; rollback previsto: disattivare il trigger `pull_request` mantenendo `workflow_dispatch`. Per `validate-naming.yml` usare il rollback consultivo (push/dispatch + continue-on-error) se emergono falsi positivi bloccanti o drift glossario/registri.

### Log operativo sui cambi di stato

- Ogni passaggio di stato (consultivo → enforcing, disattivato → attivo) deve essere registrato in `logs/agent_activity.md` e nel changelog del branch `patch/01C-tooling-ci-catalog` con: data/ora UTC, workflow, stato precedente, stato nuovo, owner che approva, evidenze di monitoraggio (esecuzioni verdi, metriche).
- Le note di log devono citare eventuali rollback o eccezioni temporanee e includere link ai run CI di riferimento.
- Punto decisionale Master DD: prima di cambiare lo stato di un workflow, verificare che i log operativi riportino la stabilità della matrice core/derived, le **3 esecuzioni verdi consecutive** e l’analisi dei falsi positivi; l’approvazione deve essere tracciata e collegata ai run CI del branch `patch/01C-tooling-ci-catalog`.

## Inventario workflow/script (stato gating – 2025-11-30)

| Voce                   | Percorso                                                      | Owner               | Ultimo run/esito                | Stato                      | Dipendenza (core/derived)                                   | Note                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------- | ------------------- | ------------------------------- | -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI orchestrazione      | `.github/workflows/ci.yml`                                    | dev-tooling (owner) | 2025-11-30 – verde (report)     | report-only                | Core + pack (artefatti non pubblicati)                      | Include `scripts/cli_smoke.sh`, `scripts/build_trait_index.js`, `tools/py/validate_datasets.py`; mantenere consultivo finché 01C non approvato.                                              |
| Audit dati core/pack   | `.github/workflows/data-quality.yml`                          | dev-tooling (owner) | 2025-11-30 – verde (3/3)        | enforcing PR               | Core enforcing, pack consultivo                             | Usa `scripts/trait_audit.py --check`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py`, `tools/audit/data_health.py`; gate PR attivo con rollback consultivo documentato. |
| Validazione trait      | `.github/workflows/validate_traits.yml`                       | dev-tooling (owner) | 2025-11-30 – verde (3/3)        | enforcing PR/push          | Core enforcing, pack consultivo                             | `tools/py/trait_template_validator.py --summary`, `scripts/build_trait_index.js`, `scripts/trait_style_check.js`; gate PR attivo con raccolta artefatti report.                              |
| Schema checker         | `.github/workflows/schema-validate.yml`                       | dev-tooling (owner) | 2025-11-30 – verde (3/3)        | enforcing PR/push/dispatch | Core enforcing (schema lint), derived opzionale             | `tools/ajv-wrapper.sh`, `tools/py/yaml_lint.py` su `schemas/**` e `config/schemas/*.json`; trigger manuale mantenuto.                                                                        |
| Naming registri        | `.github/workflows/validate-naming.yml`                       | dev-tooling (owner) | 2025-11-30 – verde (3/3)        | PR gate attivo             | Core glossary enforcing, pack registries                    | `tools/py/validate_registry_naming.py` contro glossario core; trigger `pull_request` attivo, continue-on-error rimosso; rollback consultivo disponibile.                                     |
| Smoke incoming/core    | `.github/workflows/incoming-smoke.yml`                        | dev-tooling (owner) | 2025-11-30 – verde (trigger PR) | PR + dispatch consultivo   | Core smoke; pack/incoming derivati (solo read)              | Paths `incoming/**` + dispatch manuale; rollback: disabilitare PR e mantenere solo dispatch se blocchi impropri.                                                                             |
| Audit checksum derived | `.github/workflows/derived_checksum.yml`                      | dev-tooling (owner) | 2025-11-30 – verde (consultivo) | report-only                | Derived only (manifest checksum)                            | Job `derived-checksum` consultivo con continue-on-error; pronto per promozione dopo 3 run verdi dedicati.                                                                                    |
| Smoke CLI/core-pack    | `scripts/cli_smoke.sh`                                        | coordinator (run)   | 2025-11-30 – verde (dry-run)    | report-only                | Core enforcing (input), derived pack rigenerato come output | Da usare con `--core-root data/core --pack-root dist/packs/evo_tactics_pack` in dry-run; loggare esiti, senza pubblicare artefatti.                                                          |
| Validator dataset      | `tools/py/validate_datasets.py`                               | dev-tooling (run)   | 2025-11-30 – verde (schemas)    | report-only                | Core schema enforcing, pack schema consultivo               | Esecuzione con `--schemas-only` o `--pack` in staging; vietato committare output/artefatti.                                                                                                  |
| Trait audit/coverage   | `scripts/trait_audit.py`, `tools/py/report_trait_coverage.py` | trait-curator (run) | 2025-11-30 – warning (false+)   | report-only                | Core enforcing, pack consultivo                             | Solo consultivo su core/pack; includere nei log 01C senza cambiare dataset.                                                                                                                  |
| Trait style check      | `scripts/trait_style_check.js`                                | trait-curator (run) | 2025-11-30 – verde              | report-only                | Core enforcing (lint), pack overlay opzionale               | Lint su `data/traits/**` o core/pack mirror; output locale non commit.                                                                                                                       |

---

## Mappatura workflow CI (`.github/workflows/**`)

- **ci.yml** → orchestrazione principale con `paths-filter` per job ts/cli/python/data/deploy/styleguide/stack/site_audit; tocca `scripts/cli_smoke.sh`, `scripts/build_trait_index.js`, `tools/py/validate_datasets.py` e verifica che i job dati puntino a `data/core/**` prima di generare derived.
- **data-quality.yml** → audit dati core/pack: `tools/py/validate_datasets.py`, `scripts/trait_audit.py --check`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py`, `tools/audit/data_health.py` (usa `data/core/**`, `packs/evo_tactics_pack/**`); deve rimanere in sola lettura sui core durante PATCHSET-00.
- **validate_traits.yml** → validazione trait catalog (`tools/py/trait_template_validator.py --summary`, `scripts/build_trait_index.js`, trait coverage, `scripts/trait_style_check.js`, `tools/py/trait_health.py` se abilitato) con ingressi da `data/core/traits/**` e overlay pack.
- **schema-validate.yml** → verifica formale degli schemi JSON/YAML in `schemas/*.json`, `schemas/core/**`, `schemas/evo/**`, `schemas/quality/**`, `config/schemas/*.json`, `schemas/card_schema.yaml`, `schemas/roll_table_schema.yaml` via `jsonschema` / `ajv-wrapper.sh`; include lint YAML per i draft 2020.
- **validate-naming.yml** → controllo naming registri (`tools/py/validate_registry_naming.py` + registri pack `packs/evo_tactics_pack/tools/config/registries/**`) con glossary core come fonte.
- Workflow di servizio (`traits-monthly-maintenance.yml`, `traits-sync.yml`, `qa-*.yml`, `incoming-smoke.yml`, `evo-*.yml`, `daily-*.yml`, `hud.yml`, `lighthouse.yml`, `gh-pages.yml`, `telemetry-export.yml`, `search-index.yml`, `idea-intake-index.yml`, `qa-reports.yml`, `qa-kpi-monitor.yml`, `qa-export.yml`, `update-evo-tracker.yml`, `evo-rollout-status.yml`): refresh tracker, sync trait, export KPI/report, rollout status, idea intake, search index, HUD/lighthouse, deploy test interface, telemetry export, pubblicazione siti. Segnalare eventuali consumi di snapshot (`data/derived/**`) o pack statici `packs/evo_tactics_pack/docs/catalog/**` da rimuovere nei patchset successivi. **incoming-smoke** ora gira automaticamente sulle PR limitate a percorsi incoming.
- Workflow chatGPT/e2e/deploy (`chatgpt_sync.yml`, `e2e.yml`, `deploy-test-interface.yml`, `incoming-smoke.yml`, `hud.yml`, `lighthouse.yml`): verificare dipendenze su snapshot/pack e smoke contro `data/core/**`; nessun cambio workflow in PATCHSET-00 oltre all'attivazione PR limitata di `incoming-smoke.yml`.

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

## Smoke PATCHSET-00 (serie 2025-11-30)

- Serie di 3 run consecutive su `patch/01C-tooling-ci-catalog` per `data-quality.yml`, `validate_traits.yml`, `schema-validate.yml`, `validate-naming.yml` con esito verde (vedi `logs/ci_runs/*`).
- Falsi positivi monitorati: warning trait_audit su specie temp (`data/core/species.yaml`) e mismatch glossary/registries (`ali_solari_fotoni`, `occhi_cristallo_modulare`); nessuna rottura di job/exit-code.
- Trigger attivi su `pull_request` per i workflow dati/schema/naming e **incoming-smoke.yml** (paths `incoming/**` + note collegate); `incoming-smoke.yml` mantiene anche il dispatch manuale con gli stessi guardrail.
- In caso di regressioni naming, rollback a modalità consultiva (solo push/dispatch + continue-on-error) prima di bloccare PR.

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

- 2025-11-30: versione 0.7 – 3 run verdi su data-quality/validate_traits/schema-validate/validate-naming; riattivati i gate PR (validate-naming ora pull_request con continue-on-error rimosso) con rollback consultivo documentato nei log 01C.
- 2026-04-22: versione 0.6 – aggiunta nota smoke per PATCHSET-00 (nessuna modifica dati/tooling), checklist PATCHSET-01 con comandi/owner e riferimenti ai percorsi canonici (`REF_REPO_SOURCES_OF_TRUTH`) e derived (`REF_PACKS_AND_DERIVED`).
- 2025-12-30: versione 0.5 – intestazione aggiornata al report v0.5, confermata la numerazione 01A–03B e il perimetro di PATCHSET-00 senza impatti ai workflow.
- 2025-12-17: versione 0.3 – design completato e perimetro documentazione confermato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance espansi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-23: struttura iniziale di inventario tooling/CI (dev-tooling).
- 2025-12-09: mappatura workflow/validatori estesa, checklist v0.2 con gate incrociati core/pack e prerequisiti branch dedicati.
