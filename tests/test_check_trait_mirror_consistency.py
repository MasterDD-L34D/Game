"""Tests for tools/py/check_trait_mirror_consistency.py -- F6 hardening.

Finding F6 (docs/reports/2026-06-10-electric-channel-n40-evidence.md, PR #2715):
a duplicate trait key in active_effects.yaml breaks js-yaml load at runtime ->
loadActiveTraitRegistry returns {} -> entire trait engine silently no-op.
The mirror validator used a regex key SET, so duplicates were invisible.

Covers:
- duplicate-key detection on both YAML files (exit 1)
- parse canary (yaml.safe_load) on YAML-breaking edits (exit 1)
- skip_keys excluded from duplicate counting
- real repo files stay green (regression guard)
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = PROJECT_ROOT / "tools" / "py" / "check_trait_mirror_consistency.py"

CLEAN_MECH = """schema_version: "0.1"
traits:
  alpha_trait:
    attack_mod: 1
  beta_trait:
    defense_mod: 1
"""

CLEAN_ACTIVE = """version: 1
traits:
  alpha_trait:
    tier: T1
  beta_trait:
    tier: T1
"""


def run_checker(*args: str) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, str(SCRIPT), *args]
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def run_on(tmp_path: Path, mech: str, active: str, *extra: str):
    mech_path = tmp_path / "trait_mechanics.yaml"
    active_path = tmp_path / "active_effects.yaml"
    mech_path.write_text(mech, encoding="utf-8")
    active_path.write_text(active, encoding="utf-8")
    return run_checker(
        "--trait-mechanics", str(mech_path),
        "--active-effects", str(active_path),
        "--json", *extra,
    )


def test_real_repo_files_pass() -> None:
    result = run_checker("--json")
    assert result.returncode == 0, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["status"] == "PASS"
    assert report["duplicate_keys"] == {"trait_mechanics": {}, "active_effects": {}}
    assert report["parse_canary"]["active_effects"] in ("ok", "skipped")
    assert report["parse_canary"]["trait_mechanics"] in ("ok", "skipped")


def test_clean_tmp_files_pass(tmp_path: Path) -> None:
    result = run_on(tmp_path, CLEAN_MECH, CLEAN_ACTIVE)
    assert result.returncode == 0, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["status"] == "PASS"


def test_duplicate_key_in_active_effects_fails(tmp_path: Path) -> None:
    # F6 reproduction: same trait key twice (stub orphan + new entry).
    dup_active = CLEAN_ACTIVE + """  alpha_trait:
    tier: T2
"""
    result = run_on(tmp_path, CLEAN_MECH, dup_active)
    assert result.returncode == 1, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["status"] == "FAIL"
    assert report["duplicate_keys"]["active_effects"] == {"alpha_trait": 2}
    assert report["duplicate_keys"]["trait_mechanics"] == {}


def test_duplicate_key_in_trait_mechanics_fails(tmp_path: Path) -> None:
    dup_mech = CLEAN_MECH + """  beta_trait:
    defense_mod: 2
"""
    result = run_on(tmp_path, dup_mech, CLEAN_ACTIVE)
    assert result.returncode == 1, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["status"] == "FAIL"
    assert report["duplicate_keys"]["trait_mechanics"] == {"beta_trait": 2}


def test_skip_keys_not_counted_as_duplicates(tmp_path: Path) -> None:
    # Role-category keys (_defaults block) may repeat at column-2 indent;
    # they are skip_keys, never trait ids -> no duplicate flag.
    mech = """schema_version: "0.1"
_defaults:
  offensive:
    attack_mod: 1
  offensive:
    attack_mod: 2
traits:
  alpha_trait:
    attack_mod: 1
  beta_trait:
    defense_mod: 1
"""
    result = run_on(tmp_path, mech, CLEAN_ACTIVE)
    assert result.returncode == 0, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["duplicate_keys"]["trait_mechanics"] == {}


def test_parse_canary_catches_broken_yaml(tmp_path: Path) -> None:
    # Unclosed flow sequence: regex key-set extraction is unaffected
    # (mirror still consistent) but yaml.safe_load explodes -> canary FAIL.
    broken_active = CLEAN_ACTIVE + """  gamma_extra: [1, 2
"""
    result = run_on(tmp_path, CLEAN_MECH, broken_active)
    assert result.returncode == 1, result.stdout + result.stderr
    report = json.loads(result.stdout)
    assert report["status"] == "FAIL"
    assert report["parse_canary"]["active_effects"].startswith("fail")
    assert report["parse_canary"]["trait_mechanics"] == "ok"


def _load_module():
    import importlib.util

    spec = importlib.util.spec_from_file_location("ctmc", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_node_canary_skips_when_js_yaml_missing(monkeypatch, tmp_path: Path) -> None:
    # CI docs-governance job: no pip install, no npm ci -> node exists but
    # js-yaml unresolvable. Must report 'skipped', NOT a false 'fail'.
    mod = _load_module()
    yaml_file = tmp_path / "x.yaml"
    yaml_file.write_text("a: 1\n", encoding="utf-8")

    def fake_run(*args, **kwargs):
        return subprocess.CompletedProcess(
            args=args, returncode=1, stdout="",
            stderr="Error: Cannot find module 'js-yaml'\n",
        )

    monkeypatch.setattr(mod.subprocess, "run", fake_run)
    assert mod._node_js_yaml_canary(yaml_file) == "skipped"


def test_node_canary_skips_when_node_missing(monkeypatch, tmp_path: Path) -> None:
    mod = _load_module()
    yaml_file = tmp_path / "x.yaml"
    yaml_file.write_text("a: 1\n", encoding="utf-8")

    def fake_run(*args, **kwargs):
        raise FileNotFoundError("node not found")

    monkeypatch.setattr(mod.subprocess, "run", fake_run)
    assert mod._node_js_yaml_canary(yaml_file) == "skipped"


def test_human_output_reports_duplicates(tmp_path: Path) -> None:
    dup_active = CLEAN_ACTIVE + """  alpha_trait:
    tier: T2
"""
    mech_path = tmp_path / "trait_mechanics.yaml"
    active_path = tmp_path / "active_effects.yaml"
    mech_path.write_text(CLEAN_MECH, encoding="utf-8")
    active_path.write_text(dup_active, encoding="utf-8")
    result = run_checker(
        "--trait-mechanics", str(mech_path),
        "--active-effects", str(active_path),
    )
    assert result.returncode == 1
    assert "DUPLICATE" in result.stdout
    assert "alpha_trait" in result.stdout
