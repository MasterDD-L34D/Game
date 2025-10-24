# Tool Execution Report

## 2025-10-24 — Tooling & Dataset Check
- Ambiente container Ubuntu; Node.js 22.19.0 / npm 11.4.2; Python 3.11.12 / pip 25.2. Dipendenze reinstallate con `npm ci` (`tools/ts`) e `pip install -r tools/py/requirements.txt`.
- `npm run build` ha rigenerato `tools/ts/dist/` senza errori.
- `python tools/py/validate_datasets.py` ha confermato che tutti i dataset YAML sono validi.
- `node tools/ts/dist/roll_pack.js ENTP invoker data/packs.yaml --seed demo` e `python tools/py/roll_pack.py ENTP invoker data/packs.yaml --seed demo` restituiscono JSON identici (seed deterministico, pack `A`).
- Server locale `python -m http.server 8000` risponde su `/docs/test-interface/` (verificato via `curl`); l'esecuzione dei test interattivi web resta bloccata per assenza di browser nell'ambiente headless.

## TypeScript `roll_pack`
- Built the TypeScript project via `npm run build` inside `tools/ts`.
- Executed `node dist/roll_pack.js` with the following parameter combinations against `data/packs.yaml`:
  1. `ENTP` / `invoker`
  2. `ISFP` / `warden`
  3. `ISTJ` / `harvester`
- Each run returned a valid pack selection JSON payload without runtime errors. All combinations respected the expected structure (`d20`, `pack`, and `combo`).

## Python `roll_pack.py`
- Installed the `PyYAML` dependency locally to satisfy the script import.
- Ran the script with multiple form/job combinations:
  1. `ENTP` / `invoker`
  2. `ISFP` / `warden`
  3. `INFJ` / `skirmisher`
- The outputs matched the TypeScript tool in structure and produced no assertion errors, indicating the pack cost validations succeeded.

## Python `generate_encounter.py`
- Generated encounters for the available biomes defined in `data/biomes.yaml`:
  1. `savana`
  2. `caverna`
  3. `palude`
- Each execution produced a threat-budget summary with grouped roles and affix lists; no anomalies were observed.

No issues or irregularities were detected during these runs.
