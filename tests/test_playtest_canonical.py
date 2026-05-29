"""Unit tests for tools/py/playtest_canonical.py -- canonical suite orchestrator.

Backend-free. Covers the pure manifest/plan helpers + the --dry-run CLI path
(TKT-PLAYTEST-SUITE). The live run (calibrate_parallel subprocess) is smoke-
tested separately with a backend up (anti-pattern #9: dry-run != live smoke).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "py"))

import playtest_canonical as pc  # noqa: E402

MANIFEST = ROOT / "docs" / "playtest" / "canonical-suite.yaml"


def test_load_manifest_real_file():
    m = pc.load_manifest(str(MANIFEST))
    assert m["version"] == 1
    assert isinstance(m["scenarios"], list) and len(m["scenarios"]) >= 2


def test_oracle_scenarios_excludes_tutorial_ladder():
    m = pc.load_manifest(str(MANIFEST))
    oracles = pc.oracle_scenarios(m)
    ids = {s["id"] for s in oracles}
    assert "enc_tutorial_06_hardcore" in ids
    assert "enc_tutorial_07_hardcore_pod_rush" in ids
    # the designed-winnable tutorial ladder is NOT a balance oracle
    assert "enc_tutorial_01_05" not in ids


def test_resolve_parallel_key():
    assert pc.resolve_parallel_key("enc_tutorial_06_hardcore") == "hardcore_06"
    assert pc.resolve_parallel_key("enc_tutorial_07_hardcore_pod_rush") == "hardcore_07"
    assert pc.resolve_parallel_key("nope") is None


def test_wr_from_runs():
    runs = [{"outcome": "victory"}, {"outcome": "defeat"}, {"outcome": "timeout"}, {"outcome": "victory"}]
    assert pc.wr_from_runs(runs) == pytest.approx(0.5)
    assert pc.wr_from_runs([]) is None
    # non-dict / missing outcome are ignored
    assert pc.wr_from_runs([{"outcome": "victory"}, {"error": "x"}]) == pytest.approx(1.0)


def test_in_band():
    assert pc.in_band(0.20, [0.15, 0.25]) is True
    assert pc.in_band(0.15, [0.15, 0.25]) is True
    assert pc.in_band(0.30, [0.15, 0.25]) is False
    assert pc.in_band(None, [0.15, 0.25]) is False


def test_build_plan_has_oracle_scenarios_with_keys():
    m = pc.load_manifest(str(MANIFEST))
    plan = pc.build_plan(m, n=40, shards=4, base_port=3341)
    assert plan["n"] == 40
    assert plan["shards"] == 4
    keys = {s["parallel_key"] for s in plan["scenarios"]}
    assert keys == {"hardcore_06", "hardcore_07"}
    # repro contract surfaced in the plan
    assert plan["repro"]["host"].startswith("http://127.0.0.1")
    assert plan["repro"]["lobby_ws_enabled"] is False


def test_build_plan_scenario_filter():
    m = pc.load_manifest(str(MANIFEST))
    plan = pc.build_plan(m, n=10, shards=2, base_port=3341, only="hardcore_06")
    assert [s["parallel_key"] for s in plan["scenarios"]] == ["hardcore_06"]


def test_dry_run_cli_no_backend(tmp_path):
    """--dry-run parses the manifest + prints the plan and exits 0 without any
    backend (this is the backend-free smoke gate)."""
    env = dict(os.environ)
    proc = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "py" / "playtest_canonical.py"),
         "--dry-run", "--n", "40", "--manifest", str(MANIFEST)],
        capture_output=True, text=True, env=env, cwd=str(ROOT), timeout=60,
    )
    assert proc.returncode == 0, proc.stderr
    out = proc.stdout
    assert "DRY-RUN" in out
    assert "hardcore_06" in out and "hardcore_07" in out
    assert "127.0.0.1" in out
