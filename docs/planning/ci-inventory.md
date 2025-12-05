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

| Workflow                                      | Owner            | Ultimo run (data/esito)                                                                              | Modalità                      | Blocchi noti / note (log)                                                                                                        |
| --------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
  | `.github/workflows/ci.yml`                    | dev-tooling      | Log assente – tentativo manuale 2025-12-05 bloccato (gh/credenziali non disponibili)                  | enforcing                     | Richiesto run completo pre-go-live; non espone `workflow_dispatch` (vedi guida manual dispatch PowerShell), quindi occorre un push/PR sul branch di riferimento per ottenere log aggiornati.      |
| `.github/workflows/e2e.yml`                   | QA               | 2025-12-05 – RUN in corso (workflow_dispatch manuale su `main`, ultimo ID 19975455881; precedenti manuali in PASS)                  | enforcing                     | Scaricare report Playwright dai run manuali (es. `gh run download --run-id 19975455881 --repo MasterDD-L34D/Game --dir logs/ci_runs/e2e_2025-12-05`) e allegarli; credenziali gh disponibili.                  |
  | `.github/workflows/daily-pr-summary.yml`      | archivist        | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                                | enforcing                     | Auto-commit; archiviare log/commit generato e verificare eventuali diff roadmap dopo il completamento.                                      |
  | `.github/workflows/daily-tracker-refresh.yml` | analytics        | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                                | enforcing                     | Auto-commit; verificare aggiornamento `reports/daily_tracker_summary.json` e note scheduler dopo il completamento.                  |
| `.github/workflows/data-quality.yml`          | data             | 2026-07-24 – PASS (schema-only rerun 03A) 【F:logs/ci_runs/freezer_validator_2026-07-24.log†L1-L10】 | enforcing                     | Validator 02A green con manifest 03A/03B allineati; mantenere monitor su prossimi push e ripetere full matrix post-merge finale. |
  | `.github/workflows/deploy-test-interface.yml` | devops           | 2025-12-05 – RUN dispatchato (workflow_dispatch manuale su `main`, in attesa log)                            | enforcing                     | Dry-run richiesto con bundle HUD/CLI; scaricare artefatti Pages/CLI e verificare deploy checks quando il run si chiude.                                                |
  | `.github/workflows/idea-intake-index.yml`     | archivist        | Log assente – tentativo manuale 2025-12-05 bloccato (gh/credenziali non disponibili)                                                          | enforcing                     | Auto-commit; se serve rerun usare i passi PowerShell della guida dispatch, oppure un push su `docs/ideas/submissions/**` se non espone `workflow_dispatch` nel repo upstream.                                                     |
  | `.github/workflows/incoming-smoke.yml`        | dev-tooling      | 2025-12-05 – KO (workflow_dispatch manuale su `main`); precedente PASS 2026-07-24 【F:reports/redirects/redirect-smoke-2026-07-24.json†L1-L11】     | enforcing                     | Analizzare log Actions per capire failure (Incoming CLI smoke); riprovare dopo fix dei percorsi/host; mantenere mapping R-01/R-02/R-03.     |
  | `.github/workflows/validate-naming.yml`       | data             | 2025-12-05 – PASS (workflow_dispatch manuale)                                  | enforcing                     | Verifica glossario aggiornata; archiviare log run 2025-12-05 in `logs/ci_runs/` e mantenere check su `ali_solari_fotoni`.                          |
| `.github/workflows/validate_traits.yml`       | data             | 2025-11-30 – OK 【F:logs/ci_runs/validate-traits_run3.log†L1-L15】                                   | enforcing                     | Nessun blocco; mantenere matrix pack/core.                                                                                       |
  | `.github/workflows/qa-kpi-monitor.yml`        | QA               | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                        | enforcing                     | Attendere esito; al termine scaricare `logs/visual_runs`/`metrics.json` e aggiornare indicatori dashboard.                                       |
  | `.github/workflows/qa-export.yml`             | QA               | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                              | enforcing                     | Export QA in corso; scaricare artefatti/badges da Actions e allegarli in `logs/ci_runs` al termine.      |
  | `.github/workflows/qa-reports.yml`            | QA               | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                              | enforcing                     | Run manuale in corso; verificare aggiornamento `reports/qa_badges.json` e baseline, poi archiviare log da Actions.                      |
  | `.github/workflows/telemetry-export.yml`      | analytics        | Log assente – tentativo manuale 2025-12-05 bloccato (gh/credenziali non disponibili)                                                                | enforcing                     | Validare export/schema prima del go-live; se non espone `workflow_dispatch` seguire la guida per i prerequisiti e poi lanciare da trigger nativo (push/PR) per produrre i log.                                                       |
  | `.github/workflows/search-index.yml`          | web perf/content | 2025-12-05 – PASS (workflow_dispatch manuale)                                                 | enforcing                     | `public/search_index.json` rigenerato; scaricare eventuale commit/artefatti da Actions e allegare in `logs/ci_runs/`.                             |
  | `.github/workflows/hud.yml`                   | HUD              | 2025-12-05 – PASS (HUD Canary workflow_dispatch manuale)                                              | enforcing (salta se flag off) | Build HUD riuscita; scaricare artefatti overlay dai log Actions e allegarli.   |
  | `.github/workflows/lighthouse.yml`            | web perf         | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                                  | report-only   | Attendere esito Lighthouse e scaricare `.lighthouseci` dagli artefatti quando pronto.                                        |
  | `.github/workflows/update-evo-tracker.yml`    | roadmap          | Log assente – tentativo manuale 2025-12-05 bloccato (gh/credenziali non disponibili)                                                                | enforcing | Nessun blocco noto; se disponibile `workflow_dispatch` usare il loop PowerShell della guida con repo `MasterDD-L34D/Game`, altrimenti attivare tramite workflow caller/PR e archiviare i log.                           |
  | `.github/workflows/traits-sync.yml`           | data             | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                                     | enforcing      | Verificare segreti S3 se pubblicazione attiva; scaricare export interno/esterno dagli artefatti al termine.                                                  |
  | `.github/workflows/evo-batch.yml`             | ops              | 2025-12-05 – KO per batch `traits` (workflow_dispatch manuale), rerun in corso su `main`                                                                        | enforcing (dry-run default)   | Analizzare log del KO (Actions) e valutare retry con `execute`/`ignore_errors`; archiviare log di entrambi i run.                                                  |
  | `.github/workflows/evo-doc-backfill.yml`      | archivist        | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                                     | enforcing      | Controllare diff/backfill prodotti al termine e allegare gli artefatti notifiche/diff.                                               |
  | `.github/workflows/evo-rollout-status.yml`    | roadmap          | 2025-12-05 – RUN in corso (workflow_dispatch manuale)                                                                     | enforcing      | Attendere snapshot `reports/evo/rollout/status_export.json` dal run 2025-12-05 e archiviare gli artefatti da Actions.                                                 |

