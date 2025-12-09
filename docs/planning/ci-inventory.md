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
- **Validate JSON Schemas (`.github/workflows/schema-validate.yml`)** – push/PR su `schemas/**` e `config/schemas/**`. Valida i JSON Schema (Draft2020-12) e controlla la sintassi YAML (`schemas/*.yaml`) tramite `tools/py/validate_json_schemas.py`. Nessun artefatto; non report-only.
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
- **Log Harvester (`.github/workflows/log-harvester.yml`)** – schedulato (giornaliero) + `workflow_dispatch`. Usa un token con permessi `actions:read` e `contents:write` per scaricare gli ultimi log/artefatti dei workflow e salvarli in `logs/ci_runs/`, `logs/visual_runs/` e `logs/incoming_smoke/`; mantiene l’inventario aggiornato. Pubblica inoltre un artifact web-ready `logs-harvest-<YYYYMMDD>.zip` (retention 14 giorni) contenente l’intera cartella `logs/` dell’estrazione corrente. Non report-only.

### Stato run, owner e blocchi

_Nota_: quando il **Log Harvester** è attivo, l’aggiornamento degli esiti e dei log avviene automaticamente dai pacchetti scaricati. Per i workflow senza `workflow_dispatch` (es. `ci.yml`) l’harvester attende il prossimo push/PR; per i workflow manuali con input richiede un job esterno che lanci il dispatch con i parametri prima di scaricare i log.

> **Stato autenticazione locale** – GH CLI installata (Ubuntu 2.45.0) ma `CI_LOG_PAT` non è configurato: `GH_TOKEN=$CI_LOG_PAT gh auth status` fallisce mostrando “You are not logged into any GitHub hosts” (`logs/ci_runs/gh_auth_status_20251209T214011Z.log`). Tentativi precedenti prima dell’installazione di GH CLI fallivano con “command not found” (`logs/ci_runs/gh_auth_status_20251209T213948Z.log`). In sessione Windows/PowerShell l’autenticazione era riuscita esportando `CI_LOG_PAT` come `GH_TOKEN` (scope admin:org, repo, workflow); resta necessario riesportare il PAT su ogni shell (nessun accesso diretto ai secrets Actions da locale). Dispatch manuali 2025-12-09 (`qa-kpi-monitor`, `qa-export`, `qa-reports`) eseguiti da `main` con quel token. **Sessione 2025-12-09T1259Z (locale)**: `CI_LOG_PAT` non presente → `gh auth status` fallisce e non è stato possibile rilanciare `data-quality.yml`, `schema-validate.yml`, `validate_traits.yml`, `qa-kpi-monitor.yml`, `deploy-test-interface.yml` né `qa-export.yml`/`qa-reports.yml`; log in `logs/ci_runs/gh_auth_status_2025-12-09T1259Z.log`.

> **Dove prendere il PAT** – Il secret Actions `CI_log_pat` (già popolato con il PAT di logging `CI_LOG_PAT`) è disponibile per i runner e per gli operatori autorizzati. In locale: `export CI_LOG_PAT=<valore del secret CI_log_pat>` e subito dopo `export GH_TOKEN=$CI_LOG_PAT`; verifica con `GH_TOKEN=$CI_LOG_PAT gh auth status` che l’auth sia attiva. Non salvare il PAT su disco/git e chiudi il terminale al termine.

> **Dispatch 2025-12-09 (GH CLI con PAT)** – Rerun manuali da `main` riusciti in **success**: `data-quality.yml` (run **20078247297**), `schema-validate.yml` (run **20078546102**), `validate_traits.yml` (run **20078578686**), `qa-kpi-monitor.yml` (run **20079062769**), `deploy-test-interface.yml` (run **20078990093**), `qa-export.yml` (run **20078354573**) e `qa-reports.yml` (run **20078458869**). Download artefatti: `schema-validate` non produce artefatti per design; gli altri run non hanno pubblicato pacchetti scaricabili (tentativi con `gh run download` hanno restituito "no valid artifacts found").

