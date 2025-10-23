# Tool Execution Report

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
