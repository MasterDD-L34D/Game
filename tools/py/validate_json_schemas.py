from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Iterable

import yaml
from jsonschema import Draft202012Validator


JSON_ROOTS: tuple[Path, ...] = (Path("schemas"), Path("config/schemas"))


def iter_json_schema_files() -> Iterable[Path]:
    for root in JSON_ROOTS:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.json")):
            if path.is_file():
                yield path


def iter_yaml_files() -> Iterable[Path]:
    yaml_root = Path("schemas")
    if not yaml_root.exists():
        return
    yield from sorted(path for path in yaml_root.rglob("*.yaml") if path.is_file())


def validate_json_schema(path: Path) -> None:
    with path.open("r", encoding="utf-8") as handle:
        schema = json.load(handle)
    Draft202012Validator.check_schema(schema)


def validate_yaml_file(path: Path) -> None:
    yaml.safe_load(path.read_text(encoding="utf-8"))


def main() -> int:
    json_files = list(iter_json_schema_files())
    json_errors: list[str] = []
    for schema_path in json_files:
        try:
            validate_json_schema(schema_path)
        except Exception as exc:  # noqa: BLE001
            json_errors.append(f"{schema_path}: {exc}")

    yaml_files = list(iter_yaml_files())
    yaml_errors: list[str] = []
    for yaml_path in yaml_files:
        try:
            validate_yaml_file(yaml_path)
        except Exception as exc:  # noqa: BLE001
            yaml_errors.append(f"{yaml_path}: {exc}")

    if json_errors or yaml_errors:
        if json_errors:
            print("JSON schema errors detected:")
            print("\n".join(json_errors))
        if yaml_errors:
            print("YAML syntax errors detected:")
            print("\n".join(yaml_errors))
        return 1

    json_count = len(json_files)
    yaml_count = len(yaml_files)
    print(f"Validated {json_count} JSON schema files and {yaml_count} YAML files without errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
