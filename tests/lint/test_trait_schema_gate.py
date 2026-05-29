"""Test suite for tools/lint/trait_schema_gate.py -- ADR-2026-05-29."""
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GATE_SCRIPT = REPO_ROOT / "tools/lint/trait_schema_gate.py"


def _run_gate(args):
    return subprocess.run(
        [sys.executable, str(GATE_SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )


def test_gate_script_exists():
    assert GATE_SCRIPT.exists(), f"gate script missing: {GATE_SCRIPT}"


def test_gate_blocks_missing_schema_version(tmp_path):
    p = tmp_path / "bad.json"
    p.write_text(json.dumps({"traits": {"x": {}}}))
    r = _run_gate(["--check", str(p)])
    assert r.returncode == 1
    assert "schema_version" in (r.stderr + r.stdout)


def test_gate_blocks_wrong_schema_version(tmp_path):
    p = tmp_path / "wrong.json"
    p.write_text(json.dumps({"schema_version": "1.0", "traits": {}}))
    r = _run_gate(["--check", str(p)])
    assert r.returncode == 1
    assert "2.0" in (r.stderr + r.stdout)


def test_gate_accepts_valid_v2_payload(tmp_path):
    p = tmp_path / "ok.json"
    p.write_text(json.dumps({"schema_version": "2.0", "traits": {}}))
    r = _run_gate(["--check", str(p)])
    assert r.returncode == 0, f"unexpected fail: {r.stderr}"


def test_gate_accepts_ancestor_without_design_block(tmp_path):
    p = tmp_path / "anc.json"
    payload = {
        "schema_version": "2.0",
        "traits": {
            "ancestor_xyz_01": {
                "label_it": "Test",
                "label_en": "Test",
                "description_it": "x",
                "description_en": "x",
            }
        },
    }
    p.write_text(json.dumps(payload))
    r = _run_gate(["--check", str(p)])
    assert r.returncode == 0, f"unexpected fail: {r.stderr}"


def test_gate_warns_non_ancestor_without_design_in_index(tmp_path):
    # On index.json: missing design = WARN (rc=0) NOT FAIL.
    # Tier-Backlog legacy tolerated per ADR-2026-05-29 §C tier-3.
    p = tmp_path / "index.json"
    payload = {
        "schema_version": "2.0",
        "traits": {
            "ferocia": {"label_it": "Ferocia"}  # missing design
        },
    }
    p.write_text(json.dumps(payload))
    r = _run_gate(["--check", str(p)])
    assert r.returncode == 0, "index.json missing design = WARN, not HARD"
    assert "WARN-MISSING" in (r.stderr + r.stdout)


def test_gate_strict_design_promotes_warn_to_hard(tmp_path):
    # With --strict-design: index.json missing design = HARD.
    p = tmp_path / "index.json"
    payload = {
        "schema_version": "2.0",
        "traits": {"ferocia": {"label_it": "Ferocia"}},
    }
    p.write_text(json.dumps(payload))
    r = _run_gate(["--check", str(p), "--strict-design"])
    assert r.returncode == 1
    assert "MISSING design" in (r.stderr + r.stdout)


def test_gate_yaml_active_effects_v2(tmp_path):
    p = tmp_path / "active_effects.yaml"
    p.write_text("schema_version: '2.0'\nversion: 1\ntraits: {}\n")
    r = _run_gate(["--check", str(p)])
    assert r.returncode == 0, f"unexpected fail: {r.stderr}"


def test_gate_skip_marker_bypass(tmp_path):
    p = tmp_path / "legitimate_skip.json"
    p.write_text(json.dumps({"_gate_skip_reason": "test fixture", "traits": {"x": {}}}))
    r = _run_gate(["--check", str(p), "--allow-skip-marker"])
    assert r.returncode == 0
