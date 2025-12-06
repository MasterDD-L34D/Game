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

| Workflow | Owner | Ultimo run (data/esito/log) | Modalità | Blocchi noti / note (log) |
| --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | dev-tooling | Log assente (nessun run archiviato in `logs/ci_runs`) | enforcing | Non espone `workflow_dispatch`: serve push/PR sul branch di riferimento prima del go-live. |
| `.github/workflows/e2e.yml` | QA | Log assente (`logs/ci_runs` vuoto) | enforcing | Necessario dispatch manuale con upload report Playwright in `logs/ci_runs/e2e_*`. |
| `.github/workflows/daily-pr-summary.yml` | archivist | Log assente (`logs/ci_runs` vuoto) | enforcing | Auto-commit: archiviare log e diff generato al prossimo run. |
| `.github/workflows/daily-tracker-refresh.yml` | analytics | Log assente (`logs/ci_runs` vuoto) | enforcing | Dopo il rerun verificare `reports/daily_tracker_summary.json` e note scheduler. |
| `.github/workflows/data-quality.yml` | data | **FAIL – 2025-11-30 (run3)** – [log](../../logs/ci_runs/data-quality_run3.log) | enforcing | Blocchi: `schema_version`/`trait_glossary` mancanti e `data/core/species.yaml` non conforme. |
| `.github/workflows/deploy-test-interface.yml` | devops | Log assente (`logs/ci_runs` vuoto) | enforcing | Richiede rerun con archiviazione artefatti dist/CLI. |
| `.github/workflows/idea-intake-index.yml` | archivist | Log assente (`logs/ci_runs` vuoto) | enforcing | Auto-commit: salvare log generato al prossimo run. |
| `.github/workflows/incoming-smoke.yml` | dev-tooling | Log assente (`logs/ci_runs` vuoto) | enforcing | Ripetere dispatch su dataset completo e archiviare log smoke in `logs/incoming_smoke/`. |
| `.github/workflows/schema-validate.yml` | data | **PASS – 2025-11-30 (run3)** – [log](../../logs/ci_runs/schema-validate_run3.log) | enforcing | Schemi validati, nessun blocco aperto. |
| `.github/workflows/validate-naming.yml` | data | **PASS – 2025-12-05 (run4)** – [log](../../logs/ci_runs/validate-naming_run4.log) | enforcing | Ultimo log OK; warning glossario dei run precedenti risolti. |
| `.github/workflows/validate_traits.yml` | data | **PASS – 2025-11-30 (run3)** – [log](../../logs/ci_runs/validate-traits_run3.log) | enforcing | Matrix pack/core verde; mantenere copertura dopo modifiche future. |
| `.github/workflows/qa-kpi-monitor.yml` | QA | KPI raccolti il 2025-10-27 – [log](../../logs/qa/latest-dashboard-metrics.json) | enforcing | Metriche datate e nessun upload `logs/visual_runs`: serve nuovo run con visual regression. |
| `.github/workflows/qa-export.yml` | QA | Log assente (`logs/ci_runs` vuoto) | enforcing | Rieseguire per produrre badge/artefatti QA e archiviare il log. |
| `.github/workflows/qa-reports.yml` | QA | Log assente (`logs/ci_runs` vuoto) | enforcing | Necessario rerun per aggiornare badge/baseline e salvare log. |
| `.github/workflows/telemetry-export.yml` | analytics | Log assente (`logs/ci_runs` vuoto) | enforcing | Validare export/schema e archiviare log una volta disponibili. |
| `.github/workflows/search-index.yml` | web perf/content | Log assente (`logs/ci_runs` vuoto) | enforcing | Rigenerare `public/search_index.json` e salvare commit/artefatti in `logs/ci_runs/`. |
| `.github/workflows/hud.yml` | HUD | Log assente (`logs/ci_runs` vuoto) | enforcing (salta se flag off) | Servono overlay/build HUD e, se presenti, log visual in `logs/visual_runs/`. |
| `.github/workflows/lighthouse.yml` | web perf | Log assente (`logs/ci_runs` vuoto) | report-only | Scaricare `.lighthouseci` dagli artefatti dopo il rerun. |
| `.github/workflows/update-evo-tracker.yml` | roadmap | Log assente (`logs/ci_runs` vuoto) | enforcing | Archiviare output snapshot `reports/evo/rollout/status_export.json` generato. |
| `.github/workflows/traits-sync.yml` | data | Log assente (`logs/ci_runs` vuoto) | enforcing | Verificare segreti S3 se pubblicazione attiva; salvare export interno/esterno dagli artefatti. |
| `.github/workflows/evo-batch.yml` | ops | Log assente (`logs/ci_runs` vuoto) | enforcing (dry-run default) | Servono log del batch (dry-run o execute) per confermare stato. |
| `.github/workflows/evo-doc-backfill.yml` | archivist | Log assente (`logs/ci_runs` vuoto) | enforcing | Allegare diff/backfill prodotti dagli artefatti di Actions. |
| `.github/workflows/evo-rollout-status.yml` | roadmap | Log assente (`logs/ci_runs` vuoto) | enforcing | Archiviare snapshot `reports/evo/rollout/status_export.json` dal prossimo run. |


