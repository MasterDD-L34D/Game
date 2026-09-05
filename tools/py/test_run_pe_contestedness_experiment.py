#!/usr/bin/env python3
"""Unit tests for the multi-policy generalization of run_pe_contestedness_experiment.

The committed evidence was a 3-point band on GREEDY-ONLY corpora (harsh-review HIGH:
wrong policy regime + 3-point outlier artifact). The re-run pools the canonical
Restricted-Play regime [random, greedy, lookahead2, utility] (canonical-suite.yaml)
across >=5 oracles. These tests pin the PURE pooling + band-derivation + analysis logic
(no backend, no file I/O except pool_oracle_runs round-trip).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import run_pe_contestedness_experiment as rx  # noqa: E402


def _run(outcome, rounds, taken, dealt):
    return {
        "outcome": outcome, "rounds": rounds,
        "dmg_taken_player": taken, "dmg_dealt_player": dealt,
    }


# --- derive_band: mean +/- k*sd, clamped to [0,1] -------------------------------

def test_derive_band_basic_mean_and_spread():
    b = rx.derive_band([0.2, 0.4, 0.6], k=2.0)
    assert b["n"] == 3
    assert abs(b["mu"] - 0.4) < 1e-9
    assert abs(b["sd"] - 0.16329931) < 1e-6  # population stdev of [.2,.4,.6]
    assert abs(b["lo"] - (0.4 - 2 * 0.16329931)) < 1e-6
    assert abs(b["hi"] - (0.4 + 2 * 0.16329931)) < 1e-6


def test_derive_band_clamps_to_unit_interval():
    b = rx.derive_band([0.1, 0.9], k=2.0)  # mu .5 sd .4 -> [-.3, 1.3] clamps
    assert b["lo"] == 0.0
    assert b["hi"] == 1.0


def test_derive_band_single_oracle_zero_spread():
    b = rx.derive_band([0.5], k=2.0)
    assert b["sd"] == 0.0
    assert b["lo"] == 0.5 and b["hi"] == 0.5


# --- pool_oracle_runs: concatenate per-policy corpora for ONE oracle ------------

def test_pool_oracle_runs_concatenates_across_policy_files(tmp_path):
    a = tmp_path / "greedy.json"
    b = tmp_path / "random.json"
    a.write_text(json.dumps({"policy_mode": "greedy", "runs": [_run("victory", 10, 5, 9)]}), encoding="utf-8")
    b.write_text(json.dumps({"policy_mode": "random", "runs": [
        _run("defeat", 40, 30, 4), _run("victory", 12, 6, 8)]}), encoding="utf-8")
    pooled = rx.pool_oracle_runs([str(a), str(b)])
    assert len(pooled) == 3  # 1 + 2 across the two policy corpora


def test_pool_oracle_runs_accepts_bare_list_corpus(tmp_path):
    p = tmp_path / "list.json"
    p.write_text(json.dumps([_run("victory", 10, 5, 9)]), encoding="utf-8")
    assert len(rx.pool_oracle_runs([str(p)])) == 1


def test_pool_oracle_runs_flattens_policy_all_triangulation_file(tmp_path):
    # A `batch_calibrate_*.py --policy all` file holds per-policy runs nested under
    # policies[pol].runs (NOT a flat top-level `runs`). One such file = the full
    # multi-policy pool for one oracle; pool_oracle_runs must flatten all 4 policies.
    p = tmp_path / "allpol.json"
    p.write_text(json.dumps({
        "mode": "triangulation",
        "policies": {
            "random": {"runs": [_run("defeat", 40, 30, 4)]},
            "greedy": {"runs": [_run("victory", 10, 5, 9), _run("victory", 12, 6, 8)]},
            "lookahead2": {"runs": [_run("victory", 11, 5, 9)]},
            "utility": {"runs": [_run("defeat", 38, 28, 5)]},
        },
    }), encoding="utf-8")
    pooled = rx.pool_oracle_runs([str(p)])
    assert len(pooled) == 5  # 1 + 2 + 1 + 1 across the 4 policies


def test_pool_oracle_runs_triangulation_drops_error_records(tmp_path):
    # run_one returns {"error": ...} on a failed run (no outcome); these must not
    # pollute the pool (they have no contestedness fields).
    p = tmp_path / "allpol_err.json"
    p.write_text(json.dumps({
        "policies": {
            "greedy": {"runs": [_run("victory", 10, 5, 9), {"error": "session/start failed"}]},
            "random": {"runs": [_run("defeat", 40, 30, 4)]},
        },
    }), encoding="utf-8")
    pooled = rx.pool_oracle_runs([str(p)])
    assert len(pooled) == 2  # the error record is dropped
    assert all("error" not in r for r in pooled)


# --- analyze: orthogonality on pooled multi-policy runs + band across oracles ----

def _oracle_runs():
    # 2 synthetic oracles; outcome tracks rounds (long fight => loss) so D/F are
    # collinear while E (dmg margin) has its own spread. Exact corr values are not
    # asserted (covered by pe_orthogonality tests) -- structure + wiring is.
    o1 = [_run("victory", 8, 4, 12), _run("victory", 10, 6, 11),
          _run("defeat", 38, 28, 5), _run("defeat", 40, 30, 6)]
    o2 = [_run("victory", 9, 5, 10), _run("defeat", 36, 24, 7),
          _run("victory", 11, 7, 9), _run("defeat", 39, 26, 6)]
    return {"oracle_hi": o1, "oracle_lo": o2}


def test_analyze_returns_per_oracle_and_pooled_orthogonality():
    res = rx.analyze(_oracle_runs(), k=2.0)
    assert set(res["per_oracle"]) == {"oracle_hi", "oracle_lo"}
    for o in res["per_oracle"].values():
        assert o["n"] == 4
        for cand in rx.CONTEST:
            assert cand in o["orthogonality"]
    for cand in rx.CONTEST:
        assert cand in res["pooled_orthogonality"]


def test_analyze_selects_least_collinear_contestedness_candidate():
    res = rx.analyze(_oracle_runs(), k=2.0)
    # selected is the min-|corr| CONTEST candidate (or None if all rejected).
    assert res["selected"] in set(rx.CONTEST) | {None}
    if res["selected"] is not None:
        sel_corr = res["pooled_orthogonality"][res["selected"]]
        assert sel_corr == min(res["pooled_orthogonality"][c] for c in rx.CONTEST)


def test_analyze_band_is_over_per_oracle_aggregate_values():
    res = rx.analyze(_oracle_runs(), candidate="E_dmg_margin", k=2.0)
    band = res["band"]
    assert band["candidate"] == "E_dmg_margin"
    assert band["n"] == 2  # one aggregate value per oracle (NOT per-run)
    # values match pe_ratio_aggregate(oracle_aggregate(pooled_runs)) per oracle.
    from pe_candidates import pe_ratio_aggregate  # noqa: E402
    expect = sorted(
        pe_ratio_aggregate(rx.oracle_aggregate(runs), "E_dmg_margin")
        for runs in _oracle_runs().values()
    )
    assert sorted(band["values"]) == [round(v, 12) for v in [round(x, 12) for x in expect]] or \
        all(abs(a - b) < 1e-9 for a, b in zip(sorted(band["values"]), expect))


def test_analyze_rejected_flag_when_all_above_threshold():
    # Degenerate corpus where every contestedness candidate perfectly tracks `won`
    # (win => short+low-damage, loss => long+high-damage) -> |corr| ~ 1 -> rejected.
    runs = [_run("victory", 5, 1, 20) for _ in range(5)] + \
           [_run("defeat", 40, 40, 1) for _ in range(5)]
    res = rx.analyze({"degenerate": runs}, k=2.0)
    assert res["rejected"] is True
    assert res["selected"] is None
