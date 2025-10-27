# Pipeline CI completa

Il workflow GitHub Actions mantiene in salute la toolchain TS/Python e i dataset di gioco.

## Workflow `CI`

Il file di configurazione è `.github/workflows/ci.yml` e viene attivato su `push` e `pull_request`.

Passaggi principali del job `build-and-test`:

1. Checkout del repository.
2. Setup di Node.js 20 con cache su `tools/ts/package-lock.json`.
3. Installazione delle dipendenze TypeScript (`npm ci`).
4. Esecuzione delle suite TypeScript (build + unit + Playwright) tramite `npm test`.
5. Esecuzione della CLI compilata per generare un pack di esempio (`node dist/roll_pack.js ENTP invoker ../../data/packs.yaml`).
6. Validazione dataset specie lato TypeScript (`node dist/validate_species.js ../../data/species.yaml`).
7. Setup di Python 3.11.
8. Installazione delle dipendenze Python da `tools/py/requirements.txt`.
9. Esecuzione della suite `pytest` dalla radice del progetto.
10. Validazione specie lato Python (`python3 validate_species.py ../../data/species.yaml`).
11. Verifica CLI Python (`python roll_pack.py ENTP invoker ../../data/packs.yaml`).
12. Validazione dataset base via CLI (`python3 game_cli.py validate-datasets`).
13. Validazione pack ecosistema Evo-Tactics (`python3 tools/py/game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json`).
14. Smoke test profili CLI (`./scripts/cli_smoke.sh`).

## Dipendenze e credenziali

- Le dipendenze Node devono rimanere centralizzate in `tools/ts/package.json`; quelle Python in `tools/py/requirements.txt`.
- Il workflow `CI` non richiede credenziali aggiuntive: sfrutta il `GITHUB_TOKEN` fornito automaticamente da GitHub Actions per i checkout e opera unicamente su file locali.
- Se in futuro serviranno API key (es. per telemetria), registrare i secret GitHub necessari e richiamarli nel workflow tramite `env:`.

## Debug locale

Per replicare i passaggi in locale:

```bash
# TypeScript
cd tools/ts
npm ci
npm test
node dist/roll_pack.js ENTP invoker ../../data/packs.yaml
node dist/validate_species.js ../../data/species.yaml

# Python
cd ../py
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
python3 validate_species.py ../../data/species.yaml
python roll_pack.py ENTP invoker ../../data/packs.yaml
python3 game_cli.py validate-datasets
python3 game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json
./scripts/cli_smoke.sh
```

Annotare gli esiti in `docs/tool_run_report.md` quando i test vengono eseguiti manualmente.