### Semaforo go-live per workflow critici

  - **CI (`ci.yml`)** – Rosso: nessun log archiviato; serve run completo (push/PR) prima del go-live.
  - **Data Quality (`data-quality.yml`)** – Rosso: ultimo run (30/11/2025) in FAIL con blocchi di schema sui trait/species.
  - **QA suite (`qa-kpi-monitor.yml`, `qa-reports.yml`, `qa-export.yml`)** – Rosso: KPI datati (27/10/2025) e nessun log/artefatto archiviato per export/report.
  - **HUD (`hud.yml`)** – Giallo: nessun log archiviato; necessario dispatch con overlay/visual runs.
  - **Deploy site (`deploy-test-interface.yml`)** – Giallo: nessun log archiviato; serve rerun prima del go-live.

### Azioni aperte (aggiornato)

- **data-quality.yml** – Owner: data. Correggere gli errori di schema (`schema_version`/`trait_glossary` mancanti, `data/core/species.yaml` non conforme) e rerun archiviando il log.
- **ci.yml** – Owner: dev-tooling. Trigger push/PR su branch di riferimento e salvare log/artefatti in `logs/ci_runs/`.
- **e2e.yml** – Owner: QA. Dispatch manuale su `main` con download del report Playwright in `logs/ci_runs/e2e_*`.
- **QA suite** – Owner: QA. Rerun `qa-export.yml` e `qa-reports.yml` con upload artefatti, e aggiornare `qa-kpi-monitor.yml` includendo `logs/visual_runs`.
- **hud.yml** – Owner: HUD. Dispatch con build overlay e, se prodotti, log visual in `logs/visual_runs/`.


### Aggiornamenti ticket 03A/03B

- **03A** – Validator 02A schema-only rerun in **PASS** con manifest confermati (vedi `logs/ci_runs/freezer_validator_2026-07-24.log`). Gate chiuso con firma Master DD e freeze 03AB terminato; rollback pronto grazie ai manifest archiviati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD). 【F:logs/ci_runs/freezer_validator_2026-07-24.log†L1-L10】【F:logs/agent_activity.md†L6-L10】
- **03B** – Smoke redirect staging in **PASS** su `http://localhost:8000` (report `reports/redirects/redirect-smoke-2026-07-24.json`). Gate chiuso con firma Master DD, freeze 03AB dichiarato chiuso e rollback pronto con manifest referenziati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD). 【F:reports/redirects/redirect-smoke-2026-07-24.json†L1-L11】【F:logs/agent_activity.md†L6-L10】

### Log ancora assenti e come recuperarli

Restano senza log archiviati in `logs/ci_runs`/`logs/visual_runs`: `ci.yml`, `e2e.yml`, `daily-pr-summary.yml`, `daily-tracker-refresh.yml`, `deploy-test-interface.yml`, `idea-intake-index.yml`, `incoming-smoke.yml`, `qa-export.yml`, `qa-reports.yml`, `telemetry-export.yml`, `search-index.yml`, `hud.yml`, `lighthouse.yml`, `update-evo-tracker.yml`, `traits-sync.yml`, `evo-batch.yml`, `evo-doc-backfill.yml`, `evo-rollout-status.yml`. Seguire la guida standard: [docs/workflows/gh-cli-manual-dispatch.md](../workflows/gh-cli-manual-dispatch.md), usando `workflow_dispatch` dove esposto oppure il trigger nativo (push/PR/caller) e scaricando log/artefatti con `gh run download` nelle directory `logs/ci_runs`/`logs/visual_runs`.


### Come mantenere aggiornato l'inventario (fino al 07/12/2025)

- Ogni lunedì verifica nuovi log in `logs/ci_runs` (o artefatti CI) e aggiorna la colonna “Ultimo run” con data/esito e link ai log corrispondenti.
- Se mancano log, lancia i workflow manuali con `gh workflow run <file.yml> --ref <branch>` solo per i file con trigger `workflow_dispatch` e passando gli input obbligatori (es. `evo-batch.yml -f batch=<valore>`). Usa un PAT con scope `workflow` e `read:org` autorizzato SSO quando richiesto.
- Mantieni il semaforo go-live coerente con l’ultimo esito (verde se run completo <7 giorni e verde, giallo se log assente/vecchio, rosso se KO o step critici mancanti).
- Aggiorna le note con blocchi e retry pianificati, archiviando eventuali artefatti aggiuntivi in `logs/ci_runs` o `logs/visual_runs`.
- Esegui un controllo incrociato settimanale con i responsabili (owner colonna) per confermare retry e scadenze prima delle milestone di rilascio.
- Se usi la CLI, dopo il dispatch controlla i log con `gh run list --workflow <file.yml> --limit <n>` e scaricali con `gh run download <id> --dir logs/ci_runs`, sostituendo i placeholder con valori reali.

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
