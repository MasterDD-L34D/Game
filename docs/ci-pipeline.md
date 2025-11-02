# Pipeline CI completa

Il workflow GitHub Actions `.github/workflows/ci.yml` mantiene in salute la
strumentazione Node.js/Python e i dataset del progetto. È composto da più job
specializzati che vengono abilitati dinamicamente in base ai file modificati
tramite `dorny/paths-filter@v3`.

## Panoramica dei job

1. **`paths-filter`** — calcola i flag (`ts`, `cli`, `python`, `data`,
   `deploy`, `orchestrator`) che guidano i job successivi. Qualsiasi modifica al
   lock file principale (`package-lock.json`) o alla style guide
   dell'orchestrator (`docs/**/orchestrator-*-guide*.md`) fa quindi scattare i
   controlli di latenza.
2. **`typescript-tests`** — esegue `npm ci --workspace tools/ts --include-workspace-root false`
   e la suite `npm test` in `tools/ts/`, validando inoltre le specie
   (`node dist/validate_species.js`). Si attiva quando cambiano file TypeScript
   o i lock file associati.
3. **`webapp-quality`** — dopo `npm ci` nella radice, lancia `npm run lint`,
   i test `npm run test --workspace webapp`, la build `npm run build --workspace webapp`
   e un breve smoke `npm run preview`.
4. **`cli-checks`** — compila la toolchain TypeScript, installa la toolchain
   Python e lancia gli smoke test CLI (`./scripts/cli_smoke.sh`). È abilitato
   dalle modifiche CLI o dataset.
5. **`python-tests`** — installa le dipendenze Python da `tools/py/` ed esegue
   `pytest` assieme alle validazioni CLI Python.
6. **`dataset-checks`** — riesegue gli audit su tratti e coperture quando si
   toccano dataset o script di deploy.
7. **`orchestrator-latency`** — installa le dipendenze dal `package-lock.json`
   di root, prepara l'ambiente Python (`requirements-dev.txt`) e avvia
   `node scripts/loadtest-orchestrator.mjs --requests 12 --concurrency 4
   --threshold-ms 3000`. Il job monitora anche gli aggiornamenti di
   documentazione dedicata (`docs/orchestrator-config.md`, guide di stile) e
   della telemetria (`server/metrics/**`).
8. **`deployment-checks`** — ricostruisce i bundle di deploy riusando gli
   artefatti TypeScript e rilancia gli script di verifica `scripts/run_deploy_checks.sh`.

## Dipendenze e lock file

- Il file `package-lock.json` di root deve rimanere sincronizzato con
  `package.json`. Eventuali errori `npm ci` in CI indicano una divergenza: usare
  `npm install` in locale e committare il lock file aggiornato.
- Le dipendenze TypeScript specifiche vivono ancora in `tools/ts/package.json`
  con il relativo lock file; i job che operano in quella cartella sfruttano il
  caching `actions/setup-node` basato su `tools/ts/package-lock.json`.
- La toolchain Python è gestita da `tools/py/requirements.txt` e, per i test
  orchestrator, da `requirements-dev.txt` nella radice del repo.

## Esecuzione locale dei job principali

```bash
# Job: typescript-tests
npm ci --workspace tools/ts --include-workspace-root false
cd tools/ts
npm test
node dist/validate_species.js ../../data/core/species.yaml
node dist/roll_pack.js ENTP invoker ../../data/packs.yaml
cd ../..

# Job: webapp-quality
npm ci
npm run lint
npm run test --workspace webapp
VITE_BASE_PATH=./ npm run build --workspace webapp
VITE_BASE_PATH=./ npm run preview --workspace webapp -- --host 127.0.0.1 --port 4173 --strictPort &
PREVIEW_PID=$!
trap 'kill $PREVIEW_PID' EXIT
npx wait-on http://127.0.0.1:4173
curl --fail http://127.0.0.1:4173 >/tmp/webapp-preview.html
kill $PREVIEW_PID
trap - EXIT

# Job: cli-checks
cd tools/ts
npm ci
npm run build --silent
cd ../py
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 ../py/game_cli.py validate-datasets
python3 ../py/game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json
cd ../..
./scripts/cli_smoke.sh

# Job: python-tests
deactivate 2>/dev/null || true
cd tools/py
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest
python3 validate_species.py ../../data/core/species.yaml
python roll_pack.py ENTP invoker ../../data/packs.yaml
cd ../..

deactivate 2>/dev/null || true

# Job: dataset-checks
python3 scripts/trait_audit.py --check
python3 tools/py/build_trait_baseline.py \
  packs/evo_tactics_pack/docs/catalog/env_traits.json \
  packs/evo_tactics_pack/docs/catalog/trait_reference.json \
  --trait-glossary data/core/traits/glossary.json \
  --out data/derived/analysis/trait_baseline.yaml
python3 tools/py/report_trait_coverage.py \
  --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json \
  --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json \
  --species-root packs/evo_tactics_pack/data/species \
  --trait-glossary data/core/traits/glossary.json \
  --out-json data/derived/analysis/trait_coverage_report.json \
  --out-csv data/derived/analysis/trait_coverage_matrix.csv

# Job: orchestrator-latency
npm ci
python -m pip install --upgrade pip
python -m pip install --requirement requirements-dev.txt
node scripts/loadtest-orchestrator.mjs --requests 12 --concurrency 4 --threshold-ms 3000

# Job: deployment-checks
scripts/run_deploy_checks.sh
```

Annotare gli esiti manuali in `docs/tool_run_report.md` quando si replicano i
job localmente.
