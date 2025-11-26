# Readiness 01C – Inventario CI e script (modalità report-only)

## Workflow CI attivi

| Nome | Percorso | Trigger | I/O principale | Rischio |
| ---- | -------- | ------- | -------------- | ------- |
| CI orchestrazione | .github/workflows/ci.yml | push, pull_request | Paths filter indirizza job TS/CLI/Python/data e richiama script di smoke e validazione (es. scripts/cli_smoke.sh, scripts/build_trait_index.js) | Medio |
| Data audit e validation | .github/workflows/data-quality.yml | pull_request su data/packs/scripts schemi | Valida dataset YAML/JSON, esegue trait audit, genera report/artefatti nei report e data/derived/analysis | Medio |
| Validate Trait Catalog | .github/workflows/validate_traits.yml | push/pull_request su data/traits e schema trait | Valida schema trait, genera coverage/stile con report in reports/** e data/derived/analysis | Medio |
| Schema validate | .github/workflows/schema-validate.yml | push/pull_request su schemas/**, workflow_dispatch | Verifica schemi JSON locali via jsonschema | Basso |
| Validate registry naming | .github/workflows/validate-naming.yml | push/pull_request su registries/config legati al pack | Controlla naming registri con tools/py/validate_registry_naming.py | Basso |
| ChatGPT Sync | .github/workflows/chatgpt_sync.yml | schedule giornaliero, workflow_dispatch | Esegue scripts/sync_chatgpt.sh con API OpenAI e può committare modifiche | Alto |
| E2E Playwright | .github/workflows/e2e.yml | schedule giornaliero, workflow_dispatch | Installa npm e Playwright, esegue test browser contro BASE_URL remoto, carica report | Medio |
| Altri workflow di servizio (deploy-test-interface, lighthouse, hud, qa-*, telemetry-export, search/idea index, evo-*, traits-sync, traits-monthly-maintenance, incoming-smoke, daily-*) | .github/workflows/*.yml | Vari (schedule, push/pull_request o dispatch) | Sync/refresh tracker, deploy interfacce o esport export KPI/search; usano Node/Python/batch per produrre artefatti o aggiornare indici | Variabile (Basso–Medio secondo scope; nessuna scrittura dati core nel repo in modalità CI) |

## Script locali con I/O

| Script | Percorso | Scopo/I-O | Dipendenze esterne | Rischio |
| ------ | -------- | --------- | ------------------ | ------- |
| CLI smoke | scripts/cli_smoke.sh | Esegue smoke CLI su core/pack, legge dati biomi/traits e produce log in logs/cli e logs/incoming_smoke | PyYAML, game_cli; richiede dataset locali | Medio |
| Trait audit | scripts/trait_audit.py | Audit dati trait core/pack in modalità check, legge data/core e pack; può scrivere report | requirements-dev (Python, jsonschema) | Medio |
| Build trait index | scripts/build_trait_index.js | Genera indice trait a partire da dataset e scrive file in reports/data/derived | Node/npm | Medio |
| Trait coverage/style | tools/py/report_trait_coverage.py; scripts/trait_style_check.js | Calcola coverage e lint stile, produce report in reports/ e data/derived/analysis | Python jsonschema, Node/npm | Medio |
| Schema validator | tools/py/validate_datasets.py | Valida YAML/JSON di core/pack; può scrivere report/artefatti | Python jsonschema, requirements-dev | Medio |
| Registry naming | tools/py/validate_registry_naming.py | Verifica naming registri pack contro glossario core | Python deps da tools/py/requirements.txt | Basso |
| Ops notifier | ops/notifier.py | Legge JSON di diff documentazione e invia notifiche Slack/Teams; può scrivere payload issue | Webhook HTTP (Slack/Teams) | Alto |
| MongoDB apply | ops/mongodb/apply.sh | Esegue migrazioni/seed MongoDB con config JSON, lancia script Python di migration/seed | Bash + accesso DB Mongo tramite script Python | Alto |
| Site-audit suite | ops/site-audit/run.sh + run_suite.py | Genera sitemap/redirect/search index, controlla link; legge/writa file in ops/site-audit e logs | Python reqs da ops/site-audit/requirements.txt | Medio |

## Note operative

- Tutti gli elementi sono censiti in modalità **report-only** per readiness 01C: nessuna esecuzione effettuata.
- I workflow che possono committare o inviare richieste esterne (ChatGPT Sync, Ops notifier, MongoDB apply) sono marcati a rischio alto.
- I workflow di validazione dati generano artefatti locali/CI ma non modificano il repository in questa fase.
