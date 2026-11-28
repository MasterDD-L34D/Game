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

from packs.evo_tactics_pack.validators.rules import hazards
from packs.evo_tactics_pack.validators.rules.base import format_messages, has_errors


def _load_yaml(path: Path) -> dict:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}


def _print_messages(messages: Iterable[str]) -> None:
    for line in messages:
        print(line)


def run(eco_path: str, cfg_path: str, reg_dir: str) -> int:
    biome = _load_yaml(eco_path)
    hazard_registry = hazards.build_hazard_registry(_load_yaml(Path(reg_dir) / "hazards.yaml"))
    hazard_rules = hazards.build_biome_hazard_rules(_load_yaml(cfg_path))

    messages = hazards.validate_biome_document(
        biome,
        hazard_registry=hazard_registry,
        hazard_rules=hazard_rules,
    )
    _print_messages(format_messages(messages))
    return 0 if not has_errors(messages) else 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida un bioma v1.1")
    parser.add_argument("eco_path")
    parser.add_argument("cfg_path")
    parser.add_argument("registries_dir")
    args = parser.parse_args(argv)
    return run(args.eco_path, args.cfg_path, args.registries_dir)


if __name__ == "__main__":
    sys.exit(main())