### Semaforo go-live per workflow critici

  - **CI (`ci.yml`)** –
    - Verde: ultimo run <7 giorni con suite lint/test/CLI verdi.
    - Giallo: log mancanti o ultimi run >7 giorni → lanciare run completo (dispatch manuale ancora da rieseguire con gh attivo).
    - Rosso: step falliti o skip HUD/CLI → bloccare patch finché non risolto.
- **Data Quality (`data-quality.yml`)** – Verde: schema-only 02A in PASS (2026-07-24) con manifest 03A/03B riletti; pianificare full matrix post-merge per confermare lo stato enforcing. 【F:logs/ci_runs/freezer_validator_2026-07-24.log†L1-L10】
  - **QA Reports (`qa-reports.yml`)** – Giallo: run manuale 2025-12-05 in corso; serve export QA aggiornato e log archiviati prima del rilascio.
  - **HUD (`hud.yml`)** – Giallo: run manuale 2025-12-05 in PASS; verificare artefatti overlay e consolidare in `logs/ci_runs`/`logs/visual_runs` prima di passare a verde.
  - **Deploy site (`deploy-test-interface.yml`)** – Giallo: run manuale 2025-12-05 dispatchato; verificare bundle Pages/CLI e deploy checks dagli artefatti, rosso se compaiono KO nei job di smoke/deploy.

### Aggiornamenti ticket 03A/03B

- **03A** – Validator 02A schema-only rerun in **PASS** con manifest confermati (vedi `logs/ci_runs/freezer_validator_2026-07-24.log`). Gate chiuso con firma Master DD e freeze 03AB terminato; rollback pronto grazie ai manifest archiviati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD). 【F:logs/ci_runs/freezer_validator_2026-07-24.log†L1-L10】【F:logs/agent_activity.md†L6-L10】
- **03B** – Smoke redirect staging in **PASS** su `http://localhost:8000` (report `reports/redirects/redirect-smoke-2026-07-24.json`). Gate chiuso con firma Master DD, freeze 03AB dichiarato chiuso e rollback pronto con manifest referenziati (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`, checkpoint Master DD). 【F:reports/redirects/redirect-smoke-2026-07-24.json†L1-L11】【F:logs/agent_activity.md†L6-L10】

### Log ancora assenti e come recuperarli (post-dispatch 2025-12-05)

Per i workflow che non hanno ancora log archiviati, seguire la guida standard: [docs/workflows/gh-cli-manual-dispatch.md](../workflows/gh-cli-manual-dispatch.md). Usa i passi PowerShell con `REPO="MasterDD-L34D/Game"` e `REF="main"` quando il workflow espone `workflow_dispatch`; in caso contrario, attiva il trigger nativo (push/PR o caller) e poi scarica log/artefatti con `gh run download` nelle directory `logs/ci_runs`/`logs/visual_runs`.

- **CI (`ci.yml`)** – non ha `workflow_dispatch`: richiede push/PR per ottenere nuovi log; archiviare artefatti CI una volta completato.
- **Idea Intake Index (`idea-intake-index.yml`)** – se il trigger manuale non è disponibile, eseguire un push su `docs/ideas/submissions/**`; in alternativa usare il comando PowerShell della guida se il workflow supporta `workflow_dispatch` nel repo upstream.
- **Telemetry export (`telemetry-export.yml`)** – validare via trigger nativo (push/PR) se manca `workflow_dispatch`; archiviare log di validazione.
- **Update Evo tracker (`update-evo-tracker.yml`)** – se disponibile `workflow_dispatch`, lanciare con la guida (eventuale input `batch`); altrimenti attivarlo tramite workflow caller/PR e salvare i log.

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
