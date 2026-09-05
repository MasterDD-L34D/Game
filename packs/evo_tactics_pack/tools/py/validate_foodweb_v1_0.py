#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

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

from packs.evo_tactics_pack.validators.rules import foodweb as foodweb_rules
from packs.evo_tactics_pack.validators.rules.base import format_messages, has_errors


def _load_yaml(path: Path) -> dict:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}


def run(foodweb_path: str, cfg_path: str) -> int:
    foodweb = _load_yaml(foodweb_path)
    rules = foodweb_rules.build_foodweb_rules(_load_yaml(cfg_path))
    messages = foodweb_rules.validate_foodweb_document(foodweb, rules)
    for line in format_messages(messages):
        print(line)
    return 0 if not has_errors(messages) else 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida un foodweb locale")
    parser.add_argument("foodweb_path")
    parser.add_argument("cfg_path")
    args = parser.parse_args(argv)
    return run(args.foodweb_path, args.cfg_path)


if __name__ == "__main__":
    sys.exit(main())
