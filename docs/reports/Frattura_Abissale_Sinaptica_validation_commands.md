# Frattura Abissale Sinaptica – Comandi di verifica consigliati

## CLI raccomandate (non eseguite)

- **Lint/stack di base**
  - `npm run lint:stack`
  - `npm run schema:lint`
- **Schema dei biomi e alias**
  - `python -m jsonschema -i data/core/biomes.yaml config/schemas/biome.schema.yaml`
  - `python -m jsonschema -i data/core/biome_aliases.yaml config/schemas/biome.schema.yaml`
  - `python -m jsonschema -i biomes/terraforming_bands.yaml config/schemas/biome.schema.yaml`
- **Schema dei trait e pool**
  - `python -m jsonschema -i data/traits/index.json config/schemas/trait.schema.json`
  - `python -m jsonschema -i data/core/traits/biome_pools.json config/schemas/trait.schema.json`
- **Schema/specie e affinità**
  - `python -m jsonschema -i data/core/species.yaml config/schemas/species.schema.yaml`
  - `python scripts/qa/frattura_abissale_validations.py`
- **Trait style & coerenza**
  - `npm run style:check`
  - `python tools/traits/evaluate_internal.py --dry-run --gap-report reports/evo/rollout/traits_gap.csv --glossary data/core/traits/glossary.json --output /tmp/frattura_abissale_traits_eval`
  - `python tools/traits/sync_missing_index.py --dry-run --source reports/evo/rollout/traits_gap.csv --dest data/core/traits/glossary.json --trait-dir data/traits --no-update-glossary`
- **Pipeline QA dedicata**
  - `bash scripts/qa/run_frattura_abissale_pipeline.sh`

## Copertura file attesa

- **Biomi**: `data/core/biomes.yaml`, `data/core/biome_aliases.yaml`, `biomes/terraforming_bands.yaml`
- **Pool/trait**: `data/core/traits/biome_pools.json`, `data/traits/index.json`, `data/core/traits/glossary.json`
- **Specie/affinity**: `data/core/species.yaml`, `data/traits/species_affinity.json`
- **Sistema/bilanciamento**: `data/core/game_functions.yaml` (consistenza slot/cooldown citata nei piani QA)

## Script aggiuntivi suggeriti

- `tools/traits/check_frattura_abissale.py` (nuovo): wrapper leggero che richiami
  `frattura_abissale_validations.py` e aggiunga check di slug duplicati contro
  dizionario trait globale, pensato per essere lanciato in CI veloce.
- Estendere `scripts/qa/run_frattura_abissale_pipeline.sh` con una flag `--skip-style`
  per separare debt di formattazione da errori bloccanti.

## Punti deboli e casi limite

- `npm run lint:stack` può essere lento; conviene lanciare prima i check JSONSchema
  mirati per feedback rapido.
- I file YAML di bioma e alias non devono contenere chiavi duplicate: usare `python -m jsonschema`
  con attenzione perché errori di indentazione bloccano il check.
- `npm run style:check` potrebbe fallire per debito storico sui trait esistenti;
  prevedere una modalità `--changed` o limitare al sottoinsieme Frattura Abissale.
