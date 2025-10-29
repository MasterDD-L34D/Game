#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

import yaml

# Ensure the repository root (containing the ``packs`` package) is importable
CURRENT_DIR = Path(__file__).resolve()
for candidate in CURRENT_DIR.parents:
    if (candidate / "packs").is_dir():
        REPO_ROOT = candidate
        break
else:  # Fallback: assume the repository root is the direct parent of ``packs``
    REPO_ROOT = CURRENT_DIR.parents[4]

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from packs.evo_tactics_pack.validators.rules import trophic_roles
from packs.evo_tactics_pack.validators.rules.base import format_messages, has_errors


def _load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _print_messages(messages: Iterable[str]) -> None:
    for line in messages:
        print(line)


def run(species_root: str, registries_dir: str) -> int:
    registry_payload = {
        "trophic_roles": _load_yaml(Path(registries_dir) / "trophic_roles.yaml"),
        "morphotypes": _load_yaml(Path(registries_dir) / "morphotypes.yaml"),
    }
    registry = trophic_roles.load_species_registry(registry_payload)

    has_errors_any = False
    for yaml_path in sorted(Path(species_root).glob("*.yaml")):
        species = _load_yaml(yaml_path)
        messages = trophic_roles.validate_species_document(species, registry)
        if has_errors(messages):
            has_errors_any = True
        _print_messages(format_messages(messages))

    return 0 if not has_errors_any else 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida i file specie v1.7")
    parser.add_argument("--species-root", required=True)
    parser.add_argument("--registries", required=True)
    args = parser.parse_args(argv)
    return run(args.species_root, args.registries)


if __name__ == "__main__":
    sys.exit(main())
