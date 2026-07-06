"""Characterization tests for tools/py/validate_json_schemas.py (schema validity gate).

Behavior-only snapshot: cwd-relative discovery (root order schemas/ then
config/schemas/, per-root sorted rglob, the .yml-is-excluded pin), Draft 2020-12
schema checking, YAML syntax checking, and the main() error-report format and
exit codes. A deliberate change to these behaviors SHOULD update these assertions
consciously -- that is the point of a characterization test.
"""

import json
import sys
from pathlib import Path

import pytest
import yaml
from jsonschema.exceptions import SchemaError

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

import validate_json_schemas as v  # noqa: E402


def _write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_iter_json_schema_files_empty_when_roots_missing(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert list(v.iter_json_schema_files()) == []


def test_iter_json_schema_files_root_order_then_sorted(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _write(tmp_path / "schemas" / "b.json", "{}")
    _write(tmp_path / "schemas" / "a.json", "{}")
    _write(tmp_path / "config" / "schemas" / "c.json", "{}")
    assert list(v.iter_json_schema_files()) == [
        Path("schemas/a.json"),
        Path("schemas/b.json"),
        Path("config/schemas/c.json"),
    ]


def test_iter_json_schema_files_ignores_non_json(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _write(tmp_path / "schemas" / "x.yaml", "a: 1\n")
    assert list(v.iter_json_schema_files()) == []


def test_iter_yaml_files_empty_without_schemas_dir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert list(v.iter_yaml_files()) == []


def test_iter_yaml_files_sorted_and_yml_excluded(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _write(tmp_path / "schemas" / "y.yaml", "a: 1\n")
    _write(tmp_path / "schemas" / "x.yaml", "a: 1\n")
    _write(tmp_path / "schemas" / "z.yml", "a: 1\n")
    assert list(v.iter_yaml_files()) == [Path("schemas/x.yaml"), Path("schemas/y.yaml")]


def test_validate_json_schema_accepts_valid(tmp_path):
    p = tmp_path / "ok.json"
    p.write_text(json.dumps({"type": "object"}), encoding="utf-8")
    v.validate_json_schema(p)


def test_validate_json_schema_rejects_invalid(tmp_path):
    p = tmp_path / "bad.json"
    p.write_text(json.dumps({"type": 123}), encoding="utf-8")
    with pytest.raises(SchemaError):
        v.validate_json_schema(p)


def test_validate_yaml_file_accepts_valid(tmp_path):
    p = tmp_path / "ok.yaml"
    p.write_text("a: 1\n", encoding="utf-8")
    v.validate_yaml_file(p)


def test_validate_yaml_file_rejects_broken(tmp_path):
    p = tmp_path / "bad.yaml"
    p.write_text("a: [", encoding="utf-8")
    with pytest.raises(yaml.YAMLError):
        v.validate_yaml_file(p)


def test_main_empty_tree_reports_zero_and_passes(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    rc = v.main()
    out = capsys.readouterr().out
    assert rc == 0
    assert "Validated 0 JSON schema files and 0 YAML files without errors." in out


def test_main_reports_errors_and_fails(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    _write(tmp_path / "schemas" / "bad.json", json.dumps({"type": 123}))
    _write(tmp_path / "schemas" / "bad.yaml", "a: [")
    rc = v.main()
    out = capsys.readouterr().out
    assert rc == 1
    assert "JSON schema errors detected:" in out
    assert "YAML syntax errors detected:" in out


def test_main_counts_validated_files(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    _write(tmp_path / "schemas" / "ok.json", json.dumps({"type": "object"}))
    _write(tmp_path / "config" / "schemas" / "ok2.json", json.dumps({"type": "object"}))
    _write(tmp_path / "schemas" / "ok.yaml", "a: 1\n")
    rc = v.main()
    out = capsys.readouterr().out
    assert rc == 0
    assert "Validated 2 JSON schema files and 1 YAML files without errors." in out
