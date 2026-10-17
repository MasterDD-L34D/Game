# Readiness 01C – Inventario CI e script (modalità report-only)

Inventario aggiornato per il gate **01C** collegato alla nota di readiness `reports/readiness_01B01C_status.md` e al log di riapertura `logs/RIAPERTURA-2025-02.md`. Tutte le voci restano **report-only** (nessuna pipeline eseguita).

## Collegamento branch readiness 01B/01C
- Branch dedicati attivi in sola lettura: `patch/01B-core-derived-matrix` (01B) e `patch/01C-tooling-ci-catalog` (01C); `patch/01A-report-only` resta il punto di handoff da 01A.
- Stato readiness 2026-10-12T1200Z (report-only): agenti on-call confermati (species-curator + trait-curator per 01B; dev-tooling per 01C; coordinator/balancer backup) con ticket **TKT-01B-001/002** e **TKT-01C-001/002**.
- Log di riferimento: `logs/agent_activity.md` entry `01B01C-READINESS-2026-10-12T1200Z` con link a questo inventario e alla nota readiness `reports/readiness_01B01C_status.md`.

## Workflow CI attivi

| Nome | Percorso | Trigger | Input principali | Output/artefatti | Rischio |
| ---- | -------- | ------- | ---------------- | ----------------- | ------- |
| CI orchestrazione | .github/workflows/ci.yml | push, pull_request | Filtri su TS/CLI/Python/data/deploy/styleguide/stack/site_audit | Avvio job condizionali (build TS, smoke CLI, lint, report stack) e bundle Playwright in cache runner | Medio |
| Data audit e validation | .github/workflows/data-quality.yml | pull_request su data/**, packs/**, tool di audit | Dataset YAML/JSON, script `scripts/trait_audit.py`, `tools/py/validate_datasets.py` | Report trait e coverage in `reports/**`, artefatti `data/derived/analysis`, upload artifact `trait-data-reports-*` | Medio |
| Validate Trait Catalog | .github/workflows/validate_traits.yml | push/pull_request su data/traits/** e schema trait | Trait dataset, schema `config/schemas/trait.schema.json`, script JS/Python di coverage/stile | Report coverage/stile in `reports/**` e `data/derived/analysis`, artifact `trait-data-reports-*` | Medio |
| Schema validate | .github/workflows/schema-validate.yml | push/pull_request su schemas/**, workflow_dispatch | Schemi JSON in `schemas/**` | Validazione jsonschema senza side-effect, log CI | Basso |
| Validate registry naming | .github/workflows/validate-naming.yml | push/pull_request su registries/config | File registry pack e `tools/py/validate_registry_naming.py` | Esito naming in log CI, nessun artefatto persistente | Basso |
| Derived checksum audit | .github/workflows/derived_checksum.yml | push/pull_request su data/derived/** | Dataset derivati, script `tools/py/check_derived_checksums.py` | Report in `reports/derived_checksums` + artifact `derived-checksum-audit-*` (continue-on-error) | Basso |
| Incoming CLI smoke | .github/workflows/incoming-smoke.yml | workflow_dispatch, pull_request su incoming/** | Parametri `data-root`, `pack-root`, profilo `staging_incoming`, script `scripts/cli_smoke.sh` | Log in `logs/incoming_smoke` caricati come artifact `incoming-smoke-logs` | Medio |
| ChatGPT Sync | .github/workflows/chatgpt_sync.yml | schedule giornaliero, workflow_dispatch | Script `scripts/sync_chatgpt.sh`, credenziali API | Possibile commit/PR automatico con contenuti sincronizzati | Alto |
| E2E Playwright | .github/workflows/e2e.yml | schedule giornaliero, workflow_dispatch | `apps/dashboard`, Playwright installato con npm | Report test browser caricati come artifact | Medio |
| Altri workflow di servizio (deploy-test-interface, lighthouse, hud, qa-*, telemetry-export, search/idea index, evo-*, traits-sync, traits-monthly-maintenance, daily-*/tracker) | .github/workflows/*.yml | Vari (schedule, push/pull_request o dispatch) | Config di deploy/test, tracker e KPI | Artifact/report di monitoraggio o sync indici/search, nessuna modifica dati core | Variabile (Basso–Medio secondo scope) |

## Script locali con I/O

| Script | Percorso | Scopo/I-O | Output/percorsi | Dipendenze esterne | Rischio |
| ------ | -------- | --------- | --------------- | ------------------ | ------- |
| CLI smoke | scripts/cli_smoke.sh | Smoke CLI su dataset core/incoming con profili CLI | Log run in `logs/cli` e `logs/incoming_smoke`; copia snapshot label | PyYAML, `tools/py/game_cli.py`, dataset locali | Medio |
| Trait audit | scripts/trait_audit.py | Audit trait in modalità check | Report markdown/JSON in `logs/trait_audit` e `reports/**` | Python `requirements-dev.txt`, jsonschema | Medio |
| Build trait index | scripts/build_trait_index.js | Genera indici trait a partire da dataset | File derivati in `data/derived/analysis` e `reports/` | Node/npm | Medio |
| Trait coverage/style | tools/py/report_trait_coverage.py; scripts/trait_style_check.js | Coverage e lint stile trait | Report JSON/CSV/MD in `reports/trait_*` e `data/derived/analysis` | Python jsonschema, Node/npm | Medio |
| Schema validator | tools/py/validate_datasets.py | Valida YAML/JSON di core/pack | Log CI e report validazione locale | Python jsonschema, requirements-dev | Medio |
| Registry naming | tools/py/validate_registry_naming.py | Verifica naming registri pack | Log CLI/CI, nessun output persistente | Python deps da tools/py/requirements.txt | Basso |
| Ops notifier | ops/notifier.py | Invio notifiche Slack/Teams da diff documentazione | Payload HTTP verso webhook, può creare issue | Webhook esterni | Alto |
| MongoDB apply | ops/mongodb/apply.sh | Migrazioni/seed MongoDB da config JSON | Script Python/JSON letti da `ops/mongodb/**`, esecuzione su DB target | Bash + accesso DB/Mongo driver | Alto |
| Site-audit suite | ops/site-audit/run.sh; ops/site-audit/run_suite.py | Sitemap/redirect/search index e link check | Output in `ops/site-audit/output/**` e log locali | Python reqs `ops/site-audit/requirements.txt` | Medio |

## Note operative

- Inventario aggiornato in sola lettura per readiness 01C; nessuna pipeline o script eseguito.
- Workflow con commit o chiamate esterne (ChatGPT Sync, Ops notifier, MongoDB apply) marcati rischio alto.
- I flussi di validazione producono artefatti confinati in `reports/**`, `logs/**` o artifact CI; i dataset core non vengono modificati in questa fase.