| Workflow                                                                                                                   | Owner       | Ultimo run (data/esito/log)                                                                                                                    | Modalità  | Blocchi noti / note (log)                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                                                                 | dev-tooling | **PASS – 2025-12-06 (run4960)** – [log](../../logs/ci_runs/ci_run4960.html)                                                                    | enforcing | Log HTML salvato (download zip API bloccato 403 senza permessi admin). Non espone `workflow_dispatch`: usa push/PR; lo script di raccolta log deve prendere l’ultimo run disponibile. |
| `.github/workflows/e2e.yml`                                                                                                | QA          | **PASS – 2025-12-06 (run38)** – [log](../../logs/ci_runs/e2e_run38.html)                                                                       | enforcing | Log HTML salvato (download zip API bloccato 403 senza permessi admin). Lo script può scaricare l’ultimo run schedulato; resta opzionale il dispatch QA se serve copertura immediata.  |
| `.github/workflows/daily-pr-summary.yml`                                                                                   | archivist   | Prossimo auto-commit da scaricare in `logs/ci_runs/`                                                                                           | enforcing | Aspetta cron/trigger manuale; raccogli il log via script.                                                                                                                             |
| `.github/workflows/daily-tracker-refresh.yml`                                                                              | analytics   | Prossimo export `reports/daily_tracker_summary.json` da salvare                                                                                | enforcing | Usare raccolta automatica dopo il cron; verificare scheduler e output JSON.                                                                                                           |
| `.github/workflows/data-quality.yml`                                                                                       | data        |
| **PASS – 2025-12-09 (run20078247297, dispatch `main`)** – download artefatti non disponibile (nessun pacchetto pubblicato) | enforcing   | Dispatch manuale con PAT esportato; conserva l’ID verde. Run KO precedente archiviato in `logs/ci_runs/data-quality_run20012320492_rerun.log`. |
| `.github/workflows/deploy-test-interface.yml`                                                                              | devops      |
| **PASS – 2025-12-09 (run20078990093, push `main`)** – nessun artefatto pubblicato (download non disponibile)               | enforcing   | Run verde successivo ai tentativi KO; log dei dispatch precedenti in `logs/ci_runs/deploy_test_interface_dispatch.log`.                        |
| `.github/workflows/idea-intake-index.yml`                                                                                  | archivist   |
| Prossimo auto-commit da salvare                                                                                            | enforcing   | In attesa del cron/manuale; raccogliere log in automatico.                                                                                     |

                                                                     |

| `.github/workflows/schema-validate.yml` | data
| **PASS – 2025-12-09 (run20078546102, dispatch `main`)** – nessun artefatto previsto | enforcing | Ultimo dispatch manuale con PAT esportato riuscito. Run KO precedente archiviato in `logs/ci_runs/schema-validate_run20037257496.log`.
|
| `.github/workflows/validate-naming.yml` | data
| **PASS – 2025-12-05 (run110)** – [log](../../logs/ci_runs/validate-naming_run110.html) | enforcing | Ultimo log OK (HTML salvato; zip non scaricabile senza permessi admin). Nessun warning aperto.

                                                                     |

| `.github/workflows/validate_traits.yml` | data
| **PASS – 2025-12-09 (run20078578686, dispatch `main`)** – nessun artefatto pubblicato | enforcing | Dispatch manuale con PAT esportato completato con successo; run KO precedente in `logs/ci_runs/validate_traits_run20012325923_rerun.log`.
|
| `.github/workflows/qa-kpi-monitor.yml` | QA
| **PASS – 2025-12-09 (run20079062769, dispatch `main`)** – nessun artefatto pubblicato |
| enforcing | Sequenza manuale completata con PAT esportato; log dei tentativi 2025-12-08 in `logs/visual_runs/qa-kpi-monitor_2025-12-08T1846Z.log`. |
| |
| `.github/workflows/qa-export.yml` | QA
| **PASS – 2025-12-09 (run20078354573, dispatch `main`)** – nessun artefatto pubblicato |
| enforcing | Sequenza manuale completata con PAT esportato; log storici 2025-12-07/08 restano in `logs/ci_runs/qa-export_*.log`. |
| |
| `.github/workflows/qa-reports.yml` | QA
| **PASS – 2025-12-09 (run20078458869, dispatch `main`)** – nessun artefatto pubblicato |
| enforcing | Sequenza manuale completata con PAT esportato; log storici 2025-12-07/08 restano in `logs/ci_runs/qa-reports_*.log`. |
| |
| `.github/workflows/evo-rollout-status.yml` | roadmap | Prossimo snapshot `reports/evo/rollout/status_export.json` da salvare | enforcing | Scaricare l’artefatto con la raccolta automatica. |

