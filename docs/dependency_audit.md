# Verifica dipendenze — Ottobre 2025

## Sintesi Python
- `tools/py/requirements.txt` ora elenca le librerie richieste per eseguire gli script CLI e la sincronizzazione: `PyYAML`, `requests`, il client ufficiale `openai` (necessario per `scripts/chatgpt_sync.py`) e `pytest` per la suite di test.
- Lo script `scripts/chatgpt_sync.py` utilizza il client `openai` quando si lavora in modalità API e richiede anche `requests` per il download HTTP; entrambi vengono installati tramite lo stesso file di requirements.
- L'installazione `pip install -r tools/py/requirements.txt` completa senza errori nel container e rende disponibili le librerie richieste.
- La suite `pytest` eseguita con `PYTHONPATH=tools/py pytest` conferma che le utility deterministiche funzionano e che l'ambiente contiene tutte le dipendenze dichiarate.

### Motivazioni per le dipendenze Python
- `PyYAML>=6.0` — parsing degli asset in `data/` e caricamento dei file YAML nei comandi di `tools/py/game_cli.py`.
- `requests>=2.32.0` — download di snapshot e contenuti remoti in `scripts/chatgpt_sync.py::fetch_from_web`.
- `openai>=1.0.0` — invocazione dell'API ChatGPT tramite `scripts/chatgpt_sync.py::fetch_from_api`, con compatibilità per le versioni legacy.
- `pytest>=8.0.0` — esecuzione della suite deterministica in `tests/py` con il comando documentato `PYTHONPATH=tools/py pytest`.

## Sintesi TypeScript
- La CLI TypeScript si affida solo a `js-yaml` come dipendenza runtime e a `@types/js-yaml`, `@types/node`, `typescript` come dev dependency, già dichiarate in `tools/ts/package.json`.
- `npm test` (che compila prima del run) passa con successo, a conferma che le dipendenze Node installate sono complete.

## Stato generale
- Nessuna dipendenza mancante è stata rilevata dopo l'aggiornamento; `openai` è stata aggiunta per coprire l'integrazione API.
- Si consiglia di usare sempre `pip install -r tools/py/requirements.txt` e `npm install`/`npm test` per replicare l'ambiente verificato.
