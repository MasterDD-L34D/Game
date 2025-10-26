# Pipeline CI completa

Il workflow GitHub Actions mantiene in salute la toolchain TS/Python e i dataset di gioco.

## Workflow `CI`

Il file di configurazione è `.github/workflows/ci.yml` e viene attivato su `push` e `pull_request`.

Passaggi principali del job `build-and-test`:

1. Checkout del repository.
2. Setup di Node.js 20 con cache su `tools/ts/package-lock.json`.
3. Installazione delle dipendenze TypeScript (`npm ci`).
4. Build della CLI TypeScript (`npm run build`).
5. Esecuzione della CLI compilata per generare un pack di esempio (`node dist/roll_pack.js ENTP invoker ../../data/packs.yaml`).
6. Validazione dataset specie lato TypeScript (`npm run validate:species`).
7. Setup di Python 3.11.
8. Installazione delle dipendenze Python da `tools/py/requirements.txt`.
9. Validazione specie lato Python (`python3 validate_species.py ../../data/species.yaml`).
10. Verifica CLI Python (`python roll_pack.py ENTP invoker ../../data/packs.yaml`).
11. Validazione dataset base via CLI (`python3 game_cli.py validate-datasets`).
12. Validazione pack ecosistema Evo-Tactics (`python3 tools/py/game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json`).

## Dipendenze e credenziali

- Le dipendenze Node devono rimanere centralizzate in `tools/ts/package.json`; quelle Python in `tools/py/requirements.txt`.
- Non sono necessarie credenziali o secret: gli script lavorano su file locali.
- Se in futuro serviranno API key (es. per telemetria), registrare i secret GitHub necessari e richiamarli nel workflow tramite `env:`.

## Debug locale

Per replicare i passaggi in locale:

```bash
# TypeScript
cd tools/ts
npm ci
npm run build
node dist/roll_pack.js ENTP invoker ../../data/packs.yaml
npm run validate:species

# Python
cd ../py
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 validate_species.py ../../data/species.yaml
python roll_pack.py ENTP invoker ../../data/packs.yaml
python3 game_cli.py validate-datasets
python3 game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json
```

Annotare gli esiti in `docs/tool_run_report.md` quando i test vengono eseguiti manualmente.
