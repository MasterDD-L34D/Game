"""TDD for PE_ratio experiment PR1: per-run + aggregate pressure-trajectory stats
instrumentation in batch_calibrate_hardcore06.py (G2 follow-up)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import batch_calibrate_hardcore06 as hc06  # noqa: E402


def _base_run(outcome):
    """Minimal per-run record with every field aggregate() reads, so the
    function does not crash on a real-contract fixture."""
    return {
        "outcome": outcome,
        "rounds": 10,
        "players_alive": 2,
        "players_dead": 1,
        "enemies_alive": 0,
        "enemies_dead": 3,
        "dmg_dealt_player": 40,
        "dmg_taken_player": 20,
        "boss_hp_remaining": 0,
        "ai_intent_tally": {},
        "player_action_tally": {},
        "trait_used_tally": {},
    }


def test_run_one_emits_per_run_pressure_stats():
    from pressure_stats import pressure_stats

    s = pressure_stats([75, 80, 95, 100])
    assert set(s) == {"pressure_mean", "frac_ge75", "pmax"}


def test_aggregate_surfaces_pressure_keys():
    run1 = _base_run("victory")
    run1.update({"pressure_mean": 90.0, "pressure_frac_ge75": 0.9, "pressure_pmax": 99})
    run2 = _base_run("defeat")
    run2.update({"pressure_mean": 62.0, "pressure_frac_ge75": 0.2, "pressure_pmax": 75})
    runs = [run1, run2]

    agg = hc06.aggregate(runs, "hardcore")
    assert "pressure_mean_avg" in agg
    assert "pressure_frac_ge75_avg" in agg
    assert "apex_reach_rate" in agg
    assert round(agg["pressure_frac_ge75_avg"], 2) == 0.55  # (0.9 + 0.2)/2
    assert agg["apex_reach_rate"] == 0.5  # 1 of 2 runs pmax >= 95
