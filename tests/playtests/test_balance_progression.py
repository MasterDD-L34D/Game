from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

from balance_progression import load_mission_config, simulate_xp_progression


MISSION_PATH = Path("data/core/missions/skydock_siege.yaml")


@pytest.fixture(scope="session")
def progression_payload():
    mission = load_mission_config(MISSION_PATH, "skydock_siege")
    return simulate_xp_progression(mission)


def test_standard_sentinel_total_xp(progression_payload):
    sentinel = progression_payload["difficulties"]["standard"]["classes"]["sentinel"]
    assert sentinel["total_xp"] == pytest.approx(1460.0, rel=1e-4)
    assert sentinel["xp_per_minute"] == pytest.approx(62.661, rel=1e-3)
    assert sentinel["delta_vs_target_pct"] == pytest.approx(2.4561, rel=1e-4)


def test_cipher_gap_is_within_threshold(progression_payload):
    cipher = progression_payload["difficulties"]["standard"]["classes"]["cipher"]
    assert cipher["total_xp"] == pytest.approx(1343.2, rel=1e-4)
    assert cipher["delta_vs_target_pct"] == pytest.approx(-5.7404, rel=1e-4)


def test_wave_breakdown_matches_configuration(progression_payload):
    waves = progression_payload["waves"]["breakdown"]
    assert len(waves) == 6
    assert waves[2]["wave"] == 3
    assert waves[2]["total_xp"] == pytest.approx(201.0, rel=1e-4)
    assert waves[5]["total_xp"] == pytest.approx(315.0, rel=1e-4)
