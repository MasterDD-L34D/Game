"""Unit test per tools/py/batch_calibrate_non_elim.py — helpers puri.

Non richiede backend running. Testa:
  - load_yaml success su encounter file
  - encounter_to_units shape (player + sis + escort VIP)
  - aggregate outcome distribution
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "py"))

from batch_calibrate_non_elim import aggregate, encounter_to_units, load_yaml  # noqa: E402


ENCOUNTERS_DIR = ROOT / "docs" / "planning" / "encounters"


def test_load_yaml_capture():
    path = ENCOUNTERS_DIR / "enc_capture_01.yaml"
    data = load_yaml(path)
    assert data["encounter_id"] == "enc_capture_01"
    assert data["objective"]["type"] == "capture_point"
    assert data["objective"]["hold_turns"] == 3


def test_encounter_to_units_capture():
    path = ENCOUNTERS_DIR / "enc_capture_01.yaml"
    data = load_yaml(path)
    units = encounter_to_units(data)
    players = [u for u in units if u["controlled_by"] == "player"]
    sis = [u for u in units if u["controlled_by"] == "sistema"]
    assert len(players) == 4, "capture encounter ha 4 player_spawn"
    assert len(sis) >= 3, "wave 1 spawn almeno 3 sis"


def test_encounter_to_units_escort_includes_vip():
    path = ENCOUNTERS_DIR / "enc_escort_01.yaml"
    data = load_yaml(path)
    units = encounter_to_units(data)
    vip = [u for u in units if u["id"] == "escort_01"]
    assert len(vip) == 1, "escort VIP unit aggiunto automaticamente"
    assert vip[0]["controlled_by"] == "player"
    assert vip[0]["attack_range"] == 0, "VIP non-combattente"


def test_encounter_to_units_survival():
    path = ENCOUNTERS_DIR / "enc_survival_01.yaml"
    data = load_yaml(path)
    units = encounter_to_units(data)
    assert any(u["controlled_by"] == "player" for u in units)
    assert any(u["controlled_by"] == "sistema" for u in units)


def test_encounter_to_units_hardcore_reinf():
    path = ENCOUNTERS_DIR / "enc_hardcore_reinf_01.yaml"
    data = load_yaml(path)
    units = encounter_to_units(data)
    players = [u for u in units if u["controlled_by"] == "player"]
    sis = [u for u in units if u["controlled_by"] == "sistema"]
    assert len(players) == 4
    # wave 1 = 2 elite + 1 apex = 3 sis units
    assert len(sis) == 3


def test_aggregate_outcome_distribution():
    runs = [
        {"run": 0, "outcome": "win", "objective_state": {"completed": True}},
        {"run": 1, "outcome": "win", "objective_state": {"completed": True}},
        {"run": 2, "outcome": "timeout", "objective_state": {"failed": True}},
        {"run": 3, "outcome": "wipe", "objective_state": {"failed": True}},
        {"run": 4, "error": "session/start failed"},
    ]
    agg = aggregate(runs)
    assert agg["N"] == 4
    assert agg["failures"] == 1
    assert agg["outcome_distribution"]["win"] == 2
    assert agg["outcome_distribution"]["timeout"] == 1
    assert agg["outcome_distribution"]["wipe"] == 1
    assert agg["win_rate"] == 0.5


def test_aggregate_no_successful_runs():
    runs = [{"run": 0, "error": "timeout"}, {"run": 1, "error": "connect"}]
    agg = aggregate(runs)
    assert "error" in agg


def test_cli_missing_scenario_fails():
    """CLI exits 1 se scenario non trovato."""
    script = ROOT / "tools" / "py" / "batch_calibrate_non_elim.py"
    env = dict(os.environ, PYTHONPATH=str(ROOT / "tools" / "py"))
    res = subprocess.run(
        [sys.executable, str(script), "--scenario", "enc_nonexistent", "--skip-health"],
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert res.returncode == 1
    assert "non trovato" in res.stdout or "non trovato" in res.stderr