### Semaforo go-live per workflow critici

_Nota_: con il **Log Harvester** abilitato, gli stati del semaforo si aggiornano dai log scaricati automaticamente; i workflow privi di `workflow_dispatch` restano in attesa di push/PR, mentre quelli manuali con input necessitano di un job esterno che effettui il dispatch prima del download.

- **CI (`ci.yml`)** – Giallo: ultimo run `20015313386` (08/12/2025) **cancelled** con HTML/log zip archiviati (`logs/ci_runs/ci_run20015313386*`); artifact `site-audit` non scaricabile (`403 Forbidden`). Serve rerun verde.
- **Data Quality (`data-quality.yml`)** – Verde: run `20078247297` (09/12/2025) **success** via `workflow_dispatch` da `main`; download artefatti non disponibile (nessun pacchetto pubblicato, `gh run download` → "no valid artifacts found").
- **E2E (`e2e.yml`)** – Verde: run `20017801531` (08/12/2025) **success** con HTML/log zip archiviati; nessun artefatto disponibile.
- **Schema/Validate Traits** – Verde: run `20078546102` (`schema-validate.yml`, 09/12/2025) **success** via `workflow_dispatch` da `main` (nessun artefatto previsto); run `20078578686` (`validate_traits.yml`, 09/12/2025) **success** via `workflow_dispatch` da `main`, nessun artefatto pubblicato (download assente).
- **QA suite (`qa-kpi-monitor.yml`, `qa-reports.yml`, `qa-export.yml`)** – Verde: dispatch manuale 09/12/2025 da `main` in **success** (`qa-kpi-monitor` run `20079062769`, `qa-export` run `20078354573`, `qa-reports` run `20078458869`). Download artefatti: nessun pacchetto pubblicato sui run più recenti (`gh run download` → "no valid artifacts found"); `schema-validate` resta senza artefatti per design.
- **HUD (`hud.yml`)** – Giallo: run `19975105999` (08/12/2025) **success** con HTML/log zip in `logs/ci_runs` e `logs/visual_runs`; nessun artifact scaricabile. Verificare se flag HUD resta attivo e pianificare rerun se servono overlay aggiornati.
- **Deploy site (`deploy-test-interface.yml`)** – Verde: run `20078990093` (09/12/2025) **success** su `main`; tentativi di download artefatti non hanno trovato pacchetti pubblicati ("no valid artifacts found").

### Azioni aperte (aggiornato)

