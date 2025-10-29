# Pipeline CI completa

Il workflow GitHub Actions mantiene in salute la toolchain TS/Python e i dataset di gioco. Per evitare esecuzioni superflue, la pipeline principale è stata suddivisa in più job specializzati che si attivano solo quando i file interessati vengono toccati nella PR.

## Workflow `CI`

Il file di configurazione è `.github/workflows/ci.yml` e viene attivato su `push` e `pull_request`.

### Sequenza dei job

1. **`paths-filter`** – usa `dorny/paths-filter@v3` per popolare le variabili booleane `ts`, `cli`, `python`, `data`, `deploy` in base ai percorsi modificati. Esempi:
   - `ts`: `tools/ts/**`, `package.json`, `webapp/src/**`, ecc.
   - `cli`: `scripts/cli_smoke.sh`, `tools/py/game_cli.py`, `tools/py/game_cli/**`.
   - `python`: `tools/py/**`, `scripts/**/*.py`, `server/**`, `services/**`, `tests/**/*.py`.
   - `data`: `data/**`, `packs/**`, `reports/**`.
   - `deploy`: `scripts/trait_audit.py`, `scripts/run_deploy_checks.sh`, `tools/py/report_trait_coverage.py`, `config/deploy/**`.

2. **`typescript-tests`** – esegue il setup Node.js 20, installa le dipendenze (`npm ci` in `tools/ts`), lancia `npm test` e `node dist/validate_species.js`. Viene eseguito solo se `ts == 'true'`.

3. **`cli-checks`** – builda gli artefatti TypeScript (`npm run build --silent`) e verifica i comandi CLI:
   - `node dist/roll_pack.js …`
   - `python3 tools/py/game_cli.py validate-datasets`
   - `./scripts/cli_smoke.sh`
   Si attiva quando `cli == 'true'` o `data == 'true'` per intercettare variazioni sia alla shell che ai dataset.

4. **`python-tests`** – predispone Python 3.11, installa i requisiti e lancia `pytest`, `validate_species.py` e `roll_pack.py`. Parte quando `python == 'true'` oppure `data == 'true'`.

5. **`dataset-checks`** – controlla la coerenza dei trait (`scripts/trait_audit.py`) e la copertura minima (`tools/py/report_trait_coverage.py`). Si attiva se `data == 'true'` o `deploy == 'true'`.

6. **`deployment-checks`** – esegue `scripts/run_deploy_checks.sh` in modalità CI per verificare che il pacchetto statico sia generabile. Parte solo quando `deploy == 'true'`.

Nei casi in cui nessun filtro si attiva (es. PR di sola documentazione), i job specialistici vengono saltati mantenendo il workflow in stato `success`.

### `scripts/run_deploy_checks.sh`

Lo script non re-esegue più i test: si limita a verificare che `tools/ts/dist` sia presente, copia la dashboard (`docs/test-interface`) e il dataset selezionato in una cartella temporanea e, se non viene richiesto diversamente, avvia un breve smoke test HTTP per assicurarsi che il pacchetto statico risponda. I dettagli vengono salvati in `logs/web_status.md` per consultazioni successive.

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
node dist/validate_species.js ../../data/core/species.yaml

# Python
cd ../py
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
python3 validate_species.py ../../data/core/species.yaml
python roll_pack.py ENTP invoker ../../data/packs.yaml
python3 game_cli.py validate-datasets
python3 game_cli.py validate-ecosystem-pack --json-out /tmp/evo_pack_report.json
./scripts/cli_smoke.sh

# Bundle statico (dopo che i passaggi precedenti hanno già generato `tools/ts/dist`)
cd ..
scripts/run_deploy_checks.sh
```

Annotare gli esiti in `docs/tool_run_report.md` quando i test vengono eseguiti manualmente.
