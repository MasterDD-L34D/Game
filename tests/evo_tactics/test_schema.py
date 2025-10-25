import json, pathlib
from jsonschema import validate

SCHEMA = json.loads(pathlib.Path('docs/evo-tactics/schemas/param_synergy.schema.json').read_text(encoding='utf-8'))
SAMPLE = json.loads(pathlib.Path('data/evo-tactics/param-synergy/_samples/sample_params.json').read_text(encoding='utf-8'))

def test_sample_matches_schema():
    validate(SAMPLE, SCHEMA)