- **Raccolta automatica log** – Configurare/abilitare lo script `gh run list --workflow <file> --limit 1 --json databaseId,status` → `gh run download <id> --dir <dest>` usando un PAT con scope `workflow/read:org` **e** permessi repo/admin (esposto come `CI_LOG_PAT`/`LOG_HARVEST_PAT` → `GH_TOKEN`) per sbloccare il download zip dei log oltre alle pagine HTML. Applicare a tutti i workflow con trigger push/PR/cron; i workflow manual-only vengono comunque scaricati (dispatch opzionale con `DISPATCH_MANUAL=1`). Configurare lo stesso PAT come secret del job `log-harvester.yml`, esportarlo come `GH_TOKEN` e autenticare `gh` sul runner (`echo "$GH_TOKEN" | gh auth login --with-token` + `gh auth status`), seguendo lo snippet e la checklist runner in `docs/planning/ci-log-automation.md`. Per questo PR i pacchetti `_logs.zip` sono stati rimossi (binari non ammessi): usa `scripts/ci_log_harvest.sh --config ops/ci-log-config.txt --force-zip` con `GH_TOKEN=$CI_LOG_PAT` per rigenerarli localmente (vedi `logs/ci_runs/LOG_ARCHIVE_NOTE.md`).
- **QA suite manuale** – Sequenza 09/12/2025 eseguita con PAT esportato: `qa-kpi-monitor` run `20079062769`, `qa-export` run `20078354573`, `qa-reports` run `20078458869` tutti in **success**. Nessun artefatto scaricabile sui run più recenti; ripetere la sequenza quando servono nuove baseline/report.
- **Autenticazione GH locale (2025-12-08)** – GitHub CLI installata via apt (`gh 2.45.0`) e autenticata esportando `GH_TOKEN=$CI_LOG_PAT` (scope `workflow`/repo). Rerun manuali eseguiti: `data-quality.yml` (run20012320492 rerun, KO per catalogo specie vuoto), `schema-validate.yml` (run20037257496 dispatch `main`, KO per `IndentationError` inline), `validate_traits.yml` (run20012325923 rerun `main`, KO per catalogo specie vuoto). Artefatti trait ancora 403 via SAS. Usare direttamente `GH_TOKEN=$CI_LOG_PAT gh <comando>` evitando `gh auth login` se la variabile è già esportata.
- **Sweep manuale 2025-12-08 (PAT `CI_LOG_PAT` valido, rerun post-fix)** – Eseguito `scripts/ci_log_harvest.sh --config ops/ci-log-config.txt` con `GH_TOKEN` attivo e `GH_REPO=MasterDD-L34D/Game`: tutte le pagine HTML e i log zip sono stati riscaricati senza errori di autenticazione GH; gli artifact restano bloccati da 403 SAS (site-audit, trait-data-reports, visual-report, evo-anchors-map, traits-internal-evaluation, incoming-smoke-logs) e `update-evo-tracker.yml` non ha run recenti. Il dispatch locale `gh workflow run log-harvester.yml --ref work` falliva perché il ref non era presente su origin; lo script ora effettua fallback automatico al branch di default remoto (es. `main`) e il workflow con piping del token (`printf '%s' "$GH_TOKEN" | gh auth login --with-token`) va rieseguito da un ref remoto valido per chiudere il fail storico `gh run watch 20030901346`.
- **Sweep GH CLI 2025-12-08 (PAT admin repo/workflow)** – GitHub CLI installata via apt e autenticata con `GH_REPO=MasterDD-L34D/Game`: raccolti gli ID più recenti (`ci.yml` 20032812398 success, `e2e.yml` 20017801531 success, `data-quality.yml` 20012320492 failure per catalogo specie vuoto, `schema-validate.yml` 20037257496 failure per `IndentationError`, `validate_traits.yml` 20012325923 failure per catalogo specie vuoto, `qa-kpi-monitor.yml` 19989066630 failure, `qa-export.yml` 19975106001 cancelled, `qa-reports.yml` 20012320512 cancelled, `deploy-test-interface.yml` 20032811732 failure, `hud.yml` 19975105999 success, `incoming-smoke.yml` 20012779896 failure). Download artifact ancora in 403 (`trait-data-reports`, `visual-report`, `incoming-smoke-logs`); dispatch `log-harvester.yml` `run 20033909404` fallito allo step “Auth gh” se si usa `gh auth login --with-token` con `GH_TOKEN` già presente (warning “The value of the GH_TOKEN environment variable is being used for authentication”).
- **Tentativo 2025-12-08 (env privo di `CI_LOG_PAT`)** – Ripristinata l’installazione di GitHub CLI via apt (`gh 2.45.0`), ma l’ambiente locale non espone `CI_LOG_PAT`/`GH_TOKEN`: `gh auth status` segnala nessuna sessione attiva, `scripts/ci_log_harvest.sh --config ops/ci-log-config.txt` rifiuta l’esecuzione per PAT mancante e l’opzione `--force-zip` non è riconosciuta. I dispatch manuali `gh workflow run log-harvester.yml -r main` e `gh workflow run deploy-test-interface.yml -r main` non partono senza token. Sblocco richiesto: esportare `GH_TOKEN=$CI_LOG_PAT` (scope workflow/read:org/admin) e usare direttamente i comandi `GH_TOKEN=$CI_LOG_PAT gh …` (senza `gh auth login`) oppure eseguire `gh auth status` dopo l’export per verificare la sessione. L’agente non può consumare PAT forniti nella chat; un operatore deve configurare l’ambiente prima di rieseguire log-harvester/QA/deploy.
- **Tentativo 2025-12-09 (GH CLI installata, HUD flag on)** – `gh 2.45.0` installata via apt (`logs/ci_runs/hud_gh_version.log`), ma l’ambiente resta senza `GH_TOKEN`: `gh auth status` segnala nessuna sessione (`logs/ci_runs/hud_auth_status.log`) e il dispatch manuale `gh workflow run hud.yml -r main` rifiuta l’avvio (`logs/ci_runs/hud_dispatch.log`). Azioni: esportare `GH_TOKEN=$CI_LOG_PAT` o login con PAT equivalente, quindi rerun `hud.yml` da `main` e archiviare overlay/log in `logs/visual_runs` e `logs/ci_runs`.
- **Tentativo 2025-12-09 (incoming-smoke con input di default)** – GH CLI installata (`logs/incoming_smoke/incoming_smoke_gh_version.log`) ma non autenticata (`logs/incoming_smoke/incoming_smoke_auth_status.log`); i dispatch manuali `gh workflow run incoming-smoke.yml -r main -f data-root=incoming/decompressed/latest/data -f pack-root=incoming/decompressed/latest/packs/evo_tactics_pack` sono stati rifiutati senza `GH_TOKEN`, vedi `logs/incoming_smoke/incoming_smoke_dispatch*.log`. Azioni: esportare `GH_TOKEN=$CI_LOG_PAT`, rilanciare con input di default o specifici e salvare i log in `logs/incoming_smoke/`.

