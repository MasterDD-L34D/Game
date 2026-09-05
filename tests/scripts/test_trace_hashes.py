import importlib.util
import json
from pathlib import Path
from typing import Iterable, Iterator, Tuple

import pytest
import yaml


_MODULE_PATH = Path(__file__).resolve().parents[2] / "tools" / "py" / "update_trace_hashes.py"
_SPEC = importlib.util.spec_from_file_location("update_trace_hashes", _MODULE_PATH)
assert _SPEC and _SPEC.loader
_MODULE = importlib.util.module_from_spec(_SPEC)
import sys

sys.modules[_SPEC.name] = _MODULE
_SPEC.loader.exec_module(_MODULE)

JSON_DIRECTORIES = _MODULE.JSON_DIRECTORIES
JSON_AGGREGATES = _MODULE.JSON_AGGREGATES
_fallback_yaml_root = getattr(_MODULE, "YAML_ROOT", None)
if _fallback_yaml_root is not None:
    _default_yaml_roots = (_fallback_yaml_root,)
else:
    _default_yaml_roots = ()

YAML_ROOTS = tuple(getattr(_MODULE, "YAML_ROOTS", _default_yaml_roots))


def _iter_manifest_files() -> Iterator[Path]:
    for directory in JSON_DIRECTORIES:
        if directory.exists():
            yield from sorted(directory.glob("*.json"))
    for aggregate in JSON_AGGREGATES:
        if aggregate.exists():
            yield aggregate
    for root in YAML_ROOTS:
        if root.exists():
            yield from sorted(root.rglob("*.yaml"))
            yield from sorted(root.rglob("*.yml"))


def _iter_trace_hashes(payload) -> Iterable[Tuple[Tuple[str, ...], str]]:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key == "trace_hash":
                yield (key,), value
            else:
                for sub_path, sub_value in _iter_trace_hashes(value):
                    yield (key,) + sub_path, sub_value
    elif isinstance(payload, list):
        for index, item in enumerate(payload):
            for sub_path, sub_value in _iter_trace_hashes(item):
                yield (str(index),) + sub_path, sub_value


def _load_manifest(path: Path):
    if path.suffix.lower() == ".json":
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    if path.suffix.lower() in {".yaml", ".yml"}:
        with path.open(encoding="utf-8") as handle:
            return yaml.safe_load(handle)
    raise ValueError(f"Formato non supportato: {path}")


@pytest.mark.parametrize("path", list(_iter_manifest_files()))
def test_trace_hashes_filled(path: Path) -> None:
    payload = _load_manifest(path)
    if payload is None:
        pytest.skip(f"Manifest vuoto: {path}")

    offenders = []
    for key_path, value in _iter_trace_hashes(payload):
        if value == "to-fill":
            offenders.append("/".join(key_path))

    assert not offenders, f"trace_hash non valorizzati in {path}: {offenders}"
