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
| `.github/workflows/ci.yml` | dev-tooling | In attesa del prossimo run automatico (push/PR) – log da scaricare in `logs/ci_runs/` | enforcing | Non espone `workflow_dispatch`: usa push/PR; lo script di raccolta log deve prendere l’ultimo run disponibile. |
| `.github/workflows/e2e.yml` | QA | Schedulato/dispatch: archiviare il prossimo report Playwright in `logs/ci_runs/e2e_*` | enforcing | Lo script può scaricare l’ultimo run schedulato; resta opzionale il dispatch QA se serve copertura immediata. |
| `.github/workflows/daily-pr-summary.yml` | archivist | Prossimo auto-commit da scaricare in `logs/ci_runs/` | enforcing | Aspetta cron/trigger manuale; raccogli il log via script. |
| `.github/workflows/daily-tracker-refresh.yml` | analytics | Prossimo export `reports/daily_tracker_summary.json` da salvare | enforcing | Usare raccolta automatica dopo il cron; verificare scheduler e output JSON. |
| `.github/workflows/data-quality.yml` | data | **PASS – 2025-11-30 (run3)** – [log](../../logs/ci_runs/data-quality_run3.log) | enforcing | Ultimo run verde archiviato; nessun rerun dopo il 30/11/2025. |
| `.github/workflows/deploy-test-interface.yml` | devops | In attesa del prossimo run (push/PR/manuale) – archiviare dist/CLI | enforcing | Nessun log recente dopo i run 2025: pianificare un dispatch/PR e scaricare dist/CLI in `logs/ci_runs/`. |
| `.github/workflows/idea-intake-index.yml` | archivist | Prossimo auto-commit da salvare | enforcing | In attesa del cron/manuale; raccogliere log in automatico. |
| `.github/workflows/incoming-smoke.yml` | dev-tooling | Retry **NON ESEGUITO – 2026-07-06** (GH offline) – [log](../../logs/agent_activity.md) | enforcing | Smoke non verificato: ultimo tentativo di dispatch fallito per assenza accesso GH; serve nuovo dispatch con log in `logs/incoming_smoke/`. |
| `.github/workflows/schema-validate.yml` | data | **PASS – 2025-11-30 (run3)** – [log](../../logs/ci_runs/schema-validate_run3.log) | enforcing | Schemi validati, nessun blocco aperto. |
| `.github/workflows/validate-naming.yml` | data | **PASS – 2025-12-06 (run4)** – [log](../../logs/ci_runs/validate-naming_run4.log) | enforcing | Ultimo log OK; nessun warning aperto. |
| `.github/workflows/validate_traits.yml` | data | **PASS – 2025-11-30 (run3)** – [log](../../logs/ci_runs/validate-traits_run3.log) | enforcing | Matrix pack/core verde; mantenere copertura dopo modifiche future. |
| `.github/workflows/qa-kpi-monitor.yml` | QA | KPI raccolti il 2025-10-27 – [log](../../logs/qa/latest-dashboard-metrics.json) | enforcing | Nessun upload `logs/visual_runs`: serve rerun con visual regression. |
| `.github/workflows/qa-export.yml` | QA | Retry **NON ESEGUITO – 2026-07-06** (GH offline) – [log](../../logs/agent_activity.md) | enforcing | Dispatch manuale programmato appena GH torna disponibile; archiviare artefatti/badge QA in `logs/ci_runs/`. |
| `.github/workflows/qa-reports.yml` | QA | Prossimo run manuale/schedulato da archiviare | enforcing | Rerun richiesto insieme a qa-export; usare raccolta automatica dopo il run e loggare in `logs/ci_runs/`. |
| `.github/workflows/telemetry-export.yml` | analytics | In attesa del prossimo run per validare export | enforcing | Archiviare log e risultati schema tramite script post-run. |
| `.github/workflows/search-index.yml` | web perf/content | Prossimo run (push/manuale) da archiviare | enforcing | Run richiesto prima del prossimo deploy contenuti; scaricare `public/search_index.json` aggiornato. |
| `.github/workflows/hud.yml` | HUD | Retry necessario: log 05/12 non reperibile, nessun artefatto locale – [log](../../logs/agent_activity.md) | enforcing (salta se flag off) | Dispatch manuale con download overlay/log visual in `logs/ci_runs`/`logs/visual_runs`; gestire caso skip se flag off. |
| `.github/workflows/lighthouse.yml` | web perf | Prossimo run schedulato/manuale da archiviare `.lighthouseci` | report-only | Artefatto da recuperare automaticamente al termine del run. |
| `.github/workflows/update-evo-tracker.yml` | roadmap | Prossimo snapshot `reports/evo/rollout/status_export.json` da scaricare | enforcing | Raccogliere l’artefatto al termine del run (trigger da altri workflow). |
| `.github/workflows/traits-sync.yml` | data | Prossimo run schedulato/manuale da archiviare | enforcing | Verificare segreti S3 se pubblicazione attiva; scaricare export interno/esterno. |
| `.github/workflows/evo-batch.yml` | ops | Dry-run `batch=traits` **PIANIFICATO – 2026-07-06** (nessun log) – [log](../../logs/agent_activity.md) | enforcing (dry-run default) | Dispatch richiesto con `execute=false` e salvataggio log in `logs/ci_runs` prima di valutare `execute=true`. |
| `.github/workflows/evo-doc-backfill.yml` | archivist | Prossimo diff/backfill da allegare | enforcing | Richiede upload log dopo il prossimo run; può essere raccolto automaticamente. |
| `.github/workflows/evo-rollout-status.yml` | roadmap | Prossimo snapshot `reports/evo/rollout/status_export.json` da salvare | enforcing | Scaricare l’artefatto con la raccolta automatica. |