- **Copertura workflow/destinazioni** – Mantieni allineata la lista nel job `Resolve latest workflow runs` di `log-harvester.yml` con la tabella dei workflow coperti; il job “Prepare target directories” crea e valida `logs/ci_runs`, `logs/visual_runs`, `logs/incoming_smoke` e fallisce se non sono scrivibili.
- **Stato sweep locale** – `gh` installata via apt, `GH_REPO=MasterDD-L34D/Game` e PAT `CI_LOG_PAT` in uso; raccolti HTML + log zip per i workflow in `ops/ci-log-config.txt` ma gli artifact restano inaccessibili (403 su SAS Azure). In attesa di permessi blob o di rigenerazione dei SAS per completare i pacchetti artefatto.
- **ci.yml** – Owner: dev-tooling. Ultimo run4960 (06/12) in PASS con log HTML salvato; mantenere monitoraggio e abilitare PAT con permessi adeguati per scaricare i pacchetti log zip in automatico.
- **e2e.yml** – Owner: QA. Ultimo run38 (06/12) in PASS con log HTML salvato; mantenere la raccolta automatica e abilitare PAT con permessi repo per il download zip completo.
- **data-quality.yml** – Owner: data. Dispatch 09/12/2025 (`workflow_dispatch` da `main`) in **success** – run20078247297, nessun artefatto pubblicato (download assente). Run precedente KO in `logs/ci_runs/data-quality_run20012320492_rerun.log` per copertura specie vuota.
- **schema-validate.yml** / **validate_traits.yml** – Owner: data. Dispatch manuali 09/12/2025 su `main` in **success** (`schema-validate` run20078546102, `validate_traits` run20078578686); `schema-validate` non produce artefatti, `validate_traits` non ha pubblicato pacchetti scaricabili. Run precedenti KO archiviati in `logs/ci_runs/schema-validate_run20037257496.log` e `logs/ci_runs/validate_traits_run20012325923_rerun.log`.
- **QA suite** – Owner: QA. Dispatch manuale 09/12/2025 da `main` in **success** (`qa-kpi-monitor` run20079062769, `qa-export` run20078354573, `qa-reports` run20078458869); nessun artefatto pubblicato nei run correnti. Log storici dei tentativi 2025-12-08 restano in `logs/visual_runs/qa-kpi-monitor_2025-12-08T1846Z.log`, `logs/ci_runs/qa-export_2025-12-08T1846Z.log`, `logs/ci_runs/qa-reports_2025-12-08T1846Z.log`.
- **deploy-test-interface.yml** – Owner: devops. Ultimo run 20078990093 (09/12/2025) in **success** su `main`; nessun artefatto trovato al download. I run KO precedenti (es. 20032811732) restano referenziati per storia.
- **hud.yml** – Owner: HUD. Flag HUD attivo per smart alerts (`config/cli/hud.yaml` → `flags.hud.smart_alerts.default: true`). Tentativo 2025-12-09 bloccato senza token (`logs/ci_runs/hud_dispatch.log`, `logs/ci_runs/hud_auth_status.log`); azioni: esportare `GH_TOKEN=$CI_LOG_PAT`, rerun manuale da `main`, archiviare overlay in `logs/visual_runs` e log HTML/testuali in `logs/ci_runs` gestendo il caso skip se il flag venisse disattivato.
- **incoming-smoke.yml** – Owner: dev-tooling. Ultimo run `20012779896` in failure con artifact `incoming-smoke-logs` bloccato (403 SAS) nonostante PAT `workflow/repo`; serve rerun con input `data-root`/`pack-root` e log in `logs/incoming_smoke/` o un job esterno che fornisca i parametri. Tentativo 2025-12-09 bloccato senza `GH_TOKEN` (`logs/incoming_smoke/incoming_smoke_dispatch*.log`).
- **evo-batch.yml** – Owner: ops/dev-tooling. Dry-run `batch=traits` pianificato il 2026-07-06 (nessun log, vedi [log](../../logs/agent_activity.md)): eseguire con `execute=false` via script/dispatch e archiviare in `logs/ci_runs` prima di valutare `execute=true`.
- **Log harvester** – Garantire manutenzione del workflow `log-harvester.yml` (frequenza giornaliera, dispatch manuale di backup) e revisione periodica dei permessi del token (almeno `actions:read` + `contents:write`).

