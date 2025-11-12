from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator, RefResolver

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "schemas" / "evo" / "trait.schema.json"
TRAIT_DIR = Path(__file__).resolve().parents[2] / "data" / "external" / "evo" / "traits"

with SCHEMA_PATH.open("r", encoding="utf-8") as handle:
    TRAIT_SCHEMA = json.load(handle)

enums_path = SCHEMA_PATH.parent / "enums.json"
with enums_path.open("r", encoding="utf-8") as handle:
    enums_schema = json.load(handle)

resolver = RefResolver.from_schema(
    TRAIT_SCHEMA,
    store={
        "https://game.example.com/schemas/evo/enums.json": enums_schema,
        "enums.json": enums_schema,
    },
)

VALIDATOR = Draft202012Validator(TRAIT_SCHEMA, resolver=resolver)

TRAIT_FILES = sorted(path for path in TRAIT_DIR.glob("TR-*.json"))


@pytest.mark.parametrize("path", TRAIT_FILES, ids=lambda path: path.stem)
def test_evo_trait_files_match_schema(path: Path) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    VALIDATOR.validate(payload)
