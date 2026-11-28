from __future__ import annotations

import json
from pathlib import Path


ALIASES_PATH = Path("data/core/species/aliases.json")


def test_aliases_file_exists() -> None:
    assert ALIASES_PATH.exists(), "The merged species aliases file is missing."


def test_alias_entries_are_unique() -> None:
    payload = json.loads(ALIASES_PATH.read_text(encoding="utf-8"))
    aliases = payload.get("aliases", [])
    seen = set()
    for entry in aliases:
        pair = (entry["from"], entry["to"])
        assert pair not in seen, f"Duplicate alias mapping detected: {pair}"
        seen.add(pair)
        assert entry["from"] != entry["to"], "Alias source and target must differ."
