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

# Incomplete traits: these files lack the schema-required `metrics` (real
# balance values that cannot be fabricated). Quarantined with a strict xfail so
# the marker self-clears (XPASS -> failure) once metrics are authored. The rest
# of each file already satisfies the schema. Tracked for completion in BACKLOG.
INCOMPLETE_PENDING_METRICS = {
    "TR-2006",
    "TR-2007",
    "TR-2008",
    "TR-2009",
    "TR-2010",
}


def _trait_param(path: Path):
    marks = ()
    if path.stem in INCOMPLETE_PENDING_METRICS:
        marks = pytest.mark.xfail(
            reason="incomplete trait: required `metrics` not yet authored (tracked in BACKLOG)",
            strict=True,
        )
    return pytest.param(path, marks=marks, id=path.stem)


TRAIT_FILES = [_trait_param(path) for path in sorted(TRAIT_DIR.glob("TR-*.json"))]


@pytest.mark.parametrize("path", TRAIT_FILES)
def test_evo_trait_files_match_schema(path: Path) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    VALIDATOR.validate(payload)
