from datetime import datetime
from pathlib import Path
import json
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TOOLS_PY = PROJECT_ROOT / "tools" / "py"
if str(TOOLS_PY) not in sys.path:
    sys.path.insert(0, str(TOOLS_PY))

from balance_progression import load_mission_config, simulate_xp_progression


MISSION_PATH = Path("data/core/missions/skydock_siege.yaml")
LOG_DIR = Path("logs/pilot-2025-11-12/telemetry")
LOG_FILE = LOG_DIR / "skydock_siege_xp_delta.json"


@pytest.fixture(scope="session")
def progression_payload():
    mission = load_mission_config(MISSION_PATH, "skydock_siege")
    return simulate_xp_progression(mission)


@pytest.fixture(scope="session", autouse=True)
def telemetry_log(progression_payload):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    summary: dict[str, object] = {
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "mission": "skydock_siege",
        "difficulties": {},
        "profiles": {},
    }

    for difficulty, diff_payload in progression_payload["difficulties"].items():
        summary["difficulties"][difficulty] = {
            class_id: {
                "total_xp": class_payload["total_xp"],
                "target_xp": class_payload["target_xp"],
                "delta_vs_target_pct": class_payload["delta_vs_target_pct"],
            }
            for class_id, class_payload in diff_payload["classes"].items()
        }

    for profile_id, profile_payload in progression_payload["profiles"].items():
        summary["profiles"][profile_id] = {
            "label": profile_payload.get("label"),
            "difficulties": {
                difficulty: {
                    "total_xp": diff_payload["total_xp"],
                    "target_xp": diff_payload["target_xp"],
                    "delta_vs_target_pct": diff_payload["delta_vs_target_pct"],
                }
                for difficulty, diff_payload in profile_payload["difficulties"].items()
            },
        }

    LOG_FILE.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    return summary


def test_standard_sentinel_total_xp(progression_payload):
    sentinel = progression_payload["difficulties"]["standard"]["classes"]["sentinel"]
    assert sentinel["total_xp"] == pytest.approx(1425.0, rel=1e-4)
    assert sentinel["xp_per_minute"] == pytest.approx(61.1588, rel=1e-4)
    assert sentinel["delta_vs_target_pct"] == pytest.approx(0.0, abs=1e-4)


def test_cipher_gap_is_balanced(progression_payload):
    cipher = progression_payload["difficulties"]["standard"]["classes"]["cipher"]
    assert cipher["total_xp"] == pytest.approx(1375.125, rel=1e-4)
    assert cipher["delta_vs_target_pct"] == pytest.approx(-3.5, rel=1e-4)


def test_wave_breakdown_matches_configuration(progression_payload):
    waves = progression_payload["waves"]["breakdown"]
    assert len(waves) == 6
    assert waves[2]["wave"] == 3
    assert waves[2]["total_xp"] == pytest.approx(201.0, rel=1e-4)
    assert waves[5]["total_xp"] == pytest.approx(315.0, rel=1e-4)


def test_helix_cipher_profile_is_on_target(progression_payload):
    profile = progression_payload["profiles"]["helix_cipher"]["difficulties"]["standard"]
    assert profile["total_xp"] == pytest.approx(1429.9875, rel=1e-4)
    assert profile["delta_vs_target_pct"] == pytest.approx(-0.0009, abs=1e-3)


def test_duration_minutes_is_version_stable(progression_payload):
    # CPython 3.12 added compensated (Neumaier) summation to sum() for floats, so a
    # raw sum(cadence_minutes) yields 23.3 on 3.12 but 23.299999999999997 on 3.11.
    # The emitted duration must be decimal-canonical so the derived artifact is
    # byte-identical across interpreter versions (uses exact ==, not approx, on
    # purpose -- approx would mask the precision drift this guards against).
    duration = progression_payload["waves"]["duration_minutes"]
    # Version-agnostic invariant: no >4-decimal summation noise survives.
    # (23.299999999999997 != round(it, 4); 23.3 == round(it, 4).)
    assert duration == round(duration, 4)
    # Contract derived from the fixture data (not a hardcoded literal, so editing
    # cadence_minutes won't make this brittle): duration is the cadence sum rounded.
    cadence = load_mission_config(MISSION_PATH, "skydock_siege")["progression"]["waves"][
        "cadence_minutes"
    ]
    assert duration == round(sum(float(x) for x in cadence), 4)


def test_telemetry_log_is_recorded(telemetry_log):
    assert LOG_FILE.exists()
    helix_cipher_standard = telemetry_log["profiles"]["helix_cipher"]["difficulties"]["standard"]
    assert helix_cipher_standard["target_xp"] == 1430.0
    assert helix_cipher_standard["delta_vs_target_pct"] == pytest.approx(-0.0009, abs=1e-3)