### Procedura rapida di autenticazione GH CLI e rerun manuali

1. **Esporta il PAT**: `export GH_TOKEN=$CI_LOG_PAT` e verifica con `GH_TOKEN=$CI_LOG_PAT gh auth status` che la sessione sia attiva (evita `gh auth login --with-token` che genera warning se `GH_TOKEN` è già impostato).
2. **Imposta il repo**: se necessario, `export GH_REPO=MasterDD-L34D/Game` per forzare il contesto.
3. **Dispatch workflow**: usa sempre il prefisso `GH_TOKEN=$CI_LOG_PAT gh workflow run <file>.yml -r main [input]` per data-quality/schema/traits/QA/deploy/HUD/incoming-smoke/log-harvester e recupera l’ID con `gh run list --workflow <file>.yml --limit 1`.
4. **Scarica log/artefatti**: `GH_TOKEN=$CI_LOG_PAT gh run download <id> --dir logs/ci_runs` (o `logs/visual_runs` / `logs/incoming_smoke` in base al workflow).
5. **Aggiorna il semaforo**: registra esito e percorsi log nella tabella sopra; se il download artefatti fallisce con 403, segnala agli owner per nuovi SAS/perms.

**Checklist rapida per la QA suite con token**

1. `export CI_LOG_PAT=<valore CI_log_pat>`

2. `export GH_TOKEN=$CI_LOG_PAT && GH_TOKEN=$CI_LOG_PAT gh auth status`

3. `GH_TOKEN=$CI_LOG_PAT gh workflow run qa-kpi-monitor.yml -r main` (nessun input richiesto); scarica il log con `GH_TOKEN=$CI_LOG_PAT gh run download <id> --dir logs/visual_runs`

4. `GH_TOKEN=$CI_LOG_PAT gh workflow run qa-export.yml -r main` e `GH_TOKEN=$CI_LOG_PAT gh workflow run qa-reports.yml -r main`

5. scarica i log export/reports in `logs/ci_runs/` e aggiorna badge/KPI secondo gli output generati

- **Rerun data-quality.yml** – Dispatch manuale 09/12/2025 su `main` (run20078247297) in **success**; nessun artefatto pubblicato (download non disponibile). Conservare l’ID come baseline verde più recente.
- **Rerun schema-validate.yml** – Dispatch manuale 09/12/2025 su `main` (run20078546102) in **success**; nessun artefatto previsto.
- **Rerun validate_traits.yml** – Dispatch manuale 09/12/2025 su `main` (run20078578686) in **success**; nessun artefatto pubblicato (download non disponibile).
- **QA suite (qa-kpi-monitor + qa-export + qa-reports)** – Sequenza manuale 09/12/2025 su `main` in **success** (`qa-kpi-monitor` run20079062769, `qa-export` run20078354573, `qa-reports` run20078458869); nessun artefatto pubblicato nei run correnti.

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
