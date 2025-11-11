#!/usr/bin/env python3
"""Lint Evo JSON schema files for structural issues."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from jsonschema import (
    RefResolver,
    SchemaError,
    exceptions as jsonschema_exceptions,
    validator_for,
)

try:
    RefResolutionError = jsonschema_exceptions.RefResolutionError
except AttributeError:  # pragma: no cover - legacy compatibility
    class RefResolutionError(Exception):
        """Fallback error when jsonschema does not expose RefResolutionError."""

from tools.automation import configure_logging, get_logger


LOGGER = get_logger(__name__)


def discover_schema_files(root: Path) -> Iterable[Path]:
    if root.is_file():
        yield root
        return
    for path in sorted(root.rglob("*.json")):
        yield path


def load_schema(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_store(paths: Iterable[Path]) -> Dict[str, dict]:
    store: Dict[str, dict] = {}
    for path in paths:
        store[path.resolve().as_uri()] = load_schema(path)
    return store


def lint(paths: List[Path]) -> int:
    store = build_store(paths)
    failures = 0
    for path in paths:
        schema = store[path.resolve().as_uri()]
        validator_cls = validator_for(schema)
        resolver = RefResolver.from_schema(schema, store=store)
        try:
            validator_cls.check_schema(schema)
            # Instantiate the validator once to ensure references can be resolved.
            validator_cls(schema, resolver=resolver)
            LOGGER.info("✅ %s", path)
        except (SchemaError, RefResolutionError, json.JSONDecodeError) as exc:
            failures += 1
            LOGGER.error("❌ %s -> %s", path, exc)
    return failures


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "path",
        type=Path,
        nargs="?",
        default=Path("schemas/evo"),
        help="File or directory containing schema JSON documents",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging output.",
    )
    parser.add_argument(
        "--pattern",
        nargs="*",
        help="Optional explicit list of schema files to lint.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    configure_logging(verbose=args.verbose, logger=LOGGER)

    if args.pattern:
        schema_paths = [Path(pattern) for pattern in args.pattern]
    else:
        schema_paths = list(discover_schema_files(args.path))
    LOGGER.debug("Discovered %s schema files", len(schema_paths))
    if not schema_paths:
        LOGGER.error("No schema files found under %s.", args.path)
        return 1
    failures = lint(schema_paths)
    if failures:
        return 1
    LOGGER.info("All schemas passed structural validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