### Semaforo go-live per workflow critici

  - **CI (`ci.yml`)** – Rosso: attendere/forzare un run (push/PR) e scaricare l’artefatto con lo script automatico prima del go-live.
  - **Data Quality (`data-quality.yml`)** – Verde: run3 30/11/2025 in PASS (log archiviato).
  - **E2E (`e2e.yml`)** – Rosso: attendere il prossimo schedulato o dispatch QA e archiviare il report Playwright via raccolta automatica.
  - **QA suite (`qa-kpi-monitor.yml`, `qa-reports.yml`, `qa-export.yml`)** – Rosso: KPI datati (27/10/2025) e retry 2026-07-06 non eseguito per GH offline ([log](../../logs/agent_activity.md)); pianificare rerun automatico/manuale con upload log/visual.
  - **HUD (`hud.yml`)** – Giallo: nessun log/visual archiviato e retry necessario perché l’ultimo run (05/12) non è reperibile ([log](../../logs/agent_activity.md)); dispatch richiesto se il flag è attivo, altrimenti l’automazione salta.
  - **Deploy site (`deploy-test-interface.yml`)** – Giallo: nessun log recente dopo i run 2025; attendere un run (push/PR/manuale) e archiviare dist/CLI prima del go-live.

### Azioni aperte (aggiornato)

- **Raccolta automatica log** – Configurare/abilitare lo script `gh run list --workflow <file> --limit 1 --json databaseId,status` → `gh run download <id> --dir <dest>` con PAT `workflow/read:org`, puntando `logs/ci_runs`, `logs/visual_runs`, `logs/incoming_smoke`. Applicare a tutti i workflow con trigger push/PR/cron.
- **ci.yml** – Owner: dev-tooling. Attendere il prossimo push/PR e assicurare che la raccolta automatica scarichi il log in `logs/ci_runs/` per sbloccare il gate base.
- **e2e.yml** – Owner: QA. Usare lo script per scaricare il prossimo run schedulato; se serve copertura immediata, dispatch manuale su `main` e archiviazione in `logs/ci_runs/e2e_*`.
- **QA suite** – Owner: QA. Retry 2026-07-06 non eseguito per GH offline ([log](../../logs/agent_activity.md)); ripianificare rerun (manuale o da script) di `qa-kpi-monitor.yml` con `visual_regression` abilitato e output in `logs/visual_runs`, poi `qa-export.yml` e `qa-reports.yml` con log in `logs/ci_runs/`.
- **deploy-test-interface.yml** – Owner: devops. Nessun log recente: assicurare un run (push/PR/manuale) e che lo script scarichi dist/CLI in `logs/ci_runs/` prima del go-live.
- **hud.yml** – Owner: HUD. Nessun artefatto reperibile (retry richiesto, vedi [log](../../logs/agent_activity.md)): dispatch se il flag HUD è attivo e archivia overlay/log in `logs/ci_runs` e `logs/visual_runs`; lo script deve gestire il caso skip quando il flag è off.
- **incoming-smoke.yml** – Owner: dev-tooling. Retry 2026-07-06 non eseguito per GH offline ([log](../../logs/agent_activity.md)); lanciare con input `path`/`pack` e archiviare in `logs/incoming_smoke/` o configurare un job esterno che invochi `gh workflow run` con i parametri.
- **evo-batch.yml** – Owner: ops/dev-tooling. Dry-run `batch=traits` pianificato il 2026-07-06 (nessun log, vedi [log](../../logs/agent_activity.md)): eseguire con `execute=false` via script/dispatch e archiviare in `logs/ci_runs` prima di valutare `execute=true`.


### Aggiornamenti ticket 03A/03B

- **03A** – Validator 02A schema-only rerun in **PASS** con manifest confermati (vedi `logs/ci_runs/freezer_validator_2026-07-24.log`). Gate chiuso con firma Master DD e freeze 03AB terminato; rollback pronto grazie ai manifest archiviati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD). 【F:logs/ci_runs/freezer_validator_2026-07-24.log†L1-L10】【F:logs/agent_activity.md†L6-L10】
- **03B** – Smoke redirect staging in **PASS** su `http://localhost:8000` (report `reports/redirects/redirect-smoke-2026-07-24.json`). Gate chiuso con firma Master DD, freeze 03AB dichiarato chiuso e rollback pronto con manifest referenziati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD). 【F:reports/redirects/redirect-smoke-2026-07-24.json†L1-L11】【F:logs/agent_activity.md†L6-L10】



### Come mantenere aggiornato l'inventario (versione automatica)

- Ogni lunedì o dopo i cron, esegui lo script di raccolta automatica: `gh run list --workflow <file.yml> --limit 1 --json databaseId,status,conclusion` per ottenere l’ID più recente, quindi `gh run download <id> --dir logs/ci_runs` (o `logs/visual_runs` / `logs/incoming_smoke`) usando un PAT con scope `workflow`/`read:org` autorizzato SSO.
- Per i workflow che non espongono `workflow_dispatch` (`ci.yml`) attendi push/PR; per i manuali con input (`incoming-smoke.yml`, `evo-batch.yml`, QA suite) valuta un job esterno che lanci `gh workflow run …` con i parametri richiesti prima di scaricare i log.
- Mantieni il semaforo go-live coerente con l’ultimo esito (verde se run completo <7 giorni e verde, giallo se log assente/vecchio, rosso se KO o step critici mancanti) usando i log scaricati automaticamente.
- Aggiorna le note con blocchi e retry pianificati, includendo eventuali esecuzioni programmate dallo scheduler o da job esterni, e archivia gli artefatti aggiuntivi nelle cartelle dedicate.
- Confronta settimanalmente con gli owner se servono dispatch mirati oltre ai cron, soprattutto per HUD (flag on), QA visual e incoming smoke.

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
