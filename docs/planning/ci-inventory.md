# Inventario workflow CI e script locali

Questa pagina riepiloga i workflow GitHub Actions e gli script locali citati dalla CI, con trigger, input/output principali e note su eventuale modalità _report-only_.

## Workflow GitHub Actions

- **CI (`.github/workflows/ci.yml`)** – `push`/`pull_request`. Usa filtri paths per attivare suite TypeScript, CLI Python, dataset e deploy. Esegue lint/test Node (`npm run lint:stack`, unit test dashboard/trait editor), CLI smoke (`scripts/cli_smoke.sh`, `tools/py/game_cli.py`), validazioni dati/trait (`scripts/trait_audit.py`, `tools/py/report_trait_coverage.py`), deploy checks (`scripts/run_deploy_checks.sh`) e genera report coverage/style guide. Output principali: artefatti Chrome bundle, metriche dashboard, baseline/coverage trait in `data/derived/analysis` e `reports/trait_style`. Non è report-only.
- **E2E Tests (Playwright) (`.github/workflows/e2e.yml`)** – schedulato e `workflow_dispatch`. Installa `tests/playwright`, risolve `BASE_URL` e lancia `npx playwright test`; carica report `tests/playwright/playwright-report`. Non report-only (fallisce su test KO).
- **Daily PR Summary (`.github/workflows/daily-pr-summary.yml`)** – schedulato + manuale. Script `tools/py/daily_pr_report.py` aggiorna changelog/roadmap e committa su main. Output: file docs aggiornati. Non report-only.
- **Daily tracker refresh (`.github/workflows/daily-tracker-refresh.yml`)** – schedulato + manuale. Esegue `scripts/daily_tracker_refresh.py` con export `reports/daily_tracker_summary.json` e auto-commit. Non report-only.
- **Data audit and validation (`.github/workflows/data-quality.yml`)** – PR su dati/pack. Installa deps, esegue `tools/py/validate_datasets.py`, `scripts/trait_audit.py --check`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py --strict`, `tools/py/trait_completion_dashboard.py`. Carica artefatti `reports/**` e `data/derived/analysis/*.json/csv`. Non report-only.
- **Deploy site (`.github/workflows/deploy-test-interface.yml`)** – su `push` main/PR/manuale. Build tools/ts, HUD tests, CLI smoke, trait audit/baseline/coverage e `scripts/run_deploy_checks.sh`; prepara `dist` e pubblica GitHub Pages. Artefatti: Chromium bundle, test outputs, dist. Non report-only.
- **Idea Intake Index (`.github/workflows/idea-intake-index.yml`)** – su modifiche `docs/ideas/submissions/**`. Script shell genera `IDEAS_INDEX.md`, promemoria changelog e auto-commit. Non report-only.
- **Incoming CLI smoke (`.github/workflows/incoming-smoke.yml`)** – manuale con input percorsi dati/pack. Risolve path incoming e lancia `scripts/cli_smoke.sh --profile staging_incoming`, carica log `logs/incoming_smoke`. Non report-only.
- **Validate JSON Schemas (`.github/workflows/schema-validate.yml`)** – push/PR su `schemas/**`. Valida tutti gli schemi via `jsonschema`. Nessun artefatto; non report-only.
- **Validate registry naming (`.github/workflows/validate-naming.yml`)** – push/PR su registri/glossario. Esegue `tools/py/validate_registry_naming.py`. Non report-only.
- **Validate Trait Catalog (`.github/workflows/validate_traits.yml`)** – push/PR su dati trait. Esegue `tools/py/trait_template_validator.py`, `scripts/build_trait_index.js`, `tools/py/report_trait_coverage.py --strict`, `scripts/trait_style_check.js`; carica `reports/**` e coverage. Non report-only.
- **QA KPI & Visual Monitor (`.github/workflows/qa-kpi-monitor.yml`)** – mensile + manuale. Corre `tests/validate_dashboard.py` (metriche), `tools/py/report_kpi_alerts.py` e `tools/py/visual_regression.py compare`; carica `logs/visual_runs` e `metrics.json`. Non report-only.
- **QA export manual (`.github/workflows/qa-export.yml`)** – manuale con input PR. Genera QA report via `scripts/export-qa-report.js`, carica artefatti QA e opzionale commento PR. Non report-only.
- **QA reports (`.github/workflows/qa-reports.yml`)** – PR/manuale. Stesse pipeline di export QA e controllo che `reports/qa_badges.json` e `reports/trait_baseline.json` siano aggiornati. Non report-only.
- **Telemetry export (`.github/workflows/telemetry-export.yml`)** – PR su file export. Esegue `tools/py/validate_export.py`, test UI `tools/ts/tests/export-modal.test.tsx`, e invia notifica Slack. Output: validazione schema, nessun artefatto; non report-only.
- **Build Search Index (`.github/workflows/search-index.yml`)** – push su contenuti e manuale. Usa `ops/site-audit/generate_search_index.py` e auto-commit `public/search_index.json`/`ops/site-audit/_out/search_index.json`. Non report-only.
- **HUD Canary (`.github/workflows/hud.yml`)** – push/manuale su HUD. Se flag in `config/cli/hud.yaml` abilitato, installa `tools/ts` e build HUD overlay; altrimenti salta. Non report-only (fallisce su build).
- **Lighthouse CI (`.github/workflows/lighthouse.yml`)** – schedulato/manuale. Esegue `npm run lint:lighthouse` contro `SITE_BASE_URL` e carica `.lighthouseci` come artefatto. Non report-only.
- **Update Evo tracker (check) (`.github/workflows/update-evo-tracker.yml`)** – richiamabile da altri workflow; esegue `make update-tracker TRACKER_CHECK=1` con eventuale input `batch`. Non report-only.
- **Sync Evo traits glossary (`.github/workflows/traits-sync.yml`)** – schedulato/manuale. Esegue `tools/traits/sync_missing_index.py` e `tools/traits/evaluate_internal.py`, carica export interno/esterno e (se segreti) pubblica su S3. Non report-only.
- **Run Evo Batch (`.github/workflows/evo-batch.yml`)** – manuale con input `batch`, `execute`, `ignore_errors`. Usa `tools/automation/evo_batch_runner.py` per pianificare/eseguire batch; dry-run di default. Non report-only (può eseguire comandi reali se `execute=true`).
- **Evo documentation archive sync (`.github/workflows/evo-doc-backfill.yml`)** – schedulato/manuale. Script `scripts/evo_tactics_metadata_diff.py` produce diff/anchors/backfill, `ops/notifier.py` segnala gap e crea issue/alert. Artefatti: diff JSON/MD. Non report-only.
- **Evo rollout status sync (`.github/workflows/evo-rollout-status.yml`)** – settimanale/manuale. `tools/roadmap/update_status.py` genera snapshot roadmap e carica `reports/evo/rollout/status_export.json` + md; mostra diff. Non report-only.

### Stato run, owner e blocchi

| Workflow                                      | Owner            | Ultimo run (data/esito)                                                                       | Modalità                      | Blocchi noti / note (log)                                                                                                                           |
| --------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                    | dev-tooling      | n/d (nessun log locale recente)                                                               | enforcing                     | Richiesto run completo pre-go-live; verificare suite dashboard/CLI.                                                                                 |
| `.github/workflows/e2e.yml`                   | QA               | n/d                                                                                           | enforcing                     | Nessun log locale; eseguire Playwright contro env target.                                                                                           |
| `.github/workflows/daily-pr-summary.yml`      | archivist        | n/d                                                                                           | enforcing                     | Auto-commit, nessun blocco noto.                                                                                                                    |
| `.github/workflows/daily-tracker-refresh.yml` | analytics        | n/d                                                                                           | enforcing                     | Auto-commit; verificare credenziali scheduler.                                                                                                      |
| `.github/workflows/data-quality.yml`          | data             | 2025-11-30 – KO (blocchi schema specie/trait) 【F:logs/ci_runs/data-quality_run3.log†L1-L25】 | enforcing                     | Riparare campi `schema_version`/`trait_glossary` e specie core (ID/array/synergy) prima del retry. 【F:logs/ci_runs/data-quality_run3.log†L10-L23】 |
| `.github/workflows/deploy-test-interface.yml` | devops           | n/d                                                                                           | enforcing                     | Nessun log locale; necessario dry-run Pages con bundle HUD/CLI.                                                                                     |
| `.github/workflows/idea-intake-index.yml`     | archivist        | n/d                                                                                           | enforcing                     | Auto-commit; controllare diff indice.                                                                                                               |
| `.github/workflows/incoming-smoke.yml`        | dev-tooling      | n/d                                                                                           | enforcing                     | Log attesi in `logs/incoming_smoke`; rieseguire per nuovi incoming.                                                                                 |
| `.github/workflows/schema-validate.yml`       | dev-tooling      | 2025-11-30 – OK 【F:logs/ci_runs/schema-validate_run3.log†L1-L6】                             | enforcing                     | Nessun blocco.                                                                                                                                      |
| `.github/workflows/validate-naming.yml`       | data             | 2025-11-30 – KO (glossario incompleto) 【F:logs/ci_runs/validate-naming_run3.log†L1-L8】      | enforcing                     | Aggiungere `occhi_cristallo_modulare` (label/entry) e rimuovere entry orfane `ali_solari_fotoni`.                                                   |
| `.github/workflows/validate_traits.yml`       | data             | 2025-11-30 – OK 【F:logs/ci_runs/validate-traits_run3.log†L1-L15】                            | enforcing                     | Nessun blocco; mantenere matrix pack/core.                                                                                                          |
| `.github/workflows/qa-kpi-monitor.yml`        | QA               | n/d                                                                                           | enforcing                     | Nessun log locale; controllare `logs/visual_runs` nel prossimo ciclo.                                                                               |
| `.github/workflows/qa-export.yml`             | QA               | n/d                                                                                           | enforcing                     | Manuale; raccogliere artefatti QA prima del merge.                                                                                                  |
| `.github/workflows/qa-reports.yml`            | QA               | n/d                                                                                           | enforcing                     | Richiesto run PR/manuale per aggiornare `reports/qa_badges.json`/baseline.                                                                          |
| `.github/workflows/telemetry-export.yml`      | analytics        | n/d                                                                                           | enforcing                     | Validare export/schema prima del go-live.                                                                                                           |
| `.github/workflows/search-index.yml`          | web perf/content | n/d                                                                                           | enforcing                     | Verificare generazione `public/search_index.json`.                                                                                                  |
| `.github/workflows/hud.yml`                   | HUD              | n/d                                                                                           | enforcing (salta se flag off) | Necessario run HUD overlay; verificare `config/cli/hud.yaml` abilitato.                                                                             |
| `.github/workflows/lighthouse.yml`            | web perf         | n/d                                                                                           | report-only                   | Attendere run schedulato/manuale per score aggiornati.                                                                                              |
| `.github/workflows/update-evo-tracker.yml`    | roadmap          | n/d                                                                                           | enforcing                     | Nessun blocco noto; input `batch` opzionale.                                                                                                        |
| `.github/workflows/traits-sync.yml`           | data             | n/d                                                                                           | enforcing                     | Verificare segreti S3 se pubblicazione attiva.                                                                                                      |
| `.github/workflows/evo-batch.yml`             | ops              | n/d                                                                                           | enforcing (dry-run default)   | Run manuale con `execute=true` solo dopo revisione batch.                                                                                           |
| `.github/workflows/evo-doc-backfill.yml`      | archivist        | n/d                                                                                           | enforcing                     | Controllare diff/backfill prima di notifiche.                                                                                                       |
| `.github/workflows/evo-rollout-status.yml`    | roadmap          | n/d                                                                                           | enforcing                     | Verificare snapshot `reports/evo/rollout/status_export.json`.                                                                                       |

### Semaforo go-live per workflow critici

- **CI (`ci.yml`)** –
  - Verde: ultimo run <7 giorni con suite lint/test/CLI verdi.
  - Giallo: log mancanti o ultimi run >7 giorni → lanciare run completo.
  - Rosso: step falliti o skip HUD/CLI → bloccare patch finché non risolto.
- **Data Quality (`data-quality.yml`)** – Rosso attuale: blocchi su schema specie/trait; necessario fix + rerun prima del go-live. 【F:logs/ci_runs/data-quality_run3.log†L10-L23】
- **QA Reports (`qa-reports.yml`)** – Giallo: nessun run recente; serve export QA aggiornato prima di rilasciare.
- **HUD (`hud.yml`)** – Giallo: run non disponibili; abilitare flag HUD e ottenere build verde con artifact overlay.
- **Deploy site (`deploy-test-interface.yml`)** – Giallo: eseguire dry-run Pages con bundle aggiornato; Rosso se falliscono CLI smoke/deploy checks.

## Script locali citati

- `scripts/cli_smoke.sh` – profili smoke CLI; input opzionali (profilo, root dati/pack) e log in `logs/*`.
- `scripts/trait_audit.py` – controlli coerenza catalogo trait; opzione `--check` per modalità verifica. Output baseline/coverage quando usato nei deploy.
- `scripts/run_deploy_checks.sh` – orchestrazione check deploy (usa bundle Playwright, vari env `DEPLOY_*`).
- `scripts/daily_tracker_refresh.py` – aggiorna tracker e JSON riepilogo.
- `scripts/export-qa-report.js` – genera QA badges/baseline/changelog in `reports/`.
- `scripts/build_trait_index.js` – costruisce indice trait.
- `scripts/trait_style_check.js` – verifica style guide trait e genera report JSON/MD.
- `scripts/evo_tactics_metadata_diff.py` – calcola diff/backfill archivio documentazione Evo.
- `scripts/prepare_static_site.py` – compila asset statici per Pages.
- `tools/py` utilities: `game_cli.py` (validate datasets/packs), `validate_datasets.py`, `report_trait_coverage.py`, `trait_completion_dashboard.py`, `trait_template_validator.py`, `styleguide_compliance_report.py`, `validate_registry_naming.py`, `validate_export.py`, `report_kpi_alerts.py`, `visual_regression.py`, `daily_pr_report.py`.
- `tools/automation/evo_batch_runner.py` – pianifica/esegue batch CI/ops.
- `tools/roadmap/update_status.py` – produce stato rollout settimanale.
- `tools/traits/sync_missing_index.py` / `evaluate_internal.py` – sync glossario/valutazioni.
- `ops/site-audit/generate_search_index.py` – costruisce indice ricerca e scrive in `public/search_index.json`.
- `tests/validate_dashboard.py` – validazione dashboard con metriche.

Nessuno script è marcato come "report-only" di default: quelli con flag `--check` o `--strict` falliscono in caso di errori.
