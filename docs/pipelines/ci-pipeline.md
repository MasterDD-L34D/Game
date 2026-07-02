---
title: Pipeline CI completa
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Pipeline CI completa

Il workflow GitHub Actions `.github/workflows/ci.yml` mantiene in salute la
toolchain Node/Python e i dataset di gioco. Per evitare esecuzioni superflue la
pipeline NON e' un job monolitico: un job dispatcher (`paths-filter`) rileva le
aree toccate dalla PR e ogni job specializzato gira solo quando la sua area
cambia. Trigger: `push`, `pull_request`, `workflow_dispatch`.

## Job dispatcher -- `paths-filter`

Usa `dorny/paths-filter@v3` e pubblica gli output booleani consumati dagli altri
job: `ts`, `cli`, `python`, `data`, `deploy`, `styleguide`, `stack`,
`site_audit`, `i18n`. Esempi di mappatura (vedi `ci.yml` per la lista completa):

- `ts` -> `package.json`, `package-lock.json`, `tools/ts/**`
- `cli` -> `scripts/cli_smoke.sh`, `tools/py/game_cli.py`
- `python` -> `scripts/**/*.py`, `services/**/*.py`, `tests/**/*.py`, `tools/py/**`, `tools/sim/**`
- `data` -> `data/**`, `packs/**`, `config/schemas/**`, generatore evo-pack (`scripts/update_evo_pack_catalog.js`, `scripts/sync_evo_pack_assets.js`)
- `deploy` -> `scripts/run_deploy_checks.sh`, `scripts/trait_audit.py`, `config/deploy/**`

## Job specializzati (gated sui filtri)

- `typescript-tests` (area `ts`) -- suite TypeScript in `tools/ts`.
- `stack-quality` (area `stack`) -- lint/format dello stack backend (Prettier) + `test:backend`.
- `cli-checks` (area `cli`) -- smoke profili CLI `scripts/cli_smoke.sh` + `game_cli.py`.
- `python-tests` (area `python`) -- `pytest` + guard analyzer playtest (round-trip `tools/sim/telemetry-bridge.js`).
- `dataset-checks` (area `data`) -- validazione dataset + gate generation-enforcement (rigenera-e-diff evo-pack, Phase A/L1).
- `i18n-parity` (area `i18n`) -- parita' chiavi i18n.
- `playwright-bundle`, `generator-dashboard-validation` -- bundle/dashboard checks.
- `site-audit` + `lighthouse-ci` (area `site_audit`) -- audit del sito statico docs/ (vedi nota maintenance-mode in `docs/ci/README.md`; richiedono `SITE_BASE_URL`).
- `styleguide-compliance` (area `styleguide`) -- linter style trait.
- `deployment-checks` (area `deploy`) -- `scripts/run_deploy_checks.sh`.

## Gate richiesto -- `ci-gate` (issue #2410)

`ci-gate` e' l'**unico check richiesto** di `ci.yml` su `main`. Gira con
`if: always()`, dipende da `paths-filter`, `stack-quality`, `cli-checks`,
`python-tests`, `dataset-checks` e passa quando ogni job necessario e'
`success` **o** `skipped`, fallendo solo su `failure`/`cancelled`. Questo
risolve il problema del "check richiesto che resta Pending" quando un job
path-filtered viene saltato: una PR tooling/CI-only non ha piu' bisogno di
admin-merge. La lista `needs:` deve rispecchiare il required-set della
branch-protection.

## Dipendenze e credenziali

- Dipendenze Node centralizzate nel root `package.json` (+ `tools/ts/package.json`);
  Python in `tools/py/requirements.txt`.
- Il workflow usa il `GITHUB_TOKEN` automatico per il checkout; nessun secret
  obbligatorio per il path principale. `SITE_BASE_URL` abilita i job di audit
  sito (opzionale, vedi `docs/ci/README.md`).

## Debug locale

Replica i job principali in locale dalla radice del repo:

```bash
npm ci
npm run test            # = test:backend (Node)
npm run test:api        # suite API + tsx specs
node --test tests/ai/*.test.js
PYTHONPATH=tools/py pytest
python3 tools/py/game_cli.py validate-datasets
python3 tools/py/game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json
./scripts/cli_smoke.sh
npm run format:check
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

> Nota: il monolite `data/core/species.yaml` e' stato rimosso (#2271, split in
> `data/core/species/*.yaml` + `species_catalog.json`). Doc/comandi che ancora
> lo citano sono drift -- usare il catalogo per-specie.
