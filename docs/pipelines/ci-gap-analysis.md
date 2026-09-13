---
title: CI gap analysis (OPS-01)
doc_status: draft
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# CI gap analysis (OPS-01)

Questa analisi sintetizza lo stato attuale dei workflow CI e identifica le aree
scoperte rispetto agli obiettivi Ops. Ri-ancorata allo split `ci.yml` corrente
(26 workflow in `.github/workflows/`, gate aggregatore `ci-gate`).

## Copertura attuale (`ci.yml`)

`ci.yml` e' una pipeline split, path-filtered. Il job `paths-filter`
(`dorny/paths-filter@v3`) calcola gli output `ts / cli / python / data /
deploy / styleguide / stack / site_audit / i18n` e ogni job a valle gira solo
quando l'area corrispondente e' toccata.

Job principali:

- `stack-quality` (filtro `stack`): `npm run lint:stack` + `npm run test:api`
  (suite backend Express `apps/backend`, porta 3334; combat Node in
  `apps/backend/services/combat/`) + build/test del Trait Editor
  (`apps/trait-editor`). Sostituisce il vecchio `webapp-quality` (la webapp /
  `apps/dashboard` e' stata rimossa in #1343).
- `cli-checks` (filtro `cli` o `data`): TS CLI (`tools/ts`) + validazioni Python
  CLI (`game_cli.py validate-datasets` e `validate-ecosystem-pack`) +
  `scripts/cli_smoke.sh`.
- `python-tests` (filtro `python` o `data`): `pytest` + validazione specie
  (`validate_species.py`) + guard regressione analyzer playtest#2 +
  round-trip `tools/sim/telemetry-bridge.js`.
- `dataset-checks` (filtro `data` o `deploy`): gate "regenerate-or-die"
  (`npm run sync:evo-pack` + `git status --porcelain` drift) + audit/baseline
  trait + integrita' species-index. La specie e' su `data/core/species/*.yaml`
  - `species_catalog.json` (il monolitico `data/core/species.yaml` e' stato
    rimosso in #2271).
- `typescript-tests` (filtro `ts`): test del CLI TypeScript.
- `i18n-parity` (filtro `i18n`): parita' bundle `data/i18n/**`.
- `styleguide-compliance` (filtro `styleguide` / `data` / `python`): linter
  stile trait.
- `site-audit` (filtro `site_audit` / `deploy` / `stack`): esegue
  `ops/site-audit/run_suite.py` (NON `make audit`) e carica gli artifact.
- `lighthouse-ci` (filtro `ts` / `deploy`): LHCI; gira solo se `SITE_BASE_URL`
  e' configurato, altrimenti skippa.
- `playwright-bundle` + `generator-dashboard-validation` + `deployment-checks`
  (filtro `deploy`): bundle Chromium condiviso + validazione dashboard +
  `run_deploy_checks.sh`.
- **`ci-gate`** (issue #2410): job aggregatore con `if: always()`, dichiarato
  required check su `main`. Fa `needs` su `paths-filter / stack-quality /
cli-checks / python-tests / dataset-checks` e passa quando ognuno e'
  success-o-skipped, fallendo solo su failure/cancelled reali. Risolve il
  problema dei required-check path-filtered che restavano Pending (skip = OK)
  e richiedevano admin-merge.

Workflow ausiliari/schedulati distinti da `ci.yml`: `docs-governance.yml`
(governance frontmatter/registry), `schema-validate.yml` (schemi JSON),
`combat-balance-gate.yml` / `meta-loop-gate.yml` (gate di balance),
`swarm-validation.yml` (canon entity-grounding linter), `ai-sim-nightly.yml` /
`ai-sim-sweep.yml` / `playtest-2-weekly.yml` (sim AI/playtest),
`derived_checksum.yml`, `evo-import-gate.yml`, `idea-intake-index.yml`,
`sot-drift-sentinel.yml`, `telemetry-export.yml`, `traits-sync.yml`,
`traits-monthly-maintenance.yml`, `qa-export.yml` / `qa-reports.yml` /
`qa-kpi-monitor.yml`, `chatgpt_sync.yml`, `evo-rollout-status.yml`,
`mission-console-build.yml`, `e2e.yml`, `daily-pr-summary.yml`,
`daily-tracker-refresh.yml`, `skiv-monitor.yml`.

## Gap chiusi (rispetto alla versione precedente di questa analisi)

- **`webapp-quality` / lint webapp** -- non e' piu' un gap ne' un job: la webapp
  e' stata rimossa (#1343). La copertura full-stack vive in `stack-quality`.
- **`lighthouse.yml` standalone** -- non esiste piu' come workflow separato;
  l'audit Lighthouse e' il job `lighthouse-ci` dentro `ci.yml` (path-filtered,
  gated su `SITE_BASE_URL`).
- **Required check path-filtered Pending** -- chiuso da `ci-gate` (aggregatore
  always-run); non serve piu' admin-merge per PR tooling/CI-only.
- **`site-audit` via `make audit`** -- l'esecuzione CR e' migrata a
  `ops/site-audit/run_suite.py` nel job `site-audit`.

## Gap ancora aperti

1. **Target Evo (`evo-*`) non eseguiti in CI** -- i target Make
   `evo-list / evo-plan / evo-run / evo-lint / evo-validate` (Makefile) e gli
   script in `tools/automation/` non hanno alcun job CI o schedule dedicato.
   Verificato 2026-06-21: nessun workflow in `.github/workflows/` invoca quei
   target. La validazione degli schemi incoming resta affidata a run manuali.
2. **Segnalazione centralizzata dei risultati** -- gli artifact di site-audit,
   Lighthouse, styleguide e trait-style vengono caricati per-run come artifact
   GitHub, ma non esiste un bucket/dashboard unico per la consultazione
   storica.

## Raccomandazioni

1. Definire un job (CI on-change o schedulato) che riusi i target `evo-*` per
   validare schemi/batch Evo direttamente in CI, chiudendo il gap manuale.
2. Valutare una piattaforma di archiviazione/reportistica condivisa che
   raccolga automaticamente gli artifact generati da site-audit, Lighthouse e
   style-guide.
