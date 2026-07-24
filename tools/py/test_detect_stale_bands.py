#!/usr/bin/env python3
"""Unit tests for tools/py/detect_stale_bands.py (G2 P5 -- advisory stale-band detector).

P5 ships the DETECTION core + an injectable seed-pinned runner + a --dry-run/print CLI,
ALL advisory (never writes a band/knob/manifest). Live GitHub-issue emission + the nightly
CI job + the band-invalidation label are DEFERRED (owner decision 2026-06-18) until the
SDMG harsh-review falsification corpus is green. These tests pin the false-positive
discipline the verify+red-team workflow surfaced (node-runtime drift #2764, N=40 near-edge
variance, iter3 staging transient) + the over-claim guard (symptom, not verdict).
See docs/superpowers/specs/2026-06-17-per-template-calibration-design.md sec 6.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from detect_stale_bands import (  # noqa: E402
    ci_disjoint_from_band,
    detect_scenario,
    node_matches_canonical,
)

BAND = [0.15, 0.30]
SCEN = {"id": "enc_tutorial_06_hardcore", "role": "balance_oracle", "status": "ratified",
        "target_band": [0.15, 0.30], "ratified_knob": {"boss_hp_multiplier": 1.02}}


def _agg(win_count, n=100, knob_used=None):
    a = {"win_rate": win_count / n, "win_count": win_count, "n": n,
         "kd_avg": 0.8, "defeat_rate": 1 - win_count / n}
    if knob_used is not None:
        a["knob_used"] = knob_used
    return a


# --- Group 1: CI-overlap discipline + runtime assert ---------------------------

def test_ci_disjoint_above_band():
    # #2719 signature: 51/100 -> Wilson ~ (0.41,0.61), entirely above [0.15,0.30].
    disjoint, lo, hi = ci_disjoint_from_band(51, 100, BAND)
    assert disjoint is True and lo > 0.30


def test_ci_disjoint_below_band():
    disjoint, lo, hi = ci_disjoint_from_band(5, 100, BAND)
    assert disjoint is True and hi < 0.15


def test_ci_overlap_near_edge_not_disjoint():
    # 31/100: point 0.31 is just over the high edge, but Wilson ~ (0.227,0.404) OVERLAPS
    # the band -> statistically in-band -> must NOT flag (the near-edge false-positive trap).
    disjoint, lo, hi = ci_disjoint_from_band(31, 100, BAND)
    assert disjoint is False


def test_ci_overlap_node_drift_12pct_not_disjoint():
    # #2764 trap: a node-runtime drift reads ~12/100; Wilson ~ (0.07,0.20) OVERLAPS [0.15..]
    # so the CI discipline ALSO softens it (the primary guard is the runtime assert below).
    disjoint, _, _ = ci_disjoint_from_band(12, 100, BAND)
    assert disjoint is False


def test_ci_disjoint_fail_safe_on_missing_counts():
    # No counts -> cannot compute -> never claim disjoint (advisory: no false flag).
    assert ci_disjoint_from_band(None, None, BAND) == (False, None, None)


def test_node_matches_canonical():
    assert node_matches_canonical("v22.15.0") is True
    assert node_matches_canonical("v24.3.1") is False
    assert node_matches_canonical(None) is False


# --- Group 2: detect_scenario (the per-scenario verdict) ------------------------

def test_flag_when_ci_disjoint_and_regression_green():
    r = detect_scenario(SCEN, runner=lambda s: _agg(51), node_version="v22.15.0",
                        regression_green=True, seed=424242)
    assert r["status"] == "flag"
    assert r["observed_wr"] == 0.51
    assert r["band"] == [0.15, 0.30]  # old band from STRUCTURED target_band
    assert r["n"] == 100 and r["seed"] == 424242


def test_in_band_when_ci_overlaps():
    r = detect_scenario(SCEN, runner=lambda s: _agg(23), node_version="v22.15.0",
                        regression_green=True, seed=424242)
    assert r["status"] == "in-band"  # healthy hc06 (23/100, CI overlaps band)


def test_no_flag_near_edge():
    r = detect_scenario(SCEN, runner=lambda s: _agg(31), node_version="v22.15.0",
                        regression_green=True, seed=424242)
    assert r["status"] == "in-band"  # CI-overlap discipline, not point-over-edge


def test_skip_on_runtime_mismatch_never_flags():
    # #2764 primary guard: a non-canonical runtime yields NO verdict (not a false flag),
    # even with a wildly-OOB reading.
    r = detect_scenario(SCEN, runner=lambda s: _agg(8), node_version="v24.3.1",
                        regression_green=True, seed=424242)
    assert r["status"] == "skip-runtime-mismatch"
    assert r["node_version"] == "v24.3.1"


def test_skip_on_staging_divergence():
    # iter3 trap: runner ran a NON-ratified (staging) knob -> measure is not the ratified
    # band -> no verdict.
    r = detect_scenario(
        SCEN, runner=lambda s: _agg(85, knob_used={"boss_hp_multiplier": 0.65}),
        node_version="v22.15.0", regression_green=True, seed=424242,
    )
    assert r["status"] == "skip-staging-divergence"


def test_no_flag_when_regression_red():
    # WR OOB but regression RED = a regression bug, NOT a stale band -> do not flag.
    r = detect_scenario(SCEN, runner=lambda s: _agg(51), node_version="v22.15.0",
                        regression_green=False, seed=424242)
    assert r["status"] == "skip-regression-red"


def test_composite_pending_annotated_on_flag():
    # composite needs pe_ratio (absent) -> None -> WR-only check + composite_pending flag.
    r = detect_scenario(
        SCEN, runner=lambda s: _agg(51), node_version="v22.15.0", regression_green=True,
        seed=424242, objective_metric="0.5*win_rate + 0.25*kd_ratio + 0.25*pe_ratio",
    )
    assert r["status"] == "flag"
    assert r["composite_pending"] is True
    assert r["composite"] is None


# --- Group 3: advisory issue body (CANDIDATE / symptom-not-verdict / structured) -

from detect_stale_bands import (  # noqa: E402
    build_candidate_body,
    build_culprit_log_cmd,
    detect_stale_bands,
)


def _flag_candidate():
    return detect_scenario(SCEN, runner=lambda s: _agg(51), node_version="v22.15.0",
                           regression_green=True, seed=424242,
                           objective_metric="0.5*win_rate + 0.25*kd_ratio + 0.25*pe_ratio")


def test_body_frames_candidate_not_verdict():
    body = build_candidate_body(_flag_candidate())
    assert "CANDIDATE" in body
    low = body.lower()
    assert "symptom" in low and "not a verdict" in low and "git-bisect" in low


def test_body_old_band_from_structured_not_prose():
    body = build_candidate_body(_flag_candidate())
    # the structured target_band [0.15, 0.30] (Python renders 0.30 as 0.3), never the
    # stale note prose form '[15-25]'.
    assert "[0.15, 0.3]" in body
    assert "15-25" not in body


def test_body_carries_required_fields():
    body = build_candidate_body(_flag_candidate())
    assert "enc_tutorial_06_hardcore" in body
    assert "424242" in body  # seed
    assert "40" in body or "100" in body  # N used
    assert "22" in body  # node runtime stamp
    assert "composite-pending" in body  # honest gap annotation


def test_body_includes_culprit_hint_as_candidates():
    body = build_candidate_body(_flag_candidate(), culprit_hint="abc123 2026-06-10 fix(combat): channel")
    assert "abc123" in body
    assert "candidates" in body.lower() and "authoritative" in body.lower()


# --- Group 4: detect_stale_bands loop (ratified balance oracles only) -----------

MANIFEST = {
    "composite_metric": "0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio",
    "repro": {"canonical_seed": 424242},
    "scenarios": [
        {"id": "enc_tutorial_06_hardcore", "role": "balance_oracle", "status": "ratified",
         "target_band": [0.15, 0.30], "ratified_knob": {"boss_hp_multiplier": 1.02}},
        {"id": "enc_tutorial_07_hardcore_pod_rush", "role": "balance_oracle", "status": "ratified",
         "target_band": [0.30, 0.50], "ratified_knob": {"enemy_damage_multiplier_override": 2.5}},
        {"id": "enc_tutorial_01_05", "role": "designed_winnable_ladder",
         "status": "not_balance_oracle", "target_band": None},
    ],
}


def test_loop_only_ratified_oracles():
    wins = {"enc_tutorial_06_hardcore": 51, "enc_tutorial_07_hardcore_pod_rush": 40}

    def runner(s):
        return _agg(wins[s["id"]])

    results = detect_stale_bands(MANIFEST, runner=runner, node_version="v22.15.0",
                                 regression_green=True)
    ids = {r["scenario_id"] for r in results}
    assert ids == {"enc_tutorial_06_hardcore", "enc_tutorial_07_hardcore_pod_rush"}  # tutorial skipped
    by = {r["scenario_id"]: r for r in results}
    assert by["enc_tutorial_06_hardcore"]["status"] == "flag"  # 51/100 OOB-high vs [0.15,0.30]
    assert by["enc_tutorial_07_hardcore_pod_rush"]["status"] == "in-band"  # 40/100 in [0.30,0.50]
    # seed threaded from manifest repro.canonical_seed
    assert by["enc_tutorial_06_hardcore"]["seed"] == 424242


def test_loop_flags_only_returns_helper():
    wins = {"enc_tutorial_06_hardcore": 51, "enc_tutorial_07_hardcore_pod_rush": 40}
    results = detect_stale_bands(MANIFEST, runner=lambda s: _agg(wins[s["id"]]),
                                 node_version="v22.15.0", regression_green=True)
    flags = [r for r in results if r["status"] == "flag"]
    assert len(flags) == 1 and flags[0]["scenario_id"] == "enc_tutorial_06_hardcore"


# --- Group 5: culprit-hint command (scoped, not authoritative) ------------------

def test_culprit_log_cmd_scopes_balance_combat_paths():
    cmd = build_culprit_log_cmd(since="2026-05-29", repo="/r")
    s = " ".join(cmd)
    assert "data/core/balance/damage_curves.yaml" in s
    assert "apps/backend/services/combat" in s
    assert "apps/backend/services/balance" in s
    assert "--since" in cmd and "2026-05-29" in cmd
    assert "log" in cmd


def test_culprit_log_cmd_omits_since_when_absent():
    cmd = build_culprit_log_cmd(since=None, repo="/r")
    assert "--since" not in cmd  # no bound -> caller must print 'window unavailable', not dump


# --- Group 6: harsh-review SDMG fixes (P3 band-shape, P2 prod-knob measure) ------

from detect_stale_bands import read_prod_knob  # noqa: E402


def test_ci_disjoint_fail_safe_on_malformed_band():
    # P3: a half-null / short / scalar band must NOT crash -> (False, None, None).
    assert ci_disjoint_from_band(51, 100, [None, 0.30]) == (False, None, None)
    assert ci_disjoint_from_band(51, 100, [0.15]) == (False, None, None)
    assert ci_disjoint_from_band(51, 100, 0.30) == (False, None, None)
    assert ci_disjoint_from_band(51, 100, [0.30, 0.15]) == (False, None, None)  # inverted


def test_detect_scenario_skip_malformed_band():
    # P3: a malformed structured band yields a verdict-less skip, never a crash mid-loop.
    bad = {"id": "enc_x", "role": "balance_oracle", "status": "ratified",
           "target_band": [None, 0.30], "ratified_knob": {"boss_hp_multiplier": 1.02}}
    r = detect_scenario(bad, runner=lambda s: _agg(51), node_version="v22.15.0",
                        regression_green=True, seed=424242)
    assert r["status"] == "skip-malformed-band"


def test_read_prod_knob_independent_measurement(tmp_path):
    # P2: the prod runner must measure the ON-DISK knob, independent of the manifest.
    dc = tmp_path / "damage_curves.yaml"
    dc.write_text(
        "scenario_overrides:\n  enc_x:\n    boss_hp_multiplier: 0.65\n    rationale: drift\n",
        encoding="utf-8",
    )
    assert read_prod_knob(str(dc), "enc_x", "boss_hp_multiplier") == 0.65  # on-disk, not manifest
    assert read_prod_knob(str(dc), "enc_x", "ghost") is None
    assert read_prod_knob(str(dc), "enc_missing", "boss_hp_multiplier") is None
